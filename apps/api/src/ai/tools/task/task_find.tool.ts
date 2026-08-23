import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const TaskFindInputSchema = z.object({
  query: z.string().optional().describe("Free-text search query across title and description"),
  status: z.string().optional().describe("Filter by task status e.g. todo, in_progress, review, done"),
  priority: PriorityLevelSchema.optional().describe("Filter by priority level"),
  assigneeId: z.string().optional().describe("Filter by assignee user ID"),
  isOverdue: z.boolean().optional().describe("Filter for tasks past due date"),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export class TaskFindTool implements IAITool<z.infer<typeof TaskFindInputSchema>, { count: number; tasks: any[] }> {
  public readonly id = "task_find";
  public readonly name = "Find Tasks";
  public readonly description =
    "Searches and retrieves real tasks from the workspace database by text query, status, priority, assignee, or overdue condition.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query for task title or description" },
      status: { type: "string", description: "Task status (todo, in_progress, review, done)" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "Task priority" },
      assigneeId: { type: "string", description: "Assignee user ObjectId" },
      isOverdue: { type: "boolean", description: "Whether to return only overdue tasks" },
      limit: { type: "number", description: "Max tasks to return (default 20)" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["task:read", "workspace:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskFindInputSchema;

  public async execute(
    params: z.infer<typeof TaskFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<{ count: number; tasks: any[] }> {
    const where: any = {
      workspaceId: context.workspaceId,
      isArchived: false,
    };

    if (params.status) {
      where.status = params.status.toLowerCase();
    }

    if (params.priority) {
      where.priority = params.priority;
    }

    if (params.assigneeId) {
      where.assigneeId = params.assigneeId;
    }

    if (params.isOverdue) {
      where.dueDate = { lt: new Date() };
      where.status = { not: "done" };
    }

    if (params.query && params.query.trim()) {
      where.OR = [
        { title: { contains: params.query.trim(), mode: "insensitive" } },
        { description: { contains: params.query.trim(), mode: "insensitive" } },
      ];
    }

    const tasks = await prisma.task.findMany({
      where,
      take: params.limit || 20,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    return {
      count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString(),
        assignee: t.assignee
          ? `${t.assignee.firstName} ${t.assignee.lastName} (${t.assignee.email})`
          : "Unassigned",
        createdAt: t.createdAt.toISOString(),
      })),
    };
  }
}
