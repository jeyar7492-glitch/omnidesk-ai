import { Request, Response, NextFunction } from "express";
import { taskService } from "../services/task.service";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
  ReorderTaskSchema,
  AssignTaskSchema,
  CreateTaskChecklistSchema,
  UpdateTaskChecklistSchema,
  CreateTaskDependencySchema,
  CreateTaskCommentSchema,
  UpdateTaskCommentSchema,
  TaskQuerySchema,
} from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class TasksController {
  // ── Task CRUD ─────────────────────────────────────────────────────────────
  public async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskSchema.parse(req.body);

      const task = await taskService.createTask(authReq.context.workspaceId, {
        title: validated.title,
        description: validated.description,
        projectId: validated.projectId,
        milestoneId: validated.milestoneId,
        parentTaskId: validated.parentTaskId,
        priority: validated.priority as any,
        status: validated.status,
        position: validated.position,
        assigneeId: validated.assigneeId,
        reporterId: authReq.context.userId,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        estimatedHours: validated.estimatedHours,
        labels: validated.labels,
        dependencies: validated.dependencies,
      });

      return res.status(201).json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = TaskQuerySchema.parse(req.query);

      const result = await taskService.findTasks(authReq.context.workspaceId, {
        query: query.q || (req.query.query as string),
        projectId: query.projectId,
        milestoneId: query.milestoneId,
        assigneeId: query.assigneeId,
        status: query.status,
        priority: query.priority as any,
        isBlocked: query.isBlocked,
        isOverdue: query.isOverdue,
        isArchived: query.isArchived,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      return res.status(200).json({
        success: true,
        data: result,
        meta: (result as any).meta,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const task = await taskService.getTask(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: task,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateTaskSchema.parse(req.body);

      const updated = await taskService.updateTask(
        authReq.context.workspaceId,
        req.params.id,
        {
          title: validated.title,
          description: validated.description,
          priority: validated.priority as any,
          status: validated.status,
          projectId: validated.projectId,
          milestoneId: validated.milestoneId,
          parentTaskId: validated.parentTaskId,
          startDate: validated.startDate ? new Date(validated.startDate) : undefined,
          dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
          estimatedHours: validated.estimatedHours,
          actualHours: validated.actualHours,
          labels: validated.labels,
          position: validated.position,
        },
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await taskService.deleteTask(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Kanban Transitions & Reordering ───────────────────────────────────────
  public async moveTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = MoveTaskSchema.parse(req.body);

      const updated = await taskService.moveTask(
        authReq.context.workspaceId,
        req.params.id,
        validated.targetStatus,
        validated.reason,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async reorderTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = ReorderTaskSchema.parse(req.body);

      const updated = await taskService.reorderTask(
        authReq.context.workspaceId,
        req.params.id,
        validated.targetStatus,
        validated.position,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Assignment ────────────────────────────────────────────────────────────
  public async assignTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = AssignTaskSchema.parse(req.body);

      const updated = await taskService.assignTask(
        authReq.context.workspaceId,
        req.params.id,
        validated.assigneeId || validated.assigneeNameOrEmail,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Archive & Restore ─────────────────────────────────────────────────────
  public async archiveTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const updated = await taskService.archiveTask(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async restoreTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const updated = await taskService.restoreTask(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Checklists ────────────────────────────────────────────────────────────
  public async addChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskChecklistSchema.parse(req.body);

      const items = await taskService.addChecklist(
        authReq.context.workspaceId,
        req.params.id,
        { items: validated.items, title: validated.title },
        authReq.context.userId
      );

      return res.status(201).json({
        success: true,
        data: items,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateChecklistItem(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateTaskChecklistSchema.parse(req.body);

      const updated = await taskService.updateChecklistItem(
        authReq.context.workspaceId,
        req.params.id,
        req.params.checklistId,
        validated.isCompleted,
        validated.title,
        validated.position,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async deleteChecklistItem(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await taskService.deleteChecklistItem(
        authReq.context.workspaceId,
        req.params.id,
        req.params.checklistId,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Dependencies ──────────────────────────────────────────────────────────
  public async addDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskDependencySchema.parse(req.body);

      const updated = await taskService.addDependency(
        authReq.context.workspaceId,
        req.params.id,
        validated.dependsOnTaskId,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async removeDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const depId = req.params.dependencyId || req.params.depId;

      const updated = await taskService.removeDependency(
        authReq.context.workspaceId,
        req.params.id,
        depId,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Comments ──────────────────────────────────────────────────────────────
  public async getComments(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const comments = await taskService.getComments(
        authReq.context.workspaceId,
        req.params.id
      );

      return res.status(200).json({
        success: true,
        data: comments,
      });
    } catch (err) {
      next(err);
    }
  }

  public async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskCommentSchema.parse(req.body);

      const comment = await taskService.addComment(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId,
        validated.content
      );

      return res.status(201).json({
        success: true,
        data: comment,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateComment(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateTaskCommentSchema.parse(req.body);

      const updated = await taskService.updateComment(
        authReq.context.workspaceId,
        req.params.id,
        req.params.commentId,
        authReq.context.userId,
        validated.content,
        authReq.context.userRole
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async deleteComment(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;

      const result = await taskService.deleteComment(
        authReq.context.workspaceId,
        req.params.id,
        req.params.commentId,
        authReq.context.userId,
        authReq.context.userRole
      );

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  // ── Diagnostics & Workload ────────────────────────────────────────────────
  public async getBlocked(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const blocked = await taskService.getBlockedTasks(
        authReq.context.workspaceId,
        req.query.projectId as string
      );

      return res.status(200).json({
        success: true,
        data: blocked,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getWorkload(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workload = await taskService.getTeamWorkload(
        authReq.context.workspaceId,
        req.query.projectId as string
      );

      return res.status(200).json({
        success: true,
        data: workload,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const tasksController = new TasksController();
