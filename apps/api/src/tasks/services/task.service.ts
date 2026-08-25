import { PriorityLevel } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { resolveWorkspaceUser } from "../../lib/user_resolver";

export const VALID_TASK_STATUSES = ["backlog", "todo", "in_progress", "review", "testing", "done"] as const;

export const ALLOWED_TASK_TRANSITIONS: Record<string, string[]> = {
  backlog: ["todo", "in_progress"],
  todo: ["in_progress", "backlog"],
  in_progress: ["review", "testing", "done", "todo"],
  review: ["testing", "done", "in_progress"],
  testing: ["done", "in_progress", "review"],
  done: ["todo", "in_progress"], // Re-opening only
};

export class TaskService {
  // ── Create Task ───────────────────────────────────────────────────────────
  public async createTask(
    workspaceId: string,
    data: {
      title: string;
      description?: string;
      projectId?: string;
      projectName?: string;
      milestoneId?: string;
      milestoneTitle?: string;
      priority?: PriorityLevel;
      status?: string;
      assigneeId?: string;
      assigneeNameOrEmail?: string;
      reporterId?: string;
      startDate?: Date;
      dueDate?: Date;
      estimatedHours?: number;
      labels?: string[];
      dependencies?: string[];
    }
  ) {
    let resolvedProjectId = data.projectId;
    if (!resolvedProjectId && data.projectName) {
      const project = await prisma.project.findFirst({
        where: {
          workspaceId,
          name: { contains: data.projectName.trim(), mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (project) resolvedProjectId = project.id;
    }

    if (resolvedProjectId) {
      const project = await prisma.project.findFirst({
        where: { id: resolvedProjectId, workspaceId },
      });
      if (!project) {
        throw new NotFoundError(`Project '${resolvedProjectId}' not found in workspace`);
      }
      if (project.isArchived) {
        throw new ValidationError(`Cannot create task in archived project '${project.name}'`);
      }
    }

    let resolvedMilestoneId = data.milestoneId;
    if (!resolvedMilestoneId && data.milestoneTitle) {
      const milestone = await prisma.milestone.findFirst({
        where: {
          workspaceId,
          title: { contains: data.milestoneTitle.trim(), mode: "insensitive" },
        },
        orderBy: { createdAt: "desc" },
      });
      if (milestone) resolvedMilestoneId = milestone.id;
    }

    let resolvedAssigneeId = data.assigneeId;
    if (!resolvedAssigneeId && data.assigneeNameOrEmail) {
      const user = await resolveWorkspaceUser(workspaceId, data.assigneeNameOrEmail);
      if (user) resolvedAssigneeId = user.id;
    }

    // Verify dependencies if any
    const validDependencies: string[] = [];
    let isBlocked = false;
    let blockedReason: string | undefined = undefined;

    if (data.dependencies && data.dependencies.length > 0) {
      const depTasks = await prisma.task.findMany({
        where: { id: { in: data.dependencies }, workspaceId },
      });
      for (const dt of depTasks) {
        validDependencies.push(dt.id);
        if (dt.status !== "done") {
          isBlocked = true;
          blockedReason = `Blocked by unfinished task: ${dt.title}`;
        }
      }
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        description: data.description?.trim(),
        projectId: resolvedProjectId,
        milestoneId: resolvedMilestoneId,
        priority: data.priority || "MEDIUM",
        status: (data.status || "todo").toLowerCase(),
        assigneeId: resolvedAssigneeId,
        reporterId: data.reporterId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        labels: data.labels || [],
        dependencies: validDependencies,
        isBlocked,
        blockedReason,
      },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "task:created", {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectName: task.project?.name || null,
      assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
      createdAt: task.createdAt.toISOString(),
    });

    return task;
  }

  // ── Find Tasks ────────────────────────────────────────────────────────────
  public async findTasks(
    workspaceId: string,
    filter: {
      query?: string;
      projectId?: string;
      milestoneId?: string;
      assigneeId?: string;
      status?: string;
      priority?: PriorityLevel;
      isBlocked?: boolean;
      isOverdue?: boolean;
      isArchived?: boolean;
      limit?: number;
    }
  ) {
    const where: any = { workspaceId };
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.milestoneId) where.milestoneId = filter.milestoneId;
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.status) where.status = filter.status.toLowerCase();
    if (filter.priority) where.priority = filter.priority;
    if (filter.isBlocked !== undefined) where.isBlocked = filter.isBlocked;
    if (filter.isArchived !== undefined) where.isArchived = filter.isArchived;

    if (filter.isOverdue) {
      where.status = { not: "done" };
      where.dueDate = { lt: new Date() };
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      take: filter.limit || 50,
      orderBy: { createdAt: "desc" },
      include: {
        project: { select: { id: true, name: true } },
        milestone: { select: { id: true, title: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        checklists: true,
        _count: { select: { comments: true } },
      },
    });

    return tasks.map((t) => {
      const checklistCount = t.checklists.length;
      const completedChecklistCount = t.checklists.filter((c) => c.isCompleted).length;

      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        position: t.position,
        projectId: t.projectId,
        projectName: t.project?.name || null,
        milestoneId: t.milestoneId,
        milestoneTitle: t.milestone?.title || null,
        assigneeId: t.assigneeId,
        assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null,
        dueDate: t.dueDate?.toISOString() || null,
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        isBlocked: t.isBlocked,
        blockedReason: t.blockedReason,
        dependenciesCount: t.dependencies.length,
        checklistCount,
        completedChecklistCount,
        commentsCount: t._count.comments,
        createdAt: t.createdAt.toISOString(),
      };
    });
  }

  // ── Get Task ──────────────────────────────────────────────────────────────
  public async getTask(workspaceId: string, taskIdOrTitle: string) {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(taskIdOrTitle);
    const where: any = { workspaceId };

    if (isObjectId) {
      where.id = taskIdOrTitle;
    } else {
      where.title = { contains: taskIdOrTitle.trim(), mode: "insensitive" };
    }

    const task = await prisma.task.findFirst({
      where,
      include: {
        project: { select: { id: true, name: true, status: true } },
        milestone: { select: { id: true, title: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        checklists: { orderBy: { position: "asc" } },
        comments: {
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError(`Task '${taskIdOrTitle}' not found in workspace`);
    }

    // Resolve dependencies details
    let resolvedDependencies: Array<{ id: string; title: string; status: string; assigneeName?: string }> = [];
    if (task.dependencies && task.dependencies.length > 0) {
      const deps = await prisma.task.findMany({
        where: { id: { in: task.dependencies }, workspaceId },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
        },
      });
      resolvedDependencies = deps.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        assigneeName: d.assignee ? `${d.assignee.firstName} ${d.assignee.lastName}` : "Unassigned",
      }));
    }

    return {
      ...task,
      resolvedDependencies,
    };
  }

  // ── Update Task ───────────────────────────────────────────────────────────
  public async updateTask(
    workspaceId: string,
    taskId: string,
    data: {
      title?: string;
      description?: string;
      priority?: PriorityLevel;
      projectId?: string;
      milestoneId?: string;
      startDate?: Date;
      dueDate?: Date;
      estimatedHours?: number;
      actualHours?: number;
      labels?: string[];
    }
  ) {
    const existing = await this.getTask(workspaceId, taskId);

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: {
        title: data.title?.trim(),
        description: data.description?.trim(),
        priority: data.priority,
        projectId: data.projectId,
        milestoneId: data.milestoneId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        actualHours: data.actualHours,
        labels: data.labels,
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "task:updated", {
      taskId: updated.id,
      title: updated.title,
      priority: updated.priority,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Assign Task ───────────────────────────────────────────────────────────
  public async assignTask(
    workspaceId: string,
    taskId: string,
    assigneeIdOrName?: string
  ) {
    const existing = await this.getTask(workspaceId, taskId);

    let resolvedAssigneeId: string | null = null;
    if (assigneeIdOrName) {
      const user = await resolveWorkspaceUser(workspaceId, assigneeIdOrName);
      if (user) resolvedAssigneeId = user.id;
    }

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: { assigneeId: resolvedAssigneeId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "task:assigned", {
      taskId: updated.id,
      title: updated.title,
      assignee: updated.assignee ? `${updated.assignee.firstName} ${updated.assignee.lastName}` : "Unassigned",
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Move Task Stage ───────────────────────────────────────────────────────
  public async moveTask(
    workspaceId: string,
    taskId: string,
    targetStatus: string,
    reason?: string
  ) {
    const task = await this.getTask(workspaceId, taskId);
    const currentStatus = task.status.toLowerCase();
    const target = targetStatus.toLowerCase();

    if (!VALID_TASK_STATUSES.includes(target as any)) {
      throw new ValidationError(`Invalid task status '${targetStatus}'`);
    }

    if (currentStatus === target) {
      return task;
    }

    // Check allowed workflow transitions
    const allowed = ALLOWED_TASK_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(target)) {
      throw new ValidationError(
        `Invalid workflow transition: Cannot move task directly from '${currentStatus}' to '${target}'. Allowed transitions: [${allowed.join(
          ", "
        )}]`
      );
    }

    // If moving to in_progress or done, check if blocked by dependencies
    if ((target === "in_progress" || target === "done") && task.isBlocked) {
      throw new ValidationError(
        `Cannot move task to '${target}': Task is currently blocked by unresolved dependencies: ${task.blockedReason}`
      );
    }

    const completedAt = target === "done" ? new Date() : currentStatus === "done" ? null : task.completedAt;

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: target,
        completedAt,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // If task was completed, check if any dependent tasks in the workspace can now be unblocked
    if (target === "done") {
      await this.recheckDependentTasks(workspaceId, task.id);
    }

    wsManager.broadcastToWorkspace(workspaceId, "task:moved", {
      taskId: updated.id,
      title: updated.title,
      previousStatus: currentStatus,
      newStatus: target,
      completedAt: updated.completedAt?.toISOString() || null,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return updated;
  }

  // ── Task Checklists ───────────────────────────────────────────────────────
  public async addChecklist(workspaceId: string, taskId: string, items: string[]) {
    const task = await this.getTask(workspaceId, taskId);

    const existingCount = task.checklists.length;
    const createdItems = await Promise.all(
      items.map((itemTitle, idx) =>
        prisma.taskChecklist.create({
          data: {
            taskId: task.id,
            title: itemTitle.trim(),
            position: existingCount + idx,
            isCompleted: false,
          },
        })
      )
    );

    wsManager.broadcastToWorkspace(workspaceId, "task:checklist_created", {
      taskId: task.id,
      itemCount: createdItems.length,
      items: createdItems.map((i) => i.title),
    });

    return createdItems;
  }

  public async updateChecklistItem(workspaceId: string, taskId: string, checklistId: string, isCompleted: boolean, title?: string) {
    const task = await this.getTask(workspaceId, taskId);

    const item = await prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId: task.id },
    });
    if (!item) {
      throw new NotFoundError(`Checklist item '${checklistId}' not found on task`);
    }

    const updated = await prisma.taskChecklist.update({
      where: { id: item.id },
      data: {
        isCompleted,
        title: title ? title.trim() : undefined,
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "task:checklist_updated", {
      taskId: task.id,
      checklistId: updated.id,
      title: updated.title,
      isCompleted: updated.isCompleted,
    });

    return updated;
  }

  // ── Task Dependencies & Cycle Prevention ──────────────────────────────────
  public async addDependency(workspaceId: string, taskId: string, dependsOnTaskId: string) {
    const task = await this.getTask(workspaceId, taskId);
    const depTask = await this.getTask(workspaceId, dependsOnTaskId);

    // Rule 1: Self-dependency rejection
    if (task.id === depTask.id) {
      throw new ValidationError("A task cannot depend on itself");
    }

    // Rule 2: Already a dependency check
    if (task.dependencies.includes(depTask.id)) {
      return task;
    }

    // Rule 3: Circular dependency prevention (Cycle detection using DFS)
    const hasCycle = await this.detectCycle(workspaceId, depTask.id, task.id);
    if (hasCycle) {
      throw new ValidationError(
        `Circular dependency detected: Adding dependency from '${task.title}' to '${depTask.title}' creates a dependency loop.`
      );
    }

    const newDependencies = [...task.dependencies, depTask.id];
    const isBlocked = depTask.status !== "done";
    const blockedReason = isBlocked ? `Blocked by unfinished task: ${depTask.title}` : task.blockedReason;

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        dependencies: newDependencies,
        isBlocked: isBlocked || task.isBlocked,
        blockedReason: isBlocked ? blockedReason : task.blockedReason,
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "task:dependency_added", {
      taskId: updated.id,
      taskTitle: updated.title,
      dependsOnTaskId: depTask.id,
      dependsOnTaskTitle: depTask.title,
      isBlocked: updated.isBlocked,
    });

    return updated;
  }

  public async removeDependency(workspaceId: string, taskId: string, dependsOnTaskId: string) {
    const task = await this.getTask(workspaceId, taskId);

    const newDependencies = task.dependencies.filter((id) => id !== dependsOnTaskId);

    // Recompute blocker state
    let isBlocked = false;
    let blockedReason: string | null = null;

    if (newDependencies.length > 0) {
      const remainingDeps = await prisma.task.findMany({
        where: { id: { in: newDependencies }, workspaceId },
      });
      const unfinished = remainingDeps.find((d) => d.status !== "done");
      if (unfinished) {
        isBlocked = true;
        blockedReason = `Blocked by unfinished task: ${unfinished.title}`;
      }
    }

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        dependencies: newDependencies,
        isBlocked,
        blockedReason,
      },
    });

    wsManager.broadcastToWorkspace(workspaceId, "task:dependency_removed", {
      taskId: updated.id,
      removedDependencyId: dependsOnTaskId,
      isBlocked: updated.isBlocked,
    });

    return updated;
  }

  private async detectCycle(workspaceId: string, startTaskId: string, targetTaskId: string, visited: Set<string> = new Set()): Promise<boolean> {
    if (startTaskId === targetTaskId) return true;
    if (visited.has(startTaskId)) return false;
    visited.add(startTaskId);

    const task = await prisma.task.findUnique({
      where: { id: startTaskId },
      select: { dependencies: true },
    });

    if (!task || !task.dependencies || task.dependencies.length === 0) {
      return false;
    }

    for (const depId of task.dependencies) {
      if (await this.detectCycle(workspaceId, depId, targetTaskId, visited)) {
        return true;
      }
    }

    return false;
  }

  private async recheckDependentTasks(workspaceId: string, completedTaskId: string) {
    const dependentTasks = await prisma.task.findMany({
      where: {
        workspaceId,
        dependencies: { has: completedTaskId },
        isBlocked: true,
      },
    });

    for (const dep of dependentTasks) {
      const allDeps = await prisma.task.findMany({
        where: { id: { in: dep.dependencies }, workspaceId },
      });
      const unfinished = allDeps.find((d) => d.status !== "done");
      if (!unfinished) {
        await prisma.task.update({
          where: { id: dep.id },
          data: {
            isBlocked: false,
            blockedReason: null,
          },
        });
      }
    }
  }

  // ── Blocked Tasks ─────────────────────────────────────────────────────────
  public async getBlockedTasks(workspaceId: string, projectId?: string) {
    const where: any = {
      workspaceId,
      isBlocked: true,
    };
    if (projectId) where.projectId = projectId;

    const blockedTasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { firstName: true, lastName: true } },
      },
    });

    const results = await Promise.all(
      blockedTasks.map(async (t) => {
        let unresolved: Array<{ id: string; title: string; status: string; assigneeName?: string }> = [];
        if (t.dependencies.length > 0) {
          const deps = await prisma.task.findMany({
            where: { id: { in: t.dependencies }, status: { not: "done" } },
            include: { assignee: { select: { firstName: true, lastName: true } } },
          });
          unresolved = deps.map((d) => ({
            id: d.id,
            title: d.title,
            status: d.status,
            assigneeName: d.assignee ? `${d.assignee.firstName} ${d.assignee.lastName}` : "Unassigned",
          }));
        }

        return {
          id: t.id,
          title: t.title,
          status: t.status,
          projectName: t.project?.name || null,
          assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned",
          blockedReason: t.blockedReason,
          unresolvedDependencies: unresolved,
        };
      })
    );

    return {
      count: results.length,
      blockedTasks: results,
    };
  }

