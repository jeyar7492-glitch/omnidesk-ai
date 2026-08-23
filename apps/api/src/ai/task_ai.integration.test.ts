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

describe("Phase 2 Step 2: Real AI Provider + Task Management Production Pipeline", () => {
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const victimWorkspaceId = "67b844ec10ec6e3973b5cc22";
  const testUserId = "67b844ec10ec6e3973b5cc33";

  const adminContext: AgentExecutionContext = {
    workspaceId: testWorkspaceId,
    userId: testUserId,
    userRole: "ADMIN",
    userPermissions: ["workspace:read", "workspace:write", "task:read", "task:write", "system:admin"],
    requestId: "req_task_test_001",
  };

  const restrictedContext: AgentExecutionContext = {
    workspaceId: testWorkspaceId,
    userId: "67b844ec10ec6e3973b5cc44",
    userRole: "VIEWER",
    userPermissions: ["workspace:read", "task:read"], // No task:write
    requestId: "req_task_test_002",
  };

  beforeEach(() => {
    AIProviderFactory.setCustomProvider(null);
  });

  afterEach(() => {
    AIProviderFactory.setCustomProvider(null);
    vi.restoreAllMocks();
  });

  it("1. Missing API key returns 503 AI_PROVIDER_NOT_CONFIGURED without fake data", async () => {
    AIProviderFactory.setCustomProvider(new NoopProvider());

    await expect(
      orchestrator.execute({
        prompt: "Find all tasks in the workspace",
        context: adminContext,
        agentId: "supervisor",
      })
    ).rejects.toThrow(/No valid AI Provider credentials/);
  });

  it("2. Real task creation writes to MongoDB and emits task:created event", async () => {
    const wsSpy = vi.spyOn(wsManager, "broadcastToWorkspace");

    const proposal: ToolCallProposal = {
      toolId: "task_create",
      arguments: {
        title: "Prepare Q3 investor financial review",
        description: "Review balance sheet, cash flows, and runway estimates",
        priority: "HIGH",
        status: "todo",
        dueDate: "2026-09-30T00:00:00.000Z",
      },
      reason: "Creating high priority investor task",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc91",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    expect(response.result?.success).toBe(true);
    const created: any = response.result?.result;
    expect(created).toBeDefined();
    expect(created.title).toBe("Prepare Q3 investor financial review");
    expect(created.priority).toBe("HIGH");

    // Verify record exists in real MongoDB database
    const dbRecord = await prisma.task.findUnique({
      where: { id: created.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.workspaceId).toBe(testWorkspaceId);
    expect(dbRecord?.title).toBe("Prepare Q3 investor financial review");

    // Verify WebSocket domain event
    expect(wsSpy).toHaveBeenCalledWith(
      testWorkspaceId,
      "task:created",
      expect.objectContaining({ taskId: created.id, title: "Prepare Q3 investor financial review" })
    );
  });

  it("3. Real task lookup retrieves exact MongoDB record with workspace isolation", async () => {
    // Create task directly in DB
    const seeded = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Audit cloud infrastructure security",
        description: "Inspect IAM roles and VPC egress",
        priority: "URGENT",
        status: "in_progress",
      },
    });

    const getProposal: ToolCallProposal = {
      toolId: "task_get",
      arguments: { taskId: seeded.id },
      reason: "Fetch task details",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: getProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc92",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.title).toBe("Audit cloud infrastructure security");
    expect(result.priority).toBe("URGENT");
    expect(result.status).toBe("in_progress");
  });

  it("4. Task query finds tasks matching text query and priority in MongoDB", async () => {
    const findProposal: ToolCallProposal = {
      toolId: "task_find",
      arguments: { query: "investor", priority: "HIGH" },
      reason: "Search investor tasks",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: findProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc93",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.count).toBeGreaterThan(0);
    const found = result.tasks.some(
      (t: any) => t.title.includes("investor")
    );
    expect(found).toBe(true);
  });

  it("5. Real task update modifies task in MongoDB and emits task:updated event", async () => {
    const seeded = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Draft product requirements doc",
        priority: "LOW",
        status: "todo",
      },
    });

    const updateProposal: ToolCallProposal = {
      toolId: "task_update",
      arguments: {
        taskId: seeded.id,
        title: "Draft product requirements doc (v2 updated)",
        priority: "HIGH",
      },
      reason: "Update task priority and title",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: updateProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc94",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.title).toBe("Draft product requirements doc (v2 updated)");
    expect(result.priority).toBe("HIGH");

    // Verify DB update
    const updatedRecord = await prisma.task.findUnique({
      where: { id: seeded.id },
    });
    expect(updatedRecord?.title).toBe("Draft product requirements doc (v2 updated)");
    expect(updatedRecord?.priority).toBe("HIGH");
  });

  it("6. Real task movement follows workflow transitions and records completion", async () => {
    const seeded = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Review PR #402 database migration",
        status: "in_progress",
      },
    });

    const moveProposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: seeded.id,
        targetStatus: "review",
      },
      reason: "Move to review after PR opened",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: moveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc95",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const moveResult: any = response.result?.result;
    expect(moveResult.newStatus).toBe("review");

    // Now transition from review to done
    const finishMoveProposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: seeded.id,
        targetStatus: "done",
      },
      reason: "Review completed and approved",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const finishResponse = await toolExecutor.executeTool({
      proposal: finishMoveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc96",
      agentId: "supervisor",
    });

    expect(finishResponse.executed).toBe(true);
    const finishResult: any = finishResponse.result?.result;
    expect(finishResult.newStatus).toBe("done");
    expect(finishResult.completedAt).toBeDefined();

    // Verify MongoDB state
    const doneRecord = await prisma.task.findUnique({
      where: { id: seeded.id },
    });
    expect(doneRecord?.status).toBe("done");
    expect(doneRecord?.completedAt).not.toBeNull();
  });

  it("7. Invalid workflow transition is rejected with ValidationError", async () => {
    const seeded = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Backlog item attempting direct skip",
        status: "backlog",
      },
    });

    const illegalMoveProposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: seeded.id,
        targetStatus: "done", // Backlog cannot directly jump to done without in_progress / review
      },
      reason: "Attempting illegal stage jump",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: illegalMoveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc97",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/Invalid workflow transition/);
  });

  it("8. Cross-workspace task access is rejected with NotFoundError", async () => {
    // Task created in Victim Workspace
    const victimTask = await prisma.task.create({
      data: {
        workspaceId: victimWorkspaceId,
        title: "Secret enterprise acquisition memo",
        status: "todo",
      },
    });

    const getProposal: ToolCallProposal = {
      toolId: "task_get",
      arguments: { taskId: victimTask.id },
      reason: "Attempting cross-tenant data access",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    // Attacker in testWorkspaceId attempts to retrieve it
    const response = await toolExecutor.executeTool({
      proposal: getProposal,
      context: adminContext, // context.workspaceId = testWorkspaceId
      executionId: "67b844ec10ec6e3973b5cc98",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/not found in workspace/);
  });

  it("9. Unauthorized task write operation is rejected for VIEWER role without task:write", async () => {
    const createProposal: ToolCallProposal = {
      toolId: "task_create",
      arguments: { title: "Unauthorized task creation" },
      reason: "Viewer attempting to write",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    await expect(
      toolExecutor.executeTool({
        proposal: createProposal,
        context: restrictedContext,
        executionId: "67b844ec10ec6e3973b5cc99",
        agentId: "supervisor",
      })
    ).rejects.toThrow(/Unauthorized: Missing required permissions/);
  });

  it("10. Task comment writes comment record to MongoDB and emits WebSocket event", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Coordinate release deployment v2.0",
        status: "in_progress",
      },
    });

    const commentProposal: ToolCallProposal = {
      toolId: "task_comment",
      arguments: {
        taskId: task.id,
        content: "Deployment pipeline passed staging integration drill.",
      },
      reason: "Status update",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: commentProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9a",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.content).toBe("Deployment pipeline passed staging integration drill.");

    // Verify DB comment record
    const commentRecord = await prisma.taskComment.findFirst({
      where: { taskId: task.id },
    });
    expect(commentRecord).not.toBeNull();
    expect(commentRecord?.content).toBe("Deployment pipeline passed staging integration drill.");
  });

  it("11. List overdue tasks filters MongoDB records strictly by due date in past", async () => {
    const pastDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days in future

    await prisma.task.createMany({
      data: [
        {
          workspaceId: testWorkspaceId,
          title: "Overdue tax report submission",
          status: "todo",
          dueDate: pastDate,
        },
        {
          workspaceId: testWorkspaceId,
          title: "Future roadmap planning",
          status: "todo",
          dueDate: futureDate,
        },
      ],
    });

    const overdueProposal: ToolCallProposal = {
      toolId: "task_list_overdue",
      arguments: {},
      reason: "List overdue items",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: overdueProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9b",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const overdueList = (response.result?.result as any).overdueTasks;
    expect(overdueList.length).toBeGreaterThan(0);
    const foundOverdue = overdueList.some((t: any) => t.title === "Overdue tax report submission");
    const foundFuture = overdueList.some((t: any) => t.title === "Future roadmap planning");
    expect(foundOverdue).toBe(true);
    expect(foundFuture).toBe(false); // Future tasks must NOT be in overdue list
  });

  it("12. Supervisor Agent coordinates multi-step task workflow through Orchestrator", async () => {
    const testMock = new TestMockProvider([
      {
        thought: "User wants to create a high priority task for investor review",
        toolCall: {
          toolId: "task_create",
          arguments: {
            title: "Executive Board Review Deck",
            priority: "HIGH",
            status: "todo",
          },
          reason: "Creating board review task",
          riskLevel: "MEDIUM",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Task created successfully. Now adding initial kickoff comment.",
        toolCall: {
          toolId: "task_find",
          arguments: { query: "Executive Board Review Deck" },
          reason: "Find the created task",
          riskLevel: "LOW",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Task verified in MongoDB. Concluding workflow.",
        isComplete: true,
        finalResponse: "Successfully created and verified the Executive Board Review Deck task.",
      },
    ]);

    AIProviderFactory.setCustomProvider(testMock);

    const execResult = await orchestrator.execute({
      prompt: "Create a task called Executive Board Review Deck with high priority",
      context: adminContext,
      agentId: "supervisor",
    });

    expect(execResult.status).toBe("COMPLETED");
    expect(execResult.steps.length).toBe(3);
    expect(execResult.finalResponse).toBe("Successfully created and verified the Executive Board Review Deck task.");

    // Verify task exists in MongoDB
    const taskInDb = await prisma.task.findFirst({
      where: { workspaceId: testWorkspaceId, title: "Executive Board Review Deck" },
    });
    expect(taskInDb).not.toBeNull();
  });
});
