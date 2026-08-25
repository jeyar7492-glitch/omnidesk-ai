import { Request, Response, NextFunction } from "express";
import { dashboardService } from "../services/dashboard.service";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class DashboardController {
  public static async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const workspaceId = authReq.context.workspaceId;

      const metrics = await dashboardService.getDashboardMetrics(workspaceId);

      return res.status(200).json({
        success: true,
        data: metrics,
      });
    } catch (err) {
      next(err);
    }
  }
}
