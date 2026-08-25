import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectUpdateInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  budget: z.number().nonnegative().optional(),
  spent: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  health: z.string().optional(),
});

export class ProjectUpdateTool implements IAITool<z.infer<typeof ProjectUpdateInputSchema>, any> {
  public readonly id = "project_update";
  public readonly name = "Update Project";
  public readonly description =
    "Updates project properties such as status, budget, deadline, health assessment, or description.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID" },
      name: { type: "string", description: "Updated project name" },
      description: { type: "string", description: "Updated description" },
      status: {
        type: "string",
        enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
        description: "New status",
      },
      budget: { type: "number", description: "Updated budget" },
      spent: { type: "number", description: "Updated spent amount" },
      startDate: { type: "string", description: "Updated start date in ISO format" },
      deadline: { type: "string", description: "Updated deadline in ISO format" },
      health: { type: "string", description: "Health tag (healthy, at_risk, critical, delayed)" },
    },
    required: ["projectId"],
  };
  public readonly requiredPermissions: string[] = ["project:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = ProjectUpdateInputSchema;

  public async execute(
    params: z.infer<typeof ProjectUpdateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const updated = await projectService.updateProject(context.workspaceId, params.projectId, {
      name: params.name,
      description: params.description,
      status: params.status as any,
      budget: params.budget,
      spent: params.spent,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      deadline: params.deadline ? new Date(params.deadline) : undefined,
      health: params.health,
    });

    return {
      id: updated.id,
      name: updated.name,
      status: updated.status,
      budget: updated.budget,
      spent: updated.spent,
      health: updated.health,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
