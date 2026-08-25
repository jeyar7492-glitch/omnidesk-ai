import { prisma } from "../apps/api/src/lib/prisma";
import { projectService } from "../apps/api/src/projects/services/project.service";
import { taskService } from "../apps/api/src/tasks/services/task.service";
import { crmService } from "../apps/api/src/crm/services/crm.service";
import { approvalService } from "../apps/api/src/ai/approvals/approval.service";
import { toolExecutor } from "../apps/api/src/ai/tools/tool.executor";
import { ToolCallProposal, AgentExecutionContext } from "@omnidesk/shared-types";

async function main() {
  console.log("\n=======================================================");
  console.log("  OMNIDESK AI — PHASE 2 STEP 5 LIVE WORKFLOW TEST");
  console.log("=======================================================\n");

  const workspaceId = "67b844ec10ec6e3973b5cc11";
  const adminUserId = "67b844ec10ec6e3973b5cc33";

  const context: AgentExecutionContext = {
    workspaceId,
    userId: adminUserId,
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
      "crm:read",
      "crm:write",
      "deal:read",
      "deal:write",
      "lead:read",
      "lead:write",
      "customer:read",
      "customer:write",
      "system:admin",
    ],
    requestId: "live_step5_test_001",
  };

  // ── TEST 1: Show Overdue Tasks ──────────────────────────────────────────
  console.log("TEST 1: 'Show my overdue tasks' workflow...");
  // Create an overdue task in MongoDB
  const overdueTask = await taskService.createTask(workspaceId, {
    title: "Critical Security Patch Backlog",
    status: "todo",
    dueDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  });

  const overdueProposal: ToolCallProposal = {
    toolId: "task_list_overdue",
    arguments: {},
    reason: "Find all overdue tasks across workspace",
    riskLevel: "LOW",
    requiresApproval: false,
  };

  const res1 = await toolExecutor.executeTool({
    proposal: overdueProposal,
    context,
    executionId: "exec_test_1",
    agentId: "supervisor",
  });
  console.log(`  ✓ Tool 'task_list_overdue' executed: count=${res1.result?.result?.count}`);
  expect(res1.executed).toBe(true);

  // ── TEST 2: Show Project Progress ───────────────────────────────────────
  console.log("\nTEST 2: 'Show the progress of my projects' workflow...");
  const proj = await projectService.createProject(workspaceId, {
    name: `Enterprise Analytics Migration ${Date.now()}`,
    budget: 150000,
  });

  const progressProposal: ToolCallProposal = {
    toolId: "project_progress",
    arguments: { projectId: proj.id },
    reason: "Compute real-time project task completion rate",
    riskLevel: "LOW",
    requiresApproval: false,
  };

  const res2 = await toolExecutor.executeTool({
    proposal: progressProposal,
    context,
    executionId: "exec_test_2",
    agentId: "supervisor",
  });
  console.log(`  ✓ Tool 'project_progress' executed: progressPercentage=${res2.result?.result?.progressPercentage}%`);
  expect(res2.executed).toBe(true);

  // ── TEST 3: Show Open CRM Deals ─────────────────────────────────────────
  console.log("\nTEST 3: 'Show my open CRM deals' workflow...");
  const deal = await crmService.createDeal(workspaceId, {
    title: `Global SaaS Subscription ${Date.now()}`,
    amount: 95000,
    stage: "QUALIFICATION",
    probability: 40,
  });

  const crmProposal: ToolCallProposal = {
    toolId: "pipeline_summary",
    arguments: {},
    reason: "Aggregate active deals and pipeline values",
    riskLevel: "LOW",
    requiresApproval: false,
  };

  const res3 = await toolExecutor.executeTool({
    proposal: crmProposal,
    context,
    executionId: "exec_test_3",
    agentId: "supervisor",
  });
  console.log(`  ✓ Tool 'pipeline_summary' executed: totalActiveDeals=${res3.result?.result?.totalDeals}`);
  expect(res3.executed).toBe(true);

  // ── TEST 4: Create low-risk task through AI tool ────────────────────────
  console.log("\nTEST 4: Low-risk task creation via AI tool...");
  const taskCreateProposal: ToolCallProposal = {
    toolId: "task_create",
    arguments: {
      title: "Automated End-to-End API Integration Suite",
      description: "Implemented via Step 5 Frontend AI integration",
      priority: "HIGH",
      status: "todo",
    },
    reason: "Create integration test task",
    riskLevel: "LOW",
    requiresApproval: false,
  };

  const res4 = await toolExecutor.executeTool({
    proposal: taskCreateProposal,
    context,
    executionId: "exec_test_4",
    agentId: "supervisor",
  });
  console.log(`  ✓ Low-risk task created: id=${res4.result?.result?.id}, title='${res4.result?.result?.title}'`);
  expect(res4.executed).toBe(true);

  // ── TEST 5: High-risk archive workflow with human approval gate ─────────
  console.log("\nTEST 5: High-risk archive operation with approval gate...");
  const archiveProj = await projectService.createProject(workspaceId, {
    name: "Project to be archived via Approval Gate",
  });

  const archiveProposal: ToolCallProposal = {
    toolId: "project_archive",
    arguments: { projectId: archiveProj.id, reason: "Decommissioning completed project" },
    reason: "Archive old project",
    riskLevel: "HIGH",
    requiresApproval: true,
  };

  // Step 1: Tool execution halts at approval gate
  const res5_gate = await toolExecutor.executeTool({
    proposal: archiveProposal,
    context,
    executionId: "exec_test_5",
    agentId: "supervisor",
  });
  console.log(`  ✓ High-risk operation intercepted: approvalRequired=${res5_gate.approvalRequired}, approvalId=${res5_gate.approvalId}`);
  expect(res5_gate.approvalRequired).toBe(true);
  expect(res5_gate.approvalId).toBeDefined();

  // Step 2: Human Operator grants approval
  const approvalDecision = await approvalService.decideApproval({
    approvalId: res5_gate.approvalId!,
    workspaceId,
    decidedById: adminUserId,
    decision: "APPROVED",
    reason: "Approved by enterprise director",
  });
  console.log(`  ✓ Human operator approval recorded: status=${approvalDecision.status}`);
  expect(approvalDecision.status).toBe("APPROVED");

  // Step 3: Tool is executed with approval token
  const res5_exec = await toolExecutor.executeTool({
    proposal: archiveProposal,
    context,
    executionId: "exec_test_5",
    agentId: "supervisor",
    approvalId: res5_gate.approvalId,
  });
  console.log(`  ✓ Approved action executed: executed=${res5_exec.executed}`);
  expect(res5_exec.executed).toBe(true);

  // Verify in MongoDB
  const dbArchived = await prisma.project.findUnique({ where: { id: archiveProj.id } });
  console.log(`  ✓ Verified DB state: isArchived=${dbArchived?.isArchived}, status='${dbArchived?.status}'`);
  expect(dbArchived?.isArchived).toBe(true);

  console.log("\n=======================================================");
  console.log("  ALL STEP 5 REAL END-TO-END WORKFLOWS VERIFIED (1 - 5)");
  console.log("=======================================================\n");

  await prisma.$disconnect();
}

function expect(val: any) {
  return {
    toBe: (expected: any) => {
      if (val !== expected) throw new Error(`Expected ${expected}, received ${val}`);
    },
    toBeDefined: () => {
      if (val === undefined || val === null) throw new Error("Expected value to be defined");
    },
  };
}

main().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
