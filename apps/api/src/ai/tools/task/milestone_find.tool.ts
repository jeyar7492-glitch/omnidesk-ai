import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { milestoneService } from "../../../projects/services/milestone.service";

const MilestoneFindInputSchema = z.object({
  projectId: z.string().optional(),
  status: z.string().optional(),
  query: z.string().optional(),
  limit: z.number().int().positive().optional().default(50),
});

export class MilestoneFindTool implements IAITool<z.infer<typeof MilestoneFindInputSchema>, any> {
  public readonly id = "milestone_find";
  public readonly name = "Find Milestones";
  public readonly description =
    "Searches and retrieves milestones filtered by project, status, or keyword.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Filter by project ID" },
      status: { type: "string", description: "Filter by status" },
      query: { type: "string", description: "Search keyword" },
      limit: { type: "number", description: "Limit results" },
    },
  };
  public readonly requiredPermissions: string[] = ["milestone:read", "project:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = MilestoneFindInputSchema;

  public async execute(
    params: z.infer<typeof MilestoneFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const milestones = await milestoneService.findMilestones(context.workspaceId, {
      projectId: params.projectId,
      status: params.status,
      query: params.query,
      limit: params.limit,
    });

    return {
      count: milestones.length,
      milestones,
    };
  }
}
