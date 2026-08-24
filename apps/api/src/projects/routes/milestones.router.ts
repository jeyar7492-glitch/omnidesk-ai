import { Router } from "express";
import { milestonesController } from "../controllers/milestones.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const milestonesRouter = Router();

// Apply workspace & auth context middleware
milestonesRouter.use(requireAuthContext);

milestonesRouter.post("/", requirePermission("milestone:write"), (req, res, next) => milestonesController.createMilestone(req, res, next));
milestonesRouter.get("/", requirePermission("milestone:read"), (req, res, next) => milestonesController.listMilestones(req, res, next));
milestonesRouter.get("/overdue", requirePermission("milestone:read"), (req, res, next) => milestonesController.getOverdue(req, res, next));
milestonesRouter.get("/:id", requirePermission("milestone:read"), (req, res, next) => milestonesController.getMilestone(req, res, next));
milestonesRouter.patch("/:id", requirePermission("milestone:write"), (req, res, next) => milestonesController.updateMilestone(req, res, next));
milestonesRouter.post("/:id/complete", requirePermission("milestone:write"), (req, res, next) => milestonesController.completeMilestone(req, res, next));

