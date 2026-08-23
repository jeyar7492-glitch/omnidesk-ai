import {
  AgentExecutionContext,
  ToolCallProposal,
  ToolExecutionResult,
} from "@omnidesk/shared-types";
import { toolRegistry } from "./tool.registry";
import { approvalService } from "../approvals/approval.service";
import { AIEventEmitter } from "../events/ai_event_emitter";
import { prisma } from "../../lib/prisma";
import {
  ValidationError,
  ForbiddenError,
  NotFoundError,
} from "../../lib/errors";

export interface ExecuteToolOptions {
  proposal: ToolCallProposal;
  context: AgentExecutionContext;
  executionId: string;
  agentId: string;
  approvalId?: string;
}

export interface ToolExecutionResponse {
  executed: boolean;
  result?: ToolExecutionResult;
  approvalRequired?: boolean;
  approvalId?: string;
  error?: string;
}

export class ToolExecutor {
  public async executeTool(options: ExecuteToolOptions): Promise<ToolExecutionResponse> {
    const { proposal, context, executionId, agentId, approvalId } = options;

    // 1. Tool presence validation
    const tool = toolRegistry.getTool(proposal.toolId);
    if (!tool) {
      throw new ValidationError(`Unknown tool '${proposal.toolId}' rejected by Tool Registry`);
    }

    // 2. Argument schema validation with Zod
    const validationResult = tool.schema.safeParse(proposal.arguments);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.errors
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      throw new ValidationError(`Invalid tool arguments for '${proposal.toolId}': ${errorDetails}`);
    }
    const validatedParams = validationResult.data;

    // 3. RBAC / Permission check
    if (tool.requiredPermissions.length > 0) {
      const isPrivileged = context.userRole === "OWNER" || context.userRole === "ADMIN";
      const hasAllPermissions = tool.requiredPermissions.every((perm) =>
        context.userPermissions.includes(perm)
      );

      if (!isPrivileged && !hasAllPermissions) {
        throw new ForbiddenError(
          `Unauthorized: Missing required permissions [${tool.requiredPermissions.join(
            ", "
          )}] for tool '${tool.id}'`
        );
      }
    }

    // 4. Human Approval Gate for HIGH / CRITICAL Risk Tools
    if (tool.riskLevel === "HIGH" || tool.riskLevel === "CRITICAL") {
      if (!approvalId) {
        // Create new approval request
        const approval = await approvalService.createApprovalRequest({
          workspaceId: context.workspaceId,
          executionId,
          agentId,
          toolId: tool.id,
          proposedArguments: proposal.arguments,
          riskLevel: tool.riskLevel,
          requestedById: context.userId,
        });

        return {
          executed: false,
          approvalRequired: true,
          approvalId: approval.id,
        };
      }

      // Verify existing approval
      const approval = await approvalService.getApproval(approvalId, context.workspaceId);
      if (approval.status === "REJECTED") {
        throw new ForbiddenError(
          `Execution blocked: Approval '${approvalId}' for tool '${tool.id}' was REJECTED by human operator`
        );
      }
      if (approval.status === "PENDING") {
        return {
          executed: false,
          approvalRequired: true,
          approvalId: approval.id,
        };
      }
      if (approval.status !== "APPROVED") {
        throw new ForbiddenError(
          `Execution blocked: Approval status is '${approval.status}'`
        );
      }
    }

    // 5. Tool Execution with duration capture and safety boundaries
    const startTime = Date.now();
    AIEventEmitter.emit(context.workspaceId, executionId, "ai:tool_started", {
      toolId: tool.id,
      arguments: validatedParams,
    });

    try {
      const output = await tool.execute(validatedParams, context);
      const durationMs = Date.now() - startTime;

      const execResult: ToolExecutionResult = {
        toolId: tool.id,
        success: true,
        result: output,
        durationMs,
        executedAt: new Date().toISOString(),
      };

      // 6. Audit trail in database
      await prisma.auditEvent.create({
        data: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          action: "ai:tool_execution",
          entityType: "AITool",
          entityId: tool.id,
          details: {
            executionId,
            agentId,
            params: validatedParams,
            durationMs,
            success: true,
          } as any,
        },
      });

      AIEventEmitter.emit(context.workspaceId, executionId, "ai:tool_completed", {
        toolId: tool.id,
        durationMs,
        success: true,
      });

      return {
        executed: true,
        result: execResult,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errorMsg = err?.message || "Tool execution failed";

      await prisma.auditEvent.create({
        data: {
          workspaceId: context.workspaceId,
          userId: context.userId,
          action: "ai:tool_execution_failed",
          entityType: "AITool",
          entityId: tool.id,
          details: {
            executionId,
            agentId,
            params: validatedParams,
            durationMs,
            error: errorMsg,
          } as any,
        },
      });

      AIEventEmitter.emit(context.workspaceId, executionId, "ai:tool_completed", {
        toolId: tool.id,
        durationMs,
        success: false,
        error: errorMsg,
      });

      return {
        executed: false,
        error: errorMsg,
        result: {
          toolId: tool.id,
          success: false,
          error: errorMsg,
          durationMs,
          executedAt: new Date().toISOString(),
        },
      };
    }
  }
}

export const toolExecutor = new ToolExecutor();
