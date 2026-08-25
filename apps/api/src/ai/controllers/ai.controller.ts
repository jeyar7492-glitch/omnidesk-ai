import { Request, Response, NextFunction } from "express";
import { CreateAIExecutionSchema, ApprovalDecisionSchema, AIExecutionQuerySchema, AIApprovalQuerySchema } from "@omnidesk/validation";
import { ApiResponse } from "@omnidesk/shared-types";
import { orchestrator } from "../orchestrator/orchestrator";
import { approvalService } from "../approvals/approval.service";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class AIController {
  public static async createExecution(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const validated = CreateAIExecutionSchema.parse(req.body);
      const authReq = req as AuthenticatedRequest;

      const result = await orchestrator.execute({
        prompt: validated.prompt,
        agentId: validated.agentId,
        context: authReq.context,
        conversationId: validated.conversationId,
        maxSteps: validated.maxSteps,
      });

      const response: ApiResponse = {
        success: true,
        data: result,
        error: null,
      };

      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  }

  public static async getExecution(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const execution = await orchestrator.getExecution(req.params.id, authReq.context.workspaceId);

      const response: ApiResponse = {
        success: true,
        data: execution,
        error: null,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  public static async listExecutions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = AIExecutionQuerySchema.parse(req.query);

      const result = await orchestrator.listExecutions(
        authReq.context.workspaceId,
        query.page,
        query.perPage
      );

      const response: ApiResponse = {
        success: true,
        data: result.items,
        error: null,
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  public static async listApprovals(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = AIApprovalQuerySchema.parse(req.query);

      const result = await approvalService.listApprovals(
        authReq.context.workspaceId,
        query.status,
        query.page,
        query.perPage
      );

      const response: ApiResponse = {
        success: true,
        data: result.items,
        error: null,
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.total,
          totalPages: result.totalPages,
        },
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  public static async getApproval(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const approval = await approvalService.getApproval(
        req.params.id,
        authReq.context.workspaceId
      );

      const response: ApiResponse = {
        success: true,
        data: approval,
        error: null,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  public static async approveApproval(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body || {};

      const updated = await approvalService.decideApproval({
        approvalId: req.params.id,
        workspaceId: authReq.context.workspaceId,
        decidedById: authReq.context.userId,
        decision: "APPROVED",
        reason: body.reason,
      });

      const response: ApiResponse = {
        success: true,
        data: updated,
        error: null,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  public static async rejectApproval(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const body = req.body || {};

      const updated = await approvalService.decideApproval({
        approvalId: req.params.id,
        workspaceId: authReq.context.workspaceId,
        decidedById: authReq.context.userId,
        decision: "REJECTED",
        reason: body.reason,
      });

      const response: ApiResponse = {
        success: true,
        data: updated,
        error: null,
      };

      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
