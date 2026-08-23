import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TeamWorkloadInputSchema = z.object({});

export class TeamWorkloadTool implements IAITool<z.infer<typeof TeamWorkloadInputSchema>, any> {
  public readonly id = "team_workload";
  public readonly name = "Analyze Team Workload";
  public readonly description =
    "Analyzes workload distribution, active assignments, in-progress tasks, and overdue task bottlenecks across all workspace members.";
  public readonly parameters = {
    type: "object",
    properties: {},
  };
  public readonly requiredPermissions: string[] = ["task:read", "project:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TeamWorkloadInputSchema;

  public async execute(
    _params: z.infer<typeof TeamWorkloadInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    return taskService.getTeamWorkload(context.workspaceId);
  }
}