  // ── Task Comments ─────────────────────────────────────────────────────────
  public async addComment(workspaceId: string, taskId: string, userId: string, content: string) {
    const task = await this.getTask(workspaceId, taskId);

    // Fetch or fallback author
    const authorUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const comment = await prisma.taskComment.create({
      data: {
        taskId: task.id,
        userId,
        content: content.trim(),
      },
    });

    const authorName = authorUser ? `${authorUser.firstName} ${authorUser.lastName}` : "System User";

    wsManager.broadcastToWorkspace(workspaceId, "task:commented", {
      taskId: task.id,
      commentId: comment.id,
      user: authorName,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    });

    return {
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      user: authorUser || { id: userId, firstName: "System", lastName: "User", email: "system@omnidesk.ai" },
    };
  }

  // ── Team Workload Analytics ───────────────────────────────────────────────
  public async getTeamWorkload(workspaceId: string) {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    const now = new Date();

    const memberWorkloads = await Promise.all(
      members.map(async (m) => {
        const userTasks = await prisma.task.findMany({
          where: { workspaceId, assigneeId: m.user.id },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            estimatedHours: true,
          },
        });

        const totalTasks = userTasks.length;
        const inProgressTasks = userTasks.filter((t) => t.status === "in_progress").length;
        const todoTasks = userTasks.filter((t) => t.status === "todo" || t.status === "backlog").length;
        const reviewTasks = userTasks.filter((t) => t.status === "review" || t.status === "testing").length;
        const completedTasks = userTasks.filter((t) => t.status === "done").length;
        const overdueTasks = userTasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now).length;
        const estimatedHoursTotal = userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);

        return {
          userId: m.user.id,
          name: `${m.user.firstName} ${m.user.lastName}`,
          email: m.user.email,
          role: m.role,
          totalTasks,
          inProgressTasks,
          todoTasks,
          reviewTasks,
          completedTasks,
          overdueTasks,
          estimatedHoursTotal,
          tasks: userTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString() || undefined,
            isOverdue: Boolean(t.status !== "done" && t.dueDate && t.dueDate < now),
          })),
        };
      })
    );

    const totalActive = memberWorkloads.reduce((sum, m) => sum + (m.totalTasks - m.completedTasks), 0);
    const totalOverdue = memberWorkloads.reduce((sum, m) => sum + m.overdueTasks, 0);

    return {
      workspaceId,
      totalActiveTasks: totalActive,
      totalOverdueTasks: totalOverdue,
      members: memberWorkloads,
    };
  }
}

export const taskService = new TaskService();
