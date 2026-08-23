import { ProjectStatus } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { resolveWorkspaceUser } from "../../lib/user_resolver";

export class ProjectService {
  // ── Create Project ────────────────────────────────────────────────────────
  public async createProject(
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      status?: ProjectStatus;
      budget?: number;
      spent?: number;
      startDate?: Date;
      deadline?: Date;
      managerId?: string;
      managerNameOrEmail?: string;
      customerId?: string;
      customerName?: string;
      health?: string;
    }
  ) {
    let resolvedCustomerId = data.customerId;
    if (!resolvedCustomerId && data.customerName) {
      const customer = await prisma.customer.findFirst({
        where: {
          workspaceId,
          companyName: { contains: data.customerName.trim(), mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (customer) resolvedCustomerId = customer.id;
    }

    let resolvedManagerId = data.managerId;
    if (!resolvedManagerId && data.managerNameOrEmail) {
      const manager = await resolveWorkspaceUser(workspaceId, data.managerNameOrEmail);
      if (manager) resolvedManagerId = manager.id;
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: data.name.trim(),
        description: data.description?.trim(),
        status: data.status || "PLANNING",
        budget: data.budget ?? 0.0,
        spent: data.spent ?? 0.0,
        startDate: data.startDate,
        deadline: data.deadline,
        managerId: resolvedManagerId,
        customerId: resolvedCustomerId,
        health: data.health || "healthy",
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "project:created", {
      projectId: project.id,
      name: project.name,
      status: project.status,
      budget: project.budget,
      manager: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : null,
      customer: project.customer?.companyName || null,
      createdAt: project.createdAt.toISOString(),
    });

    return project;
  }

  // ── Find Projects ─────────────────────────────────────────────────────────
  public async findProjects(
    workspaceId: string,
    filter: {
      query?: string;
      status?: ProjectStatus;
      managerId?: string;
      customerId?: string;
      isArchived?: boolean;
      limit?: number;
    }
  ) {
    const where: any = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.managerId) where.managerId = filter.managerId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    } else {
      where.isArchived = false; // Default to active projects
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      take: filter.limit || 20,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { id: true, companyName: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
    });

    // Calculate progress for each project
    const results = await Promise.all(
      projects.map(async (p) => {
        const completedTasksCount = await prisma.task.count({
          where: { projectId: p.id, status: "done" },
        });
        const totalTasks = p._count.tasks;
        const progress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

        return {
          id: p.id,
          name: p.name,
          description: p.description,
          status: p.status,
          health: p.health,
          budget: p.budget,
          spent: p.spent,
          startDate: p.startDate?.toISOString() || null,
          deadline: p.deadline?.toISOString() || null,
          managerName: p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : null,
          customerName: p.customer?.companyName || null,
          isArchived: p.isArchived,
          progressPercentage: progress,
          totalTasks,
          completedTasks: completedTasksCount,
          totalMilestones: p._count.milestones,
          createdAt: p.createdAt.toISOString(),
        };
      })
    );

    return results;
  }

  // ── Get Project ───────────────────────────────────────────────────────────
  public async getProject(workspaceId: string, projectIdOrName: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrName);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = projectIdOrName;
    } else {
      where.name = { contains: projectIdOrName.trim(), mode: "insensitive" };
    }

    const project = await prisma.project.findFirst({
      where,
      include: {
        customer: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
        milestones: {
          orderBy: { dueDate: "asc" },
        },
        tasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundError(`Project '${projectIdOrName}' not found in workspace`);
    }

    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === "done").length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...project,
      progressPercentage: progress,
      totalTasks,
      completedTasks,
    };
  }

  // ── Update Project ────────────────────────────────────────────────────────
  public async updateProject(
    workspaceId: string,
    projectId: string,
    data: {
      name?: string;
      description?: string;
      status?: ProjectStatus;
      budget?: number;
      spent?: number;
      startDate?: Date;
      deadline?: Date;
      managerId?: string;
      customerId?: string;
      health?: string;
    }
  ) {
    const existing = await this.getProject(workspaceId, projectId);

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        name: data.name?.trim(),
        description: data.description?.trim(),
        status: data.status,
        budget: data.budget,
        spent: data.spent,
        startDate: data.startDate,
        deadline: data.deadline,
        managerId: data.managerId,
        customerId: data.customerId,
        health: data.health,
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "project:updated", {
      projectId: updated.id,
      name: updated.name,
      status: updated.status,
      budget: updated.budget,
      spent: updated.spent,
      health: updated.health,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Archive Project ───────────────────────────────────────────────────────
  public async archiveProject(workspaceId: string, projectId: string, reason?: string) {
    const existing = await this.getProject(workspaceId, projectId);

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        isArchived: true,
        status: "CANCELLED",
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "project:archived", {
      projectId: updated.id,
      name: updated.name,
      reason: reason || "Archived by user",
      archivedAt: new Date().toISOString(),
    });

    return updated;
  }

  // ── Project Health Analytics ──────────────────────────────────────────────
  public async getProjectHealth(workspaceId: string, projectIdOrName: string) {
    const project = await this.getProject(workspaceId, projectIdOrName);
    const now = new Date();

    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const overdueTasks = tasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now);
    const blockedTasks = tasks.filter((t) => t.status !== "done" && t.isBlocked);

    const milestones = project.milestones;
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === "completed").length;
    const overdueMilestones = milestones.filter((m) => m.status !== "completed" && m.dueDate && m.dueDate < now);

    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const budgetBurnPercentage = project.budget > 0 ? Math.round((project.spent / project.budget) * 100) : 0;

    const atRiskReasons: string[] = [];
    let healthScore = 100;

    if (overdueTasks.length > 0) {
      healthScore -= overdueTasks.length * 15;
      atRiskReasons.push(`${overdueTasks.length} task(s) are overdue`);
    }

    if (blockedTasks.length > 0) {
      healthScore -= blockedTasks.length * 10;
      atRiskReasons.push(`${blockedTasks.length} task(s) are blocked by dependencies`);
    }

    if (overdueMilestones.length > 0) {
      healthScore -= overdueMilestones.length * 20;
      atRiskReasons.push(`${overdueMilestones.length} milestone(s) are past due`);
    }

    if (budgetBurnPercentage > 100) {
      healthScore -= 25;
      atRiskReasons.push(`Budget exceeded by ${budgetBurnPercentage - 100}%`);
    } else if (budgetBurnPercentage > 85 && completionRate < 50) {
      healthScore -= 15;
      atRiskReasons.push(`High budget burn (${budgetBurnPercentage}%) relative to progress (${completionRate}%)`);
    }

    if (project.deadline && project.deadline < now && project.status !== "COMPLETED") {
      healthScore -= 30;
      atRiskReasons.push("Project deadline has elapsed");
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    let overallHealth: "healthy" | "at_risk" | "critical" | "delayed" = "healthy";
    if (healthScore < 40 || project.deadline && project.deadline < now) {
      overallHealth = "critical";
    } else if (healthScore < 75) {
      overallHealth = "at_risk";
    }

    // Update project health tag in DB
    await prisma.project.update({
      where: { id: project.id },
      data: { health: overallHealth },
    });

    wsManager.broadcastToWorkspace(workspaceId, "project:health_updated", {
      projectId: project.id,
      overallHealth,
      healthScore,
      atRiskReasons,
    });

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      overallHealth,
      healthScore,
      completionRate,
      totalBudget: project.budget,
      totalSpent: project.spent,
      budgetBurnPercentage,
      totalTasks,
      completedTasks,
      overdueTasksCount: overdueTasks.length,
      blockedTasksCount: blockedTasks.length,
      totalMilestones,
      completedMilestones,
      overdueMilestonesCount: overdueMilestones.length,
      atRiskReasons,
    };
  }

  // ── Project Progress ──────────────────────────────────────────────────────
  public async getProjectProgress(workspaceId: string, projectIdOrName: string) {
    const project = await this.getProject(workspaceId, projectIdOrName);
    const tasks = project.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const todoTasks = tasks.filter((t) => t.status === "todo" || t.status === "backlog").length;
    const reviewTasks = tasks.filter((t) => t.status === "review" || t.status === "testing").length;

    const totalEstimatedHours = tasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
    const totalActualHours = tasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    wsManager.broadcastToWorkspace(workspaceId, "project:progress_updated", {
      projectId: project.id,
      progressPercentage,
      completedTasks,
      totalTasks,
    });

    return {
      projectId: project.id,
      projectName: project.name,
      status: project.status,
      progressPercentage,
      totalTasks,
      completedTasks,
      taskBreakdown: {
        total: totalTasks,
        completed: completedTasks,
        inProgress: inProgressTasks,
        review: reviewTasks,
        todo: todoTasks,
      },
      hoursSummary: {
        estimatedTotal: totalEstimatedHours,
        actualTotal: totalActualHours,
      },
      milestonesSummary: {
        total: project.milestones.length,
        completed: project.milestones.filter((m) => m.status === "completed").length,
      },
    };
  }
}

export const projectService = new ProjectService();
