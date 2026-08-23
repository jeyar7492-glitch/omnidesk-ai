import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { milestoneService } from "../../../projects/services/milestone.service";

const MilestoneCreateInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z.string().min(1, "Milestone title is required").max(200),
  description: z.string().optional(),
  dueDate: z.string().optional().describe("ISO due date string"),
  status: z.string().optional().default("pending"),
  assignedUserId: z.string().optional(),
});

export class MilestoneCreateTool implements IAITool<z.infer<typeof MilestoneCreateInputSchema>, any> {
  public readonly id = "milestone_create";
  public readonly name = "Create Milestone";
  public readonly description =
    "Creates a project milestone with target deadline and connects it to the project roadmap.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID" },
      title: { type: "string", description: "Milestone name/title" },
      description: { type: "string", description: "Deliverables and scope" },
      dueDate: { type: "string", description: "Target deadline in ISO format" },
      status: { type: "string", description: "Initial status (default: pending)" },
    },
    required: ["projectId", "title"],
  };
  public readonly requiredPermissions: string[] = ["milestone:write", "project:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = MilestoneCreateInputSchema;

  public async execute(
    params: z.infer<typeof MilestoneCreateInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const milestone = await milestoneService.createMilestone(context.workspaceId, {
      projectId: params.projectId,
      title: params.title,
      description: params.description,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      status: params.status,
      assignedUserId: params.assignedUserId,
    });

    return {
      id: milestone.id,
      title: milestone.title,
      projectId: milestone.projectId,
      status: milestone.status,
      dueDate: milestone.dueDate?.toISOString() || null,
      createdAt: milestone.createdAt.toISOString(),
    };
  }
}
