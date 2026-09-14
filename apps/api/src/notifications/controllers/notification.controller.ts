import { Request, Response, NextFunction } from "express";
import { NotificationService } from "../services/notification.service";
import {
  NotificationQuerySchema,
  UpdateNotificationPreferenceSchema,
} from "@omnidesk/validation";
import { NotFoundError, UnauthorizedError } from "../../lib/errors";

export class NotificationController {
  private static instance: NotificationController;
  private service: NotificationService;

  private constructor() {
    this.service = NotificationService.getInstance();
  }

  public static getInstance(): NotificationController {
    if (!NotificationController.instance) {
      NotificationController.instance = new NotificationController();
    }
    return NotificationController.instance;
  }

  private getAuth(req: Request): { workspaceId: string; userId: string } {
    const ctx = (req as any).context || (req as any).user;
    if (!ctx?.workspaceId || !ctx?.userId) {
      throw new UnauthorizedError("Authentication context required");
    }
    return { workspaceId: ctx.workspaceId, userId: ctx.userId };
  }

  public listNotifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const parsedQuery = NotificationQuerySchema.parse(req.query);
      const result = await this.service.listNotifications(workspaceId, userId, parsedQuery);

      res.status(200).json({
        success: true,
        data: result,
        meta: {
          page: result.page,
          perPage: result.perPage,
          total: result.total,
          totalPages: result.totalPages,
          unreadCount: result.unreadCount,
          timestamp: new Date().toISOString(),
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public getUnreadCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const count = await this.service.getUnreadCount(workspaceId, userId);

      res.status(200).json({
        success: true,
        data: {
          unreadCount: count,
          workspaceId,
          userId,
        },
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public getNotificationById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const { id } = req.params;

      const notif = await this.service.getNotificationById(workspaceId, userId, id);
      if (!notif) {
        throw new NotFoundError("Notification not found");
      }

      res.status(200).json({
        success: true,
        data: notif,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public markAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const { id } = req.params;

      const updated = await this.service.markAsRead(workspaceId, userId, id);
      if (!updated) {
        throw new NotFoundError("Notification not found");
      }

      res.status(200).json({
        success: true,
        data: updated,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public markAsUnread = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const { id } = req.params;

      const updated = await this.service.markAsUnread(workspaceId, userId, id);
      if (!updated) {
        throw new NotFoundError("Notification not found");
      }

      res.status(200).json({
        success: true,
        data: updated,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public markAllAsRead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const result = await this.service.markAllAsRead(workspaceId, userId);

      res.status(200).json({
        success: true,
        data: result,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public archiveNotification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const { id } = req.params;

      const updated = await this.service.archiveNotification(workspaceId, userId, id);
      if (!updated) {
        throw new NotFoundError("Notification not found");
      }

      res.status(200).json({
        success: true,
        data: updated,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public getPreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const pref = await this.service.getOrCreatePreference(workspaceId, userId);

      res.status(200).json({
        success: true,
        data: pref,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };

  public updatePreferences = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workspaceId, userId } = this.getAuth(req);
      const parsed = UpdateNotificationPreferenceSchema.parse(req.body);
      const updated = await this.service.updatePreferences(workspaceId, userId, parsed);

      res.status(200).json({
        success: true,
        data: updated,
        error: null,
      });
    } catch (err) {
      next(err);
    }
  };
}
