import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const ContactFindInputSchema = z.object({
  query: z.string().optional().describe("Search query by contact name or email"),
  customerId: z.string().optional().describe("Filter by customer company ID"),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export class ContactFindTool implements IAITool<z.infer<typeof ContactFindInputSchema>, any> {
  public readonly id = "contact_find";
  public readonly name = "Find Contacts";
  public readonly description = "Searches for contacts across the workspace database by name, email, or company.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keyword" },
      customerId: { type: "string", description: "Filter by customer ID" },
      limit: { type: "number", description: "Max results" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["contact:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = ContactFindInputSchema;

  public async execute(
    params: z.infer<typeof ContactFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const contacts = await crmService.findContacts(context.workspaceId, params);

    return {
      count: contacts.length,
      contacts: contacts.map((c) => ({
        id: c.id,
        name: `${c.firstName} ${c.lastName}`,
        email: c.email,
        phone: c.phone,
        jobTitle: c.jobTitle,
        customer: c.customer?.companyName || "No Company Linked",
      })),
    };
  }
}
