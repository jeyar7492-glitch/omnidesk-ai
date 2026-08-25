import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";

const SystemMaintenanceInputSchema = z.object({
  action: z.enum(["clear_cache", "rotate_keys", "rebuild_indices"]),
  reason: z.string().min(5, "Reason is required for maintenance actions"),
});

export class SystemMaintenanceTool
  implements
    IAITool<
      z.infer<typeof SystemMaintenanceInputSchema>,
      { action: string; status: string; executedBy: string; timestamp: string }
    > {
  public readonly id = "system_maintenance";
  public readonly name = "System Maintenance Action";
  public readonly description =
    "Performs privileged system maintenance tasks (e.g., cache eviction, key rotation). Marked as HIGH risk and strictly requires human approval.";
  public readonly parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["clear_cache", "rotate_keys", "rebuild_indices"],
        description: "The maintenance routine to trigger",
      },
      reason: {
        type: "string",
        description: "Business or operational justification for the action",
      },
    },
    required: ["action", "reason"],
  };
  public readonly requiredPermissions: string[] = ["system:admin"];
  public readonly riskLevel: RiskLevel = "HIGH";
  public readonly workspaceScoped = true;
  public readonly schema = SystemMaintenanceInputSchema;

  public async execute(
    params: z.infer<typeof SystemMaintenanceInputSchema>,
    context: AgentExecutionContext
  ): Promise<{ action: string; status: string; executedBy: string; timestamp: string }> {
    return {
      action: params.action,
      status: "executed",
      executedBy: context.userId,
      timestamp: new Date().toISOString(),
    };
  }
}
