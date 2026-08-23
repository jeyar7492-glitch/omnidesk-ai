import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const StaleDealsInputSchema = z.object({
  daysInactive: z.number().int().min(1).max(365).optional().default(14).describe("Days without activity/updates"),
});

export class StaleDealsTool implements IAITool<z.infer<typeof StaleDealsInputSchema>, any> {
  public readonly id = "stale_deals";
  public readonly name = "Detect Stale Deals";
  public readonly description =
    "Finds active pipeline deals that have had no updates or progress for a given number of days (default: 14 days).";
  public readonly parameters = {
    type: "object",
    properties: {
      daysInactive: { type: "number", description: "Days of inactivity threshold" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["deal:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = StaleDealsInputSchema;

  public async execute(
    params: z.infer<typeof StaleDealsInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const result = await crmService.getStaleDeals(context.workspaceId, params.daysInactive);
    return result;
  }
}
