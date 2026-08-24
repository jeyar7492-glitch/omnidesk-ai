import { Request, Response, NextFunction } from "express";
import { RegisterSchema, LoginSchema, RefreshTokenSchema, SwitchWorkspaceSchema } from "@omnidesk/validation";
import { authService } from "../services/auth.service";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RegisterSchema.parse(req.body);
      const result = await authService.register(validated);

      res.status(201).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = LoginSchema.parse(req.body);
      const targetWorkspaceId = req.headers["x-workspace-id"] as string | undefined;
      const result = await authService.login({
        ...validated,
        targetWorkspaceId,
      });

      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = RefreshTokenSchema.parse(req.body);
      const tokens = await authService.refreshToken(validated.refreshToken);

      res.status(200).json({
        success: true,
        data: tokens,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.context?.userId;
      const refreshToken = req.body?.refreshToken as string | undefined;

      if (userId) {
        await authService.logout(userId, refreshToken);
      }

      res.status(200).json({
        success: true,
        data: { message: "Successfully logged out" },
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }

  public static async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authReq = req as AuthenticatedRequest;
      const userId = authReq.context.userId;
      const workspaceId = authReq.context.workspaceId;

      const user = await authService.getCurrentUser(userId, workspaceId);

      res.status(200).json({
        success: true,
        data: user,
        meta: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  }
}
