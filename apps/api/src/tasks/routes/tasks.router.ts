import { Router } from "express";
import { tasksController } from "../controllers/tasks.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const tasksRouter = Router();

// Apply workspace & auth context middleware
tasksRouter.use(requireAuthContext);

tasksRouter.post("/", requirePermission("task:write"), (req, res, next) => tasksController.createTask(req, res, next));
tasksRouter.get("/", requirePermission("task:read"), (req, res, next) => tasksController.listTasks(req, res, next));
tasksRouter.get("/blocked", requirePermission("task:read"), (req, res, next) => tasksController.getBlocked(req, res, next));
tasksRouter.get("/workload", requirePermission("task:read"), (req, res, next) => tasksController.getWorkload(req, res, next));
tasksRouter.get("/:id", requirePermission("task:read"), (req, res, next) => tasksController.getTask(req, res, next));
tasksRouter.patch("/:id", requirePermission("task:write"), (req, res, next) => tasksController.updateTask(req, res, next));
tasksRouter.post("/:id/move", requirePermission("task:move"), (req, res, next) => tasksController.moveTask(req, res, next));
tasksRouter.post("/:id/assign", requirePermission("task:assign"), (req, res, next) => tasksController.assignTask(req, res, next));
tasksRouter.post("/:id/comments", requirePermission("task:write"), (req, res, next) => tasksController.addComment(req, res, next));
tasksRouter.post("/:id/checklists", requirePermission("task:write"), (req, res, next) => tasksController.addChecklist(req, res, next));
tasksRouter.patch("/:id/checklists/:checklistId", requirePermission("task:write"), (req, res, next) => tasksController.updateChecklistItem(req, res, next));
tasksRouter.post("/:id/dependencies", requirePermission("task:write"), (req, res, next) => tasksController.addDependency(req, res, next));
tasksRouter.delete("/:id/dependencies/:depId", requirePermission("task:write"), (req, res, next) => tasksController.removeDependency(req, res, next));

