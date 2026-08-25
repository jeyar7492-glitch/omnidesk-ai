import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const TaskUpdateInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  priority: PriorityLevelSchema.optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  startDate: z.string().optional().describe("ISO start date string"),
  dueDate: z.string().optional().describe("ISO date string for due date"),
  estimatedHours: z.number().nonnegative().optional(),
  actualHours: z.number().nonnegative().optional(),
  labels: z.array(z.string()).optional(),
});

export class TaskUpdateTool implements IAITool<z.infer<typeof TaskUpdateInputSchema>, any> {
  public readonly id = "task_update";
  public readonly name = "Update Task";
  public readonly description =
    "Updates details, priority, due date, description, or logged hours for an existing task in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      title: { type: "string", description: "New title" },
      description: { type: "string", description: "New description" },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"], description: "New priority" },
      dueDate: { type: "string", description: "New due date in ISO format" },
      startDate: { type: "string", description: "New start date in ISO format" },
      estimatedHours: { type: "number", description: "Updated estimated hours" },
      actualHours: { type: "number", description: "Updated logged actual hours" },
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
    const updated = await taskService.updateTask(context.workspaceId, params.taskId, {
      title: params.title,
      description: params.description,
      priority: params.priority,
      projectId: params.projectId,
      milestoneId: params.milestoneId,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      estimatedHours: params.estimatedHours,
      actualHours: params.actualHours,
      labels: params.labels,
    });

    return {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      priority: updated.priority,
      status: updated.status,
      estimatedHours: updated.estimatedHours,
      actualHours: updated.actualHours,
      dueDate: updated.dueDate?.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
