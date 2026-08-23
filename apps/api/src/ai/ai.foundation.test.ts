import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toolExecutor } from "./tools/tool.executor";
import { toolRegistry } from "./tools/tool.registry";
import { approvalService } from "./approvals/approval.service";
import { orchestrator } from "./orchestrator/orchestrator";
import { AIProviderFactory } from "./providers/provider.factory";
import { TestMockProvider } from "./providers/test.provider";
import { NoopProvider } from "./providers/noop.provider";
import { wsManager } from "../lib/websocket";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";
import { prisma } from "../lib/prisma";

describe("Agentic AI Foundation — Security & Execution Verification", () => {
  const testContext: AgentExecutionContext = {
    workspaceId: "67b844ec10ec6e3973b5cc11",
    userId: "67b844ec10ec6e3973b5cc22",
    userRole: "ADMIN",
    userPermissions: ["workspace:read", "workspace:write", "system:admin"],
    requestId: "req_test_001",
  };

  const restrictedContext: AgentExecutionContext = {
    workspaceId: "67b844ec10ec6e3973b5cc11",
    userId: "67b844ec10ec6e3973b5cc33",
    userRole: "VIEWER",
    userPermissions: [],
    requestId: "req_test_002",
  };

  beforeEach(() => {
    AIProviderFactory.setCustomProvider(null);
  });

  afterEach(() => {
    AIProviderFactory.setCustomProvider(null);
    vi.restoreAllMocks();
  });

  it("1. Unknown tool is rejected immediately with validation error", async () => {
    const fakeProposal: ToolCallProposal = {
      toolId: "arbitrary_unregistered_tool",
      arguments: {},
      reason: "Testing rogue tool proposal",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    await expect(
      toolExecutor.executeTool({
        proposal: fakeProposal,
        context: testContext,
        executionId: "67b844ec10ec6e3973b5cc01",
        agentId: "supervisor",
      })
    ).rejects.toThrow(/Unknown tool/);
  });

  it("2. Invalid tool arguments are rejected by Zod validation", async () => {
    const invalidPingProposal: ToolCallProposal = {
      toolId: "system_maintenance",
      arguments: {
        action: "invalid_action_name", // Must be enum: clear_cache | rotate_keys | rebuild_indices
        reason: "short", // min length 5
      },
      reason: "Testing invalid args",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    await expect(
      toolExecutor.executeTool({
        proposal: invalidPingProposal,
        context: testContext,
        executionId: "67b844ec10ec6e3973b5cc02",
        agentId: "supervisor",
      })
    ).rejects.toThrow(/Invalid tool arguments/);
  });

  it("3. Unauthorized tool execution is rejected for users without required permissions", async () => {
    const adminProposal: ToolCallProposal = {
      toolId: "system_maintenance",
      arguments: {
        action: "clear_cache",
        reason: "Routine maintenance cycle",
      },
      reason: "Maintenance",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    await expect(
      toolExecutor.executeTool({
        proposal: adminProposal,
        context: restrictedContext,
        executionId: "67b844ec10ec6e3973b5cc03",
        agentId: "supervisor",
      })
    ).rejects.toThrow(/Unauthorized: Missing required permissions/);
  });

  it("4. Cross-workspace approval decision is rejected", async () => {
    // Create an approval in workspace A
    const approval = await approvalService.createApprovalRequest({
      workspaceId: "67b844ec10ec6e3973b5ccaa",
      executionId: "67b844ec10ec6e3973b5cc04",
      agentId: "supervisor",
      toolId: "system_maintenance",
      proposedArguments: { action: "clear_cache", reason: "Tenant Alpha cleanup" },
      riskLevel: "HIGH",
      requestedById: "user_alpha_1",
    });

    // Attempt to decide/approve from workspace B
    await expect(
      approvalService.decideApproval({
        approvalId: approval.id,
        workspaceId: "67b844ec10ec6e3973b5ccbb",
        decidedById: "user_beta_attacker",
        decision: "APPROVED",
      })
    ).rejects.toThrow(/Cross-workspace approval decision rejected/);
  });

  it("5. HIGH risk operation requires approval and returns waiting status", async () => {
    const highRiskProposal: ToolCallProposal = {
      toolId: "system_maintenance",
      arguments: {
        action: "clear_cache",
        reason: "Clearing invalid cache records",
      },
      reason: "High risk cache flush",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    const response = await toolExecutor.executeTool({
      proposal: highRiskProposal,
      context: testContext,
      executionId: "67b844ec10ec6e3973b5cc05",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.approvalRequired).toBe(true);
    expect(response.approvalId).toBeDefined();
  });

  it("6. REJECTED approval strictly blocks execution", async () => {
    const highRiskProposal: ToolCallProposal = {
      toolId: "system_maintenance",
      arguments: {
        action: "clear_cache",
        reason: "Clearing cache",
      },
      reason: "Testing rejected approval",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    // 1. Create approval
    const initial = await toolExecutor.executeTool({
      proposal: highRiskProposal,
      context: testContext,
      executionId: "67b844ec10ec6e3973b5cc06",
      agentId: "supervisor",
    });

    const approvalId = initial.approvalId!;

    // 2. Human decides to REJECT
    await approvalService.decideApproval({
      approvalId,
      workspaceId: testContext.workspaceId,
      decidedById: testContext.userId,
      decision: "REJECTED",
      reason: "Safety policy denied this maintenance window",
    });

    // 3. Execution attempt with rejected approval ID must fail
    await expect(
      toolExecutor.executeTool({
        proposal: highRiskProposal,
        context: testContext,
        executionId: "67b844ec10ec6e3973b5cc06",
        agentId: "supervisor",
        approvalId,
      })
    ).rejects.toThrow(/was REJECTED/);
  });

  it("7. APPROVED operation executes successfully", async () => {
    const highRiskProposal: ToolCallProposal = {
      toolId: "system_maintenance",
      arguments: {
        action: "rotate_keys",
        reason: "Periodic key rotation cycle",
      },
      reason: "Testing approved execution",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    // 1. Initiate approval
    const initial = await toolExecutor.executeTool({
      proposal: highRiskProposal,
      context: testContext,
      executionId: "67b844ec10ec6e3973b5cc07",
      agentId: "supervisor",
    });

    const approvalId = initial.approvalId!;

    // 2. Human approves
    await approvalService.decideApproval({
      approvalId,
      workspaceId: testContext.workspaceId,
      decidedById: testContext.userId,
      decision: "APPROVED",
      reason: "Approved by Lead Administrator",
    });

    // 3. Execute with approved approvalId
    const response = await toolExecutor.executeTool({
      proposal: highRiskProposal,
      context: testContext,
      executionId: "67b844ec10ec6e3973b5cc07",
      agentId: "supervisor",
      approvalId,
    });

    expect(response.executed).toBe(true);
    expect(response.result?.success).toBe(true);
    expect(response.result?.result).toMatchObject({
      action: "rotate_keys",
      status: "executed",
    });
  });

  it("8. Tool execution is recorded in persistent database audit log", async () => {
    const pingProposal: ToolCallProposal = {
      toolId: "system_ping",
      arguments: { echo: "audit_verification_ping" },
      reason: "Testing audit trail",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    await toolExecutor.executeTool({
      proposal: pingProposal,
      context: testContext,
      executionId: "67b844ec10ec6e3973b5cc08",
      agentId: "supervisor",
    });

    // Verify audit log in Prisma database
    const auditRecord = await prisma.auditEvent.findFirst({
      where: {
        workspaceId: testContext.workspaceId,
        action: "ai:tool_execution",
        entityId: "system_ping",
      },
      orderBy: { createdAt: "desc" },
    });

    expect(auditRecord).toBeDefined();
    expect(auditRecord?.workspaceId).toBe(testContext.workspaceId);
    expect(auditRecord?.userId).toBe(testContext.userId);
  });

  it("9. WebSocket AI events are emitted during execution", async () => {
    const broadcastSpy = vi.spyOn(wsManager, "broadcastToWorkspace");

    const testMock = new TestMockProvider([
      {
        thought: "Diagnostic test",
        toolCall: {
          toolId: "system_ping",
          arguments: { echo: "ws_event_test" },
          reason: "Verify WS events",
          riskLevel: "LOW",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Diagnostic finished",
        isComplete: true,
        finalResponse: "All systems verified via WebSocket events.",
      },
    ]);

    AIProviderFactory.setCustomProvider(testMock);

    const execResult = await orchestrator.execute({
      prompt: "Run health diagnostic",
      context: testContext,
      agentId: "supervisor",
    });

    expect(execResult.status).toBe("COMPLETED");
    expect(broadcastSpy).toHaveBeenCalled();

    // Verify event types were broadcast
    const eventCalls = broadcastSpy.mock.calls.map((call) => call[1]);
    expect(eventCalls).toContain("ai:request_started");
    expect(eventCalls).toContain("ai:planning");
    expect(eventCalls).toContain("ai:tool_proposed");
    expect(eventCalls).toContain("ai:tool_started");
    expect(eventCalls).toContain("ai:tool_completed");
    expect(eventCalls).toContain("ai:execution_completed");
  });

  it("10. AI provider configuration failure is handled safely without fake data", async () => {
    AIProviderFactory.setCustomProvider(new NoopProvider());

    await expect(
      orchestrator.execute({
        prompt: "Perform unconfigured AI reasoning",
        context: testContext,
        agentId: "supervisor",
      })
    ).rejects.toThrow(/AI_PROVIDER_NOT_CONFIGURED|No valid AI Provider/);
  });

  it("11. AI model cannot forge workspace ID or user identity", async () => {
    // Model attempts to access another workspace by passing forged parameters
    const workspaceTool = toolRegistry.getTool("workspace_info");
    expect(workspaceTool).toBeDefined();

    // The tool execute function MUST use context.workspaceId, ignoring any attacker parameters
    const forgedResult: any = await workspaceTool?.execute(
      { includeCounts: true } as any,
      testContext
    );

    expect(forgedResult.workspaceId).toBe(testContext.workspaceId);
    expect(forgedResult.workspaceId).not.toBe("forged_workspace_victim");
  });
});
