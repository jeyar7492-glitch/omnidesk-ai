import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const TaskCreateInputSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().optional(),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  status: z.string().optional().default("todo"),
  projectId: z.string().optional().describe("Project ID if known"),
  projectName: z.string().optional().describe("Project name to link task to"),
  milestoneId: z.string().optional().describe("Milestone ID if known"),
  milestoneTitle: z.string().optional().describe("Milestone title to link task to"),
  assigneeNameOrEmail: z.string().optional().describe("Name or email of workspace member to assign"),
  assigneeId: z.string().optional().describe("Direct user ObjectId if known"),
  dueDate: z.string().optional().describe("ISO date string for due date"),
  startDate: z.string().optional().describe("ISO date string for start date"),
  estimatedHours: z.number().nonnegative().optional().describe("Estimated completion hours"),
  labels: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional().describe("List of task IDs this task depends on"),
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
      projectName: { type: "string", description: "Project name to associate with" },
      projectId: { type: "string", description: "Project ID" },
      milestoneTitle: { type: "string", description: "Milestone name to associate with" },
      assigneeNameOrEmail: { type: "string", description: "Name or email of the assignee" },
      assigneeId: { type: "string", description: "Assignee user ID if known" },
      dueDate: { type: "string", description: "Due date in ISO format (e.g. 2026-09-01T00:00:00Z)" },
      estimatedHours: { type: "number", description: "Estimated completion hours" },
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
    const createdTask = await taskService.createTask(context.workspaceId, {
      title: params.title,
      description: params.description,
      priority: params.priority,
      status: params.status,
      projectId: params.projectId,
      projectName: params.projectName,
      milestoneId: params.milestoneId,
      milestoneTitle: params.milestoneTitle,
      assigneeId: params.assigneeId,
      assigneeNameOrEmail: params.assigneeNameOrEmail,
      reporterId: context.userId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      estimatedHours: params.estimatedHours,
      labels: params.labels,
      dependencies: params.dependencies,
    });

    return {
      id: createdTask.id,
      title: createdTask.title,
      status: createdTask.status,
      priority: createdTask.priority,
      projectName: createdTask.project?.name || null,
      assignee: createdTask.assignee
        ? `${createdTask.assignee.firstName} ${createdTask.assignee.lastName}`
        : "Unassigned",
      isBlocked: createdTask.isBlocked,
      blockedReason: createdTask.blockedReason,
      dueDate: createdTask.dueDate?.toISOString() || null,
      createdAt: createdTask.createdAt.toISOString(),
    };
  }
}
