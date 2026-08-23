import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";
import { prisma } from "../../../lib/prisma";

const DealStageSchema = z.enum([
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const LeadCreateInputSchema = z.object({
  title: z.string().min(1, "Lead title is required"),
  companyName: z.string().optional().describe("Company name to link or create as customer"),
  customerId: z.string().optional().describe("Existing customer ID"),
  dealValue: z.number().nonnegative().optional().default(0),
  stage: DealStageSchema.optional().default("QUALIFICATION"),
  probability: z.number().min(0).max(100).optional().default(20),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  expectedClose: z.string().optional().describe("Expected close ISO date string"),
  assigneeNameOrEmail: z.string().optional().describe("Team member to assign"),
  notes: z.string().optional(),
});

export class LeadCreateTool implements IAITool<z.infer<typeof LeadCreateInputSchema>, any> {
  public readonly id = "lead_create";
  public readonly name = "Create Lead";
  public readonly description =
    "Creates a new sales lead in the workspace database and optionally associates it with a customer.";
  public readonly parameters = {
    type: "object",
    properties: {
      title: { type: "string", description: "Lead title or summary" },
      companyName: { type: "string", description: "Customer company name" },
      customerId: { type: "string", description: "Existing customer ID" },
      dealValue: { type: "number", description: "Estimated lead value" },
      stage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
        description: "Initial stage",
      },
      probability: { type: "number", description: "Win probability (0-100)" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      expectedClose: { type: "string", description: "Expected close ISO date" },
      assigneeNameOrEmail: { type: "string", description: "Assignee name or email" },
      notes: { type: "string", description: "Initial lead notes" },
    },
    required: ["title"],
  };
  public readonly requiredPermissions: string[] = ["lead:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = LeadCreateInputSchema;

  public async execute(
    params: z.infer<typeof LeadCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    let resolvedCustomerId = params.customerId;

    // Resolve or find customer by company name if provided
    if (!resolvedCustomerId && params.companyName) {
      const existingCust = await prisma.customer.findFirst({
        where: {
          workspaceId: context.workspaceId,
          companyName: { contains: params.companyName.trim(), mode: "insensitive" },
        },
      });

      if (existingCust) {
        resolvedCustomerId = existingCust.id;
      } else {
        // Auto-create customer organization
        const newCust = await crmService.createCustomer(context.workspaceId, {
          companyName: params.companyName.trim(),
        });
        resolvedCustomerId = newCust.id;
      }
    }

    let resolvedAssigneeId: string | undefined;
    if (params.assigneeNameOrEmail) {
      const needle = params.assigneeNameOrEmail.trim().toLowerCase();
      const member = await prisma.user.findFirst({
        where: {
          memberships: { some: { workspaceId: context.workspaceId } },
          OR: [
            { email: { contains: needle, mode: "insensitive" } },
            { firstName: { contains: needle, mode: "insensitive" } },
            { lastName: { contains: needle, mode: "insensitive" } },
          ],
        },
      });
      if (member) {
        resolvedAssigneeId = member.id;
      }
    }

    const lead = await crmService.createLead(context.workspaceId, {
      title: params.title,
      customerId: resolvedCustomerId,
      dealValue: params.dealValue,
      stage: params.stage,
      probability: params.probability,
      priority: params.priority,
      expectedClose: params.expectedClose ? new Date(params.expectedClose) : undefined,
      assignedUserId: resolvedAssigneeId,
      notes: params.notes,
    });

    return {
      id: lead.id,
      title: lead.title,
      dealValue: lead.dealValue,
      stage: lead.stage,
      probability: lead.probability,
      priority: lead.priority,
      customer: lead.customer?.companyName || "No Company Linked",
      createdAt: lead.createdAt.toISOString(),
    };
  }
}
