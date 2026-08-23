import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const CustomerGetInputSchema = z.object({
  customerId: z.string().optional().describe("Customer ObjectId"),
  companyName: z.string().optional().describe("Company name to search if ID unknown"),
});

export class CustomerGetTool implements IAITool<z.infer<typeof CustomerGetInputSchema>, any> {
  public readonly id = "customer_get";
  public readonly name = "Get Customer Details";
  public readonly description =
    "Retrieves full company profile, linked contacts, active deals, and leads for a customer.";
  public readonly parameters = {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Unique customer ID" },
      companyName: { type: "string", description: "Company name" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["customer:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = CustomerGetInputSchema;

  public async execute(
    params: z.infer<typeof CustomerGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.customerId || params.companyName;
    if (!identifier) {
      throw new Error("Must specify customerId or companyName");
    }

    const customer = await crmService.getCustomer(context.workspaceId, identifier);

    return {
      id: customer.id,
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      email: customer.email,
      phone: customer.phone,
      website: customer.website,
      industry: customer.industry,
      status: customer.status,
      contacts: customer.contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        jobTitle: c.jobTitle,
        isPrimary: c.isPrimary,
      })),
      deals: customer.deals.map((d) => ({
        id: d.id,
        title: d.title,
        dealValue: d.dealValue,
        stage: d.stage,
      })),
      leads: customer.leads.map((l) => ({
        id: l.id,
        title: l.title,
        dealValue: l.dealValue,
        stage: l.stage,
      })),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    };
  }
}
