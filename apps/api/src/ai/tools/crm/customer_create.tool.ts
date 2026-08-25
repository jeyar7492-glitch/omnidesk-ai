import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const CustomerCreateInputSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export class CustomerCreateTool implements IAITool<z.infer<typeof CustomerCreateInputSchema>, any> {
  public readonly id = "customer_create";
  public readonly name = "Create Customer Account";
  public readonly description = "Registers a new customer company or client account in the workspace database.";
  public readonly parameters = {
    type: "object",
    properties: {
      companyName: { type: "string", description: "Company or account name" },
      contactPerson: { type: "string", description: "Primary contact person name" },
      email: { type: "string", description: "Primary contact email" },
      phone: { type: "string", description: "Phone number" },
      website: { type: "string", description: "Company website URL" },
      industry: { type: "string", description: "Industry sector" },
      city: { type: "string", description: "City" },
      country: { type: "string", description: "Country" },
    },
    required: ["companyName"],
  };
  public readonly requiredPermissions: string[] = ["customer:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = CustomerCreateInputSchema;

  public async execute(
    params: z.infer<typeof CustomerCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const customer = await crmService.createCustomer(context.workspaceId, params);

    return {
      id: customer.id,
      companyName: customer.companyName,
      contactPerson: customer.contactPerson,
      email: customer.email,
      industry: customer.industry,
      status: customer.status,
      createdAt: customer.createdAt.toISOString(),
    };
  }
}
