import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const OverdueFollowupsInputSchema = z.object({});

export class OverdueFollowupsTool implements IAITool<z.infer<typeof OverdueFollowupsInputSchema>, any> {
  public readonly id = "overdue_followups";
  public readonly name = "Get Overdue Follow-ups";
  public readonly description =
    "Finds all CRM follow-up activities, calls, or tasks where the due date is in the past and still pending.";
  public readonly parameters = {
    type: "object",
    properties: {},
    required: [],
  };
  public readonly requiredPermissions: string[] = ["crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = OverdueFollowupsInputSchema;

  public async execute(
    _params: z.infer<typeof OverdueFollowupsInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const result = await crmService.getOverdueFollowups(context.workspaceId);
    return result;
  }
}
