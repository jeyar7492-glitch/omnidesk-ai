import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskAssignInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  assigneeNameOrEmail: z.string().optional().describe("Assignee name or email to resolve"),
  assigneeId: z.string().optional().describe("Direct user ObjectId"),
});

export class TaskAssignTool implements IAITool<z.infer<typeof TaskAssignInputSchema>, any> {
  public readonly id = "task_assign";
  public readonly name = "Assign Task";
  public readonly description =
    "Assigns or reassigns a task to a workspace member by resolving their user ID, name, or email.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      assigneeNameOrEmail: { type: "string", description: "Name or email of assignee" },
      assigneeId: { type: "string", description: "Direct assignee user ID" },
    },
    required: ["taskId"],
  };
  public readonly requiredPermissions: string[] = ["task:assign", "task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskAssignInputSchema;

  public async execute(
    params: z.infer<typeof TaskAssignInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await taskService.assignTask(
      context.workspaceId,
      params.taskId,
      params.assigneeId || params.assigneeNameOrEmail
    );

    return {
      taskId: updated.id,
      title: updated.title,
      assignee: updated.assignee ? `${updated.assignee.firstName} ${updated.assignee.lastName}` : "Unassigned",
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
