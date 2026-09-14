import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { logger } from "../../lib/logger";
import { EmailNotificationService } from "../email/email.service";
import {
  NotificationPriority,
  NotificationType,
  NotificationSummary,
  NotificationDetail,
  NotificationPreferenceSummary,
  UpdateNotificationPreferenceInput,
  NotificationQuery,
  NotificationListResponse,
} from "@omnidesk/shared-types";

export interface CreateNotificationParams {
  workspaceId: string;
  userId?: string;
  recipientId?: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  senderId?: string;
}

export interface CreateBulkNotificationParams {
  workspaceId: string;
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  senderId?: string;
}

const PRIORITY_LEVELS: Record<NotificationPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
};

export class NotificationService {
  private static instance: NotificationService;
  private emailService: EmailNotificationService;

  private constructor() {
    this.emailService = EmailNotificationService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Determine category from notification type.
   */
  public getCategoryForType(type: NotificationType): string {
    if (type.startsWith("TASK_")) return "tasks";
    if (type.startsWith("PROJECT_") || type.startsWith("MILESTONE_")) return "projects";
    if (type.startsWith("LEAD_") || type.startsWith("DEAL_")) return "crm";
    if (type.startsWith("INVOICE_") || type.startsWith("PAYMENT_") || type.startsWith("EXPENSE_")) return "finance";
    if (type.startsWith("DOCUMENT_") || type.startsWith("KNOWLEDGE_")) return "documents";
    return "system";
  }

  /**
   * Check whether user preferences allow this notification.
   */
  private shouldDeliver(
    pref: {
      inAppEnabled: boolean;
      tasksCategory: boolean;
      projectsCategory: boolean;
      crmCategory: boolean;
      financeCategory: boolean;
      documentsCategory: boolean;
      systemCategory: boolean;
      minPriority: NotificationPriority;
    },
    type: NotificationType,
    priority: NotificationPriority
  ): boolean {
    if (!pref.inAppEnabled) return false;

    // Check minimum priority threshold
    const reqLevel = PRIORITY_LEVELS[pref.minPriority] ?? 0;
    const currentLevel = PRIORITY_LEVELS[priority] ?? 0;
    if (currentLevel < reqLevel) return false;

    // Check category flag
    const category = this.getCategoryForType(type);
    switch (category) {
      case "tasks":
        return pref.tasksCategory;
      case "projects":
        return pref.projectsCategory;
      case "crm":
        return pref.crmCategory;
      case "finance":
        return pref.financeCategory;
      case "documents":
        return pref.documentsCategory;
      case "system":
        return pref.systemCategory;
      default:
        return true;
    }
  }

  /**
   * Create a single notification with strict tenant isolation, deduplication,
   * user preferences enforcement, and realtime delivery.
   */
  public async createNotification(params: CreateNotificationParams): Promise<NotificationSummary | null> {
    const userId = params.userId || params.recipientId;
    const {
      workspaceId,
      type,
      title,
      message,
      priority = "LOW",
      entityType,
      entityId,
      actionUrl,
      metadata,
    } = params;

    if (!workspaceId || !userId || !title || !message) {
      logger.warn({ params }, "Notification creation rejected: Missing required fields");
      return null;
    }

    // 1. Verify workspace membership to prevent cross-workspace notification delivery
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      include: {
        workspace: { select: { name: true } },
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });

    if (!member) {
      logger.warn(
        { workspaceId, userId },
        "Notification creation rejected: Recipient is not a member of target workspace"
      );
      return null;
    }

    // 2. Fetch or create user preferences
    const pref = await this.getOrCreatePreference(workspaceId, userId);

    // 3. Evaluate preferences
    if (!this.shouldDeliver(pref, type, priority)) {
      logger.debug(
        { workspaceId, userId, type, priority },
        "Notification suppressed by user preferences"
      );
      return null;
    }

    // 4. Deduplication: Check if an identical unread notification was created within last 5 minutes
    if (entityId) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const existing = await prisma.notification.findFirst({
        where: {
          workspaceId,
          userId,
          type,
          entityId,
          isRead: false,
          isArchived: false,
          createdAt: { gte: fiveMinutesAgo },
        },
      });

      if (existing) {
        logger.debug(
          { existingId: existing.id, type, entityId },
          "Duplicate notification suppressed within 5-minute window"
        );
        return this.mapToSummary(existing);
      }
    }

    // 5. Persist Notification in DB
    const notification = await prisma.notification.create({
      data: {
        workspaceId,
        userId,
        type,
        title,
        message,
        priority,
        entityType: entityType || null,
        entityId: entityId || null,
        actionUrl: actionUrl || null,
        link: actionUrl || null, // backward compatibility
        metadata: (metadata || null) as any,
        isRead: false,
        isArchived: false,
      },
    });

