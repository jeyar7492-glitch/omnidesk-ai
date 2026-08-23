import { Request, Response, NextFunction } from "express";
import { taskService } from "../services/task.service";
import {
  CreateTaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
  AssignTaskSchema,
  CreateTaskChecklistSchema,
  UpdateTaskChecklistSchema,
  CreateTaskDependencySchema,
  CreateTaskCommentSchema,
  PaginationQuerySchema,
} from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class TasksController {
  public async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskSchema.parse(req.body);

      const task = await taskService.createTask(authReq.context.workspaceId, {
        title: validated.title,
        description: validated.description,
        projectId: validated.projectId,
        milestoneId: validated.milestoneId,
        priority: validated.priority as any,
        status: validated.status,
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
      const pagination = PaginationQuerySchema.parse(req.query);

      const tasks = await taskService.findTasks(authReq.context.workspaceId, {
        query: req.query.query as string,
        projectId: req.query.projectId as string,
        milestoneId: req.query.milestoneId as string,
        assigneeId: req.query.assigneeId as string,
        status: req.query.status as string,
        priority: req.query.priority as any,
        isBlocked: req.query.isBlocked === "true" ? true : req.query.isBlocked === "false" ? false : undefined,
        isOverdue: req.query.isOverdue === "true" ? true : undefined,
        isArchived: req.query.isArchived === "true" ? true : req.query.isArchived === "false" ? false : undefined,
        limit: pagination.perPage,
      });

      return res.status(200).json({
        success: true,
        data: tasks,
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

      const updated = await taskService.updateTask(authReq.context.workspaceId, req.params.id, {
        title: validated.title,
        description: validated.description,
        priority: validated.priority as any,
        projectId: validated.projectId,
        milestoneId: validated.milestoneId,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        estimatedHours: validated.estimatedHours,
        actualHours: validated.actualHours,
        labels: validated.labels,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async moveTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = MoveTaskSchema.parse(req.body);

      const updated = await taskService.moveTask(
        authReq.context.workspaceId,
        req.params.id,
        validated.targetStatus,
        validated.reason
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async assignTask(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = AssignTaskSchema.parse(req.body);

      const updated = await taskService.assignTask(
        authReq.context.workspaceId,
        req.params.id,
        validated.assigneeId || validated.assigneeNameOrEmail
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async addChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskChecklistSchema.parse(req.body);

      const items = await taskService.addChecklist(
        authReq.context.workspaceId,
        req.params.id,
        validated.items
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
        validated.title
      );

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async addDependency(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateTaskDependencySchema.parse(req.body);

      const updated = await taskService.addDependency(
        authReq.context.workspaceId,
        req.params.id,
        validated.dependsOnTaskId
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

      const updated = await taskService.removeDependency(
        authReq.context.workspaceId,
        req.params.id,
        req.params.depId
      );

      return res.status(200).json({
        success: true,
        data: updated,
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
      const workload = await taskService.getTeamWorkload(authReq.context.workspaceId);

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
