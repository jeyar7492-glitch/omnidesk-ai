import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";
import { prisma } from "../../../lib/prisma";
import { wsManager } from "../../../lib/websocket";

const DealCloseInputSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  outcome: z.enum(["WON", "LOST"]).describe("Closing outcome (WON or LOST)"),
  lostReason: z.string().optional().describe("Reason if lost"),
  notes: z.string().optional().describe("Closing or contract notes"),
});

export class DealCloseTool implements IAITool<z.infer<typeof DealCloseInputSchema>, any> {
  public readonly id = "deal_close";
  public readonly name = "Close Deal (Won/Lost)";
  public readonly description =
    "Formally closes a sales deal as WON or LOST. Requires recording lost reasons or win agreements.";
  public readonly parameters = {
    type: "object",
    properties: {
      dealId: { type: "string", description: "Unique deal ID" },
      outcome: { type: "string", enum: ["WON", "LOST"], description: "Close outcome" },
      lostReason: { type: "string", description: "Reason if lost" },
      notes: { type: "string", description: "Closing notes" },
    },
    required: ["dealId", "outcome"],
  };
  public readonly requiredPermissions: string[] = ["deal:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "HIGH";
  public readonly workspaceScoped = true;
  public readonly schema = DealCloseInputSchema;

  public async execute(
    params: z.infer<typeof DealCloseInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const deal = await crmService.getDeal(context.workspaceId, params.dealId);

    const updated = await prisma.deal.update({
      where: { id: deal.id },
      data: {
        stage: params.outcome,
        closedAt: new Date(),
        lostReason: params.outcome === "LOST" ? params.lostReason : null,
        notes: params.notes ? `${deal.notes ? deal.notes + "\n" : ""}Closed as ${params.outcome}: ${params.notes}` : deal.notes,
      },
      include: { customer: { select: { companyName: true } } },
    });

    wsManager.broadcastToWorkspace(context.workspaceId, "crm:deal_closed", {
      dealId: updated.id,
      title: updated.title,
      outcome: params.outcome,
      dealValue: updated.dealValue,
      closedAt: updated.closedAt?.toISOString(),
    });

    return {
      dealId: updated.id,
      title: updated.title,
      outcome: params.outcome,
      dealValue: updated.dealValue,
      lostReason: updated.lostReason,
      closedAt: updated.closedAt?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
