import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { crmService } from "../../../crm/services/crm.service";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const DealUpdateInputSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  title: z.string().optional(),
  dealValue: z.number().nonnegative().optional(),
  probability: z.number().min(0).max(100).optional(),
  priority: PriorityLevelSchema.optional(),
  expectedClose: z.string().optional().describe("Expected close ISO date"),
  notes: z.string().optional(),
});

export class DealUpdateTool implements IAITool<z.infer<typeof DealUpdateInputSchema>, any> {
  public readonly id = "deal_update";
  public readonly name = "Update Deal";
  public readonly description = "Updates details, deal valuation, probability, priority, or target date for a deal.";
  public readonly parameters = {
    type: "object",
    properties: {
      dealId: { type: "string", description: "Unique deal ID" },
      title: { type: "string", description: "Updated title" },
      dealValue: { type: "number", description: "Updated deal value" },
      probability: { type: "number", description: "Updated win probability" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      expectedClose: { type: "string", description: "Updated expected close date" },
      notes: { type: "string", description: "Updated notes" },
    },
    required: ["dealId"],
  };
  public readonly requiredPermissions: string[] = ["deal:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = DealUpdateInputSchema;

  public async execute(
    params: z.infer<typeof DealUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const existing = await crmService.getDeal(context.workspaceId, params.dealId);

    const updated = await prisma.deal.update({
      where: { id: existing.id },
      data: {
        title: params.title?.trim(),
        dealValue: params.dealValue,
        probability: params.probability,
        priority: params.priority,
        expectedClose: params.expectedClose ? new Date(params.expectedClose) : undefined,
        notes: params.notes?.trim(),
      },
    });

    return {
      id: updated.id,
      title: updated.title,
      dealValue: updated.dealValue,
      stage: updated.stage,
      probability: updated.probability,
      priority: updated.priority,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
