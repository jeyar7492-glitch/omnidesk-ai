import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError } from "../../lib/errors";

export class MilestoneService {
  // ── Create Milestone ──────────────────────────────────────────────────────
  public async createMilestone(
    workspaceId: string,
    data: {
      projectId: string;
      title: string;
      description?: string;
      dueDate?: Date;
      status?: string;
      assignedUserId?: string;
    }
  ) {
    // Validate project belongs to workspace
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, workspaceId },
    });
    if (!project) {
      throw new NotFoundError(`Project '${data.projectId}' not found in workspace`);
    }

    const milestone = await prisma.milestone.create({
      data: {
        workspaceId,
        projectId: data.projectId,
        title: data.title.trim(),
        description: data.description?.trim(),
        dueDate: data.dueDate,
        status: data.status || "pending",
        assignedUserId: data.assignedUserId,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "milestone:created", {
      milestoneId: milestone.id,
      title: milestone.title,
      projectId: milestone.projectId,
      projectName: milestone.project.name,
      dueDate: milestone.dueDate?.toISOString() || null,
      createdAt: milestone.createdAt.toISOString(),
    });

    return milestone;
  }

  // ── Find Milestones ───────────────────────────────────────────────────────
  public async findMilestones(
    workspaceId: string,
    filter: {
      projectId?: string;
      status?: string;
      query?: string;
      limit?: number;
    }
  ) {
    const where: any = { workspaceId };
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.status) where.status = filter.status;
    if (filter.query && filter.query.trim()) {
      where.title = { contains: filter.query.trim(), mode: "insensitive" };
    }

    const milestones = await prisma.milestone.findMany({
      where,
      take: filter.limit || 50,
      orderBy: { dueDate: "asc" },
      include: {
        project: { select: { id: true, name: true } },
        tasks: { select: { id: true, status: true } },
      },
    });

    return milestones.map((m) => {
      const totalTasks = m.tasks.length;
      const completedTasks = m.tasks.filter((t) => t.status === "done").length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : m.progress;

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        projectId: m.projectId,
        projectName: m.project?.name || null,
        status: m.status,
        dueDate: m.dueDate?.toISOString() || null,
        progress,
        totalTasks,
        completedTasks,
        completedAt: m.completedAt?.toISOString() || null,
        createdAt: m.createdAt.toISOString(),
      };
    });
  }

  // ── Get Milestone ─────────────────────────────────────────────────────────
  public async getMilestone(workspaceId: string, milestoneIdOrTitle: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(milestoneIdOrTitle);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = milestoneIdOrTitle;
    } else {
      where.title = { contains: milestoneIdOrTitle.trim(), mode: "insensitive" };
    }

    const milestone = await prisma.milestone.findFirst({
      where,
      include: {
        project: { select: { id: true, name: true, status: true } },
        tasks: {
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!milestone) {
      throw new NotFoundError(`Milestone '${milestoneIdOrTitle}' not found in workspace`);
    }

    const totalTasks = milestone.tasks.length;
    const completedTasks = milestone.tasks.filter((t) => t.status === "done").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : milestone.progress;

    return {
      ...milestone,
      progress,
      totalTasks,
      completedTasks,
    };
  }

  // ── Update Milestone ──────────────────────────────────────────────────────
  public async updateMilestone(
    workspaceId: string,
    milestoneId: string,
    data: {
      title?: string;
      description?: string;
      dueDate?: Date;
      status?: string;
      assignedUserId?: string;
    }
  ) {
    const existing = await this.getMilestone(workspaceId, milestoneId);

    const updated = await prisma.milestone.update({
      where: { id: existing.id },
      data: {
        title: data.title?.trim(),
        description: data.description?.trim(),
        dueDate: data.dueDate,
        status: data.status,
        assignedUserId: data.assignedUserId,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "milestone:updated", {
      milestoneId: updated.id,
      title: updated.title,
      status: updated.status,
      dueDate: updated.dueDate?.toISOString() || null,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Complete Milestone ────────────────────────────────────────────────────
  public async completeMilestone(workspaceId: string, milestoneId: string, notes?: string) {
    const existing = await this.getMilestone(workspaceId, milestoneId);

    const updated = await prisma.milestone.update({
      where: { id: existing.id },
      data: {
        status: "completed",
        progress: 100,
        completedAt: new Date(),
        description: notes ? `${existing.description ? existing.description + "\n" : ""}${notes}` : existing.description,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "milestone:completed", {
      milestoneId: updated.id,
      title: updated.title,
      projectName: updated.project.name,
      completedAt: updated.completedAt?.toISOString(),
    });

    return updated;
  }

  // ── Get Overdue Milestones ────────────────────────────────────────────────
  public async getOverdueMilestones(workspaceId: string, projectId?: string) {
    const now = new Date();
    const where: any = {
      workspaceId,
      status: { not: "completed" },
      dueDate: { lt: now },
    };
    if (projectId) where.projectId = projectId;

    const overdue = await prisma.milestone.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    return {
      count: overdue.length,
      milestones: overdue.map((m) => ({
        id: m.id,
        title: m.title,
        projectId: m.projectId,
        projectName: m.project?.name || null,
        dueDate: m.dueDate?.toISOString() || null,
        status: m.status,
        daysOverdue: Math.floor((now.getTime() - (m.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
      })),
    };
  }
}

export const milestoneService = new MilestoneService();
