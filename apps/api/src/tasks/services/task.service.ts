import { PriorityLevel } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors";
import { resolveWorkspaceUser } from "../../lib/user_resolver";

function toValidObjectId(id?: string | null): string | undefined {
  return id && /^[0-9a-fA-F]{24}$/.test(id) ? id : undefined;
}

export const VALID_TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "review",
  "blocked",
  "testing",
  "done",
] as const;

export const ALLOWED_TASK_TRANSITIONS: Record<string, string[]> = {
  backlog: ["todo", "in_progress", "blocked"],
  todo: ["in_progress", "backlog", "blocked", "review", "in_review"],
  in_progress: ["review", "in_review", "testing", "done", "todo", "blocked", "backlog"],
  review: ["testing", "done", "in_progress", "todo", "blocked"],
  in_review: ["testing", "done", "in_progress", "todo", "blocked"],
  testing: ["done", "in_progress", "review", "in_review", "blocked"],
  blocked: ["backlog", "todo", "in_progress", "review", "in_review", "done"],
  done: ["todo", "in_progress", "backlog"], // Re-opening only
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
      parentTaskId?: string;
      position?: number;
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
      for (const depId of data.dependencies) {
        const dt = await prisma.task.findFirst({
          where: { id: depId, workspaceId },
        });
        if (!dt) {
          throw new NotFoundError(`Dependency task '${depId}' not found in workspace`);
        }
        validDependencies.push(dt.id);
        if (dt.status !== "done") {
          isBlocked = true;
          blockedReason = `Blocked by unfinished task: ${dt.title}`;
        }
      }
    }

    const taskStatus = (data.status || "todo").toLowerCase();

    // Determine position
    let position = data.position;
    if (position === undefined || position === null) {
      const maxTask = await prisma.task.findFirst({
        where: {
          workspaceId,
          projectId: resolvedProjectId || undefined,
          status: taskStatus,
        },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      position = (maxTask?.position ?? 0) + 1;
    }

    const task = await prisma.task.create({
      data: {
        workspaceId,
        title: data.title.trim(),
        description: data.description?.trim(),
        projectId: resolvedProjectId,
        milestoneId: resolvedMilestoneId,
        parentTaskId: data.parentTaskId,
        priority: data.priority || "MEDIUM",
        status: taskStatus,
        position,
        assigneeId: resolvedAssigneeId,
        reporterId: data.reporterId,
        startDate: data.startDate,
        dueDate: data.dueDate,
        estimatedHours: data.estimatedHours,
        labels: data.labels || [],
        dependencies: validDependencies,
        isBlocked: taskStatus === "blocked" ? true : isBlocked,
        blockedReason: taskStatus === "blocked" ? (blockedReason || "Manually marked as blocked") : blockedReason,
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
        milestone: { select: { id: true, title: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Create records in TaskDependency collection
    if (validDependencies.length > 0) {
      for (const depId of validDependencies) {
        await prisma.taskDependency.upsert({
          where: {
            taskId_dependsOnTaskId: {
              taskId: task.id,
              dependsOnTaskId: depId,
            },
          },
          update: {},
          create: {
            workspaceId,
            taskId: task.id,
            dependsOnTaskId: depId,
            type: "BLOCKS",
          },
        }).catch(() => {});
      }
    }

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(data.reporterId),
        action: "task:created",
        entityType: "task",
        entityId: task.id,
        details: {
          title: task.title,
          status: task.status,
          priority: task.priority,
          projectId: task.projectId,
        },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      projectId: task.projectId,
      projectName: task.project?.name || null,
      assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
      createdAt: task.createdAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:created", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.created", eventPayload);

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
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const where: any = { workspaceId };
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.milestoneId) where.milestoneId = filter.milestoneId;
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.status) where.status = filter.status.toLowerCase();
    if (filter.priority) where.priority = filter.priority;
    if (filter.isBlocked !== undefined) where.isBlocked = filter.isBlocked;
    if (filter.isArchived !== undefined) {
      where.isArchived = filter.isArchived;
    }

    if (filter.isOverdue) {
      where.status = { not: "done" };
      where.dueDate = { lt: new Date() };
    }

    if (filter.query && filter.query.trim()) {
      const q = filter.query.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { labels: { has: q } },
      ];
    }

    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(200, Math.max(1, filter.limit || 50));
    const skip = (page - 1) * limit;

    const [total, tasks] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: filter.sortBy === "position"
          ? { position: filter.sortOrder || "asc" }
          : filter.sortBy === "dueDate"
          ? { dueDate: filter.sortOrder || "asc" }
          : { createdAt: "desc" },
        include: {
          project: { select: { id: true, name: true, key: true } },
          milestone: { select: { id: true, title: true } },
          assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          checklists: { orderBy: { position: "asc" } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const formattedTasks = tasks.map((t) => {
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
        projectKey: t.project?.key || null,
        milestoneId: t.milestoneId,
        milestoneTitle: t.milestone?.title || null,
        parentTaskId: t.parentTaskId,
        assigneeId: t.assigneeId,
        assigneeName: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : null,
        assigneeEmail: t.assignee?.email || null,
        dueDate: t.dueDate?.toISOString() || null,
        startDate: t.startDate?.toISOString() || null,
        estimatedHours: t.estimatedHours,
        actualHours: t.actualHours,
        labels: t.labels,
        isBlocked: t.isBlocked,
        blockedReason: t.blockedReason,
        dependenciesCount: t.dependencies.length,
        checklistCount,
        completedChecklistCount,
        commentsCount: t._count.comments,
        isArchived: t.isArchived,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });

    // Provide both array and meta for broad consumer compatibility
    const responseData = formattedTasks as any;
    responseData.meta = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };

    return responseData;
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
        project: { select: { id: true, name: true, key: true, status: true } },
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
        taskDependencies: {
          include: {
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                assignee: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
        dependents: {
          include: {
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                priority: true,
                assignee: { select: { id: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundError(`Task '${taskIdOrTitle}' not found in workspace`);
    }

    // Resolve dependencies details from both taskDependencies relation and dependencies array
    const depIds = new Set<string>([
      ...task.dependencies,
      ...task.taskDependencies.map((td) => td.dependsOnTaskId),
    ]);

    let resolvedDependencies: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
      assigneeName?: string;
      isCompleted: boolean;
    }> = [];

    if (depIds.size > 0) {
      const deps = await prisma.task.findMany({
        where: { id: { in: Array.from(depIds) }, workspaceId },
        include: {
          assignee: { select: { firstName: true, lastName: true } },
        },
      });
      resolvedDependencies = deps.map((d) => ({
        id: d.id,
        title: d.title,
        status: d.status,
        priority: d.priority,
        assigneeName: d.assignee ? `${d.assignee.firstName} ${d.assignee.lastName}` : "Unassigned",
        isCompleted: d.status === "done",
      }));
    }

    return {
      ...task,
      resolvedDependencies,
      blockingCount: resolvedDependencies.filter((d) => !d.isCompleted).length,
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
      status?: string;
      projectId?: string;
      milestoneId?: string;
      parentTaskId?: string;
      startDate?: Date;
      dueDate?: Date;
      estimatedHours?: number;
      actualHours?: number;
      labels?: string[];
      position?: number;
    },
    userId?: string
  ) {
    const existing = await this.getTask(workspaceId, taskId);

    const updatePayload: any = {};
    if (data.title !== undefined) updatePayload.title = data.title.trim();
    if (data.description !== undefined) updatePayload.description = data.description?.trim();
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.projectId !== undefined) updatePayload.projectId = data.projectId;
    if (data.milestoneId !== undefined) updatePayload.milestoneId = data.milestoneId;
    if (data.parentTaskId !== undefined) updatePayload.parentTaskId = data.parentTaskId;
    if (data.startDate !== undefined) updatePayload.startDate = data.startDate;
    if (data.dueDate !== undefined) updatePayload.dueDate = data.dueDate;
    if (data.estimatedHours !== undefined) updatePayload.estimatedHours = data.estimatedHours;
    if (data.actualHours !== undefined) updatePayload.actualHours = data.actualHours;
    if (data.labels !== undefined) updatePayload.labels = data.labels;
    if (data.position !== undefined) updatePayload.position = data.position;

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: updatePayload,
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:updated",
        entityType: "task",
        entityId: updated.id,
        details: { fields: Object.keys(updatePayload) },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: updated.id,
      title: updated.title,
      priority: updated.priority,
      status: updated.status,
      projectId: updated.projectId,
      updatedAt: updated.updatedAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:updated", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.updated", eventPayload);

    return updated;
  }

  // ── Assign Task ───────────────────────────────────────────────────────────
  public async assignTask(
    workspaceId: string,
    taskId: string,
    assigneeIdOrName?: string,
    userId?: string
  ) {
    const existing = await this.getTask(workspaceId, taskId);

    let resolvedAssigneeId: string | null = null;
    if (assigneeIdOrName) {
      if (/^[0-9a-fA-F]{24}$/.test(assigneeIdOrName.trim())) {
        resolvedAssigneeId = assigneeIdOrName.trim();
      } else {
        const user = await resolveWorkspaceUser(workspaceId, assigneeIdOrName);
        if (user) resolvedAssigneeId = user.id;
      }
    }

    const updated = await prisma.task.update({
      where: { id: existing.id },
      data: { assigneeId: resolvedAssigneeId },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:assigned",
        entityType: "task",
        entityId: updated.id,
        details: { assigneeId: resolvedAssigneeId },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: updated.id,
      title: updated.title,
      assigneeId: updated.assigneeId,
      assignee: updated.assignee ? `${updated.assignee.firstName} ${updated.assignee.lastName}` : "Unassigned",
      updatedAt: updated.updatedAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:assigned", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.assigned", eventPayload);

    return updated;
  }

  // ── Move Task Stage ───────────────────────────────────────────────────────
  public async moveTask(
    workspaceId: string,
    taskId: string,
    targetStatus: string,
    reason?: string,
    userId?: string
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
    const isNowBlocked = target === "blocked" ? true : target === "done" ? false : task.isBlocked;
    const blockedReason = target === "blocked" ? (reason || task.blockedReason || "Manually moved to blocked") : (target === "done" ? null : task.blockedReason);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: target,
        completedAt,
        isBlocked: isNowBlocked,
        blockedReason,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    // If task was completed, check if any dependent tasks in the workspace can now be unblocked
    if (target === "done") {
      await this.recheckDependentTasks(workspaceId, task.id);
    }

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:status_changed",
        entityType: "task",
        entityId: updated.id,
        details: { from: currentStatus, to: target, reason },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: updated.id,
      title: updated.title,
      previousStatus: currentStatus,
      newStatus: target,
      status: target,
      isBlocked: updated.isBlocked,
      completedAt: updated.completedAt?.toISOString() || null,
      updatedAt: updated.updatedAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:moved", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.status.changed", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.updated", eventPayload);

    return updated;
  }

  // ── Reorder Task (Kanban & List persistent ordering) ──────────────────────
  public async reorderTask(
    workspaceId: string,
    taskId: string,
    targetStatus?: string,
    position: number = 0,
    userId?: string
  ) {
    const task = await this.getTask(workspaceId, taskId);
    const currentStatus = task.status.toLowerCase();
    const destinationStatus = (targetStatus || currentStatus).toLowerCase();

    // If changing status as part of reorder
    if (destinationStatus !== currentStatus) {
      if (!VALID_TASK_STATUSES.includes(destinationStatus as any)) {
        throw new ValidationError(`Invalid task status '${destinationStatus}'`);
      }

      if ((destinationStatus === "in_progress" || destinationStatus === "done") && task.isBlocked) {
        throw new ValidationError(
          `Cannot move task to '${destinationStatus}': Task is blocked by unresolved dependencies: ${task.blockedReason}`
        );
      }
    }

    const targetPos = Math.max(0, Math.round(position));

    // Fetch sibling tasks in the destination column
    const siblings = await prisma.task.findMany({
      where: {
        workspaceId,
        projectId: task.projectId || undefined,
        status: destinationStatus,
        id: { not: task.id },
      },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });

    // Splice task at requested target position
    const orderedIds = siblings.map((s) => s.id);
    const safeIndex = Math.min(targetPos, orderedIds.length);
    orderedIds.splice(safeIndex, 0, task.id);

    // Update positions in batch
    await Promise.all(
      orderedIds.map((id, idx) =>
        prisma.task.update({
          where: { id },
          data: {
            position: idx,
            status: id === task.id ? destinationStatus : undefined,
            completedAt: id === task.id && destinationStatus === "done" ? new Date() : undefined,
          },
        })
      )
    );

    const completedAt = destinationStatus === "done" ? new Date() : destinationStatus === currentStatus ? task.completedAt : null;
    if (destinationStatus === "done" && currentStatus !== "done") {
      await this.recheckDependentTasks(workspaceId, task.id);
    }

    const updated = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:reordered",
        entityType: "task",
        entityId: updated.id,
        details: { status: destinationStatus, position: safeIndex },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: updated.id,
      title: updated.title,
      status: updated.status,
      position: updated.position,
      projectId: updated.projectId,
      updatedAt: updated.updatedAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:reordered", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.reordered", eventPayload);

    return updated;
  }

  // ── Archive & Restore Task ────────────────────────────────────────────────
  public async archiveTask(workspaceId: string, taskId: string, userId?: string) {
    const task = await this.getTask(workspaceId, taskId);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { isArchived: true },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:archived",
        entityType: "task",
        entityId: updated.id,
        details: { title: updated.title },
      },
    }).catch(() => {});

    const eventPayload = { taskId: updated.id, isArchived: true };
    wsManager.broadcastToWorkspace(workspaceId, "task:archived", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.archived", eventPayload);

    return updated;
  }

  public async restoreTask(workspaceId: string, taskId: string, userId?: string) {
    const task = await this.getTask(workspaceId, taskId);

    const updated = await prisma.task.update({
      where: { id: task.id },
      data: { isArchived: false },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:restored",
        entityType: "task",
        entityId: updated.id,
        details: { title: updated.title },
      },
    }).catch(() => {});

    const eventPayload = { taskId: updated.id, isArchived: false };
    wsManager.broadcastToWorkspace(workspaceId, "task:restored", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.updated", eventPayload);

    return updated;
  }

  // ── Delete Task ───────────────────────────────────────────────────────────
  public async deleteTask(workspaceId: string, taskId: string, userId?: string) {
    const task = await this.getTask(workspaceId, taskId);

    // Delete dependent records
    await Promise.all([
      prisma.taskChecklist.deleteMany({ where: { taskId: task.id } }),
      prisma.taskComment.deleteMany({ where: { taskId: task.id } }),
      prisma.taskDependency.deleteMany({
        where: {
          OR: [{ taskId: task.id }, { dependsOnTaskId: task.id }],
        },
      }),
    ]);

    await prisma.task.delete({
      where: { id: task.id },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:deleted",
        entityType: "task",
        entityId: task.id,
        details: { title: task.title },
      },
    }).catch(() => {});

    wsManager.broadcastToWorkspace(workspaceId, "task.deleted", { taskId: task.id });

    return { success: true, message: `Task '${task.title}' deleted` };
  }

  // ── Task Checklists ───────────────────────────────────────────────────────
  public async addChecklist(
    workspaceId: string,
    taskId: string,
    data: { items?: string[]; title?: string } | string[],
    userId?: string
  ) {
    const task = await this.getTask(workspaceId, taskId);

    const itemsToCreate = Array.isArray(data)
      ? data
      : data.items && data.items.length > 0
      ? data.items
      : data.title
      ? [data.title]
      : [];

    if (itemsToCreate.length === 0) {
      throw new ValidationError("At least one checklist item title is required");
    }

    const existingCount = task.checklists.length;
    const createdItems = await Promise.all(
      itemsToCreate.map((itemTitle, idx) =>
        prisma.taskChecklist.create({
          data: {
            workspaceId,
            taskId: task.id,
            title: itemTitle.trim(),
            position: existingCount + idx,
            isCompleted: false,
          },
        })
      )
    );

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:checklist_created",
        entityType: "task",
        entityId: task.id,
        details: { count: createdItems.length },
      },
    }).catch(() => {});

    const eventPayload = {
      taskId: task.id,
      itemCount: createdItems.length,
      items: createdItems.map((i) => ({ id: i.id, title: i.title })),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:checklist_created", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.checklist.updated", eventPayload);

    return createdItems;
  }

  public async updateChecklistItem(
    workspaceId: string,
    taskId: string,
    checklistId: string,
    isCompleted?: boolean,
    title?: string,
    position?: number,
    userId?: string
  ) {
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
        isCompleted: isCompleted !== undefined ? isCompleted : item.isCompleted,
        title: title ? title.trim() : undefined,
        position: position !== undefined ? position : undefined,
      },
    });

    const eventPayload = {
      taskId: task.id,
      checklistId: updated.id,
      title: updated.title,
      isCompleted: updated.isCompleted,
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:checklist_updated", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.checklist.updated", eventPayload);

    return updated;
  }

  public async deleteChecklistItem(
    workspaceId: string,
    taskId: string,
    checklistId: string,
    userId?: string
  ) {
    const task = await this.getTask(workspaceId, taskId);

    const item = await prisma.taskChecklist.findFirst({
      where: { id: checklistId, taskId: task.id },
    });
    if (!item) {
      throw new NotFoundError(`Checklist item '${checklistId}' not found on task`);
    }

    await prisma.taskChecklist.delete({
      where: { id: item.id },
    });

    const eventPayload = {
      taskId: task.id,
      checklistId: item.id,
      deleted: true,
    };
    wsManager.broadcastToWorkspace(workspaceId, "task.checklist.updated", eventPayload);

    return { success: true, message: "Checklist item deleted" };
  }

  // ── Task Dependencies & Cycle Prevention ──────────────────────────────────
  public async addDependency(
    workspaceId: string,
    taskId: string,
    dependsOnTaskId: string,
    userId?: string
  ) {
    const task = await this.getTask(workspaceId, taskId);
    const depTask = await this.getTask(workspaceId, dependsOnTaskId);

    // Rule 1: Self-dependency rejection
    if (task.id === depTask.id) {
      throw new ValidationError("A task cannot depend on itself");
    }

    // Rule 2: Workspace tenant boundary check
    if (task.workspaceId !== workspaceId || depTask.workspaceId !== workspaceId) {
      throw new ForbiddenError("Tasks belong to different workspaces");
    }

    // Rule 3: Already a dependency check
    const existingRelation = await prisma.taskDependency.findFirst({
      where: {
        taskId: task.id,
        dependsOnTaskId: depTask.id,
      },
    });
    if (existingRelation || task.dependencies.includes(depTask.id)) {
      throw new ValidationError(`Task '${task.title}' already depends on '${depTask.title}'`);
    }

    // Rule 4: Circular dependency prevention (Cycle detection using DFS)
    const hasCycle = await this.detectCycle(workspaceId, depTask.id, task.id);
    if (hasCycle) {
      throw new ValidationError(
        `Circular dependency detected: Adding dependency from '${task.title}' to '${depTask.title}' creates a dependency loop.`
      );
    }

    // Create in TaskDependency collection
    await prisma.taskDependency.create({
      data: {
        workspaceId,
        taskId: task.id,
        dependsOnTaskId: depTask.id,
        type: "BLOCKS",
      },
    });

    const newDependencies = Array.from(new Set([...task.dependencies, depTask.id]));
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

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:dependency_added",
        entityType: "task",
        entityId: updated.id,
        details: { dependsOnTaskId: depTask.id },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: updated.id,
      taskTitle: updated.title,
      dependsOnTaskId: depTask.id,
      dependsOnTaskTitle: depTask.title,
      isBlocked: updated.isBlocked,
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:dependency_added", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.dependency.updated", eventPayload);

    return updated;
  }

  public async removeDependency(
    workspaceId: string,
    taskId: string,
    dependencyIdOrTargetId: string,
    userId?: string
  ) {
    const task = await this.getTask(workspaceId, taskId);

    // Check if dependencyIdOrTargetId matches a TaskDependency ID or a Task ID
    const relation = await prisma.taskDependency.findFirst({
      where: {
        taskId: task.id,
        OR: [
          { id: dependencyIdOrTargetId },
          { dependsOnTaskId: dependencyIdOrTargetId },
        ],
      },
    });

    if (relation) {
      await prisma.taskDependency.delete({ where: { id: relation.id } });
    }

    const targetTaskId = relation ? relation.dependsOnTaskId : dependencyIdOrTargetId;
    const newDependencies = task.dependencies.filter((id) => id !== targetTaskId);

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

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:dependency_removed",
        entityType: "task",
        entityId: updated.id,
        details: { removedTaskId: targetTaskId },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: updated.id,
      removedDependencyId: targetTaskId,
      isBlocked: updated.isBlocked,
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:dependency_removed", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.dependency.updated", eventPayload);

    return updated;
  }

  private async detectCycle(
    workspaceId: string,
    startTaskId: string,
    targetTaskId: string,
    visited: Set<string> = new Set()
  ): Promise<boolean> {
    if (startTaskId === targetTaskId) return true;
    if (visited.has(startTaskId)) return false;
    visited.add(startTaskId);

    // Check relations from TaskDependency table and task.dependencies array
    const [task, relations] = await Promise.all([
      prisma.task.findUnique({
        where: { id: startTaskId },
        select: { dependencies: true },
      }),
      prisma.taskDependency.findMany({
        where: { taskId: startTaskId, workspaceId },
        select: { dependsOnTaskId: true },
      }),
    ]);

    const depIds = new Set<string>([
      ...(task?.dependencies || []),
      ...relations.map((r) => r.dependsOnTaskId),
    ]);

    for (const depId of depIds) {
      if (await this.detectCycle(workspaceId, depId, targetTaskId, visited)) {
        return true;
      }
    }

    return false;
  }

  private async recheckDependentTasks(workspaceId: string, completedTaskId: string) {
    // Find tasks that depend on completedTaskId
    const [arrayDeps, relationDeps] = await Promise.all([
      prisma.task.findMany({
        where: {
          workspaceId,
          dependencies: { has: completedTaskId },
          isBlocked: true,
        },
      }),
      prisma.taskDependency.findMany({
        where: {
          workspaceId,
          dependsOnTaskId: completedTaskId,
        },
        select: { taskId: true },
      }),
    ]);

    const targetTaskIds = Array.from(
      new Set([...arrayDeps.map((t) => t.id), ...relationDeps.map((r) => r.taskId)])
    );

    for (const depTaskId of targetTaskIds) {
      const depTask = await prisma.task.findUnique({
        where: { id: depTaskId },
        select: { id: true, dependencies: true },
      });
      if (!depTask) continue;

      const allDeps = await prisma.task.findMany({
        where: { id: { in: depTask.dependencies }, workspaceId },
      });
      const unfinished = allDeps.find((d) => d.status !== "done");
      if (!unfinished) {
        await prisma.task.update({
          where: { id: depTaskId },
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
      isArchived: false,
    };
    if (projectId) where.projectId = projectId;

    const blockedTasks = await prisma.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true, key: true } },
        assignee: { select: { firstName: true, lastName: true, email: true } },
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
          projectId: t.projectId,
          projectName: t.project?.name || null,
          projectKey: t.project?.key || null,
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
  public async getComments(workspaceId: string, taskId: string) {
    await this.getTask(workspaceId, taskId);

    const comments = await prisma.taskComment.findMany({
      where: { taskId },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return comments.map((c) => ({
      id: c.id,
      taskId: c.taskId,
      userId: c.userId,
      content: c.content,
      createdAt: c.createdAt ? c.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: c.updatedAt ? c.updatedAt.toISOString() : (c.createdAt ? c.createdAt.toISOString() : new Date().toISOString()),
      user: c.user || { id: c.userId, firstName: "System", lastName: "User", email: "user@omnidesk.ai" },
    }));
  }

  public async addComment(
    workspaceId: string,
    taskId: string,
    userId: string,
    content: string
  ) {
    const task = await this.getTask(workspaceId, taskId);

    if (!content || !content.trim()) {
      throw new ValidationError("Comment content cannot be empty");
    }

    const authorUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const comment = await prisma.taskComment.create({
      data: {
        workspaceId,
        taskId: task.id,
        userId,
        content: content.trim(),
      },
    });

    const authorName = authorUser ? `${authorUser.firstName} ${authorUser.lastName}` : "System User";

    // Audit logging
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: toValidObjectId(userId),
        action: "task:comment_created",
        entityType: "task",
        entityId: task.id,
        details: { commentId: comment.id },
      },
    }).catch(() => {});

    // WebSocket events
    const eventPayload = {
      taskId: task.id,
      commentId: comment.id,
      user: authorName,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task:commented", eventPayload);
    wsManager.broadcastToWorkspace(workspaceId, "task.comment.created", eventPayload);

    return {
      id: comment.id,
      taskId: comment.taskId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      user: authorUser || { id: userId, firstName: "System", lastName: "User", email: "system@omnidesk.ai" },
    };
  }

  public async updateComment(
    workspaceId: string,
    taskId: string,
    commentId: string,
    userId: string,
    content: string,
    userRole?: string
  ) {
    await this.getTask(workspaceId, taskId);

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw new NotFoundError(`Comment '${commentId}' not found on task`);
    }

    if (comment.userId !== userId && userRole !== "ADMIN" && userRole !== "OWNER") {
      throw new ForbiddenError("You can only edit your own comments");
    }

    const updated = await prisma.taskComment.update({
      where: { id: comment.id },
      data: { content: content.trim() },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const eventPayload = {
      taskId,
      commentId: updated.id,
      content: updated.content,
      updatedAt: updated.updatedAt.toISOString(),
    };
    wsManager.broadcastToWorkspace(workspaceId, "task.comment.updated", eventPayload);

    return updated;
  }

  public async deleteComment(
    workspaceId: string,
    taskId: string,
    commentId: string,
    userId: string,
    userRole?: string
  ) {
    await this.getTask(workspaceId, taskId);

    const comment = await prisma.taskComment.findFirst({
      where: { id: commentId, taskId },
    });

    if (!comment) {
      throw new NotFoundError(`Comment '${commentId}' not found on task`);
    }

    if (comment.userId !== userId && userRole !== "ADMIN" && userRole !== "OWNER") {
      throw new ForbiddenError("You can only delete your own comments");
    }

    await prisma.taskComment.delete({
      where: { id: comment.id },
    });

    const eventPayload = { taskId, commentId, deleted: true };
    wsManager.broadcastToWorkspace(workspaceId, "task.comment.deleted", eventPayload);

    return { success: true, message: "Comment deleted" };
  }

  // ── Team Workload Analytics ───────────────────────────────────────────────
  public async getTeamWorkload(workspaceId: string, projectId?: string) {
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
        const whereClause: any = {
          workspaceId,
          assigneeId: m.user.id,
          isArchived: false,
        };
        if (projectId) whereClause.projectId = projectId;

        const userTasks = await prisma.task.findMany({
          where: whereClause,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            estimatedHours: true,
            actualHours: true,
            isBlocked: true,
          },
        });

        const totalTasks = userTasks.length;
        const inProgressTasks = userTasks.filter((t) => t.status === "in_progress").length;
        const todoTasks = userTasks.filter((t) => t.status === "todo" || t.status === "backlog").length;
        const reviewTasks = userTasks.filter((t) => t.status === "review" || t.status === "in_review" || t.status === "testing").length;
        const blockedTasks = userTasks.filter((t) => t.status === "blocked" || t.isBlocked).length;
        const completedTasks = userTasks.filter((t) => t.status === "done").length;
        const overdueTasks = userTasks.filter((t) => t.status !== "done" && t.dueDate && t.dueDate < now).length;
        const estimatedHoursTotal = userTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
        const actualHoursTotal = userTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);

        return {
          userId: m.user.id,
          name: `${m.user.firstName} ${m.user.lastName}`,
          email: m.user.email,
          role: m.role,
          totalTasks,
          inProgressTasks,
          todoTasks,
          reviewTasks,
          blockedTasks,
          completedTasks,
          overdueTasks,
          estimatedHoursTotal,
          actualHoursTotal,
          tasks: userTasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate?.toISOString() || undefined,
            isOverdue: Boolean(t.status !== "done" && t.dueDate && t.dueDate < now),
            isBlocked: t.isBlocked,
          })),
        };
      })
    );

    const totalActive = memberWorkloads.reduce((sum, m) => sum + (m.totalTasks - m.completedTasks), 0);
    const totalOverdue = memberWorkloads.reduce((sum, m) => sum + m.overdueTasks, 0);

    return {
      workspaceId,
      projectId: projectId || null,
      totalActiveTasks: totalActive,
      totalOverdueTasks: totalOverdue,
      members: memberWorkloads,
    };
  }
}

export const taskService = new TaskService();
