import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskGetInputSchema = z.object({
  taskId: z.string().optional().describe("Unique task ID if known"),
  taskTitle: z.string().optional().describe("Task title to search"),
});

export class TaskGetTool implements IAITool<z.infer<typeof TaskGetInputSchema>, any> {
  public readonly id = "task_get";
  public readonly name = "Get Task Details";
  public readonly description =
    "Retrieves full task details, checklists, comments, dependencies, and blocker states.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      taskTitle: { type: "string", description: "Task title to lookup" },
    },
  };
  public readonly requiredPermissions: string[] = ["task:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskGetInputSchema;

  public async execute(
    params: z.infer<typeof TaskGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.taskId || params.taskTitle;
    if (!identifier) {
      throw new Error("Either taskId or taskTitle must be provided to get task details");
    }

    const task = await taskService.getTask(context.workspaceId, identifier);

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      projectName: task.project?.name || null,
      milestoneTitle: task.milestone?.title || null,
      assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned",
      reporter: task.reporter ? `${task.reporter.firstName} ${task.reporter.lastName}` : null,
      dueDate: task.dueDate?.toISOString() || null,
      estimatedHours: task.estimatedHours,
      actualHours: task.actualHours,
      isBlocked: task.isBlocked,
      blockedReason: task.blockedReason,
      dependencies: task.resolvedDependencies,
      checklists: task.checklists.map((c) => ({
        id: c.id,
        title: c.title,
        isCompleted: c.isCompleted,
      })),
      comments: task.comments.map((cm) => ({
        id: cm.id,
        author: `${cm.user.firstName} ${cm.user.lastName}`,
        content: cm.content,
        createdAt: cm.createdAt.toISOString(),
      })),
      createdAt: task.createdAt.toISOString(),
    };
  }
}
