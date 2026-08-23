import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { milestoneService } from "../../../projects/services/milestone.service";

const MilestoneGetInputSchema = z.object({
  milestoneId: z.string().optional(),
  title: z.string().optional(),
});

export class MilestoneGetTool implements IAITool<z.infer<typeof MilestoneGetInputSchema>, any> {
  public readonly id = "milestone_get";
  public readonly name = "Get Milestone Details";
  public readonly description =
    "Fetches detailed milestone specifications, deadline, progress percentage, and linked tasks.";
  public readonly parameters = {
    type: "object",
    properties: {
      milestoneId: { type: "string", description: "Milestone ID" },
      title: { type: "string", description: "Milestone title" },
    },
  };
  public readonly requiredPermissions: string[] = ["milestone:read", "project:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = MilestoneGetInputSchema;

  public async execute(
    params: z.infer<typeof MilestoneGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.milestoneId || params.title;
    if (!identifier) {
      throw new Error("Either milestoneId or title must be provided to get milestone details");
    }

    const milestone = await milestoneService.getMilestone(context.workspaceId, identifier);

    return {
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      status: milestone.status,
      dueDate: milestone.dueDate?.toISOString() || null,
      progress: milestone.progress,
      totalTasks: milestone.totalTasks,
      completedTasks: milestone.completedTasks,
      project: milestone.project,
      tasks: milestone.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned",
      })),
    };
  }
}
