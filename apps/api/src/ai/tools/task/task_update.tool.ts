import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { wsManager } from "../../../lib/websocket";
import { NotFoundError } from "../../../lib/errors";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const TaskUpdateInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: PriorityLevelSchema.optional(),
  dueDate: z.string().optional().describe("ISO date string for due date"),
  estimatedHours: z.number().positive().optional(),
});

export class TaskUpdateTool implements IAITool<z.infer<typeof TaskUpdateInputSchema>, any> {
  public readonly id = "task_update";
  public readonly name = "Update Task";
  public readonly description = "Updates details, priority, due date, or description for an existing task in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      title: { type: "string", description: "New title" },
      description: { type: "string", description: "New description" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "New priority" },
      dueDate: { type: "string", description: "New due date in ISO format" },
      estimatedHours: { type: "number", description: "Updated estimated hours" },
    },
    required: ["taskId"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskUpdateInputSchema;

  public async execute(
    params: z.infer<typeof TaskUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const existing = await prisma.task.findUnique({
      where: { id: params.taskId },
    });

    if (!existing || existing.workspaceId !== context.workspaceId) {
      throw new NotFoundError(`Task '${params.taskId}' not found in workspace`);
    }

    const updateData: any = {};
    if (params.title) updateData.title = params.title.trim();
    if (params.description !== undefined) updateData.description = params.description.trim();
    if (params.priority) updateData.priority = params.priority;
    if (params.dueDate) updateData.dueDate = new Date(params.dueDate);
    if (params.estimatedHours) updateData.estimatedHours = params.estimatedHours;

    const updated = await prisma.task.update({
      where: { id: params.taskId },
      data: updateData,
      include: {
        assignee: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(context.workspaceId, "task:updated", {
      taskId: updated.id,
      title: updated.title,
      priority: updated.priority,
      status: updated.status,
      updatedAt: updated.updatedAt.toISOString(),
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      priority: updated.priority,
      status: updated.status,
      dueDate: updated.dueDate?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
