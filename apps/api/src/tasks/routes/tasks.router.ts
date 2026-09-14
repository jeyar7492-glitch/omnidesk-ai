import { Router } from "express";
import { tasksController } from "../controllers/tasks.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const tasksRouter = Router();

// Apply workspace & auth context middleware
tasksRouter.use(requireAuthContext);

// Global / Cross-project queries (Mount before :id)
tasksRouter.get("/blocked", requirePermission("task:read"), (req, res, next) => tasksController.getBlocked(req, res, next));
tasksRouter.get("/workload", requirePermission("task:read"), (req, res, next) => tasksController.getWorkload(req, res, next));

// Task CRUD
tasksRouter.post("/", requirePermission("task:write"), (req, res, next) => tasksController.createTask(req, res, next));
tasksRouter.get("/", requirePermission("task:read"), (req, res, next) => tasksController.listTasks(req, res, next));
tasksRouter.get("/:id", requirePermission("task:read"), (req, res, next) => tasksController.getTask(req, res, next));
tasksRouter.patch("/:id", requirePermission("task:write"), (req, res, next) => tasksController.updateTask(req, res, next));
tasksRouter.delete("/:id", requirePermission("task:delete"), (req, res, next) => tasksController.deleteTask(req, res, next));

// Kanban, Move, Reorder, Assign
tasksRouter.post("/:id/move", requirePermission("task:move"), (req, res, next) => tasksController.moveTask(req, res, next));
tasksRouter.post("/:id/reorder", requirePermission("task:move"), (req, res, next) => tasksController.reorderTask(req, res, next));
tasksRouter.post("/:id/assign", requirePermission("task:assign"), (req, res, next) => tasksController.assignTask(req, res, next));

// Archive & Restore
tasksRouter.post("/:id/archive", requirePermission("task:archive"), (req, res, next) => tasksController.archiveTask(req, res, next));
tasksRouter.post("/:id/restore", requirePermission("task:write"), (req, res, next) => tasksController.restoreTask(req, res, next));

// Checklists
tasksRouter.post("/:id/checklists", requirePermission("task:write"), (req, res, next) => tasksController.addChecklist(req, res, next));
tasksRouter.patch("/:id/checklists/:checklistId", requirePermission("task:write"), (req, res, next) => tasksController.updateChecklistItem(req, res, next));
tasksRouter.delete("/:id/checklists/:checklistId", requirePermission("task:write"), (req, res, next) => tasksController.deleteChecklistItem(req, res, next));

// Dependencies
tasksRouter.post("/:id/dependencies", requirePermission("task:write"), (req, res, next) => tasksController.addDependency(req, res, next));
tasksRouter.delete("/:id/dependencies/:dependencyId", requirePermission("task:write"), (req, res, next) => tasksController.removeDependency(req, res, next));

// Comments
tasksRouter.get("/:id/comments", requirePermission("task:read"), (req, res, next) => tasksController.getComments(req, res, next));
tasksRouter.post("/:id/comments", requirePermission("comment:write"), (req, res, next) => tasksController.addComment(req, res, next));
tasksRouter.patch("/:id/comments/:commentId", requirePermission("comment:write"), (req, res, next) => tasksController.updateComment(req, res, next));
tasksRouter.delete("/:id/comments/:commentId", requirePermission("comment:write"), (req, res, next) => tasksController.deleteComment(req, res, next));
