import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { milestoneService } from "../../../projects/services/milestone.service";

const MilestoneCompleteInputSchema = z.object({
  milestoneId: z.string().min(1, "Milestone ID is required"),
  notes: z.string().optional().describe("Completion remarks / milestone sign-off notes"),
});

export class MilestoneCompleteTool implements IAITool<z.infer<typeof MilestoneCompleteInputSchema>, any> {
  public readonly id = "milestone_complete";
  public readonly name = "Mark Milestone Complete";
  public readonly description =
    "Marks a project milestone complete, sets completion timestamp, and records sign-off notes.";
  public readonly parameters = {
    type: "object",
    properties: {
      milestoneId: { type: "string", description: "Milestone ID to mark complete" },
      notes: { type: "string", description: "Sign-off notes" },
    },
    required: ["milestoneId"],
  };
  public readonly requiredPermissions: string[] = ["milestone:write", "project:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = MilestoneCompleteInputSchema;

  public async execute(
    params: z.infer<typeof MilestoneCompleteInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await milestoneService.completeMilestone(
      context.workspaceId,
      params.milestoneId,
      params.notes
    );

    return {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      progress: updated.progress,
      completedAt: updated.completedAt?.toISOString() || null,
    };
  }
}
