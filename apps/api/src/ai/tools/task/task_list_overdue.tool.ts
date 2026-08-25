import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";

const TaskListOverdueInputSchema = z.object({
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export class TaskListOverdueTool implements IAITool<z.infer<typeof TaskListOverdueInputSchema>, any> {
  public readonly id = "task_list_overdue";
  public readonly name = "List Overdue Tasks";
  public readonly description =
    "Retrieves all tasks in the workspace where the due date is in the past and the status is not completed.";
  public readonly parameters = {
    type: "object",
    properties: {
      limit: { type: "number", description: "Max overdue tasks to return (default 20)" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["task:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskListOverdueInputSchema;

  public async execute(
    params: z.infer<typeof TaskListOverdueInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const now = new Date();
    const tasks = await prisma.task.findMany({
      where: {
        workspaceId: context.workspaceId,
        isArchived: false,
        status: { notIn: ["done", "completed"] },
        dueDate: { lt: now },
      },
      take: params.limit || 20,
      orderBy: { dueDate: "asc" },
      include: {
        assignee: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    return {
      count: tasks.length,
      overdueTasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString(),
        assignee: t.assignee
          ? `${t.assignee.firstName} ${t.assignee.lastName}`
          : "Unassigned",
        daysOverdue: Math.floor((now.getTime() - (t.dueDate?.getTime() || 0)) / (1000 * 60 * 60 * 24)),
      })),
    };
  }
}
