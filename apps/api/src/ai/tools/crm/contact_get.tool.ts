import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const ContactGetInputSchema = z.object({
  contactId: z.string().optional().describe("Contact ObjectId"),
  nameOrEmail: z.string().optional().describe("Contact name or email address"),
});

export class ContactGetTool implements IAITool<z.infer<typeof ContactGetInputSchema>, any> {
  public readonly id = "contact_get";
  public readonly name = "Get Contact Details";
  public readonly description = "Retrieves full contact details, affiliated company profile, and active deals.";
  public readonly parameters = {
    type: "object",
    properties: {
      contactId: { type: "string", description: "Unique contact ID" },
      nameOrEmail: { type: "string", description: "Name or email" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["contact:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = ContactGetInputSchema;

  public async execute(
    params: z.infer<typeof ContactGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.contactId || params.nameOrEmail;
    if (!identifier) {
      throw new Error("Must specify contactId or nameOrEmail");
    }

    const contact = await crmService.getContact(context.workspaceId, identifier);

    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      jobTitle: contact.jobTitle,
      department: contact.department,
      isPrimary: contact.isPrimary,
      customer: contact.customer
        ? { id: contact.customer.id, companyName: contact.customer.companyName }
        : null,
      deals: contact.deals.map((d) => ({ id: d.id, title: d.title, stage: d.stage, dealValue: d.dealValue })),
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }
}
