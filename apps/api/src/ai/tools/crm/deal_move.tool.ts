import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const DealStageSchema = z.enum([
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

const DealMoveInputSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  targetStage: DealStageSchema.describe("Target pipeline stage"),
  reason: z.string().optional().describe("Commercial reason for pipeline progression"),
});

export class DealMoveTool implements IAITool<z.infer<typeof DealMoveInputSchema>, any> {
  public readonly id = "deal_move";
  public readonly name = "Move Deal Pipeline Stage";
  public readonly description =
    "Transitions a deal between pipeline stages (QUALIFICATION -> CONTACTED -> PROPOSAL -> NEGOTIATION -> WON/LOST) enforcing sales governance.";
  public readonly parameters = {
    type: "object",
    properties: {
      dealId: { type: "string", description: "Unique deal ID" },
      targetStage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
      },
      reason: { type: "string", description: "Reason for move" },
    },
    required: ["dealId", "targetStage"],
  };
  public readonly requiredPermissions: string[] = ["deal:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = DealMoveInputSchema;

  public async execute(
    params: z.infer<typeof DealMoveInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await crmService.moveDeal(
      context.workspaceId,
      params.dealId,
      params.targetStage,
      params.reason
    );

    return {
      dealId: updated.id,
      title: updated.title,
      newStage: updated.stage,
      dealValue: updated.dealValue,
      closedAt: updated.closedAt?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
