import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const ContactUpdateInputSchema = z.object({
  contactId: z.string().min(1, "Contact ID is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  isPrimary: z.boolean().optional(),
  notes: z.string().optional(),
});

export class ContactUpdateTool implements IAITool<z.infer<typeof ContactUpdateInputSchema>, any> {
  public readonly id = "contact_update";
  public readonly name = "Update Contact";
  public readonly description = "Updates details, phone, email, or department for an existing contact.";
  public readonly parameters = {
    type: "object",
    properties: {
      contactId: { type: "string", description: "Unique contact ID" },
      firstName: { type: "string", description: "First name" },
      lastName: { type: "string", description: "Last name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      jobTitle: { type: "string", description: "Job title" },
      department: { type: "string", description: "Department" },
      isPrimary: { type: "boolean", description: "Is primary contact" },
      notes: { type: "string", description: "Notes" },
    },
    required: ["contactId"],
  };
  public readonly requiredPermissions: string[] = ["contact:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = ContactUpdateInputSchema;

  public async execute(
    params: z.infer<typeof ContactUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await crmService.updateContact(context.workspaceId, params.contactId, params);

    return {
      id: updated.id,
      name: `${updated.firstName} ${updated.lastName}`,
      email: updated.email,
      phone: updated.phone,
      jobTitle: updated.jobTitle,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
