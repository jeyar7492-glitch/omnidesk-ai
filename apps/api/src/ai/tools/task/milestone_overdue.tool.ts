import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { milestoneService } from "../../../projects/services/milestone.service";

const MilestoneOverdueInputSchema = z.object({
  projectId: z.string().optional().describe("Optional project ID to filter"),
});

export class MilestoneOverdueTool implements IAITool<z.infer<typeof MilestoneOverdueInputSchema>, any> {
  public readonly id = "milestone_overdue";
  public readonly name = "Detect Overdue Milestones";
  public readonly description =
    "Identifies all milestones across the workspace or a specific project that have elapsed their target deadline without completion.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID" },
    },
  };
  public readonly requiredPermissions: string[] = ["milestone:read", "project:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = MilestoneOverdueInputSchema;

  public async execute(
    params: z.infer<typeof MilestoneOverdueInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    return milestoneService.getOverdueMilestones(context.workspaceId, params.projectId);
  }
}
