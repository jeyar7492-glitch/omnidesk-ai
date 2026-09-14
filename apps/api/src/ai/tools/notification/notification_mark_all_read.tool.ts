import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { NotificationService } from "../../../notifications/services/notification.service";

const NotificationMarkAllReadInputSchema = z.object({});

export class NotificationMarkAllReadTool
  implements IAITool<z.infer<typeof NotificationMarkAllReadInputSchema>, any> {
  public readonly id = "notification_mark_all_read";
  public readonly name = "Mark All Notifications as Read";
  public readonly description = "Marks all unread notifications as read for the current authenticated user in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {},
  };
  public readonly requiredPermissions: string[] = ["notification:write"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = NotificationMarkAllReadInputSchema;

  public async execute(
    _params: z.infer<typeof NotificationMarkAllReadInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = NotificationService.getInstance();
    const result = await service.markAllAsRead(context.workspaceId, context.userId);

    return {
      success: true,
      updatedCount: result.updatedCount,
      workspaceId: context.workspaceId,
      userId: context.userId,
    };
  }
}
