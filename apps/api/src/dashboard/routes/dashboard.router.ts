import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const dashboardRouter = Router();

// Apply authentication middleware
dashboardRouter.use(requireAuthContext);

// Get workspace dashboard metrics
dashboardRouter.get("/metrics", requirePermission("workspace:read"), DashboardController.getMetrics);
