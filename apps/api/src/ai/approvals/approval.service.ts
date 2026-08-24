import { ApprovalStatus, RiskLevel } from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { AIEventEmitter } from "../events/ai_event_emitter";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "../../lib/errors";

export class ApprovalService {
  public async createApprovalRequest(params: {
    workspaceId: string;
    executionId: string;
    agentId?: string;
    toolId: string;
    toolName?: string;
    proposedArguments?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    riskLevel: RiskLevel;
    requestedById?: string;
    reason?: string;
  }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hr expiration
    const toolArgs = params.proposedArguments || params.parameters || {};
    const agentKey = params.agentId || "supervisor";
    const requestedById = params.requestedById || "system_supervisor";

    const approval = await prisma.aIApprovalRequest.create({
      data: {
        workspaceId: params.workspaceId,
        executionId: params.executionId,
        agentKey,
        actionName: params.toolId,
        params: toolArgs as any,
        riskLevel: params.riskLevel,
        status: "PENDING",
        requestedById,
      },
    });

    AIEventEmitter.emit(
      params.workspaceId,
      params.executionId,
      "ai:approval_requested",
      {
        approvalId: approval.id,
        toolId: params.toolId,
        riskLevel: params.riskLevel,
        proposedArguments: params.proposedArguments,
        requestedById: params.requestedById,
        expiresAt: expiresAt.toISOString(),
      }
    );

    return approval;
  }

  public async decideApproval(
    approvalIdOrParams:
      | string
      | {
          approvalId: string;
          workspaceId: string;
          decidedById: string;
          decision: "APPROVED" | "REJECTED";
          reason?: string;
        },
    decisionArg?: "APPROVED" | "REJECTED",
    decidedByIdArg?: string,
    workspaceIdArg?: string,
    reasonArg?: string
  ) {
    const params =
      typeof approvalIdOrParams === "string"
        ? {
            approvalId: approvalIdOrParams,
            decision: decisionArg!,
            decidedById: decidedByIdArg!,
            workspaceId: workspaceIdArg!,
            reason: reasonArg,
          }
        : approvalIdOrParams;

    const approval = await prisma.aIApprovalRequest.findUnique({
      where: { id: params.approvalId },
    });

    if (!approval) {
      throw new NotFoundError(`Approval request '${params.approvalId}'`);
    }

    if (approval.workspaceId !== params.workspaceId) {
      throw new ForbiddenError("Cross-workspace approval decision rejected");
    }

    if (approval.status !== "PENDING") {
      throw new ConflictError(`Approval is already in '${approval.status}' state`);
    }

    const updated = await prisma.aIApprovalRequest.update({
      where: { id: params.approvalId },
      data: {
        status: params.decision as any,
        decidedById: params.decidedById,
        decidedAt: new Date(),
        decisionReason: params.reason,
      },
    });

    if (updated.executionId) {
      AIEventEmitter.emit(
        params.workspaceId,
        updated.executionId,
        "ai:approval_decided",
        {
          approvalId: updated.id,
          decision: params.decision,
          decidedById: params.decidedById,
          reason: params.reason,
        }
      );
    }

    return updated;
  }

  public async getApproval(approvalId: string, workspaceId: string) {
    const approval = await prisma.aIApprovalRequest.findUnique({
      where: { id: approvalId },
    });

    if (!approval || approval.workspaceId !== workspaceId) {
      throw new NotFoundError(`Approval request '${approvalId}'`);
    }

    return approval;
  }

  public async listApprovals(workspaceId: string, status?: ApprovalStatus, page = 1, perPage = 20) {
    const where: any = { workspaceId };
    if (status) {
      where.status = status as any;
    }

    const [total, items] = await Promise.all([
      prisma.aIApprovalRequest.count({ where }),
      prisma.aIApprovalRequest.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      items,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }
}

export const approvalService = new ApprovalService();
