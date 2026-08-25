import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskDependencyCreateInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  dependsOnTaskId: z.string().min(1, "Dependency task ID is required"),
});

export class TaskDependencyCreateTool implements IAITool<z.infer<typeof TaskDependencyCreateInputSchema>, any> {
  public readonly id = "task_dependency_create";
  public readonly name = "Add Task Dependency";
  public readonly description =
    "Declares that a task depends on another task (is blocked by it). Enforces strict cycle detection and self-dependency prevention.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Target task ID that will be blocked" },
      dependsOnTaskId: { type: "string", description: "Pre-requisite task ID that must be finished first" },
    },
    required: ["taskId", "dependsOnTaskId"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskDependencyCreateInputSchema;

  public async execute(
    params: z.infer<typeof TaskDependencyCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await taskService.addDependency(
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
