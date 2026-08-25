import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectHealthInputSchema = z.object({
  projectId: z.string().optional().describe("Project ID if known"),
  projectName: z.string().optional().describe("Project name to evaluate"),
});

export class ProjectHealthTool implements IAITool<z.infer<typeof ProjectHealthInputSchema>, any> {
  public readonly id = "project_health";
  public readonly name = "Evaluate Project Health";
  public readonly description =
    "Calculates real-time project health diagnostics based on overdue tasks, dependency blockers, schedule variance, and budget burn.";
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
  public readonly schema = ProjectHealthInputSchema;

  public async execute(
    params: z.infer<typeof ProjectHealthInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.projectId || params.projectName;
    if (!identifier) {
      throw new Error("Either projectId or projectName must be provided for health evaluation");
    }

    return projectService.getProjectHealth(context.workspaceId, identifier);
  }
}
