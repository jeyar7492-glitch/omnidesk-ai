import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const DealGetInputSchema = z.object({
  dealId: z.string().optional().describe("Deal ObjectId"),
  title: z.string().optional().describe("Deal title if ID is not known"),
});

export class DealGetTool implements IAITool<z.infer<typeof DealGetInputSchema>, any> {
  public readonly id = "deal_get";
  public readonly name = "Get Deal Details";
  public readonly description = "Retrieves complete deal information including pipeline stage, customer, contact, and notes.";
  public readonly parameters = {
    type: "object",
    properties: {
      dealId: { type: "string", description: "Unique deal ID" },
      title: { type: "string", description: "Deal title" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["deal:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = DealGetInputSchema;

  public async execute(
    params: z.infer<typeof DealGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.dealId || params.title;
    if (!identifier) {
      throw new Error("Must specify dealId or title");
    }

    const deal = await crmService.getDeal(context.workspaceId, identifier);

    return {
      id: deal.id,
      title: deal.title,
      dealValue: deal.dealValue,
      stage: deal.stage,
      probability: deal.probability,
      priority: deal.priority,
      expectedClose: deal.expectedClose?.toISOString(),
      closedAt: deal.closedAt?.toISOString(),
      customer: deal.customer
        ? { id: deal.customer.id, companyName: deal.customer.companyName }
        : null,
      contact: deal.contact
        ? { id: deal.contact.id, name: `${deal.contact.firstName} ${deal.contact.lastName}` }
        : null,
      notes: deal.notes,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
    };
  }
}
