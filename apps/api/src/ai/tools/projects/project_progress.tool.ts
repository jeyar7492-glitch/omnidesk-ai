import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectProgressInputSchema = z.object({
  projectId: z.string().optional().describe("Project ID"),
  projectName: z.string().optional().describe("Project name"),
});

export class ProjectProgressTool implements IAITool<z.infer<typeof ProjectProgressInputSchema>, any> {
  public readonly id = "project_progress";
  public readonly name = "Calculate Project Progress";
  public readonly description =
    "Calculates exact completion rates, task distributions across workflow stages, and hours consumed.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID" },
      projectName: { type: "string", description: "Project name" },
    },
  };
  public readonly requiredPermissions: string[] = ["project:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = ProjectProgressInputSchema;

  public async execute(
    params: z.infer<typeof ProjectProgressInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.projectId || params.projectName;
    if (!identifier) {
      throw new Error("Either projectId or projectName must be provided for progress calculation");
    }

    return projectService.getProjectProgress(context.workspaceId, identifier);
  }
}
