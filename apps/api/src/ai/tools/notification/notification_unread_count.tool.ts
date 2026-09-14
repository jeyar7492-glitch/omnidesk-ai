import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { NotificationService } from "../../../notifications/services/notification.service";

const NotificationUnreadCountInputSchema = z.object({});

export class NotificationUnreadCountTool
  implements IAITool<z.infer<typeof NotificationUnreadCountInputSchema>, any> {
  public readonly id = "notification_unread_count";
  public readonly name = "Get Unread Notification Count";
  public readonly description =
    "Returns the number of unread notifications for the current authenticated user in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {},
  };
  public readonly requiredPermissions: string[] = ["notification:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = NotificationUnreadCountInputSchema;

  public async execute(
    _params: z.infer<typeof NotificationUnreadCountInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = NotificationService.getInstance();
    const count = await service.getUnreadCount(context.workspaceId, context.userId);
    return {
      unreadCount: count,
      workspaceId: context.workspaceId,
      userId: context.userId,
    };
  }
}
