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

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const LeadUpdateInputSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  title: z.string().optional(),
  dealValue: z.number().nonnegative().optional(),
  stage: DealStageSchema.optional(),
  probability: z.number().min(0).max(100).optional(),
  priority: PriorityLevelSchema.optional(),
  expectedClose: z.string().optional().describe("Expected close ISO date string"),
  notes: z.string().optional(),
});

export class LeadUpdateTool implements IAITool<z.infer<typeof LeadUpdateInputSchema>, any> {
  public readonly id = "lead_update";
  public readonly name = "Update Lead";
  public readonly description = "Updates details, valuation, probability, priority, or notes for an existing lead.";
  public readonly parameters = {
    type: "object",
    properties: {
      leadId: { type: "string", description: "Unique lead ID" },
      title: { type: "string", description: "Updated lead title" },
      dealValue: { type: "number", description: "Updated deal value" },
      stage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
      },
      probability: { type: "number", description: "Updated win probability" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      expectedClose: { type: "string", description: "Updated expected close date" },
      notes: { type: "string", description: "Updated notes" },
    },
    required: ["leadId"],
  };
  public readonly requiredPermissions: string[] = ["lead:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = LeadUpdateInputSchema;

  public async execute(
    params: z.infer<typeof LeadUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await crmService.updateLead(context.workspaceId, params.leadId, {
      title: params.title,
      dealValue: params.dealValue,
      stage: params.stage,
      probability: params.probability,
      priority: params.priority,
      expectedClose: params.expectedClose ? new Date(params.expectedClose) : undefined,
      notes: params.notes,
    });

    return {
      id: updated.id,
      title: updated.title,
      dealValue: updated.dealValue,
      stage: updated.stage,
      priority: updated.priority,
      customer: updated.customer?.companyName || "No Company Linked",
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
