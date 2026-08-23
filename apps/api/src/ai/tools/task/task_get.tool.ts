import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";

const TaskGetInputSchema = z.object({
  taskId: z.string().optional().describe("Direct task ObjectId"),
  title: z.string().optional().describe("Task title to search if exact ID is unknown"),
});

export class TaskGetTool implements IAITool<z.infer<typeof TaskGetInputSchema>, any> {
  public readonly id = "task_get";
  public readonly name = "Get Task Details";
  public readonly description =
    "Retrieves full details, assignee information, checklists, and comments for a specific task in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "The task unique ID" },
      title: { type: "string", description: "Search by title if ID is not known" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["task:read", "workspace:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskGetInputSchema;

  public async execute(
    params: z.infer<typeof TaskGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    if (!params.taskId && !params.title) {
      throw new NotFoundError("Must provide either taskId or title to retrieve task");
    }

    const where: any = {
      workspaceId: context.workspaceId,
    };

    if (params.taskId) {
      where.id = params.taskId;
    } else if (params.title) {
      where.title = { contains: params.title.trim(), mode: "insensitive" };
    }

    const task = await prisma.task.findFirst({
      where,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
        reporter: { select: { id: true, firstName: true, lastName: true, email: true } },
        comments: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        checklists: true,
      },
    });

    if (!task) {
      throw new NotFoundError(
        `Task not found in workspace for query: ${params.taskId || params.title}`
      );
    }

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString(),
      assignee: task.assignee
        ? `${task.assignee.firstName} ${task.assignee.lastName} (${task.assignee.email})`
        : null,
      reporter: task.reporter
        ? `${task.reporter.firstName} ${task.reporter.lastName}`
        : null,
      comments: task.comments.map((c) => ({
        id: c.id,
        author: `${c.user.firstName} ${c.user.lastName}`,
        content: c.content,
        createdAt: c.createdAt.toISOString(),
      })),
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
