import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskBlockersInputSchema = z.object({
  projectId: z.string().optional().describe("Optional project ID to filter blocked tasks"),
});

export class TaskBlockersTool implements IAITool<z.infer<typeof TaskBlockersInputSchema>, any> {
  public readonly id = "task_blockers";
  public readonly name = "Find Blocked Tasks";
  public readonly description =
    "Detects all tasks blocked by unresolved dependencies and provides detailed blocker resolution trees.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID to inspect" },
    },
  };
  public readonly requiredPermissions: string[] = ["task:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskBlockersInputSchema;

  public async execute(
    params: z.infer<typeof TaskBlockersInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    return taskService.getBlockedTasks(context.workspaceId, params.projectId);
  }
}
