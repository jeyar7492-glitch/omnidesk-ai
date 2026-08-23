import { Router } from "express";
import { AIController } from "../controllers/ai.controller";
import { requireAuthContext } from "../../middleware/auth_context";

export function createAIRouter(): Router {
  const router = Router();

  // Apply authentication & workspace context middleware
  router.use(requireAuthContext);

  // AI Executions
  router.post("/executions", AIController.createExecution);
  router.get("/executions", AIController.listExecutions);
  router.get("/executions/:id", AIController.getExecution);

  // AI Approvals
  router.get("/approvals", AIController.listApprovals);
  router.get("/approvals/:id", AIController.getApproval);
  router.post("/approvals/:id/approve", AIController.approveApproval);
  router.post("/approvals/:id/reject", AIController.rejectApproval);

  return router;
}
