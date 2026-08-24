import { Router } from "express";
import { projectsController } from "../controllers/projects.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const projectsRouter = Router();

// Apply workspace & auth context middleware
projectsRouter.use(requireAuthContext);

projectsRouter.post("/", requirePermission("project:write"), (req, res, next) => projectsController.createProject(req, res, next));
projectsRouter.get("/", requirePermission("project:read"), (req, res, next) => projectsController.listProjects(req, res, next));
projectsRouter.get("/:id", requirePermission("project:read"), (req, res, next) => projectsController.getProject(req, res, next));
projectsRouter.patch("/:id", requirePermission("project:write"), (req, res, next) => projectsController.updateProject(req, res, next));
projectsRouter.post("/:id/archive", requirePermission("project:archive"), (req, res, next) => projectsController.archiveProject(req, res, next));
projectsRouter.get("/:id/health", requirePermission("project:read"), (req, res, next) => projectsController.getProjectHealth(req, res, next));
projectsRouter.get("/:id/progress", requirePermission("project:read"), (req, res, next) => projectsController.getProjectProgress(req, res, next));

