import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";

const ProjectCreateInputSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]).optional().default("PLANNING"),
  budget: z.number().nonnegative().optional().default(0),
  spent: z.number().nonnegative().optional().default(0),
  startDate: z.string().optional().describe("ISO start date string"),
  deadline: z.string().optional().describe("ISO deadline date string"),
  managerId: z.string().optional(),
  managerNameOrEmail: z.string().optional().describe("Manager name or email to assign"),
  customerId: z.string().optional(),
  customerName: z.string().optional().describe("Customer company name to link"),
});

export class ProjectCreateTool implements IAITool<z.infer<typeof ProjectCreateInputSchema>, any> {
  public readonly id = "project_create";
  public readonly name = "Create Project";
  public readonly description =
    "Creates a new project within the authenticated workspace, linking manager and customer accounts if specified.";
  public readonly parameters = {
    type: "object",
    properties: {
      name: { type: "string", description: "Name of the project" },
      description: { type: "string", description: "Detailed description of scope and objectives" },
      status: {
        type: "string",
        enum: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"],
        description: "Initial status",
      },
      budget: { type: "number", description: "Total allocated budget in currency units" },
      spent: { type: "number", description: "Initial spent amount if any" },
      startDate: { type: "string", description: "Start date in ISO format" },
      deadline: { type: "string", description: "Project deadline in ISO format" },
      managerNameOrEmail: { type: "string", description: "Project manager name or email" },
      customerName: { type: "string", description: "Client company name to associate" },
    },
    required: ["name"],
  };
  public readonly requiredPermissions: string[] = ["project:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = ProjectCreateInputSchema;

  public async execute(
    params: z.infer<typeof ProjectCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const project = await projectService.createProject(context.workspaceId, {
      name: params.name,
      description: params.description,
      status: params.status as any,
      budget: params.budget,
      spent: params.spent,
      startDate: params.startDate ? new Date(params.startDate) : undefined,
      deadline: params.deadline ? new Date(params.deadline) : undefined,
      managerId: params.managerId,
      managerNameOrEmail: params.managerNameOrEmail,
      customerId: params.customerId,
      customerName: params.customerName,
    });

    return {
      id: project.id,
      name: project.name,
      status: project.status,
      budget: project.budget,
      manager: project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : null,
      customer: project.customer?.companyName || null,
      createdAt: project.createdAt.toISOString(),
    };
  }
}