    // 6. Record In-App Delivery Record
    await prisma.notificationDelivery.create({
      data: {
        notificationId: notification.id,
        channel: "in_app",
        status: "delivered",
        sentAt: new Date(),
      },
    });

    // 7. Dispatch Email if enabled in user preferences
    if (pref.emailEnabled) {
      const recipientEmail = pref.emailAddress || member.user.email;
      if (recipientEmail) {
        this.emailService
          .sendNotificationEmail({
            to: recipientEmail,
            title,
            message,
            actionUrl,
            priority,
            workspaceName: member.workspace.name,
          })
          .then(async (result) => {
            await prisma.notificationDelivery.create({
              data: {
                notificationId: notification.id,
                channel: "email",
                status: result.success ? "delivered" : result.skipped ? "skipped" : "failed",
                error: result.error || null,
                sentAt: result.success ? new Date() : null,
              },
            });
          })
          .catch((err) => {
            logger.warn({ err: err.message }, "Background email notification failed");
          });
      }
    }

    const summary = this.mapToSummary(notification);

    // 8. Real-time WebSocket dispatch targeted strictly to this recipient
    try {
      wsManager.sendToUser(workspaceId, userId, "notification.created", summary);
    } catch (wsErr: any) {
      logger.warn({ err: wsErr.message }, "WebSocket notification emission failed");
    }

