import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";
import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";

const LeadAssignInputSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  assigneeNameOrEmail: z.string().optional().describe("Team member name or email"),
  assigneeId: z.string().optional().describe("Direct User ID"),
});

export class LeadAssignTool implements IAITool<z.infer<typeof LeadAssignInputSchema>, any> {
  public readonly id = "lead_assign";
  public readonly name = "Assign Lead";
  public readonly description = "Assigns an existing lead to a sales team member in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      leadId: { type: "string", description: "Unique lead ID" },
      assigneeNameOrEmail: { type: "string", description: "Assignee name or email" },
      assigneeId: { type: "string", description: "User ID" },
    },
    required: ["leadId"],
  };
  public readonly requiredPermissions: string[] = ["lead:write", "crm:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = LeadAssignInputSchema;

  public async execute(
    params: z.infer<typeof LeadAssignInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
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

    const updated = await crmService.updateLead(context.workspaceId, params.leadId, {
      assignedUserId: targetUserId,
    });

    return {
      leadId: updated.id,
      title: updated.title,
      assignedUserId: updated.assignedUserId,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
