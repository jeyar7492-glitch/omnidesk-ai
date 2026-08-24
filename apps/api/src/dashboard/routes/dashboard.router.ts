import { Router } from "express";
import { getMetrics } from "../controllers/dashboard.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const dashboardRouter = Router();
dashboardRouter.get("/metrics", requireAuthContext, requirePermission("workspace:read"), getMetrics);
