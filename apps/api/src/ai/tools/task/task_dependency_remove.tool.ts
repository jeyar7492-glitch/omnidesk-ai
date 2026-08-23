import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskDependencyRemoveInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  dependsOnTaskId: z.string().min(1, "Dependency task ID to remove"),
});

export class TaskDependencyRemoveTool implements IAITool<z.infer<typeof TaskDependencyRemoveInputSchema>, any> {
  public readonly id = "task_dependency_remove";
  public readonly name = "Remove Task Dependency";
  public readonly description =
    "Removes a dependency relationship between tasks and recalculates blocker states.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Target task ID" },
      dependsOnTaskId: { type: "string", description: "Dependency task ID to detach" },
    },
    required: ["taskId", "dependsOnTaskId"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskDependencyRemoveInputSchema;

  public async execute(
    params: z.infer<typeof TaskDependencyRemoveInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await taskService.removeDependency(
      context.workspaceId,
      params.taskId,
      params.dependsOnTaskId
    );

    return {
      taskId: updated.id,
      title: updated.title,
      dependencies: updated.dependencies,
      isBlocked: updated.isBlocked,
      blockedReason: updated.blockedReason,
    };
  }
}
