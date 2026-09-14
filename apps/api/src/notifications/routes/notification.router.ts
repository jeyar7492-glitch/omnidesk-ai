import { Router } from "express";
import { NotificationController } from "../controllers/notification.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

const controller = NotificationController.getInstance();

export const notificationRouter = Router();

// Enforce authentication on all notification routes
notificationRouter.use(requireAuthContext);

// ── Notifications ─────────────────────────────────────────────────────────────
notificationRouter.get(
  "/",
  requirePermission("notification:read"),
  controller.listNotifications
);

notificationRouter.get(
  "/unread-count",
  requirePermission("notification:read"),
  controller.getUnreadCount
);

notificationRouter.post(
  "/read-all",
  requirePermission("notification:write"),
  controller.markAllAsRead
);

notificationRouter.get(
  "/preferences",
  requirePermission("notification:read"),
  controller.getPreferences
);

notificationRouter.put(
  "/preferences",
  requirePermission("notification:write"),
  controller.updatePreferences
);

notificationRouter.patch(
  "/preferences",
  requirePermission("notification:write"),
  controller.updatePreferences
);

notificationRouter.get(
  "/:id",
  requirePermission("notification:read"),
  controller.getNotificationById
);

notificationRouter.patch(
  "/:id/read",
  requirePermission("notification:write"),
  controller.markAsRead
);

notificationRouter.patch(
  "/:id/unread",
  requirePermission("notification:write"),
  controller.markAsUnread
);

notificationRouter.patch(
  "/:id/archive",
  requirePermission("notification:write"),
  controller.archiveNotification
);

notificationRouter.delete(
  "/:id",
  requirePermission("notification:delete"),
  controller.archiveNotification
);

// ── Notification Preferences Router ──────────────────────────────────────────
export const notificationPreferenceRouter = Router();

notificationPreferenceRouter.use(requireAuthContext);

notificationPreferenceRouter.get(
  "/",
  requirePermission("notification:read"),
  controller.getPreferences
);

notificationPreferenceRouter.put(
  "/",
  requirePermission("notification:write"),
  controller.updatePreferences
);

notificationPreferenceRouter.patch(
  "/",
  requirePermission("notification:write"),
  controller.updatePreferences
);
