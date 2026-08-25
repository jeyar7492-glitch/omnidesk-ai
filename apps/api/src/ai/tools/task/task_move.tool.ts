import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService, VALID_TASK_STATUSES } from "../../../tasks/services/task.service";

const TaskMoveInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  targetStatus: z.enum(VALID_TASK_STATUSES).describe("Target workflow stage"),
  reason: z.string().optional().describe("Operational rationale for moving the task"),
});

export class TaskMoveTool implements IAITool<z.infer<typeof TaskMoveInputSchema>, any> {
  public readonly id = "task_move";
  public readonly name = "Move Task Workflow Stage";
  public readonly description =
    "Transitions a task between workflow stages (backlog, todo, in_progress, review, testing, done) according to workflow governance rules.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      targetStatus: {
        type: "string",
        enum: ["backlog", "todo", "in_progress", "review", "testing", "done"],
        description: "Target stage",
      },
      reason: { type: "string", description: "Optional transition rationale" },
    },
    required: ["taskId", "targetStatus"],
  };
  public readonly requiredPermissions: string[] = ["task:move", "task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskMoveInputSchema;

  public async execute(
    params: z.infer<typeof TaskMoveInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await taskService.moveTask(
      context.workspaceId,
      params.taskId,
      params.targetStatus,
      params.reason
    );

    return {
      taskId: updated.id,
      title: updated.title,
      newStatus: updated.status,
      completedAt: updated.completedAt?.toISOString() || null,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