    // 9. Audit log for important notifications
    if (priority === "HIGH" || priority === "URGENT") {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: params.senderId || null,
          action: "notification:created",
          entityType: "notification",
          entityId: notification.id,
          details: {
            recipientId: userId,
            type,
            title,
            priority,
          },
        },
      }).catch(() => {});
    }

    return summary;
  }

  /**
   * Bulk notification creation for multi-user events.
   */
  public async createBulkNotifications(params: CreateBulkNotificationParams): Promise<NotificationSummary[]> {
    const { userIds, ...rest } = params;
    const results: NotificationSummary[] = [];

    for (const userId of userIds) {
      try {
        const notif = await this.createNotification({ ...rest, userId });
        if (notif) results.push(notif);
      } catch (err: any) {
        logger.error({ err: err.message, userId }, "Error in bulk notification delivery");
      }
    }

    return results;
  }

  /**
   * List notifications for a specific user with pagination and filters.
   */
  public async listNotifications(
    workspaceId: string,
    userId: string,
    query: NotificationQuery = {}
  ): Promise<NotificationListResponse> {
    const page = Math.max(1, query.page || 1);
    const perPage = Math.min(100, Math.max(1, query.perPage || 20));
    const skip = (page - 1) * perPage;

    const where: any = {
      workspaceId,
      userId,
      isArchived: query.isArchived !== undefined ? query.isArchived : false,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: "insensitive" } },
        { message: { contains: term, mode: "insensitive" } },
      ];
    }

    const [total, notifications, unreadCount] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: perPage,
      }),
      prisma.notification.count({
        where: {
          workspaceId,
          userId,
          isRead: false,
          isArchived: false,
        },
      }),
    ]);

    const totalPages = Math.ceil(total / perPage) || 1;

    return {
      notifications: notifications.map((n) => this.mapToSummary(n)),
      total,
      unreadCount,
      page,
      perPage,
      totalPages,
    };
  }

  /**
   * Get total unread count for user in workspace.
   */
  public async getUnreadCount(workspaceId: string, userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        workspaceId,
        userId,
        isRead: false,
        isArchived: false,
      },
    });
  }

  /**
   * Get single notification with deliveries details.
   */
  public async getNotificationById(
    workspaceId: string,
    userId: string,
    id: string
  ): Promise<NotificationDetail | null> {
    const notif = await prisma.notification.findFirst({
      where: {
        id,
        workspaceId,
        userId,
      },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!notif) return null;

    return {
      ...this.mapToSummary(notif),
      deliveries: notif.deliveries.map((d) => ({
        id: d.id,
        notificationId: d.notificationId,
        channel: d.channel as any,
        status: d.status as any,
        error: d.error,
        sentAt: d.sentAt?.toISOString() || null,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Mark a notification as read.
   */
  public async markAsRead(
    workspaceId: string,
    userId: string,
    id: string
  ): Promise<NotificationSummary | null> {
    const existing = await prisma.notification.findFirst({
      where: { id, workspaceId, userId },
    });

    if (!existing) return null;

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    const summary = this.mapToSummary(updated);
    wsManager.sendToUser(workspaceId, userId, "notification.read", { id, readAt: updated.readAt });

    return summary;
  }

  /**
   * Mark a notification as unread.
   */
  public async markAsUnread(
    workspaceId: string,
    userId: string,
    id: string
  ): Promise<NotificationSummary | null> {
    const existing = await prisma.notification.findFirst({
      where: { id, workspaceId, userId },
    });

    if (!existing) return null;

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: false,
        readAt: null,
      },
    });

    const summary = this.mapToSummary(updated);
    wsManager.sendToUser(workspaceId, userId, "notification.unread", { id });

    return summary;
  }

  /**
   * Mark all notifications as read for a user in the workspace.
   */
  public async markAllAsRead(
    workspaceId: string,
    userId: string
  ): Promise<{ updatedCount: number }> {
    const now = new Date();
    const result = await prisma.notification.updateMany({
      where: {
        workspaceId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: now,
      },
    });

    wsManager.sendToUser(workspaceId, userId, "notification.read_all", {
      readAt: now.toISOString(),
      count: result.count,
    });

    return { updatedCount: result.count };
  }

  /**
   * Archive a notification.
   */
  public async archiveNotification(
    workspaceId: string,
    userId: string,
    id: string
  ): Promise<NotificationSummary | null> {
    const existing = await prisma.notification.findFirst({
      where: { id, workspaceId, userId },
    });

    if (!existing) return null;

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    const summary = this.mapToSummary(updated);
    wsManager.sendToUser(workspaceId, userId, "notification.archived", { id });

    return summary;
  }

  /**
   * Get or create notification preferences for a user in a workspace.
   */
  public async getOrCreatePreference(
    workspaceId: string,
    userId: string
  ): Promise<NotificationPreferenceSummary> {
    const existing = await prisma.notificationPreference.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (existing) {
      return this.mapToPrefSummary(existing);
    }

    // Default preferences
    const created = await prisma.notificationPreference.create({
      data: {
        workspaceId,
        userId,
        inAppEnabled: true,
        emailEnabled: false,
        emailAddress: null,
        tasksCategory: true,
        projectsCategory: true,
        crmCategory: true,
        financeCategory: true,
        documentsCategory: true,
        systemCategory: true,
        minPriority: "LOW",
      },
    });

    return this.mapToPrefSummary(created);
  }

  /**
   * Update notification preferences.
   */
  public async updatePreferences(
    workspaceId: string,
    userId: string,
    input: UpdateNotificationPreferenceInput
  ): Promise<NotificationPreferenceSummary> {
    await this.getOrCreatePreference(workspaceId, userId);

    const updated = await prisma.notificationPreference.update({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
      data: {
        inAppEnabled: input.inAppEnabled,
        emailEnabled: input.emailEnabled,
        emailAddress: input.emailAddress,
        tasksCategory: input.tasksCategory,
        projectsCategory: input.projectsCategory,
        crmCategory: input.crmCategory,
        financeCategory: input.financeCategory,
        documentsCategory: input.documentsCategory,
        systemCategory: input.systemCategory,
        minPriority: input.minPriority,
      },
    });

    // Audit log preference update
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "notification_preference:updated",
        entityType: "notification_preference",
        entityId: updated.id,
        details: input as any,
      },
    }).catch(() => {});

    return this.mapToPrefSummary(updated);
  }

  private mapToSummary(n: any): NotificationSummary {
    return {
      id: n.id,
      workspaceId: n.workspaceId,
      userId: n.userId,
      type: n.type as NotificationType,
      title: n.title,
      message: n.message,
      priority: n.priority as NotificationPriority,
      entityType: n.entityType,
      entityId: n.entityId,
      actionUrl: n.actionUrl || n.link,
      metadata: n.metadata as Record<string, unknown> | null,
      isRead: n.isRead,
      readAt: n.readAt ? n.readAt.toISOString() : null,
      isArchived: n.isArchived,
      archivedAt: n.archivedAt ? n.archivedAt.toISOString() : null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }

  private mapToPrefSummary(p: any): NotificationPreferenceSummary {
    return {
      id: p.id,
      workspaceId: p.workspaceId,
      userId: p.userId,
      inAppEnabled: p.inAppEnabled,
      emailEnabled: p.emailEnabled,
      emailAddress: p.emailAddress,
      tasksCategory: p.tasksCategory,
      projectsCategory: p.projectsCategory,
      crmCategory: p.crmCategory,
      financeCategory: p.financeCategory,
      documentsCategory: p.documentsCategory,
      systemCategory: p.systemCategory,
      minPriority: p.minPriority as NotificationPriority,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
