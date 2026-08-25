import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskChecklistCreateInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  items: z.array(z.string().min(1, "Checklist item title is required")).min(1, "At least one item is required"),
});

export class TaskChecklistCreateTool implements IAITool<z.infer<typeof TaskChecklistCreateInputSchema>, any> {
  public readonly id = "task_checklist_create";
  public readonly name = "Create Task Checklist";
  public readonly description =
    "Breaks a task down into structured checklist/subtask items and attaches them to the specified task.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID to decompose" },
      items: {
        type: "array",
        items: { type: "string" },
        description: "List of actionable subtask/checklist item titles",
      },
    },
    required: ["taskId", "items"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskChecklistCreateInputSchema;

  public async execute(
    params: z.infer<typeof TaskChecklistCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const items = await taskService.addChecklist(context.workspaceId, params.taskId, params.items);

    return {
      taskId: params.taskId,
      createdCount: items.length,
      items: items.map((i) => ({ id: i.id, title: i.title, isCompleted: i.isCompleted })),
    };
  }
}
