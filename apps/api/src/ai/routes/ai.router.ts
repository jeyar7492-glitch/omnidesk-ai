import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export function createAIRouter(): Router {
  const router = Router();

  // Apply authentication & workspace context middleware
  router.use(requireAuthContext);

  // AI Executions
  router.post("/executions", requirePermission("ai:execute"), AIController.createExecution);
  router.get("/executions", requirePermission("ai:execute"), AIController.listExecutions);
  router.get("/executions/:id", requirePermission("ai:execute"), AIController.getExecution);

  // AI Approvals
  router.get("/approvals", requirePermission("ai:execute"), AIController.listApprovals);
  router.get("/approvals/:id", requirePermission("ai:execute"), AIController.getApproval);
  router.post("/approvals/:id/approve", requirePermission("ai:approve"), AIController.approveApproval);
  router.post("/approvals/:id/reject", requirePermission("ai:approve"), AIController.rejectApproval);

  return router;
}

