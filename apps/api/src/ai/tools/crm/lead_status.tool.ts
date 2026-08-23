import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const DealStageSchema = z.enum([
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

const LeadStatusInputSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  stage: DealStageSchema.describe("Target pipeline stage"),
  notes: z.string().optional(),
});

export class LeadStatusTool implements IAITool<z.infer<typeof LeadStatusInputSchema>, any> {
  public readonly id = "lead_status";
  public readonly name = "Change Lead Status";
  public readonly description = "Transitions a lead's stage (e.g. QUALIFICATION, CONTACTED, PROPOSAL, NEGOTIATION, WON, LOST).";
  public readonly parameters = {
    type: "object",
    properties: {
      leadId: { type: "string", description: "Unique lead ID" },
      stage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
      },
      notes: { type: "string", description: "Status change notes" },
    },
    required: ["leadId", "stage"],
  };
  public readonly requiredPermissions: string[] = ["lead:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = LeadStatusInputSchema;

  public async execute(
    params: z.infer<typeof LeadStatusInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await crmService.updateLead(context.workspaceId, params.leadId, {
      stage: params.stage,
      notes: params.notes,
    });

    return {
      leadId: updated.id,
      title: updated.title,
      stage: updated.stage,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
