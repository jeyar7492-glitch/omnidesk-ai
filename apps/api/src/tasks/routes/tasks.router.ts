import { Router } from "express";
import { tasksController } from "../controllers/tasks.controller";
import { requireAuthContext } from "../../middleware/auth_context";

export const tasksRouter = Router();

// Apply workspace & auth context middleware
tasksRouter.use(requireAuthContext);

tasksRouter.post("/", (req, res, next) => tasksController.createTask(req, res, next));
tasksRouter.get("/", (req, res, next) => tasksController.listTasks(req, res, next));
tasksRouter.get("/blocked", (req, res, next) => tasksController.getBlocked(req, res, next));
tasksRouter.get("/workload", (req, res, next) => tasksController.getWorkload(req, res, next));
tasksRouter.get("/:id", (req, res, next) => tasksController.getTask(req, res, next));
tasksRouter.patch("/:id", (req, res, next) => tasksController.updateTask(req, res, next));
tasksRouter.post("/:id/move", (req, res, next) => tasksController.moveTask(req, res, next));
tasksRouter.post("/:id/assign", (req, res, next) => tasksController.assignTask(req, res, next));
tasksRouter.post("/:id/comments", (req, res, next) => tasksController.addComment(req, res, next));
tasksRouter.post("/:id/checklists", (req, res, next) => tasksController.addChecklist(req, res, next));
tasksRouter.patch("/:id/checklists/:checklistId", (req, res, next) => tasksController.updateChecklistItem(req, res, next));
tasksRouter.post("/:id/dependencies", (req, res, next) => tasksController.addDependency(req, res, next));
tasksRouter.delete("/:id/dependencies/:depId", (req, res, next) => tasksController.removeDependency(req, res, next));
