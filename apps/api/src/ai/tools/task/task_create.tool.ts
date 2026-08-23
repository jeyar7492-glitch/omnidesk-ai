import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { wsManager } from "../../../lib/websocket";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const TaskCreateInputSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().optional(),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  status: z.string().optional().default("todo"),
  assigneeNameOrEmail: z.string().optional().describe("Name or email of workspace member to assign"),
  assigneeId: z.string().optional().describe("Direct user ObjectId if known"),
  dueDate: z.string().optional().describe("ISO date string for due date"),
});

export class TaskCreateTool implements IAITool<z.infer<typeof TaskCreateInputSchema>, any> {
  public readonly id = "task_create";
  public readonly name = "Create Task";
  public readonly description =
    "Creates a new task in the authenticated workspace and persists it to the MongoDB database.";
  public readonly parameters = {
    type: "object",
    properties: {
      title: { type: "string", description: "Title of the task" },
      description: { type: "string", description: "Detailed description or requirements" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "Priority level" },
      status: { type: "string", description: "Initial status (default: todo)" },
      assigneeNameOrEmail: { type: "string", description: "Name or email of the assignee" },
      assigneeId: { type: "string", description: "Assignee user ID if known" },
      dueDate: { type: "string", description: "Due date in ISO format (e.g. 2026-09-01T00:00:00Z)" },
    },
    required: ["title"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskCreateInputSchema;

  public async execute(
    params: z.infer<typeof TaskCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    let resolvedAssigneeId = params.assigneeId;

    // Resolve assignee by name/email if provided and not directly assigned
    if (!resolvedAssigneeId && params.assigneeNameOrEmail) {
      const needle = params.assigneeNameOrEmail.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: {
          memberships: {
            some: { workspaceId: context.workspaceId },
          },
          OR: [
            { email: { contains: needle, mode: "insensitive" } },
            { firstName: { contains: needle, mode: "insensitive" } },
            { lastName: { contains: needle, mode: "insensitive" } },
          ],
        },
      });

      if (user) {
        resolvedAssigneeId = user.id;
      }
    }

    const createdTask = await prisma.task.create({
      data: {
        workspaceId: context.workspaceId,
        title: params.title.trim(),
        description: params.description?.trim(),
        priority: params.priority || "MEDIUM",
        status: (params.status || "todo").toLowerCase(),
        reporterId: context.userId,
        assigneeId: resolvedAssigneeId || undefined,
        dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      },
      include: {
        assignee: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    // Broadcast domain event to connected workspace clients
    wsManager.broadcastToWorkspace(context.workspaceId, "task:created", {
      taskId: createdTask.id,
      title: createdTask.title,
      status: createdTask.status,
      priority: createdTask.priority,
      assignee: createdTask.assignee
        ? `${createdTask.assignee.firstName} ${createdTask.assignee.lastName}`
        : "Unassigned",
      createdAt: createdTask.createdAt.toISOString(),
    });

    return {
      id: createdTask.id,
      title: createdTask.title,
      status: createdTask.status,
      priority: createdTask.priority,
      dueDate: createdTask.dueDate?.toISOString(),
      assignee: createdTask.assignee
        ? `${createdTask.assignee.firstName} ${createdTask.assignee.lastName}`
        : "Unassigned",
      createdAt: createdTask.createdAt.toISOString(),
    };
  }
}
