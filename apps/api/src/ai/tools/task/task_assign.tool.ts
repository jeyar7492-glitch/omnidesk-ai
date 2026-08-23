import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { prisma } from "../../../lib/prisma";
import { wsManager } from "../../../lib/websocket";
import { NotFoundError } from "../../../lib/errors";

const TaskAssignInputSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  assigneeNameOrEmail: z.string().optional().describe("Name or email of workspace user to assign"),
  assigneeId: z.string().optional().describe("User ObjectId to assign directly"),
});

export class TaskAssignTool implements IAITool<z.infer<typeof TaskAssignInputSchema>, any> {
  public readonly id = "task_assign";
  public readonly name = "Assign Task";
  public readonly description = "Assigns an existing task to an authorized workspace team member.";
  public readonly parameters = {
    type: "object",
    properties: {
      taskId: { type: "string", description: "Unique task ID" },
      assigneeNameOrEmail: { type: "string", description: "Name or email of the team member" },
      assigneeId: { type: "string", description: "User ID if known" },
    },
    required: ["taskId"],
  };
  public readonly requiredPermissions: string[] = ["task:write"];
  public readonly riskLevel: RiskLevel = "MEDIUM";
  public readonly workspaceScoped = true;
  public readonly schema = TaskAssignInputSchema;

  public async execute(
    params: z.infer<typeof TaskAssignInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
    });

    if (!task || task.workspaceId !== context.workspaceId) {
      throw new NotFoundError(`Task '${params.taskId}' not found in workspace`);
    }

    let targetUserId = params.assigneeId;

    if (!targetUserId && params.assigneeNameOrEmail) {
      const needle = params.assigneeNameOrEmail.trim().toLowerCase();
      const member = await prisma.user.findFirst({
        where: {
          memberships: { some: { workspaceId: context.workspaceId } },
          OR: [
            { email: { contains: needle, mode: "insensitive" } },
            { firstName: { contains: needle, mode: "insensitive" } },
            { lastName: { contains: needle, mode: "insensitive" } },
          ],
        },
      });

      if (!member) {
        throw new NotFoundError(`User '${params.assigneeNameOrEmail}' not found in workspace members`);
      }
      targetUserId = member.id;
    }

    const updated = await prisma.task.update({
      where: { id: params.taskId },
      data: {
        assigneeId: targetUserId || null,
      },
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    wsManager.broadcastToWorkspace(context.workspaceId, "task:assigned", {
      taskId: updated.id,
      assignee: updated.assignee
        ? `${updated.assignee.firstName} ${updated.assignee.lastName}`
        : "Unassigned",
      updatedAt: updated.updatedAt.toISOString(),
    });

    return {
      taskId: updated.id,
      title: updated.title,
      assignee: updated.assignee
        ? `${updated.assignee.firstName} ${updated.assignee.lastName} (${updated.assignee.email})`
        : "Unassigned",
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
