import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";
import { prisma } from "../../../lib/prisma";

const ContactCreateInputSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().optional(),
  phone: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  companyName: z.string().optional().describe("Customer company name to link with"),
  customerId: z.string().optional().describe("Customer ID"),
  isPrimary: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

export class ContactCreateTool implements IAITool<z.infer<typeof ContactCreateInputSchema>, any> {
  public readonly id = "contact_create";
  public readonly name = "Create Contact";
  public readonly description = "Adds an individual contact person and optionally links them to a customer organization.";
  public readonly parameters = {
    type: "object",
    properties: {
      firstName: { type: "string", description: "First name" },
      lastName: { type: "string", description: "Last name" },
      email: { type: "string", description: "Email address" },
      phone: { type: "string", description: "Phone number" },
      jobTitle: { type: "string", description: "Job title" },
      department: { type: "string", description: "Department" },
      companyName: { type: "string", description: "Customer company name" },
      customerId: { type: "string", description: "Customer unique ID" },
      isPrimary: { type: "boolean", description: "Whether this is the primary company contact" },
      notes: { type: "string", description: "Notes" },
    },
    required: ["firstName", "lastName"],
  };
  public readonly requiredPermissions: string[] = ["contact:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = ContactCreateInputSchema;

  public async execute(
    params: z.infer<typeof ContactCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    let resolvedCustomerId = params.customerId;

    if (!resolvedCustomerId && params.companyName) {
      const customer = await prisma.customer.findFirst({
        where: {
          workspaceId: context.workspaceId,
          companyName: { contains: params.companyName.trim(), mode: "insensitive" },
        },
      });
      if (customer) {
        resolvedCustomerId = customer.id;
      }
    }

    const contact = await crmService.createContact(context.workspaceId, {
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      jobTitle: params.jobTitle,
      department: params.department,
      customerId: resolvedCustomerId,
      isPrimary: params.isPrimary,
      notes: params.notes,
    });

    return {
      id: contact.id,
      name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      jobTitle: contact.jobTitle,
      customer: contact.customer?.companyName || "No Company Linked",
      createdAt: contact.createdAt.toISOString(),
    };
  }
}
