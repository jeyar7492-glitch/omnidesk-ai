import {
  AgentExecutionContext,
  AIExecutionRecord,
  AIExecutionStep,
  AIExecutionStatus,
} from "@omnidesk/shared-types";
import { agentRegistry } from "../agents/agent.registry";
import { toolRegistry } from "../tools/tool.registry";
import { toolExecutor } from "../tools/tool.executor";
import { AIProviderFactory } from "../providers/provider.factory";
import { AIEventEmitter } from "../events/ai_event_emitter";
import { RiskPolicyEngine } from "../policies/risk.policy";
import { AI_EXECUTION_LIMITS } from "../policies/rate_limit.policy";
import { prisma } from "../../lib/prisma";
import { AppError, NotFoundError } from "../../lib/errors";
import { logger } from "../../lib/logger";

export interface StartExecutionOptions {
  prompt: string;
  agentId?: string;
  context: AgentExecutionContext;
  conversationId?: string;
  maxSteps?: number;
  approvalId?: string;
}

export class AgentOrchestrator {
  public async execute(options: StartExecutionOptions): Promise<AIExecutionRecord> {
    const { prompt, context, conversationId, approvalId } = options;
    const agentId = options.agentId || "supervisor";
    const maxSteps = Math.min(
      options.maxSteps || AI_EXECUTION_LIMITS.DEFAULT_MAX_STEPS,
      AI_EXECUTION_LIMITS.MAX_STEPS_PER_EXECUTION
    );

    const agent = agentRegistry.getAgent(agentId);
    const provider = AIProviderFactory.getProvider();
    const startTime = Date.now();

    // 1. Create DB execution record
    const execution = await prisma.aIExecution.create({
      data: {
        workspaceId: context.workspaceId,
        userId: context.userId,
        agentId: agent.id,
        prompt,
        status: "PENDING",
        steps: [],
      },
    });

    const executionId = execution.id;

    AIEventEmitter.emit(context.workspaceId, executionId, "ai:request_started", {
      agentId: agent.id,
      prompt,
      maxSteps,
    });

    const steps: AIExecutionStep[] = [];
    let currentStatus: AIExecutionStatus = "PLANNING";
    let finalResponse: string | undefined;
    let executionError: string | undefined;

    try {
      const allowedTools = toolRegistry.listTools(agent.allowedTools);

      for (let stepNumber = 1; stepNumber <= maxSteps; stepNumber++) {
        // Enforce execution timeout
        if (Date.now() - startTime > AI_EXECUTION_LIMITS.EXECUTION_TIMEOUT_MS) {
          currentStatus = "TIMED_OUT";
          throw new AppError(
            `Execution exceeded timeout of ${AI_EXECUTION_LIMITS.EXECUTION_TIMEOUT_MS}ms`,
            408,
            "EXECUTION_TIMEOUT"
          );
        }

        AIEventEmitter.emit(context.workspaceId, executionId, "ai:planning", {
          stepNumber,
        });

        // 2. Query AI Provider for next decision
        const decision = await provider.generatePlan(
          prompt,
          agent,
          context,
          allowedTools,
          steps.map((s) => ({ thought: s.thought, toolResult: s.toolResult }))
        );

        if (decision.isComplete && decision.finalResponse) {
          finalResponse = decision.finalResponse;
          currentStatus = "COMPLETED";
          steps.push({
            stepNumber,
            thought: decision.thought,
            status: "COMPLETED",
            timestamp: new Date().toISOString(),
          });
          break;
        }

        if (!decision.toolCall) {
          finalResponse = decision.thought || "Execution completed without tool calls.";
          currentStatus = "COMPLETED";
          steps.push({
            stepNumber,
            thought: decision.thought,
            status: "COMPLETED",
            timestamp: new Date().toISOString(),
          });
          break;
        }

        // 3. Tool proposed
        const proposal = decision.toolCall;
        const evaluatedRisk = RiskPolicyEngine.evaluateRisk(proposal);
        proposal.riskLevel = evaluatedRisk;
        proposal.requiresApproval = RiskPolicyEngine.requiresHumanApproval(evaluatedRisk);

        AIEventEmitter.emit(context.workspaceId, executionId, "ai:tool_proposed", {
          toolId: proposal.toolId,
          riskLevel: proposal.riskLevel,
          requiresApproval: proposal.requiresApproval,
          reason: proposal.reason,
        });

        // 4. Execute tool through safe ToolExecutor
        const stepRecord: AIExecutionStep = {
          stepNumber,
          thought: decision.thought,
          toolCall: proposal,
          status: "PLANNING",
          timestamp: new Date().toISOString(),
        };

        const execResponse = await toolExecutor.executeTool({
          proposal,
          context,
          executionId,
          agentId: agent.id,
          approvalId,
        });

        if (execResponse.approvalRequired) {
          stepRecord.status = "EXECUTING";
          stepRecord.approvalId = execResponse.approvalId;
          currentStatus = "WAITING_APPROVAL";
          steps.push(stepRecord);
          break; // Pause execution until approved
        }

        if (execResponse.result) {
          stepRecord.toolResult = execResponse.result;
          stepRecord.status = execResponse.result.success ? "COMPLETED" : "FAILED";
        } else if (execResponse.error) {
          stepRecord.status = "FAILED";
        }

        steps.push(stepRecord);

        // If step completed and was the last planned step
        if (decision.isComplete) {
          finalResponse = decision.finalResponse || "Task completed.";
          currentStatus = "COMPLETED";
          break;
        }
      }

      if (currentStatus !== "WAITING_APPROVAL" && currentStatus !== "COMPLETED") {
        currentStatus = "COMPLETED";
        if (!finalResponse) {
          finalResponse = "Execution finished all steps.";
        }
      }
    } catch (err: any) {
      logger.error({ err, executionId }, "AI Execution failed");
      currentStatus = currentStatus === "TIMED_OUT" ? "TIMED_OUT" : "FAILED";
      executionError = err?.message || "Execution encountered an error";
    }

    const totalDurationMs = Date.now() - startTime;

    // 5. Update DB Execution record
    const updated = await prisma.aIExecution.update({
      where: { id: executionId },
      data: {
        status: currentStatus,
        steps: steps as any,
        finalResponse,
        error: executionError,
        durationMs: totalDurationMs,
      },
    });

    if (currentStatus === "COMPLETED") {
      AIEventEmitter.emit(context.workspaceId, executionId, "ai:execution_completed", {
        finalResponse,
        totalDurationMs,
      });
    } else if (currentStatus === "FAILED" || currentStatus === "TIMED_OUT") {
      AIEventEmitter.emit(context.workspaceId, executionId, "ai:execution_failed", {
        error: executionError,
        totalDurationMs,
      });
    }

    // If an error was thrown and it is an AppError (e.g. AI_PROVIDER_NOT_CONFIGURED), rethrow so API returns correct 503
    if (executionError && currentStatus === "FAILED") {
      if (executionError.includes("No valid AI Provider credentials")) {
        throw new AppError(executionError, 503, "AI_PROVIDER_NOT_CONFIGURED");
      }
    }

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      agentId: updated.agentId,
      prompt: updated.prompt,
      status: updated.status as AIExecutionStatus,
      steps,
      finalResponse: updated.finalResponse || undefined,
      error: updated.error || undefined,
      totalDurationMs,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public async getExecution(executionId: string, workspaceId: string): Promise<AIExecutionRecord> {
    const execution = await prisma.aIExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution || execution.workspaceId !== workspaceId) {
      throw new NotFoundError(`Execution '${executionId}'`);
    }

    return {
      id: execution.id,
      workspaceId: execution.workspaceId,
      userId: execution.userId,
      agentId: execution.agentId,
      prompt: execution.prompt,
      status: execution.status as AIExecutionStatus,
      steps: (execution.steps as any) || [],
      finalResponse: execution.finalResponse || undefined,
      error: execution.error || undefined,
      totalDurationMs: execution.durationMs || undefined,
      createdAt: execution.createdAt.toISOString(),
      updatedAt: execution.updatedAt.toISOString(),
    };
  }

  public async listExecutions(workspaceId: string, page = 1, perPage = 20) {
    const where = { workspaceId };
    const [total, items] = await Promise.all([
      prisma.aIExecution.count({ where }),
      prisma.aIExecution.findMany({
        where,
        skip: (page - 1) * perPage,
        take: perPage,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      items: items.map((e) => ({
        id: e.id,
        workspaceId: e.workspaceId,
        userId: e.userId,
        agentId: e.agentId,
        prompt: e.prompt,
        status: e.status,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  }
}

export const orchestrator = new AgentOrchestrator();
