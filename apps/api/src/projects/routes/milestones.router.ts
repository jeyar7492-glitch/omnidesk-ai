import { Router } from "express";
import { milestonesController } from "../controllers/milestones.controller";
import { requireAuthContext } from "../../middleware/auth_context";

export const milestonesRouter = Router();

// Apply workspace & auth context middleware
milestonesRouter.use(requireAuthContext);

milestonesRouter.post("/", (req, res, next) => milestonesController.createMilestone(req, res, next));
milestonesRouter.get("/", (req, res, next) => milestonesController.listMilestones(req, res, next));
milestonesRouter.get("/overdue", (req, res, next) => milestonesController.getOverdue(req, res, next));
milestonesRouter.get("/:id", (req, res, next) => milestonesController.getMilestone(req, res, next));
milestonesRouter.patch("/:id", (req, res, next) => milestonesController.updateMilestone(req, res, next));
milestonesRouter.post("/:id/complete", (req, res, next) => milestonesController.completeMilestone(req, res, next));
