import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";

const WorkspaceInfoInputSchema = z.object({
  includeCounts: z.boolean().optional().default(false),
});

export class WorkspaceInfoTool
  implements
    IAITool<
      z.infer<typeof WorkspaceInfoInputSchema>,
      { workspaceId: string; name: string; memberCount: number; timestamp: string }
    > {
  public readonly id = "workspace_info";
  public readonly name = "Workspace Information Lookup";
  public readonly description = "Retrieves metadata and member counts for the authenticated user's current workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      includeCounts: { type: "boolean", description: "Whether to query entity counts" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["workspace:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = WorkspaceInfoInputSchema;

  public async execute(
    _params: z.infer<typeof WorkspaceInfoInputSchema>,
    context: AgentExecutionContext
  ): Promise<{ workspaceId: string; name: string; memberCount: number; timestamp: string }> {
    // Queries strictly by context.workspaceId, never user-provided ID
    const workspace = await prisma.workspace.findUnique({
      where: { id: context.workspaceId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    return {
      workspaceId: context.workspaceId,
      name: workspace?.name || "Default Workspace",
      memberCount: workspace?._count?.members ?? 1,
      timestamp: new Date().toISOString(),
    };
  }
}
