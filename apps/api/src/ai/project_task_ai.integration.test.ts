import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toolExecutor } from "./tools/tool.executor";
import { approvalService } from "./approvals/approval.service";
import { orchestrator } from "./orchestrator/orchestrator";
import { AIProviderFactory } from "./providers/provider.factory";
import { TestMockProvider } from "./providers/test.provider";
import { wsManager } from "../lib/websocket";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";
import { prisma } from "../lib/prisma";

describe("Phase 2 Step 4: Real Project Management & Task Agent Production Pipeline", () => {
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const victimWorkspaceId = "67b844ec10ec6e3973b5cc22";
  const testUserId = "67b844ec10ec6e3973b5cc33";
  const memberUserId = "67b844ec10ec6e3973b5cc55";

  const adminContext: AgentExecutionContext = {
    workspaceId: testWorkspaceId,
    userId: testUserId,
    userRole: "ADMIN",
    userPermissions: [
      "workspace:read",
      "workspace:write",
      "project:read",
      "project:write",
      "project:assign",
      "project:archive",
      "task:read",
      "task:write",
      "task:assign",
      "task:move",
      "milestone:read",
      "milestone:write",
      "comment:read",
      "comment:write",
      "dependency:read",
      "dependency:write",
      "system:admin",
    ],
    requestId: "req_pm_test_001",
  };

  const restrictedContext: AgentExecutionContext = {
    workspaceId: testWorkspaceId,
    userId: "67b844ec10ec6e3973b5cc44",
    userRole: "VIEWER",
    userPermissions: ["workspace:read", "project:read", "task:read", "milestone:read", "comment:read"], // Read-only
    requestId: "req_pm_test_002",
  };

  beforeEach(async () => {
    AIProviderFactory.setCustomProvider(null);

    // Ensure member user exists in test workspace for assignment testing
    const existingUser = await prisma.user.findUnique({ where: { id: memberUserId } });
    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: memberUserId,
          email: "arun.patel@omnidesk.ai",
          firstName: "Arun",
          lastName: "Patel",
          passwordHash: "dummyhash",
          memberships: {
            create: {
              workspaceId: testWorkspaceId,
              role: "MEMBER",
              permissions: ["task:read", "task:write", "project:read"],
            },
          },
        },
      });
    }
  });

  afterEach(() => {
    AIProviderFactory.setCustomProvider(null);
    vi.restoreAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. PROJECTS
  // ════════════════════════════════════════════════════════════════════════════

  it("1. Create project persists record in MongoDB and broadcasts project:created", async () => {
    const wsSpy = vi.spyOn(wsManager, "broadcastToWorkspace");

    const proposal: ToolCallProposal = {
      toolId: "project_create",
      arguments: {
        name: "Project Apollo Core Rebuild",
        description: "Next-gen platform redesign and cloud migration",
        budget: 150000,
        status: "ACTIVE",
        managerNameOrEmail: "Arun Patel",
      },
      reason: "Initialize flagship project",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc81",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const created: any = response.result?.result;
    expect(created.name).toBe("Project Apollo Core Rebuild");
    expect(created.budget).toBe(150000);
    expect(created.status).toBe("ACTIVE");

    // Verify in real MongoDB
    const dbProject = await prisma.project.findUnique({ where: { id: created.id } });
    expect(dbProject).not.toBeNull();
    expect(dbProject?.workspaceId).toBe(testWorkspaceId);
    expect(dbProject?.managerId).toBe(memberUserId);

    expect(wsSpy).toHaveBeenCalledWith(
      testWorkspaceId,
      "project:created",
      expect.objectContaining({ projectId: created.id, name: "Project Apollo Core Rebuild" })
    );
  });

  it("2. Find projects filters by keyword and active status", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project Titan Analytics Pipeline",
        description: "Real-time streaming pipeline",
        budget: 80000,
        status: "PLANNING",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "project_find",
      arguments: {
        query: "Titan",
        status: "PLANNING",
      },
      reason: "Find Titan project",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc82",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.count).toBeGreaterThan(0);
    expect(result.projects.some((pr: any) => pr.id === p.id)).toBe(true);
  });

  it("3. Get project calculates live progress and aggregates milestones", async () => {
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project Vega Cloud Migration",
        budget: 100000,
        status: "ACTIVE",
      },
    });

    // Add tasks: 1 done, 1 todo
    await prisma.task.createMany({
      data: [
        { workspaceId: testWorkspaceId, projectId: project.id, title: "Task 1", status: "done" },
        { workspaceId: testWorkspaceId, projectId: project.id, title: "Task 2", status: "todo" },
      ],
    });

    const proposal: ToolCallProposal = {
      toolId: "project_get",
      arguments: { projectId: project.id },
      reason: "Retrieve project specifications",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc83",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.progressPercentage).toBe(50);
    expect(result.totalTasks).toBe(2);
    expect(result.completedTasks).toBe(1);
  });

  it("4. Update project modifies budget and health diagnostics in MongoDB", async () => {
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project Polaris Engine",
        budget: 50000,
        spent: 10000,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "project_update",
      arguments: {
        projectId: project.id,
        budget: 75000,
        spent: 25000,
        health: "at_risk",
      },
      reason: "Update project spend metrics",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc84",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.project.findUnique({ where: { id: project.id } });
    expect(updated?.budget).toBe(75000);
    expect(updated?.spent).toBe(25000);
    expect(updated?.health).toBe("at_risk");
  });

  it("5. Workspace isolation blocks cross-workspace project access", async () => {
    const victimProject = await prisma.project.create({
      data: {
        workspaceId: victimWorkspaceId,
        name: "Confidential Competitor Project",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "project_get",
      arguments: { projectId: victimProject.id },
      reason: "Attempting cross-workspace access",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext, // workspaceId = testWorkspaceId
      executionId: "67b844ec10ec6e3973b5cc85",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/not found in workspace/);
  });

  it("6. RBAC rejection prevents unauthorized users from updating projects", async () => {
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project Secured Vault",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "project_update",
      arguments: {
        projectId: project.id,
        budget: 999999,
      },
      reason: "Viewer trying to update budget",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    await expect(
      toolExecutor.executeTool({
        proposal,
        context: restrictedContext, // VIEWER context without project:write
        executionId: "67b844ec10ec6e3973b5cc86",
        agentId: "supervisor",
      })
    ).rejects.toThrow(/Unauthorized: Missing required permissions/);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. TASKS
  // ════════════════════════════════════════════════════════════════════════════

  it("7. Create task connects to project and resolves assignee by name", async () => {
    const projectName = `Project Horizon ${Date.now()}`;
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: projectName },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_create",
      arguments: {
        title: "Build OAuth SSO Gateway",
        description: "Implement SAML and OIDC SSO authentication flow",
        projectName: projectName,
        priority: "HIGH",
        status: "todo",
        assigneeNameOrEmail: "Arun Patel",
        estimatedHours: 16,
      },
      reason: "Create SSO task",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc87",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const created: any = response.result?.result;
    expect(created.title).toBe("Build OAuth SSO Gateway");
    expect(created.assignee).toContain("Arun Patel");
    expect(created.projectName).toBe(projectName);

    const dbTask = await prisma.task.findUnique({ where: { id: created.id } });
    expect(dbTask?.projectId).toBe(project.id);
    expect(dbTask?.assigneeId).toBe(memberUserId);
    expect(dbTask?.estimatedHours).toBe(16);
  });

  it("8. Search tasks filters by assignee, project, and status", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Security Penetration Audit",
        status: "in_progress",
        priority: "URGENT",
        assigneeId: memberUserId,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_find",
      arguments: {
        status: "in_progress",
        priority: "URGENT",
        assigneeId: memberUserId,
      },
      reason: "Find Arun's in-progress urgent tasks",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc88",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.count).toBeGreaterThan(0);
    expect(result.tasks.some((t: any) => t.id === task.id)).toBe(true);
  });

  it("9. Update task modifies priority, dates, and estimates in MongoDB", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Seed Task for Updates",
        priority: "LOW",
        estimatedHours: 4,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_update",
      arguments: {
        taskId: task.id,
        priority: "URGENT",
        estimatedHours: 12,
        actualHours: 6,
      },
      reason: "Escalate task priority and estimates",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc89",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updated?.priority).toBe("URGENT");
    expect(updated?.estimatedHours).toBe(12);
    expect(updated?.actualHours).toBe(6);
  });

  it("10. Assign task reassigns task to workspace member and broadcasts task:assigned", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Unassigned Database Optimization",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_assign",
      arguments: {
        taskId: task.id,
        assigneeNameOrEmail: "Arun Patel",
      },
      reason: "Assign database optimization to Arun",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc8a",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updated?.assigneeId).toBe(memberUserId);
  });

  it("11. Valid stage movement advances task and sets completedAt on done", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Feature Implementation Task",
        status: "in_progress",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: task.id,
        targetStatus: "review",
        reason: "PR submitted for code review",
      },
      reason: "Advance to review stage",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc8b",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.task.findUnique({ where: { id: task.id } });
    expect(updated?.status).toBe("review");
  });

  it("12. Invalid stage movement is rejected with ValidationError", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Backlog Task attempting illegal jump",
        status: "backlog",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: task.id,
        targetStatus: "done", // Illegal direct transition from backlog to done
      },
      reason: "Attempting stage jump",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc8c",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/Invalid workflow transition/);
  });

  it("13. Overdue detection finds past due incomplete tasks", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const overdueTask = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Overdue Critical Bugfix",
        status: "in_progress",
        dueDate: yesterday,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_find",
      arguments: { isOverdue: true },
      reason: "Find all overdue tasks",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc8d",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.tasks.some((t: any) => t.id === overdueTask.id)).toBe(true);
  });

  it("14. Blocker detection identifies tasks blocked by dependencies", async () => {
    const blocker = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Backend API Framework Core",
        status: "in_progress", // Not done
      },
    });

    const blocked = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Frontend Client Integration",
        status: "todo",
        dependencies: [blocker.id],
        isBlocked: true,
        blockedReason: `Blocked by unfinished task: ${blocker.title}`,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_blockers",
      arguments: {},
      reason: "List all blocked tasks",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc8e",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    const found = result.blockedTasks.find((b: any) => b.id === blocked.id);
    expect(found).toBeDefined();
    expect(found.unresolvedDependencies.some((u: any) => u.id === blocker.id)).toBe(true);
  });

  it("15. Checklist creation decomposes task into subtasks in MongoDB", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Deploy Security Hardening",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_checklist_create",
      arguments: {
        taskId: task.id,
        items: [
          "Enable Strict-Transport-Security headers",
          "Configure CORS origins",
          "Rotate JWT signing secret keys",
          "Enable rate limiting middleware",
        ],
      },
      reason: "Decompose hardening task",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc8f",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.createdCount).toBe(4);

    const dbChecklists = await prisma.taskChecklist.findMany({
      where: { taskId: task.id },
      orderBy: { position: "asc" },
    });
    expect(dbChecklists.length).toBe(4);
    expect(dbChecklists[0].title).toBe("Enable Strict-Transport-Security headers");
  });

  it("16. Checklist item completion updates subtask state", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "QA Release Checklist" },
    });

    const item = await prisma.taskChecklist.create({
      data: {
        taskId: task.id,
        title: "Run automated integration suite",
        isCompleted: false,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_checklist_update",
      arguments: {
        taskId: task.id,
        checklistId: item.id,
        isCompleted: true,
      },
      reason: "Mark test suite checklist completed",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc90",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updatedItem = await prisma.taskChecklist.findUnique({ where: { id: item.id } });
    expect(updatedItem?.isCompleted).toBe(true);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. DEPENDENCIES & CYCLE PREVENTION
  // ════════════════════════════════════════════════════════════════════════════

  it("17. Add dependency links prerequisite and marks task blocked", async () => {
    const prereq = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Database Schema Migration", status: "in_progress" },
    });
    const target = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Seed Production Data", status: "todo" },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_dependency_create",
      arguments: {
        taskId: target.id,
        dependsOnTaskId: prereq.id,
      },
      reason: "Seed data requires schema migration first",
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
    const updated = await prisma.task.findUnique({ where: { id: target.id } });
    expect(updated?.dependencies).toContain(prereq.id);
    expect(updated?.isBlocked).toBe(true);
  });

  it("18. Remove dependency clears dependency ID and updates blocker state", async () => {
    const prereq = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Optional Analytics Module", status: "todo" },
    });
    const target = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Core Platform Launch",
        dependencies: [prereq.id],
        isBlocked: true,
        blockedReason: `Blocked by ${prereq.title}`,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_dependency_remove",
      arguments: {
        taskId: target.id,
        dependsOnTaskId: prereq.id,
      },
      reason: "Remove non-blocking dependency",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc92",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.task.findUnique({ where: { id: target.id } });
    expect(updated?.dependencies).not.toContain(prereq.id);
    expect(updated?.isBlocked).toBe(false);
  });

  it("19. Self-dependency is rejected with ValidationError", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Self Referencing Task" },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_dependency_create",
      arguments: {
        taskId: task.id,
        dependsOnTaskId: task.id,
      },
      reason: "Attempting self-dependency",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc93",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/A task cannot depend on itself/);
  });

  it("20. Circular dependency is detected and rejected", async () => {
    // Task A depends on Task B
    const taskB = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Task B" },
    });
    const taskA = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Task A",
        dependencies: [taskB.id],
      },
    });

    // Now try to make Task B depend on Task A (creating cycle A -> B -> A)
    const proposal: ToolCallProposal = {
      toolId: "task_dependency_create",
      arguments: {
        taskId: taskB.id,
        dependsOnTaskId: taskA.id,
      },
      reason: "Attempting circular dependency",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc94",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/Circular dependency detected/);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. MILESTONES
  // ════════════════════════════════════════════════════════════════════════════

  it("21. Create milestone attaches milestone to project in MongoDB", async () => {
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Project Chronos" },
    });

    const proposal: ToolCallProposal = {
      toolId: "milestone_create",
      arguments: {
        projectId: project.id,
        title: "Milestone 1: Alpha Core Launch",
        description: "Complete MVP features and internal validation",
        dueDate: "2026-10-15T00:00:00.000Z",
      },
      reason: "Create alpha launch milestone",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc95",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const created: any = response.result?.result;
    expect(created.title).toBe("Milestone 1: Alpha Core Launch");

    const dbMilestone = await prisma.milestone.findUnique({ where: { id: created.id } });
    expect(dbMilestone?.projectId).toBe(project.id);
  });

  it("22. Update milestone modifies deadline and description", async () => {
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Project Helios" },
    });
    const milestone = await prisma.milestone.create({
      data: {
        workspaceId: testWorkspaceId,
        projectId: project.id,
        title: "Beta Testing Phase",
        status: "pending",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "milestone_update",
      arguments: {
        milestoneId: milestone.id,
        status: "in_progress",
        dueDate: "2026-11-01T00:00:00.000Z",
      },
      reason: "Update beta milestone progress",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc96",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.milestone.findUnique({ where: { id: milestone.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("23. Complete milestone marks status completed and sets timestamp", async () => {
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Project Atlas" },
    });
    const milestone = await prisma.milestone.create({
      data: {
        workspaceId: testWorkspaceId,
        projectId: project.id,
        title: "Compliance Certification Signoff",
        status: "in_progress",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "milestone_complete",
      arguments: {
        milestoneId: milestone.id,
        notes: "SOC2 Type II audit approved by external auditors",
      },
      reason: "Sign off compliance milestone",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc97",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.milestone.findUnique({ where: { id: milestone.id } });
    expect(updated?.status).toBe("completed");
    expect(updated?.progress).toBe(100);
    expect(updated?.completedAt).not.toBeNull();
  });

  it("24. Overdue milestone detection flags past due milestones", async () => {
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Project Overdue Tracker" },
    });
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdueM = await prisma.milestone.create({
      data: {
        workspaceId: testWorkspaceId,
        projectId: project.id,
        title: "Past Due Milestone",
        dueDate: lastWeek,
        status: "pending",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "milestone_overdue",
      arguments: { projectId: project.id },
      reason: "Check overdue milestones for project",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc98",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.count).toBeGreaterThan(0);
    expect(result.milestones.some((m: any) => m.id === overdueM.id)).toBe(true);
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. AI REASONING & ORCHESTRATION
  // ════════════════════════════════════════════════════════════════════════════

  it("25. AI executes natural language task lookup with entity resolution", async () => {
    await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Refactor API Cache Layer",
        status: "in_progress",
        assigneeId: memberUserId,
      },
    });

    const testMock = new TestMockProvider([
      {
        thought: "User wants to look up the API cache refactor task",
        toolCall: {
          toolId: "task_find",
          arguments: { query: "Cache Layer" },
          reason: "Find task",
          riskLevel: "LOW",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Task found. Presenting to user.",
        isComplete: true,
        finalResponse: "Found the 'Refactor API Cache Layer' task assigned to Arun Patel in progress.",
      },
    ]);

    AIProviderFactory.setCustomProvider(testMock);

    const execResult = await orchestrator.execute({
      prompt: "Find the cache refactoring task",
      context: adminContext,
      agentId: "supervisor",
    });

    expect(execResult.status).toBe("COMPLETED");
    expect(execResult.finalResponse).toContain("Refactor API Cache Layer");
  });

  it("26. AI executes natural language project lookup and health evaluation", async () => {
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project CyberShield",
        status: "ACTIVE",
        budget: 120000,
        spent: 40000,
      },
    });

    const testMock = new TestMockProvider([
      {
        thought: "User is asking for Project CyberShield health status",
        toolCall: {
          toolId: "project_health",
          arguments: { projectName: "CyberShield" },
          reason: "Evaluate health",
          riskLevel: "LOW",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Health evaluated. Responding to user.",
        isComplete: true,
        finalResponse: "Project CyberShield is currently healthy with a 100/100 score and 33% budget consumed.",
      },
    ]);

    AIProviderFactory.setCustomProvider(testMock);

    const execResult = await orchestrator.execute({
      prompt: "How is Project CyberShield doing?",
      context: adminContext,
      agentId: "supervisor",
    });

    expect(execResult.status).toBe("COMPLETED");
    expect(execResult.finalResponse).toContain("CyberShield");
  });

  it("27. High-risk project archive pauses for human approval and executes on approval", async () => {
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Old Legacy Prototype Project",
        status: "ON_HOLD",
      },
    });

    const archiveProposal: ToolCallProposal = {
      toolId: "project_archive",
      arguments: {
        projectId: project.id,
        reason: "Decommissioned in favor of v2 architecture",
      },
      reason: "Archive deprecated project",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    // AI execution creates approval request
    const response = await toolExecutor.executeTool({
      proposal: archiveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc99",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.approvalRequired).toBe(true);
    expect(response.approvalId).toBeDefined();

    // Human decides approval
    const decided = await approvalService.decideApproval({
      approvalId: response.approvalId!,
      workspaceId: testWorkspaceId,
      decidedById: testUserId,
      decision: "APPROVED",
      reason: "Approved by project director",
    });
    expect(decided.status).toBe("APPROVED");

    // Execute with approved approval ID
    const executeApproved = await toolExecutor.executeTool({
      proposal: archiveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc99",
      agentId: "supervisor",
      approvalId: response.approvalId,
    });
    expect(executeApproved.executed).toBe(true);

    // Verify MongoDB state
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(dbProject?.isArchived).toBe(true);
    expect(dbProject?.status).toBe("CANCELLED");
  });

  it("28. Rejected project archive approval prevents mutation and keeps project active", async () => {
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Protected Core Project",
        status: "ACTIVE",
      },
    });

    const archiveProposal: ToolCallProposal = {
      toolId: "project_archive",
      arguments: {
        projectId: project.id,
        reason: "Accidental archive request",
      },
      reason: "Archive project",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    const response = await toolExecutor.executeTool({
      proposal: archiveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9a",
      agentId: "supervisor",
    });

    expect(response.approvalRequired).toBe(true);

    // Reject approval
    await approvalService.decideApproval({
      approvalId: response.approvalId!,
      workspaceId: testWorkspaceId,
      decidedById: testUserId,
      decision: "REJECTED",
      reason: "Denying accidental archive request",
    });

    // Attempting to execute with rejected approval fails
    await expect(
      toolExecutor.executeTool({
        proposal: archiveProposal,
        context: adminContext,
        executionId: "67b844ec10ec6e3973b5cc9a",
        agentId: "supervisor",
        approvalId: response.approvalId,
      })
    ).rejects.toThrow(/REJECTED by human operator/);

    // Verify MongoDB project was NOT mutated
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(dbProject?.isArchived).toBe(false);
    expect(dbProject?.status).toBe("ACTIVE");
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. ANALYTICS (PROJECT HEALTH, PROGRESS, TEAM WORKLOAD)
  // ════════════════════════════════════════════════════════════════════════════

  it("29. Project health computes score penalty for overdue tasks, blockers, and budget burn", async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "High-Risk Struggling Project",
        budget: 50000,
        spent: 55000, // Exceeded budget
        status: "ACTIVE",
      },
    });

    await prisma.task.createMany({
      data: [
        { workspaceId: testWorkspaceId, projectId: project.id, title: "Overdue Task", dueDate: yesterday, status: "in_progress" },
        { workspaceId: testWorkspaceId, projectId: project.id, title: "Blocked Task", isBlocked: true, status: "todo" },
      ],
    });

    const proposal: ToolCallProposal = {
      toolId: "project_health",
      arguments: { projectId: project.id },
      reason: "Check struggling project health",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9b",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const health: any = response.result?.result;
    expect(health.overallHealth).toBe("at_risk");
    expect(health.overdueTasksCount).toBe(1);
    expect(health.blockedTasksCount).toBe(1);
    expect(health.budgetBurnPercentage).toBe(110);
    expect(health.atRiskReasons.length).toBeGreaterThanOrEqual(2);
  });

  it("30. Team workload computes member distribution and flags overdue tasks", async () => {
    const proposal: ToolCallProposal = {
      toolId: "team_workload",
      arguments: {},
      reason: "Analyze team assignments and capacity",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9c",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const workload: any = response.result?.result;
    expect(workload.members.length).toBeGreaterThan(0);
    const member = workload.members.find((m: any) => m.userId === memberUserId);
    expect(member).toBeDefined();
    expect(member.name).toContain("Arun Patel");
  });

  it("31. Unknown entity handling safely returns NotFoundError without crashing", async () => {
    const proposal: ToolCallProposal = {
      toolId: "task_get",
      arguments: { taskId: "67b844ec10ec6e3973b5cc99" }, // Nonexistent ID
      reason: "Attempt to get non-existent task",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9d",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/not found in workspace/);
  });

  it("32. AI cannot forge workspaceId in tool arguments — server context is authoritative", async () => {
    const victimTask = await prisma.task.create({
      data: {
        workspaceId: victimWorkspaceId,
        title: "Victim Secret Task",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_update",
      arguments: {
        taskId: victimTask.id,
        title: "Hacked by unauthorized attacker",
      },
      reason: "Attempting cross-workspace mutation",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext, // workspaceId = testWorkspaceId
      executionId: "67b844ec10ec6e3973b5cc9e",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/not found in workspace/);

    // Verify victim record was unchanged
    const unchanged = await prisma.task.findUnique({ where: { id: victimTask.id } });
    expect(unchanged?.title).toBe("Victim Secret Task");
  });

  it("33. AI cannot forge userId in audit trail — context userId is enforced", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Audit Verification Task" },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_comment",
      arguments: {
        taskId: task.id,
        content: "Verified audit entry",
      },
      reason: "Add audit comment",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9f",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const comment = await prisma.taskComment.findFirst({
      where: { taskId: task.id },
    });
    expect(comment?.userId).toBe(adminContext.userId);
  });

  it("34. Archived project rejects new task creation with ValidationError", async () => {
    const archivedProject = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Old Archived Alpha",
        isArchived: true,
        status: "CANCELLED",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_create",
      arguments: {
        title: "Attempted Task in Archived Project",
        projectId: archivedProject.id,
      },
      reason: "Task creation",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca0",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/Cannot create task in archived project/);
  });

  it("35. Blocked task cannot be moved directly to in_progress", async () => {
    const blocker = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Prerequisite Service", status: "todo" },
    });

    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Dependent API Consumer",
        status: "todo",
        dependencies: [blocker.id],
        isBlocked: true,
        blockedReason: `Blocked by ${blocker.title}`,
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: task.id,
        targetStatus: "in_progress",
      },
      reason: "Attempting to move blocked task",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca1",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/blocked by unresolved dependencies/);
  });

  it("36. Completing a prerequisite task automatically unblocks dependent tasks", async () => {
    const blocker = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Auth Service Core", status: "in_progress" },
    });

    const dependent = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Mobile SSO UI",
        status: "todo",
        dependencies: [blocker.id],
        isBlocked: true,
        blockedReason: `Blocked by unfinished task: ${blocker.title}`,
      },
    });

    // Move blocker to done
    const moveProposal: ToolCallProposal = {
      toolId: "task_move",
      arguments: {
        taskId: blocker.id,
        targetStatus: "done",
      },
      reason: "Complete auth service",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    await toolExecutor.executeTool({
      proposal: moveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca2",
      agentId: "supervisor",
    });

    // Check that dependent task is now unblocked
    const unblocked = await prisma.task.findUnique({ where: { id: dependent.id } });
    expect(unblocked?.isBlocked).toBe(false);
  });

  it("37. Project progress tool returns 100% when all tasks are completed", async () => {
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Finished Sprint 12 Project" },
    });

    await prisma.task.createMany({
      data: [
        { workspaceId: testWorkspaceId, projectId: project.id, title: "Task A", status: "done" },
        { workspaceId: testWorkspaceId, projectId: project.id, title: "Task B", status: "done" },
      ],
    });

    const proposal: ToolCallProposal = {
      toolId: "project_progress",
      arguments: { projectId: project.id },
      reason: "Check sprint progress",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca3",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const progress: any = response.result?.result;
    expect(progress.progressPercentage).toBe(100);
    expect(progress.completedTasks).toBe(2);
  });

  it("38. Project assignment resolves manager by email address", async () => {
    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Email Assigned Project" },
    });

    const proposal: ToolCallProposal = {
      toolId: "project_assign",
      arguments: {
        projectId: project.id,
        managerNameOrEmail: "arun.patel@omnidesk.ai",
      },
      reason: "Assign project by email",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca4",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const updated = await prisma.project.findUnique({ where: { id: project.id } });
    expect(updated?.managerId).toBe(memberUserId);
  });

  it("39. Project ↔ CRM link: customer accounts connect cleanly to projects", async () => {
    const companyName = `Acme Enterprises Global ${Date.now()}`;
    const customer = await prisma.customer.create({
      data: {
        workspaceId: testWorkspaceId,
        companyName: companyName,
        email: "contact@acmeglobal.com",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "project_create",
      arguments: {
        name: "Acme Global Digital Transformation",
        customerName: companyName,
        budget: 250000,
      },
      reason: "Create customer project",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca5",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const created: any = response.result?.result;
    expect(created.customer).toBe(companyName);

    const dbProject = await prisma.project.findUnique({ where: { id: created.id } });
    expect(dbProject?.customerId).toBe(customer.id);
  });

  it("40. Real WebSocket broadcast emissions occur for task and project milestones", async () => {
    const wsSpy = vi.spyOn(wsManager, "broadcastToWorkspace");

    const project = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "WS Emission Project" },
    });

    const proposal: ToolCallProposal = {
      toolId: "milestone_create",
      arguments: {
        projectId: project.id,
        title: "Realtime WebSocket Milestone",
      },
      reason: "Create milestone to test WS",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cca6",
      agentId: "supervisor",
    });

    expect(wsSpy).toHaveBeenCalledWith(
      testWorkspaceId,
      "milestone:created",
      expect.objectContaining({ title: "Realtime WebSocket Milestone" })
    );
  });
});
