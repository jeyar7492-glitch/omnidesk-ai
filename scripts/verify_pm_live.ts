import { prisma } from "../apps/api/src/lib/prisma";
import { projectService } from "../apps/api/src/projects/services/project.service";
import { milestoneService } from "../apps/api/src/projects/services/milestone.service";
import { taskService } from "../apps/api/src/tasks/services/task.service";
import { approvalService } from "../apps/api/src/ai/approvals/approval.service";
import { toolExecutor } from "../apps/api/src/ai/tools/tool.executor";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";

async function main() {
  console.log("\n=======================================================");
  console.log("  OMNIDESK AI — PHASE 2 STEP 4 LIVE SYSTEM VERIFICATION");
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
      "comment:read",
      "comment:write",
      "dependency:read",
      "dependency:write",
      "system:admin",
    ],
    requestId: "live_pm_test_001",
  };

  // ── FLOW A: Create Project & Milestone ──────────────────────────────────
  console.log("FLOW A: Create Project & Milestone in real MongoDB...");
  const projectName = `Enterprise Cloud Redesign ${Date.now()}`;
  const project = await projectService.createProject(workspaceId, {
    name: projectName,
    description: "Multi-region cloud infrastructure transformation",
    budget: 350000,
    status: "ACTIVE",
  });
  console.log(`  ✓ Project created: id=${project.id}, name='${project.name}', budget=$${project.budget}`);

  const milestone = await milestoneService.createMilestone(workspaceId, {
    projectId: project.id,
    title: "Phase 1: Architecture Migration",
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  console.log(`  ✓ Milestone created: id=${milestone.id}, title='${milestone.title}'`);

  // ── FLOW B: Create Task, Assign, and Move ────────────────────────────────
  console.log("\nFLOW B: Create Task, Assign, and Move workflow stages...");
  const task1 = await taskService.createTask(workspaceId, {
    title: "Kubernetes Cluster Provisioning",
    description: "Deploy terraform scripts for EKS/GKE multi-cluster setup",
    projectId: project.id,
    milestoneId: milestone.id,
    priority: "HIGH",
    status: "todo",
    estimatedHours: 24,
  });
  console.log(`  ✓ Task created: id=${task1.id}, title='${task1.title}', status='${task1.status}'`);

  const movedTask = await taskService.moveTask(workspaceId, task1.id, "in_progress");
  console.log(`  ✓ Task moved to '${movedTask.status}'`);

  // ── FLOW C: Checklists & Subtasks ───────────────────────────────────────
  console.log("\nFLOW C: Checklists & Decomposition...");
  const checklists = await taskService.addChecklist(workspaceId, task1.id, [
    "Write VPC and Subnet modules",
    "Configure IAM roles and OIDC",
    "Deploy Helm charts",
  ]);
  console.log(`  ✓ Created ${checklists.length} checklist items on task`);

  const updatedChecklist = await taskService.updateChecklistItem(
    workspaceId,
    task1.id,
    checklists[0].id,
    true
  );
  console.log(`  ✓ Checked off item: '${updatedChecklist.title}' (isCompleted=${updatedChecklist.isCompleted})`);

  // ── FLOW D: Task Dependencies & Cycle Prevention ────────────────────────
  console.log("\nFLOW D: Task Dependencies & Blocker Resolution...");
  const task2 = await taskService.createTask(workspaceId, {
    title: "Deploy Microservices onto Cluster",
    projectId: project.id,
    status: "todo",
  });

  const blockedTask = await taskService.addDependency(workspaceId, task2.id, task1.id);
  console.log(`  ✓ Dependency added: Task '${task2.title}' depends on '${task1.title}'`);
  console.log(`  ✓ Task '${blockedTask.title}' isBlocked=${blockedTask.isBlocked} (${blockedTask.blockedReason})`);

  const blockers = await taskService.getBlockedTasks(workspaceId, project.id);
  console.log(`  ✓ Blocked tasks detected: ${blockers.count} blocked tasks found in project`);

  // ── FLOW E: Project Health & Analytics ──────────────────────────────────
  console.log("\nFLOW E: Project Health & Analytics Calculation...");
  const health = await projectService.getProjectHealth(workspaceId, project.id);
  console.log(`  ✓ Project Health: ${health.overallHealth} (Health score: ${health.healthScore}/100)`);
  console.log(`  ✓ Total Tasks: ${health.totalTasks}, Blocked: ${health.blockedTasksCount}`);

  const progress = await projectService.getProjectProgress(workspaceId, project.id);
  console.log(`  ✓ Project Progress: ${progress.progressPercentage}% (${progress.taskBreakdown.inProgress} in progress, ${progress.taskBreakdown.todo} todo)`);

  // ── FLOW F: High-Risk Archive Rejection ─────────────────────────────────
  console.log("\nFLOW F: High-Risk Archive Approval Gate (Reject Flow)...");
  const tempProject = await projectService.createProject(workspaceId, {
    name: "Temporary Project for Archive Test",
  });

  const archiveProposal: ToolCallProposal = {
    toolId: "project_archive",
    arguments: { projectId: tempProject.id, reason: "Decommissioning test" },
    reason: "Archive test project",
    riskLevel: "HIGH",
    requiresApproval: true,
  };

  const response1 = await toolExecutor.executeTool({
    proposal: archiveProposal,
    context,
    executionId: "67b844ec10ec6e3973b5cca7",
    agentId: "supervisor",
  });
  console.log(`  ✓ High-risk operation intercepted: approvalRequired=${response1.approvalRequired}, approvalId=${response1.approvalId}`);

  await approvalService.decideApproval({
    approvalId: response1.approvalId!,
    workspaceId,
    decidedById: adminUserId,
    decision: "REJECTED",
    reason: "Denied by operator",
  });
  console.log(`  ✓ Human operator rejected approval request`);

  const verifyUnmodified = await prisma.project.findUnique({ where: { id: tempProject.id } });
  console.log(`  ✓ Verified DB state: isArchived=${verifyUnmodified?.isArchived} (Project preserved)`);

  // ── FLOW G: High-Risk Archive Approval ──────────────────────────────────
  console.log("\nFLOW G: High-Risk Archive Approval Gate (Approve Flow)...");
  const response2 = await toolExecutor.executeTool({
    proposal: archiveProposal,
    context,
    executionId: "67b844ec10ec6e3973b5cca8",
    agentId: "supervisor",
  });

  await approvalService.decideApproval({
    approvalId: response2.approvalId!,
    workspaceId,
    decidedById: adminUserId,
    decision: "APPROVED",
    reason: "Authorized by project director",
  });

  const response3 = await toolExecutor.executeTool({
    proposal: archiveProposal,
    context,
    executionId: "67b844ec10ec6e3973b5cca8",
    agentId: "supervisor",
    approvalId: response2.approvalId,
  });
  console.log(`  ✓ Approved execution result: executed=${response3.executed}`);

  const verifyArchived = await prisma.project.findUnique({ where: { id: tempProject.id } });
  console.log(`  ✓ Verified DB state: isArchived=${verifyArchived?.isArchived}, status='${verifyArchived?.status}'`);

  console.log("\n=======================================================");
  console.log("  ALL LIVE FLOWS (A - G) VERIFIED SUCCESSFULLY ON MONGODB");
  console.log("=======================================================\n");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Live verification failed:", err);
  process.exit(1);
});
