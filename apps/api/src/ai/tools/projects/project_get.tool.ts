import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectGetInputSchema = z.object({
  projectId: z.string().optional().describe("Unique project ObjectId if known"),
  projectName: z.string().optional().describe("Project name to search and retrieve"),
});

export class ProjectGetTool implements IAITool<z.infer<typeof ProjectGetInputSchema>, any> {
  public readonly id = "project_get";
  public readonly name = "Get Project Details";
  public readonly description =
    "Retrieves full project details including progress percentage, task list, milestones, budget metrics, and client info.";
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
  public readonly schema = ProjectGetInputSchema;

  public async execute(
    params: z.infer<typeof ProjectGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const identifier = params.projectId || params.projectName;
    if (!identifier) {
      throw new Error("Either projectId or projectName must be provided to get project details");
    }

    const project = await projectService.getProject(context.workspaceId, identifier);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      health: project.health,
      budget: project.budget,
      spent: project.spent,
      startDate: project.startDate?.toISOString() || null,
      deadline: project.deadline?.toISOString() || null,
      progressPercentage: project.progressPercentage,
      totalTasks: project.totalTasks,
      completedTasks: project.completedTasks,
      manager: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : null,
      customer: project.customer ? project.customer.companyName : null,
      milestones: project.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        dueDate: m.dueDate?.toISOString() || null,
      })),
      tasks: project.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "Unassigned",
        dueDate: t.dueDate?.toISOString() || null,
      })),
    };
  }
}
