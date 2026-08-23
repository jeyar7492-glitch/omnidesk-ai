import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectFindInputSchema = z.object({
  query: z.string().optional().describe("Search keywords in project name or description"),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional(),
  customerId: z.string().optional(),
  managerId: z.string().optional(),
  isArchived: z.boolean().optional(),
  limit: z.number().int().positive().optional().default(20),
});

export class ProjectFindTool implements IAITool<z.infer<typeof ProjectFindInputSchema>, any> {
  public readonly id = "project_find";
  public readonly name = "Find Projects";
  public readonly description =
    "Searches and filters projects in the authenticated workspace by name, status, client, manager, or archive state.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search query for name or description" },
      status: {
        type: "string",
        enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
        description: "Filter by status",
      },
      customerId: { type: "string", description: "Filter by customer account ID" },
      managerId: { type: "string", description: "Filter by project manager user ID" },
      isArchived: { type: "boolean", description: "Filter archived vs active projects" },
      limit: { type: "number", description: "Maximum number of projects to return" },
    },
  };
  public readonly requiredPermissions: string[] = ["project:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = ProjectFindInputSchema;

  public async execute(
    params: z.infer<typeof ProjectFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const projects = await projectService.findProjects(context.workspaceId, {
      query: params.query,
      status: params.status as any,
      customerId: params.customerId,
      managerId: params.managerId,
      isArchived: params.isArchived,
      limit: params.limit,
    });

    return {
      count: projects.length,
      projects,
    };
  }
}
