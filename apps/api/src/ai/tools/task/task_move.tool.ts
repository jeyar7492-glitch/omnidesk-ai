import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { wsManager } from "../../../lib/websocket";
import { NotFoundError, ValidationError } from "../../../lib/errors";

const VALID_STATUSES = ["backlog", "todo", "in_progress", "review", "done"] as const;

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  backlog: ["todo", "in_progress"],
  todo: ["in_progress", "backlog"],
  in_progress: ["review", "done", "todo"],
  review: ["done", "in_progress"],
  done: ["todo", "in_progress"],
};

const TaskMoveInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  targetStatus: z.enum(VALID_STATUSES).describe("Target workflow stage"),
  reason: z.string().optional().describe("Operational rationale for moving the task"),
});

export class TaskMoveTool implements IAITool<z.infer<typeof TaskMoveInputSchema>, any> {
  public readonly id = "task_move";
  public readonly name = "Move Task Workflow Stage";
  public readonly description =
    "Transitions a task between workflow stages (backlog, todo, in_progress, review, done) according to workflow governance rules.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      targetStatus: {
        type: "string",
        enum: ["backlog", "todo", "in_progress", "review", "done"],
        description: "Target stage",
      },
      reason: { type: "string", description: "Optional transition rationale" },
    },
    required: ["taskId", "targetStatus"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskMoveInputSchema;

  public async execute(
    params: z.infer<typeof TaskMoveInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
    });

    if (!task || task.workspaceId !== context.workspaceId) {
      throw new NotFoundError(`Task '${params.taskId}' not found in workspace`);
    }

    const currentStatus = task.status.toLowerCase();
    const targetStatus = params.targetStatus.toLowerCase();

    if (currentStatus === targetStatus) {
      return {
        taskId: task.id,
        title: task.title,
        status: targetStatus,
        message: `Task is already in '${targetStatus}' stage`,
      };
    }

    // Validate workflow transition
    const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus)) {
      throw new ValidationError(
        `Invalid workflow transition: Cannot move task directly from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${allowed.join(
          ", "
        )}]`
      );
    }

    const completedAt = targetStatus === "done" ? new Date() : currentStatus === "done" ? null : task.completedAt;

    const updated = await prisma.task.update({
      where: { id: params.taskId },
      data: {
        status: targetStatus,
        completedAt,
      },
      include: {
        assignee: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(context.workspaceId, "task:moved", {
      taskId: updated.id,
      title: updated.title,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      completedAt: updated.completedAt?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });

    return {
      taskId: updated.id,
      title: updated.title,
      previousStatus: currentStatus,
      newStatus: targetStatus,
      completedAt: updated.completedAt?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
