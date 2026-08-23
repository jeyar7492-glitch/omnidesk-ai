import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const CustomerUpdateInputSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  status: z.string().optional(),
});

export class CustomerUpdateTool implements IAITool<z.infer<typeof CustomerUpdateInputSchema>, any> {
  public readonly id = "customer_update";
  public readonly name = "Update Customer Account";
  public readonly description = "Updates details for an existing customer organization in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Unique customer ID" },
      companyName: { type: "string", description: "Updated company name" },
      contactPerson: { type: "string", description: "Updated contact person" },
      email: { type: "string", description: "Updated email" },
      phone: { type: "string", description: "Updated phone" },
      website: { type: "string", description: "Updated website" },
      industry: { type: "string", description: "Updated industry" },
      status: { type: "string", description: "Updated status (active/inactive)" },
    },
    required: ["customerId"],
  };
  public readonly requiredPermissions: string[] = ["customer:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = CustomerUpdateInputSchema;

  public async execute(
    params: z.infer<typeof CustomerUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await crmService.updateCustomer(context.workspaceId, params.customerId, params);

    return {
      id: updated.id,
      companyName: updated.companyName,
      contactPerson: updated.contactPerson,
      email: updated.email,
      industry: updated.industry,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
