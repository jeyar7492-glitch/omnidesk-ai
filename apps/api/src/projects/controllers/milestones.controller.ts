import { Request, Response, NextFunction } from "express";
import { milestoneService } from "../services/milestone.service";
import {
  CreateMilestoneSchema,
  UpdateMilestoneSchema,
  CompleteMilestoneSchema,
  PaginationQuerySchema,
} from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class MilestonesController {
  public async createMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateMilestoneSchema.parse(req.body);

      const milestone = await milestoneService.createMilestone(authReq.context.workspaceId, {
        projectId: validated.projectId,
        title: validated.title,
        description: validated.description,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        status: validated.status,
        assignedUserId: validated.assignedUserId,
      });

      return res.status(201).json({
        success: true,
        data: milestone,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listMilestones(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const pagination = PaginationQuerySchema.parse(req.query);

      const milestones = await milestoneService.findMilestones(authReq.context.workspaceId, {
        projectId: req.query.projectId as string,
        status: req.query.status as string,
        query: req.query.query as string,
        limit: pagination.perPage,
      });

      return res.status(200).json({
        success: true,
        data: milestones,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const milestone = await milestoneService.getMilestone(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: milestone,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateMilestoneSchema.parse(req.body);

      const updated = await milestoneService.updateMilestone(authReq.context.workspaceId, req.params.id, {
        title: validated.title,
        description: validated.description,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
        status: validated.status,
        assignedUserId: validated.assignedUserId,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async completeMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CompleteMilestoneSchema.parse(req.body || {});

      const completed = await milestoneService.completeMilestone(
        authReq.context.workspaceId,
        req.params.id,
        validated.notes
      );

      return res.status(200).json({
        success: true,
        data: completed,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getOverdue(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const overdue = await milestoneService.getOverdueMilestones(
        authReq.context.workspaceId,
        req.query.projectId as string
      );

      return res.status(200).json({
        success: true,
        data: overdue,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const milestonesController = new MilestonesController();
