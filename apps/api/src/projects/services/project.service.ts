import { ProjectStatus, PriorityLevel, ProjectDashboardStats } from "@omnidesk/shared-types";
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
      key?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: PriorityLevel;
      budget?: number;
      spent?: number;
      startDate?: Date;
      deadline?: Date;
      managerId?: string;
      managerNameOrEmail?: string;
      customerId?: string;
      customerName?: string;
      health?: string;
      color?: string;
      ownerId?: string;
      userId?: string;
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

    let resolvedManagerId = data.managerId || data.ownerId || data.userId;
    if (!resolvedManagerId && data.managerNameOrEmail) {
      const manager = await resolveWorkspaceUser(workspaceId, data.managerNameOrEmail);
      if (manager) resolvedManagerId = manager.id;
    }

    // Auto-generate project key if not provided (e.g. PRJ-1, PRJ-2)
    let projectKey = data.key?.trim().toUpperCase();
    if (!projectKey) {
      const count = await prisma.project.count({ where: { workspaceId } });
      projectKey = `PRJ-${count + 1}`;
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: data.name.trim(),
        key: projectKey,
        description: data.description?.trim(),
        status: data.status || "PLANNING",
        priority: data.priority || "MEDIUM",
        budget: data.budget ?? 0.0,
        spent: data.spent ?? 0.0,
        startDate: data.startDate,
        deadline: data.deadline,
        managerId: resolvedManagerId,
        ownerId: data.ownerId || data.userId || resolvedManagerId,
        customerId: resolvedCustomerId,
        health: data.health || "healthy",
        color: data.color || "#06b6d4",
      },
      include: {
        customer: { select: { id: true, companyName: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Automatically add creator / manager as LEAD ProjectMember if userId available
    const memberUserId = data.userId || resolvedManagerId;
    if (memberUserId) {
      try {
        await prisma.projectMember.create({
          data: {
            workspaceId,
            projectId: project.id,
            userId: memberUserId,
            role: "LEAD",
          },
        });
      } catch {
        // Ignore unique constraint if already added
      }
    }

    // Audit Event
    try {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: data.userId || resolvedManagerId,
          action: "project:created",
          entityType: "project",
          entityId: project.id,
          details: { name: project.name, key: project.key, status: project.status },
        },
      });
    } catch {
      // Audit log non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:created", {
      projectId: project.id,
      name: project.name,
      key: project.key,
      status: project.status,
      budget: project.budget,
      manager: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : null,
      customer: project.customer?.companyName || null,
      createdAt: project.createdAt.toISOString(),
    });

    return project;
  }

  // ── Find Projects (Legacy & Simple) ───────────────────────────────────────
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
    const paginated = await this.findProjectsPaginated(workspaceId, {
      q: filter.query,
      status: filter.status,
      managerId: filter.managerId,
      customerId: filter.customerId,
      isArchived: filter.isArchived,
      limit: filter.limit || 50,
    });
    return paginated.items;
  }

  // ── Find Projects Paginated ───────────────────────────────────────────────
  public async findProjectsPaginated(
    workspaceId: string,
    filter: {
      q?: string;
      status?: string;
      priority?: string;
      managerId?: string;
      customerId?: string;
      isArchived?: boolean;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.managerId) where.managerId = filter.managerId;
    if (filter.customerId) where.customerId = filter.customerId;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    } else {
      where.isArchived = false;
    }

    if (filter.q && filter.q.trim()) {
      const q = filter.q.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { key: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const orderBy: any = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder || "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: { select: { id: true, companyName: true } },
          manager: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          _count: {
            select: {
              tasks: true,
              milestones: true,
              members: true,
            },
          },
        },
      }),
    ]);

    const items = await Promise.all(
      projects.map(async (p) => {
        const completedTasksCount = await prisma.task.count({
          where: { projectId: p.id, status: "done" },
        });
        const totalTasks = p._count.tasks;
        const progress = totalTasks > 0 ? Math.round((completedTasksCount / totalTasks) * 100) : 0;

        return {
          id: p.id,
          name: p.name,
          key: p.key,
          description: p.description,
          status: p.status,
          priority: p.priority,
          health: p.health,
          color: p.color,
          budget: p.budget,
          spent: p.spent,
          startDate: p.startDate?.toISOString() || null,
          deadline: p.deadline?.toISOString() || null,
          completedAt: p.completedAt?.toISOString() || null,
          managerName: p.manager ? `${p.manager.firstName} ${p.manager.lastName}` : null,
          managerId: p.managerId || null,
          ownerId: p.ownerId || null,
          customerName: p.customer?.companyName || null,
          customerId: p.customerId || null,
          isArchived: p.isArchived,
          progressPercentage: progress,
          totalTasks,
          completedTasks: completedTasksCount,
          totalMilestones: p._count.milestones,
          membersCount: p._count.members,
          createdAt: p.createdAt.toISOString(),
        };
      })
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  // ── Get Project ───────────────────────────────────────────────────────────
  public async getProject(workspaceId: string, projectIdOrName: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(projectIdOrName);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = projectIdOrName;
    } else {
      where.OR = [
        { name: { contains: projectIdOrName.trim(), mode: "insensitive" } },
        { key: { equals: projectIdOrName.trim(), mode: "insensitive" } },
      ];
    }

    const project = await prisma.project.findFirst({
      where,
      include: {
        customer: true,
        manager: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        milestones: {
          orderBy: { dueDate: "asc" },
        },
        tasks: {
          orderBy: { position: "asc" },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
            checklists: { orderBy: { position: "asc" } },
            comments: {
              orderBy: { createdAt: "desc" },
              include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } } },
            },
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

    const formattedMembers = project.members.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      userName: m.user ? `${m.user.firstName} ${m.user.lastName}` : "Unknown User",
      userEmail: m.user?.email || "",
      userAvatar: m.user?.avatarUrl || null,
      joinedAt: m.joinedAt.toISOString(),
    }));

    const formattedTasks = project.tasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      startDate: t.startDate?.toISOString() || null,
      dueDate: t.dueDate?.toISOString() || null,
      completedAt: t.completedAt?.toISOString() || null,
      assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : undefined,
      checklists: t.checklists.map((c) => ({
        id: c.id,
        title: c.title,
        isCompleted: c.isCompleted,
        position: c.position,
      })),
      checklistCount: t.checklists.length,
      completedChecklistCount: t.checklists.filter((c) => c.isCompleted).length,
      comments: t.comments.map((cm) => ({
        id: cm.id,
        userId: cm.userId,
        userName: cm.user ? `${cm.user.firstName} ${cm.user.lastName}` : "User",
        content: cm.content,
        createdAt: cm.createdAt.toISOString(),
      })),
      commentsCount: t.comments.length,
    }));

    return {
      ...project,
      progressPercentage: progress,
      totalTasks,
      completedTasks,
      members: formattedMembers,
      tasks: formattedTasks,
    };
  }

  // ── Project Dashboard Analytics ───────────────────────────────────────────
  public async getProjectDashboard(workspaceId: string, projectId: string): Promise<ProjectDashboardStats> {
    const project = await this.getProject(workspaceId, projectId);
    const now = new Date();
    const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const tasks = project.tasks as any[];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const inProgressTasks = tasks.filter((t) => t.status === "in_progress").length;
    const todoTasks = tasks.filter((t) => t.status === "todo" || t.status === "backlog").length;
    const reviewTasks = tasks.filter((t) => t.status === "review" || t.status === "testing").length;
    const blockedTasks = tasks.filter((t) => t.status !== "done" && t.isBlocked).length;
    const overdueTasks = tasks.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now).length;

    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Upcoming deadlines in next 14 days
    const upcomingDeadlines = tasks
      .filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= fourteenDaysLater)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        status: t.status,
        assigneeName: t.assigneeName || null,
      }));

    // Status breakdown
    const statusDistribution: Record<string, number> = {
      backlog: 0,
      todo: 0,
      in_progress: 0,
      review: 0,
      blocked: 0,
      done: 0,
    };
    for (const t of tasks) {
      const s = (t.status || "todo").toLowerCase();
      statusDistribution[s] = (statusDistribution[s] || 0) + 1;
    }

    // Priority breakdown
    const priorityDistribution: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      URGENT: 0,
    };
    for (const t of tasks) {
      const p = t.priority || "MEDIUM";
      priorityDistribution[p] = (priorityDistribution[p] || 0) + 1;
    }

    // Milestone progress
    const milestoneProgress = project.milestones.map((m) => {
      const milestoneTasks = tasks.filter((t) => t.milestoneId === m.id);
      const mTotal = milestoneTasks.length;
      const mDone = milestoneTasks.filter((t) => t.status === "done").length;
      const mProgress = mTotal > 0 ? Math.round((mDone / mTotal) * 100) : m.progress;
      return {
        id: m.id,
        title: m.title,
        dueDate: m.dueDate?.toISOString() || null,
        progress: mProgress,
        status: m.status,
        totalTasks: mTotal,
        completedTasks: mDone,
      };
    });

    // Member workload
    const memberWorkloadMap = new Map<string, { userId: string; name: string; email: string; taskCount: number; completedCount: number; overdueCount: number }>();
    for (const mem of project.members) {
      memberWorkloadMap.set(mem.userId, {
        userId: mem.userId,
        name: mem.userName || "User",
        email: mem.userEmail || "",
        taskCount: 0,
        completedCount: 0,
        overdueCount: 0,
      });
    }

    for (const t of tasks) {
      if (t.assigneeId) {
        let entry = memberWorkloadMap.get(t.assigneeId);
        if (!entry) {
          entry = {
            userId: t.assigneeId,
            name: t.assigneeName || "Assigned User",
            email: "",
            taskCount: 0,
            completedCount: 0,
            overdueCount: 0,
          };
          memberWorkloadMap.set(t.assigneeId, entry);
        }
        entry.taskCount++;
        if (t.status === "done") entry.completedCount++;
        if (t.status !== "done" && t.dueDate && new Date(t.dueDate) < now) entry.overdueCount++;
      }
    }

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      reviewTasks,
      blockedTasks,
      overdueTasks,
      completionPercentage,
      upcomingDeadlines,
      milestoneProgress,
      memberWorkload: Array.from(memberWorkloadMap.values()),
      statusDistribution,
      priorityDistribution,
    };
  }

  // ── Update Project ────────────────────────────────────────────────────────
  public async updateProject(
    workspaceId: string,
    projectId: string,
    data: {
      name?: string;
      key?: string;
      description?: string;
      status?: ProjectStatus;
      priority?: PriorityLevel;
      budget?: number;
      spent?: number;
      startDate?: Date;
      deadline?: Date;
      completedAt?: Date;
      color?: string;
      managerId?: string;
      customerId?: string;
      health?: string;
      userId?: string;
    }
  ) {
    const existing = await this.getProject(workspaceId, projectId);

    const updateData: any = {
      name: data.name?.trim(),
      key: data.key?.trim().toUpperCase(),
      description: data.description?.trim(),
      status: data.status,
      priority: data.priority,
      budget: data.budget,
      spent: data.spent,
      startDate: data.startDate,
      deadline: data.deadline,
      color: data.color,
      managerId: data.managerId,
      customerId: data.customerId,
      health: data.health,
    };

    if (data.status === "COMPLETED" && !existing.completedAt && !data.completedAt) {
      updateData.completedAt = new Date();
    } else if (data.completedAt !== undefined) {
      updateData.completedAt = data.completedAt;
    }

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: updateData,
      include: {
        customer: { select: { id: true, companyName: true } },
        manager: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    try {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: data.userId,
          action: "project:updated",
          entityType: "project",
          entityId: updated.id,
          details: { changes: Object.keys(data).filter((k) => (data as any)[k] !== undefined) },
        },
      });
    } catch {
      // Non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:updated", {
      projectId: updated.id,
      name: updated.name,
      key: updated.key,
      status: updated.status,
      priority: updated.priority,
      budget: updated.budget,
      spent: updated.spent,
      health: updated.health,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Archive Project ───────────────────────────────────────────────────────
  public async archiveProject(workspaceId: string, projectId: string, reason?: string, userId?: string) {
    const existing = await this.getProject(workspaceId, projectId);

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        isArchived: true,
        status: "CANCELLED",
      },
    });

    try {
      const validUserId = userId && /^[0-9a-fA-F]{24}$/.test(userId) ? userId : undefined;
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: validUserId,
          action: "project:archived",
          entityType: "project",
          entityId: updated.id,
          details: { reason },
        },
      });
    } catch {
      // Non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:archived", {
      projectId: updated.id,
      name: updated.name,
      reason: reason || "Archived by user",
      archivedAt: new Date().toISOString(),
    });

    return updated;
  }

  // ── Restore Project ───────────────────────────────────────────────────────
  public async restoreProject(workspaceId: string, projectId: string, userId?: string) {
    const existing = await this.getProject(workspaceId, projectId);

    const updated = await prisma.project.update({
      where: { id: existing.id },
      data: {
        isArchived: false,
        status: existing.status === "CANCELLED" ? "ACTIVE" : existing.status,
      },
    });

    try {
      const validUserId = userId && /^[0-9a-fA-F]{24}$/.test(userId) ? userId : undefined;
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: validUserId,
          action: "project:restored",
          entityType: "project",
          entityId: updated.id,
          details: {},
        },
      });
    } catch {
      // Non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:updated", {
      projectId: updated.id,
      name: updated.name,
      isArchived: false,
      restoredAt: new Date().toISOString(),
    });

    return updated;
  }

  // ── Delete Project ───────────────────────────────────────────────────────
  public async deleteProject(workspaceId: string, projectId: string, userId?: string) {
    const existing = await this.getProject(workspaceId, projectId);

    // Delete project cascade (tasks, milestones, members)
    await prisma.project.delete({
      where: { id: existing.id },
    });

    try {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId,
          action: "project:deleted",
          entityType: "project",
          entityId: existing.id,
          details: { name: existing.name },
        },
      });
    } catch {
      // Non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:deleted", {
      projectId: existing.id,
      name: existing.name,
    });

    return { message: "Project deleted successfully" };
  }

  // ── Project Members ───────────────────────────────────────────────────────
  public async getProjectMembers(workspaceId: string, projectId: string) {
    const project = await this.getProject(workspaceId, projectId);
    const members = await prisma.projectMember.findMany({
      where: { workspaceId, projectId: project.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      projectId: m.projectId,
      userId: m.userId,
      role: m.role,
      userName: m.user ? `${m.user.firstName} ${m.user.lastName}` : "Unknown User",
      userEmail: m.user?.email || "",
      userAvatar: m.user?.avatarUrl || null,
      joinedAt: m.joinedAt.toISOString(),
    }));
  }

  public async addMember(
    workspaceId: string,
    projectId: string,
    data: { userId: string; role?: string },
    actorUserId?: string
  ) {
    const project = await this.getProject(workspaceId, projectId);

    // Verify user belongs to workspace
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { workspaceId, userId: data.userId },
      include: { user: true },
    });
    if (!workspaceMember) {
      throw new NotFoundError(`User '${data.userId}' is not a member of this workspace`);
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: data.userId,
        },
      },
      create: {
        workspaceId,
        projectId: project.id,
        userId: data.userId,
        role: data.role || "MEMBER",
      },
      update: {
        role: data.role || "MEMBER",
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });

    try {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: actorUserId,
          action: "project:member_added",
          entityType: "project_member",
          entityId: member.id,
          details: { projectId: project.id, memberUserId: data.userId, role: member.role },
        },
      });
    } catch {
      // Non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:member_updated", {
      projectId: project.id,
      userId: member.userId,
      role: member.role,
    });

    return {
      id: member.id,
      workspaceId: member.workspaceId,
      projectId: member.projectId,
      userId: member.userId,
      role: member.role,
      userName: member.user ? `${member.user.firstName} ${member.user.lastName}` : "User",
      userEmail: member.user?.email || "",
      userAvatar: member.user?.avatarUrl || null,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  public async removeMember(workspaceId: string, projectId: string, userId: string, actorUserId?: string) {
    const project = await this.getProject(workspaceId, projectId);

    const existing = await prisma.projectMember.findFirst({
      where: { workspaceId, projectId: project.id, userId },
    });

    if (!existing) {
      throw new NotFoundError("Project member not found");
    }

    await prisma.projectMember.delete({
      where: { id: existing.id },
    });

    try {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: actorUserId,
          action: "project:member_removed",
          entityType: "project_member",
          entityId: existing.id,
          details: { projectId: project.id, memberUserId: userId },
        },
      });
    } catch {
      // Non-blocking
    }

    wsManager.broadcastToWorkspace(workspaceId, "project:member_updated", {
      projectId: project.id,
      userId,
      removed: true,
    });

    return { message: "Member removed from project" };
  }

  // ── Project Health Analytics ──────────────────────────────────────────────
  public async getProjectHealth(workspaceId: string, projectIdOrName: string) {
    const project = await this.getProject(workspaceId, projectIdOrName);
    const now = new Date();

    const tasks = project.tasks as any[];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const overdueTasks = tasks.filter((t) => t.status !== "done" && t.dueDate && new Date(t.dueDate) < now);
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
    if (healthScore < 40 || (project.deadline && project.deadline < now)) {
      overallHealth = "critical";
    } else if (healthScore < 75) {
      overallHealth = "at_risk";
    }

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
    const tasks = project.tasks as any[];
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
