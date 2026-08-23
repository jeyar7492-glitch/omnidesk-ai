import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const TaskFindInputSchema = z.object({
  query: z.string().optional().describe("Search keyword in task title or description"),
  status: z.string().optional().describe("Filter by status (todo, in_progress, review, testing, done, backlog)"),
  priority: PriorityLevelSchema.optional().describe("Filter by priority"),
  projectId: z.string().optional().describe("Filter by project ID"),
  milestoneId: z.string().optional().describe("Filter by milestone ID"),
  assigneeId: z.string().optional().describe("Filter by assignee user ID"),
  isBlocked: z.boolean().optional().describe("Filter only blocked tasks"),
  isOverdue: z.boolean().optional().describe("Filter only overdue tasks"),
  limit: z.number().int().positive().optional().default(20),
});

export class TaskFindTool implements IAITool<z.infer<typeof TaskFindInputSchema>, any> {
  public readonly id = "task_find";
  public readonly name = "Find Tasks";
  public readonly description =
    "Searches and filters tasks in the authenticated workspace by title, status, project, assignee, blockers, or due date.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query string" },
      status: { type: "string", description: "Status filter (todo, in_progress, review, testing, done, backlog)" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "Priority filter" },
      projectId: { type: "string", description: "Filter by project ID" },
      assigneeId: { type: "string", description: "Filter by assignee user ID" },
      isBlocked: { type: "boolean", description: "Filter blocked tasks" },
      isOverdue: { type: "boolean", description: "Filter overdue tasks" },
      limit: { type: "number", description: "Maximum tasks to return" },
    },
  };
  public readonly requiredPermissions: string[] = ["task:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = TaskFindInputSchema;

  public async execute(
    params: z.infer<typeof TaskFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const tasks = await taskService.findTasks(context.workspaceId, {
      query: params.query,
      status: params.status,
      priority: params.priority,
      projectId: params.projectId,
      milestoneId: params.milestoneId,
      assigneeId: params.assigneeId,
      isBlocked: params.isBlocked,
      isOverdue: params.isOverdue,
      limit: params.limit,
    });

    return {
      count: tasks.length,
      tasks,
    };
  }
}
