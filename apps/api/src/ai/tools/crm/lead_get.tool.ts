import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const LeadGetInputSchema = z.object({
  leadId: z.string().optional().describe("Lead ObjectId"),
  title: z.string().optional().describe("Lead title to find if ID is not known"),
});

export class LeadGetTool implements IAITool<z.infer<typeof LeadGetInputSchema>, any> {
  public readonly id = "lead_get";
  public readonly name = "Get Lead Details";
  public readonly description =
    "Retrieves comprehensive details for a specific lead, including associated customer company and deal status.";
  public readonly parameters = {
    type: "object",
    properties: {
      leadId: { type: "string", description: "Unique lead ID" },
      title: { type: "string", description: "Lead title" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["lead:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = LeadGetInputSchema;

  public async execute(
    params: z.infer<typeof LeadGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.leadId || params.title;
    if (!identifier) {
      throw new Error("Must specify either leadId or title to get lead details");
    }

    const lead = await crmService.getLead(context.workspaceId, identifier);

    return {
      id: lead.id,
      title: lead.title,
      dealValue: lead.dealValue,
      stage: lead.stage,
      probability: lead.probability,
      priority: lead.priority,
      expectedClose: lead.expectedClose?.toISOString(),
      customer: lead.customer
        ? { id: lead.customer.id, companyName: lead.customer.companyName, email: lead.customer.email }
        : null,
      notes: lead.notes,
      deals: lead.deals.map((d) => ({ id: d.id, title: d.title, stage: d.stage, dealValue: d.dealValue })),
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
    };
  }
}
