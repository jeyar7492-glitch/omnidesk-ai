import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";
import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";

const DealAssignInputSchema = z.object({
  dealId: z.string().min(1, "Deal ID is required"),
  assigneeNameOrEmail: z.string().optional().describe("Team member name or email"),
  assigneeId: z.string().optional().describe("Direct User ID"),
});

export class DealAssignTool implements IAITool<z.infer<typeof DealAssignInputSchema>, any> {
  public readonly id = "deal_assign";
  public readonly name = "Assign Deal";
  public readonly description = "Assigns an existing deal to a sales team member in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      dealId: { type: "string", description: "Unique deal ID" },
      assigneeNameOrEmail: { type: "string", description: "Assignee name or email" },
      assigneeId: { type: "string", description: "User ID" },
    },
    required: ["dealId"],
  };
  public readonly requiredPermissions: string[] = ["deal:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = DealAssignInputSchema;

  public async execute(
    params: z.infer<typeof DealAssignInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const existing = await crmService.getDeal(context.workspaceId, params.dealId);
    let targetUserId = params.assigneeId;

    if (!targetUserId && params.assigneeNameOrEmail) {
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

      if (!member) {
        throw new NotFoundError(`User '${params.assigneeNameOrEmail}' not found in workspace`);
      }
      targetUserId = member.id;
    }

    const updated = await prisma.deal.update({
      where: { id: existing.id },
      data: {
        assignedUserId: targetUserId,
      },
    });

    return {
      dealId: updated.id,
      title: updated.title,
      assignedUserId: updated.assignedUserId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
