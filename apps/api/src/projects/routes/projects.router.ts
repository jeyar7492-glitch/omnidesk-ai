import { Router } from "express";
import { projectsController } from "../controllers/projects.controller";
import { requireAuthContext } from "../../middleware/auth_context";

export const projectsRouter = Router();

// Apply workspace & auth context middleware
projectsRouter.use(requireAuthContext);

projectsRouter.post("/", (req, res, next) => projectsController.createProject(req, res, next));
projectsRouter.get("/", (req, res, next) => projectsController.listProjects(req, res, next));
projectsRouter.get("/:id", (req, res, next) => projectsController.getProject(req, res, next));
projectsRouter.patch("/:id", (req, res, next) => projectsController.updateProject(req, res, next));
projectsRouter.post("/:id/archive", (req, res, next) => projectsController.archiveProject(req, res, next));
projectsRouter.get("/:id/health", (req, res, next) => projectsController.getProjectHealth(req, res, next));
projectsRouter.get("/:id/progress", (req, res, next) => projectsController.getProjectProgress(req, res, next));
