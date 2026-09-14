import { Request, Response, NextFunction } from "express";
import { projectService } from "../services/project.service";
import { milestoneService } from "../services/milestone.service";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ArchiveProjectSchema,
  ProjectQuerySchema,
  ProjectMemberSchema,
  CreateMilestoneSchema,
} from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class ProjectsController {
  public async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateProjectSchema.parse(req.body);

      const project = await projectService.createProject(authReq.context.workspaceId, {
        name: validated.name,
        key: validated.key,
        description: validated.description,
        status: validated.status as any,
        priority: validated.priority as any,
        budget: validated.budget,
        spent: validated.spent,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        deadline: validated.deadline ? new Date(validated.deadline) : undefined,
        managerId: validated.managerId,
        customerId: validated.customerId,
        health: validated.health,
        color: validated.color,
        userId: authReq.context.userId,
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
      const query = ProjectQuerySchema.parse(req.query);

      const result = await projectService.findProjectsPaginated(authReq.context.workspaceId, {
        q: query.q || (req.query.query as string),
        status: query.status,
        priority: query.priority,
        customerId: query.customerId,
        managerId: query.managerId,
        isArchived: query.isArchived,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });

      return res.status(200).json({
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
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

  public async getProjectDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const dashboard = await projectService.getProjectDashboard(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: dashboard,
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
        key: validated.key,
        description: validated.description,
        status: validated.status as any,
        priority: validated.priority as any,
        budget: validated.budget,
        spent: validated.spent,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        deadline: validated.deadline ? new Date(validated.deadline) : undefined,
        managerId: validated.managerId,
        customerId: validated.customerId,
        health: validated.health,
        color: validated.color,
        userId: authReq.context.userId,
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
        validated.reason,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: archived,
      });
    } catch (err) {
      next(err);
    }
  }

  public async restoreProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const restored = await projectService.restoreProject(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({
        success: true,
        data: restored,
      });
    } catch (err) {
      next(err);
    }
  }

  public async deleteProject(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await projectService.deleteProject(
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

  // ── Project Members ───────────────────────────────────────────────────────
  public async getProjectMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const members = await projectService.getProjectMembers(authReq.context.workspaceId, req.params.id);

      return res.status(200).json({
        success: true,
        data: members,
      });
    } catch (err) {
      next(err);
    }
  }

  public async addProjectMember(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = ProjectMemberSchema.parse(req.body);

      const member = await projectService.addMember(
        authReq.context.workspaceId,
        req.params.id,
        validated,
        authReq.context.userId
      );

      return res.status(201).json({
        success: true,
        data: member,
      });
    } catch (err) {
      next(err);
    }
  }

  public async removeProjectMember(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const result = await projectService.removeMember(
        authReq.context.workspaceId,
        req.params.id,
        req.params.userId,
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

  // ── Project Milestones Direct Routes ──────────────────────────────────────
  public async getProjectMilestones(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const milestones = await milestoneService.findMilestones(authReq.context.workspaceId, {
        projectId: req.params.id,
      });

      return res.status(200).json({
        success: true,
        data: milestones,
      });
    } catch (err) {
      next(err);
    }
  }

  public async createProjectMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateMilestoneSchema.parse({
        ...req.body,
        projectId: req.params.id,
      });

      const milestone = await milestoneService.createMilestone(authReq.context.workspaceId, {
        projectId: req.params.id,
        title: validated.title,
        description: validated.description,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
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
