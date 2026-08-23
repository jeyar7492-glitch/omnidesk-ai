import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { taskService } from "../../../tasks/services/task.service";

const TaskChecklistUpdateInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  checklistId: z.string().min(1, "Checklist item ID is required"),
  isCompleted: z.boolean().describe("Whether item is checked/completed"),
  title: z.string().optional(),
});

export class TaskChecklistUpdateTool implements IAITool<z.infer<typeof TaskChecklistUpdateInputSchema>, any> {
  public readonly id = "task_checklist_update";
  public readonly name = "Update Checklist Item";
  public readonly description =
    "Marks a subtask/checklist item complete or incomplete and updates its title if provided.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Task ID" },
      checklistId: { type: "string", description: "Checklist item ID" },
      isCompleted: { type: "boolean", description: "Set completed status" },
      title: { type: "string", description: "Updated checklist item title" },
    },
    required: ["taskId", "checklistId", "isCompleted"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskChecklistUpdateInputSchema;

  public async execute(
    params: z.infer<typeof TaskChecklistUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await taskService.updateChecklistItem(
      context.workspaceId,
      params.taskId,
      params.checklistId,
      params.isCompleted,
      params.title
    );

    return {
      taskId: params.taskId,
      checklistId: updated.id,
      title: updated.title,
      isCompleted: updated.isCompleted,
    };
  }
}
