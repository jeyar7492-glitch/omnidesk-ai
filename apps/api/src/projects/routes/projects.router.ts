import { Router } from "express";
import { projectsController } from "../controllers/projects.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const projectsRouter = Router();

// Apply workspace & auth context middleware
projectsRouter.use(requireAuthContext);

// Project Core CRUD & Queries
projectsRouter.post("/", requirePermission("project:write"), (req, res, next) => projectsController.createProject(req, res, next));
projectsRouter.get("/", requirePermission("project:read"), (req, res, next) => projectsController.listProjects(req, res, next));
projectsRouter.get("/:id", requirePermission("project:read"), (req, res, next) => projectsController.getProject(req, res, next));
projectsRouter.patch("/:id", requirePermission("project:write"), (req, res, next) => projectsController.updateProject(req, res, next));
projectsRouter.delete("/:id", requirePermission("project:delete"), (req, res, next) => projectsController.deleteProject(req, res, next));

// Project Archive & Restore
projectsRouter.post("/:id/archive", requirePermission("project:archive"), (req, res, next) => projectsController.archiveProject(req, res, next));
projectsRouter.post("/:id/restore", requirePermission("project:write"), (req, res, next) => projectsController.restoreProject(req, res, next));

// Project Analytics & Diagnostics
projectsRouter.get("/:id/dashboard", requirePermission("project:read"), (req, res, next) => projectsController.getProjectDashboard(req, res, next));
projectsRouter.get("/:id/health", requirePermission("project:read"), (req, res, next) => projectsController.getProjectHealth(req, res, next));
projectsRouter.get("/:id/progress", requirePermission("project:read"), (req, res, next) => projectsController.getProjectProgress(req, res, next));

// Project Members Sub-Routes
projectsRouter.get("/:id/members", requirePermission("project:read"), (req, res, next) => projectsController.getProjectMembers(req, res, next));
projectsRouter.post("/:id/members", requirePermission("project:write"), (req, res, next) => projectsController.addProjectMember(req, res, next));
projectsRouter.delete("/:id/members/:userId", requirePermission("project:write"), (req, res, next) => projectsController.removeProjectMember(req, res, next));

// Project Milestones Sub-Routes
projectsRouter.get("/:id/milestones", requirePermission("project:read"), (req, res, next) => projectsController.getProjectMilestones(req, res, next));
projectsRouter.post("/:id/milestones", requirePermission("project:write"), (req, res, next) => projectsController.createProjectMilestone(req, res, next));
