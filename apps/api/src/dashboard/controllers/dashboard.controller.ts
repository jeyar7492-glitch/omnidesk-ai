import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export async function getMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthenticatedRequest;
    const data = await dashboardService.getDashboardMetrics(authReq.context.workspaceId);
    res.json({ success: true, data });
  } catch (error) { next(error); }
}
