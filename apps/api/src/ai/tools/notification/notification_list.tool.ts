import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { NotificationService } from "../../../notifications/services/notification.service";

const NotificationListInputSchema = z.object({
  isRead: z.boolean().optional().describe("Filter by read status (true for read, false for unread)"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().describe("Filter by notification priority"),
  page: z.number().int().positive().optional().default(1).describe("Page number"),
  perPage: z.number().int().positive().max(50).optional().default(10).describe("Number of notifications per page"),
});

export class NotificationListTool implements IAITool<z.infer<typeof NotificationListInputSchema>, any> {
  public readonly id = "notification_list";
  public readonly name = "List Notifications";
  public readonly description = "Retrieves user notifications for the current authenticated user in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      isRead: { type: "boolean", description: "Filter by read status" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "Filter by priority" },
      page: { type: "number", description: "Page number" },
      perPage: { type: "number", description: "Items per page" },
    },
  };
  public readonly requiredPermissions: string[] = ["notification:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = NotificationListInputSchema;

  public async execute(
    params: z.infer<typeof NotificationListInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = NotificationService.getInstance();
    const result = await service.listNotifications(context.workspaceId, context.userId, {
      isRead: params.isRead,
      priority: params.priority as any,
      page: params.page,
      perPage: params.perPage,
    });

    return {
      total: result.total,
      unreadCount: result.unreadCount,
      page: result.page,
      notifications: result.notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        priority: n.priority,
        isRead: n.isRead,
        createdAt: n.createdAt,
        actionUrl: n.actionUrl,
      })),
    };
  }
}
