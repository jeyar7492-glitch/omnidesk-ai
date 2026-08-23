import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { milestoneService } from "../../../projects/services/milestone.service";

const MilestoneUpdateInputSchema = z.object({
  milestoneId: z.string().min(1, "Milestone ID is required"),
  title: z.string().optional(),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  assignedUserId: z.string().optional(),
});

export class MilestoneUpdateTool implements IAITool<z.infer<typeof MilestoneUpdateInputSchema>, any> {
  public readonly id = "milestone_update";
  public readonly name = "Update Milestone";
  public readonly description =
    "Modifies milestone metadata, updates deadline, status, or deliverables description.";
  public readonly parameters = {
    type: "object",
    properties: {
      milestoneId: { type: "string", description: "Milestone ID" },
      title: { type: "string", description: "Updated title" },
      description: { type: "string", description: "Updated description" },
      dueDate: { type: "string", description: "Updated due date in ISO format" },
      status: { type: "string", description: "Updated status" },
    },
    required: ["milestoneId"],
  };
  public readonly requiredPermissions: string[] = ["milestone:write", "project:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = MilestoneUpdateInputSchema;

  public async execute(
    params: z.infer<typeof MilestoneUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await milestoneService.updateMilestone(context.workspaceId, params.milestoneId, {
      title: params.title,
      description: params.description,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      status: params.status,
      assignedUserId: params.assignedUserId,
    });

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      dueDate: updated.dueDate?.toISOString() || null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
