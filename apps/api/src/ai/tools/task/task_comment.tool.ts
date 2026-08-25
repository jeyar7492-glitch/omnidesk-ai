import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskCommentInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  content: z.string().min(1, "Comment content is required").max(4000),
});

export class TaskCommentTool implements IAITool<z.infer<typeof TaskCommentInputSchema>, any> {
  public readonly id = "task_comment";
  public readonly name = "Add Task Comment";
  public readonly description =
    "Appends an activity comment or status note to a task in the authenticated workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Target task ID" },
      content: { type: "string", description: "Comment body or update note" },
    },
    required: ["taskId", "content"],
  };
  public readonly requiredPermissions: string[] = ["task:write", "comment:write"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskCommentInputSchema;

  public async execute(
    params: z.infer<typeof TaskCommentInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const comment = await taskService.addComment(
      context.workspaceId,
      params.taskId,
      context.userId,
      params.content
    );

    return {
      commentId: comment.id,
      taskId: comment.taskId,
      author: `${comment.user.firstName} ${comment.user.lastName}`,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
