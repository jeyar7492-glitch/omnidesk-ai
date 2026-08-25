import { Request, Response, NextFunction } from "express";
import { projectService } from "../services/project.service";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ArchiveProjectSchema,
  PaginationQuerySchema,
} from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class ProjectsController {
  public async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateProjectSchema.parse(req.body);

      const project = await projectService.createProject(authReq.context.workspaceId, {
        name: validated.name,
        description: validated.description,
        status: validated.status as any,
        budget: validated.budget,
        spent: validated.spent,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        deadline: validated.deadline ? new Date(validated.deadline) : undefined,
        managerId: validated.managerId,
        customerId: validated.customerId,
        health: validated.health,
      });

      return res.status(201).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  }

  public async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const pagination = PaginationQuerySchema.parse(req.query);

      const projects = await projectService.findProjects(authReq.context.workspaceId, {
        query: req.query.query as string,
        status: req.query.status as any,
        customerId: req.query.customerId as string,
        managerId: req.query.managerId as string,
        isArchived: req.query.isArchived === "true" ? true : req.query.isArchived === "false" ? false : undefined,
        limit: pagination.perPage,
      });

      return res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const project = await projectService.getProject(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  }

  public async updateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateProjectSchema.parse(req.body);

      const updated = await projectService.updateProject(authReq.context.workspaceId, req.params.id, {
        name: validated.name,
        description: validated.description,
        status: validated.status as any,
        budget: validated.budget,
        spent: validated.spent,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        deadline: validated.deadline ? new Date(validated.deadline) : undefined,
        managerId: validated.managerId,
        customerId: validated.customerId,
        health: validated.health,
      });

      return res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public async archiveProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = ArchiveProjectSchema.parse(req.body || {});

      const archived = await projectService.archiveProject(
        authReq.context.workspaceId,
        req.params.id,
        validated.reason
      );

      return res.status(200).json({
        success: true,
        data: archived,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getProjectHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const health = await projectService.getProjectHealth(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: health,
      });
    } catch (err) {
      next(err);
    }
  }

  public async getProjectProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const progress = await projectService.getProjectProgress(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const projectsController = new ProjectsController();
