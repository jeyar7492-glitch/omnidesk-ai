import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectArchiveInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  reason: z.string().optional().describe("Rationale for archiving the project"),
});

export class ProjectArchiveTool implements IAITool<z.infer<typeof ProjectArchiveInputSchema>, any> {
  public readonly id = "project_archive";
  public readonly name = "Archive Project";
  public readonly description =
    "Archives a project and marks it inactive. This is a HIGH-RISK operation requiring human approval before mutation.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Unique project ID to archive" },
      reason: { type: "string", description: "Business reason for archiving" },
    },
    required: ["projectId"],
  };
  public readonly requiredPermissions: string[] = ["project:archive", "project:write"];
  public readonly riskLevel: RiskLevel = "HIGH";
  public readonly workspaceScoped = true;
  public readonly schema = ProjectArchiveInputSchema;

  public async execute(
    params: z.infer<typeof ProjectArchiveInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const project = await projectService.archiveProject(
      context.workspaceId,
      params.projectId,
      params.reason
    );

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      isArchived: project.isArchived,
      reason: params.reason || "Archived by user",
      archivedAt: new Date().toISOString(),
    };
  }
}
