import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { wsManager } from "../../../lib/websocket";
import { NotFoundError } from "../../../lib/errors";

const TaskCommentInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  content: z.string().min(1, "Comment content cannot be empty").max(2000),
});

export class TaskCommentTool implements IAITool<z.infer<typeof TaskCommentInputSchema>, any> {
  public readonly id = "task_comment";
  public readonly name = "Add Task Comment";
  public readonly description = "Adds a discussion comment or status update to an existing task in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      content: { type: "string", description: "Comment message text" },
    },
    required: ["taskId", "content"],
  };
  public readonly requiredPermissions: string[] = ["task:write", "task:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskCommentInputSchema;

  public async execute(
    params: z.infer<typeof TaskCommentInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
    });

    if (!task || task.workspaceId !== context.workspaceId) {
      throw new NotFoundError(`Task '${params.taskId}' not found in workspace`);
    }

    // Lookup user author or fallback gracefully
    let authorName = "Team Member";
    try {
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        authorName = `${user.firstName} ${user.lastName}`;
      }
    } catch {
      // Graceful fallback
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: params.taskId,
        userId: context.userId,
        content: params.content.trim(),
      },
    });

    wsManager.broadcastToWorkspace(context.workspaceId, "task:commented", {
      taskId: params.taskId,
      commentId: comment.id,
      author: authorName,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    });

    return {
      commentId: comment.id,
      taskId: comment.taskId,
      author: authorName,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
    };
  }
}
