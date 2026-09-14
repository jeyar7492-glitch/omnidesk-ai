import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { NotificationService } from "../../../notifications/services/notification.service";

const NotificationMarkReadInputSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required").describe("The ID of the notification to mark as read"),
});

export class NotificationMarkReadTool
  implements IAITool<z.infer<typeof NotificationMarkReadInputSchema>, any> {
  public readonly id = "notification_mark_read";
  public readonly name = "Mark Notification as Read";
  public readonly description = "Marks a specific notification as read for the current authenticated user.";
  public readonly parameters = {
    type: "object",
    properties: {
      notificationId: { type: "string", description: "The ID of the notification" },
    },
    required: ["notificationId"],
  };
  public readonly requiredPermissions: string[] = ["notification:write"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = NotificationMarkReadInputSchema;

  public async execute(
    params: z.infer<typeof NotificationMarkReadInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = NotificationService.getInstance();
    const updated = await service.markAsRead(context.workspaceId, context.userId, params.notificationId);

    if (!updated) {
      return {
        success: false,
        error: "Notification not found or access denied",
      };
    }

    return {
      success: true,
      notificationId: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt,
    };
  }
}
