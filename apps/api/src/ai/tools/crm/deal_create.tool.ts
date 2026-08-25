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

const DealCreateInputSchema = z.object({
  title: z.string().min(1, "Deal title is required"),
  dealValue: z.number().nonnegative("Deal value must be positive"),
  stage: DealStageSchema.optional().default("QUALIFICATION"),
  probability: z.number().min(0).max(100).optional().default(20),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  companyName: z.string().optional().describe("Customer company name to link with"),
  customerId: z.string().optional().describe("Customer unique ID"),
  contactId: z.string().optional().describe("Associated contact ID"),
  leadId: z.string().optional().describe("Associated lead ID"),
  expectedClose: z.string().optional().describe("Expected close ISO date"),
  assigneeNameOrEmail: z.string().optional().describe("Team member to assign"),
  notes: z.string().optional(),
});

export class DealCreateTool implements IAITool<z.infer<typeof DealCreateInputSchema>, any> {
  public readonly id = "deal_create";
  public readonly name = "Create Deal";
  public readonly description = "Creates a new revenue opportunity / deal in the sales pipeline.";
  public readonly parameters = {
    type: "object",
    properties: {
      title: { type: "string", description: "Deal name / opportunity title" },
      dealValue: { type: "number", description: "Monetary deal value (e.g. 50000)" },
      stage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
      },
      probability: { type: "number", description: "Win probability (0-100)" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      companyName: { type: "string", description: "Company name" },
      customerId: { type: "string", description: "Customer ID" },
      contactId: { type: "string", description: "Contact ID" },
      leadId: { type: "string", description: "Lead ID" },
      expectedClose: { type: "string", description: "Target closing date (ISO format)" },
      assigneeNameOrEmail: { type: "string", description: "Assignee name or email" },
      notes: { type: "string", description: "Deal notes" },
    },
    required: ["title", "dealValue"],
  };
  public readonly requiredPermissions: string[] = ["deal:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = DealCreateInputSchema;

  public async execute(
    params: z.infer<typeof DealCreateInputSchema>,
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

    const deal = await crmService.createDeal(context.workspaceId, {
      title: params.title,
      dealValue: params.dealValue,
      stage: params.stage,
      probability: params.probability,
      priority: params.priority,
      customerId: resolvedCustomerId,
      contactId: params.contactId,
      leadId: params.leadId,
      expectedClose: params.expectedClose ? new Date(params.expectedClose) : undefined,
      assignedUserId: resolvedAssigneeId,
      notes: params.notes,
    });

    return {
      id: deal.id,
      title: deal.title,
      dealValue: deal.dealValue,
      stage: deal.stage,
      probability: deal.probability,
      priority: deal.priority,
      customer: deal.customer?.companyName || "No Company Linked",
      createdAt: deal.createdAt.toISOString(),
    };
  }
}
