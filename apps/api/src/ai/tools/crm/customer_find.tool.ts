import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const CustomerFindInputSchema = z.object({
  query: z.string().optional().describe("Search query across company name, contact person, or email"),
  industry: z.string().optional().describe("Filter by industry sector"),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export class CustomerFindTool implements IAITool<z.infer<typeof CustomerFindInputSchema>, any> {
  public readonly id = "customer_find";
  public readonly name = "Find Customers";
  public readonly description = "Searches for existing customer organizations in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keyword" },
      industry: { type: "string", description: "Industry" },
      limit: { type: "number", description: "Max results" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["customer:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = CustomerFindInputSchema;

  public async execute(
    params: z.infer<typeof CustomerFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const customers = await crmService.findCustomers(context.workspaceId, params);

    return {
      count: customers.length,
      customers: customers.map((c) => ({
        id: c.id,
        companyName: c.companyName,
        contactPerson: c.contactPerson,
        email: c.email,
        industry: c.industry,
        status: c.status,
        dealCount: c._count?.deals || 0,
        leadCount: c._count?.leads || 0,
      })),
    };
  }
}
