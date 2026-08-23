import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const PipelineSummaryInputSchema = z.object({});

export class PipelineSummaryTool implements IAITool<z.infer<typeof PipelineSummaryInputSchema>, any> {
  public readonly id = "pipeline_summary";
  public readonly name = "Get Sales Pipeline Summary";
  public readonly description =
    "Calculates total active pipeline valuation, weighted forecasted revenue, won/lost metrics, and stage-wise breakdowns.";
  public readonly parameters = {
    type: "object",
    properties: {},
    required: [],
  };
  public readonly requiredPermissions: string[] = ["deal:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = PipelineSummaryInputSchema;

  public async execute(
    _params: z.infer<typeof PipelineSummaryInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const summary = await crmService.getPipelineSummary(context.workspaceId);
    return summary;
  }
}
