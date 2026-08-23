import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { projectService } from "../../../projects/services/project.service";
import { prisma } from "../../../lib/prisma";
import { NotFoundError } from "../../../lib/errors";

const ProjectAssignInputSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  managerId: z.string().optional(),
  managerNameOrEmail: z.string().optional().describe("Manager name or email to assign"),
});

export class ProjectAssignTool implements IAITool<z.infer<typeof ProjectAssignInputSchema>, any> {
  public readonly id = "project_assign";
  public readonly name = "Assign Project Manager";
  public readonly description =
    "Assigns a team member as project manager by resolving their user ID, name, or email.";
  public readonly parameters = {
    type: "object",
    properties: {
      projectId: { type: "string", description: "Project ID" },
      managerNameOrEmail: { type: "string", description: "Manager name or email to assign" },
      managerId: { type: "string", description: "Direct manager user ID" },
    },
    required: ["projectId"],
  };
  public readonly requiredPermissions: string[] = ["project:assign"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = ProjectAssignInputSchema;

  public async execute(
    params: z.infer<typeof ProjectAssignInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    let resolvedManagerId = params.managerId;
    if (!resolvedManagerId && params.managerNameOrEmail) {
      const needle = params.managerNameOrEmail.trim().toLowerCase();
      const user = await prisma.user.findFirst({
        where: {
          memberships: { some: { workspaceId: context.workspaceId } },
          OR: [
            { email: { contains: needle, mode: "insensitive" } },
            { firstName: { contains: needle, mode: "insensitive" } },
            { lastName: { contains: needle, mode: "insensitive" } },
          ],
        },
      });

      if (!user) {
        throw new NotFoundError(`Team member '${params.managerNameOrEmail}' not found in workspace`);
      }
      resolvedManagerId = user.id;
    }

    const updated = await projectService.updateProject(context.workspaceId, params.projectId, {
      managerId: resolvedManagerId,
    });

    return {
      projectId: updated.id,
      name: updated.name,
      manager: updated.manager ? `${updated.manager.firstName} ${updated.manager.lastName}` : "Unassigned",
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
