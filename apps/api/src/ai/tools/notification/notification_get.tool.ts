import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { NotificationService } from "../../../notifications/services/notification.service";

const NotificationGetInputSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required").describe("The ID of the notification to inspect"),
});

export class NotificationGetTool implements IAITool<z.infer<typeof NotificationGetInputSchema>, any> {
  public readonly id = "notification_get";
  public readonly name = "Get Notification Details";
  public readonly description = "Retrieves details of a specific notification belonging to the current authenticated user.";
  public readonly parameters = {
    type: "object",
    properties: {
      notificationId: { type: "string", description: "The ID of the notification" },
    },
    required: ["notificationId"],
  };
  public readonly requiredPermissions: string[] = ["notification:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = NotificationGetInputSchema;

  public async execute(
    params: z.infer<typeof NotificationGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = NotificationService.getInstance();
    const notif = await service.getNotificationById(context.workspaceId, context.userId, params.notificationId);

    if (!notif) {
      return {
        found: false,
        error: "Notification not found or access denied",
      };
    }

    return {
      found: true,
      notification: notif,
    };
  }
}
