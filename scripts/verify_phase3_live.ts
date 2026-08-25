import { prisma } from "../apps/api/src/lib/prisma";
import { authService } from "../apps/api/src/auth/services/auth.service";
import { dashboardService } from "../apps/api/src/dashboard/services/dashboard.service";
import { searchService } from "../apps/api/src/search/services/search.service";

async function main() {
  console.log("=======================================================");
  console.log("  OMNIDESK AI — PHASE 3 LIVE VERIFICATION DRILL");
  console.log("=======================================================");

  let passed = 0;
  let failed = 0;

  const record = (step: string, condition: boolean, details?: string) => {
    if (condition) {
      console.log(`  [PASS] ${step}${details ? ` -> ${details}` : ""}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${step}${details ? ` -> ${details}` : ""}`);
      failed++;
    }
  };

  const runId = Math.random().toString(36).substring(2, 9);

  // 1. Setup Tenant A
  const tenantAEmail = `p3_live_a_${runId}@omnidesk.ai`;
  const regA = await authService.register({
    email: tenantAEmail,
    password: "StrongPassword123!",
    firstName: "Sarah",
    lastName: "Director",
    organizationName: `P3 Alpha Org ${runId}`,
    workspaceName: `P3 Alpha Workspace ${runId}`,
  });
  const workspaceAId = regA.user.activeWorkspaceId;
  const userAId = regA.user.id;
  record("1. Tenant A Registration & Workspace Provisioning", !!workspaceAId && !!regA.tokens.accessToken);

  // 2. Setup Tenant B (Clean Isolation Boundary)
  const tenantBEmail = `p3_live_b_${runId}@omnidesk.ai`;
  const regB = await authService.register({
    email: tenantBEmail,
    password: "StrongPassword123!",
    firstName: "Bob",
    lastName: "Isolated",
    organizationName: `P3 Beta Org ${runId}`,
    workspaceName: `P3 Beta Workspace ${runId}`,
  });
  const workspaceBId = regB.user.activeWorkspaceId;
  record("2. Tenant B Registration & Clean Boundary Setup", !!workspaceBId && workspaceBId !== workspaceAId);

  try {
    // 3. Seed Real Entities in Workspace A
    const keyword = `Hypersonic_${runId}`;

    const project = await prisma.project.create({
      data: {
        workspaceId: workspaceAId,
        name: `${keyword} Propulsion Engine`,
        description: `High-mach atmospheric propulsion flight telemetry for ${keyword}`,
        status: "ACTIVE",
        health: "ON_TRACK",
        budget: 150000,
        spent: 35000,
      },
    });

    const milestone = await prisma.milestone.create({
      data: {
        workspaceId: workspaceAId,
        projectId: project.id,
        title: `${keyword} Wind Tunnel Calibration`,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
    });

    const task = await prisma.task.create({
      data: {
        workspaceId: workspaceAId,
        projectId: project.id,
        title: `Assemble ${keyword} Turbo Injection Manifold`,
        description: `Precision cryogenic manifold integration for ${keyword}`,
        status: "in_progress",
        priority: "HIGH",
        assigneeId: userAId,
        estimatedHours: 40,
        labels: [keyword, "aerospace"],
      },
    });

    const customer = await prisma.customer.create({
      data: {
        workspaceId: workspaceAId,
        companyName: `${keyword} Aerospace Systems Inc`,
        contactPerson: "Commander Marcus Vance",
        email: `marcus@${keyword.toLowerCase()}.com`,
      },
    });

    const deal = await prisma.deal.create({
      data: {
        workspaceId: workspaceAId,
        customerId: customer.id,
        title: `${keyword} Commercial Launch Agreement`,
        dealValue: 750000,
        probability: 70,
        stage: "NEGOTIATION",
      },
    });

    const aiExec = await prisma.aIExecution.create({
      data: {
        workspaceId: workspaceAId,
        userId: userAId,
        agentId: "supervisor",
        prompt: `Evaluate ${keyword} thermal dissipation profiles`,
        status: "COMPLETED",
        finalResponse: `${keyword} thermal dissipation is optimal for orbital insertion.`,
        durationMs: 420,
      },
    });


    record("3. Real Entity Persistence in MongoDB rs0", !!project.id && !!task.id && !!deal.id);

    // 4. Dashboard Metrics Calculation for Workspace A
    const dashA = await dashboardService.getDashboardMetrics(workspaceAId);
    record(
      "4. Real-time Dashboard Aggregation for Tenant A",
      dashA.kpis.totalProjects >= 1 &&
        dashA.kpis.activeProjects >= 1 &&
        dashA.kpis.totalTasks >= 1 &&
        dashA.kpis.activePipelineValue >= 750000 &&
        dashA.kpis.weightedPipelineForecast >= 525000 &&
        dashA.projectsSummary.activeProjects.some((p) => p.name.includes(keyword))
    );

    // 5. Empty Workspace Safe Metric Handling for Workspace B
    const dashB = await dashboardService.getDashboardMetrics(workspaceBId);
    record(
      "5. Safe Zero/Empty Metric Handling for Empty Workspace B",
      dashB.kpis.totalProjects === 0 &&
        dashB.kpis.totalTasks === 0 &&
        dashB.kpis.activePipelineValue === 0 &&
        dashB.projectsSummary.activeProjects.length === 0 &&
        dashB.crmSummary.recentDeals.length === 0
    );

    // 6. Cross-Tenant Dashboard Isolation
    const leakedProjects = dashB.projectsSummary.activeProjects.filter((p) => p.name.includes(keyword));
    record("6. Strict Multi-Tenant Dashboard Isolation", leakedProjects.length === 0);

    // 7. Multi-Entity Global Search Execution
    const searchResA = await searchService.search(workspaceAId, keyword, 20);
    record(
      "7. Multi-Entity Search Matching (Projects, Tasks, CRM, Milestones, AI)",
      searchResA.totalResults >= 5 &&
        searchResA.resultsByGroup.projects.length >= 1 &&
        searchResA.resultsByGroup.tasks.length >= 1 &&
        searchResA.resultsByGroup.crm.length >= 1 &&
        searchResA.resultsByGroup.milestones.length >= 1 &&
        searchResA.resultsByGroup.ai.length >= 1
    );

    // 8. Search Entity Grouping & Navigation Metadata
    const projectMatch = searchResA.resultsByGroup.projects[0];
    const taskMatch = searchResA.resultsByGroup.tasks[0];
    record(
      "8. Search Grouping & Navigation Target Verification",
      projectMatch.navigationTarget.tab === "projects" &&
        taskMatch.navigationTarget.tab === "tasks" &&
        !!projectMatch.navigationTarget.entityId
    );

    // 9. Search Result Limit Enforcement
    const searchLimited = await searchService.search(workspaceAId, keyword, 1);
    record(
      "9. Search Result Limit Enforcement",
      searchLimited.resultsByGroup.projects.length <= 1 &&
        searchLimited.resultsByGroup.tasks.length <= 1
    );

    // 10. Empty Query Handling
    const searchEmpty = await searchService.search(workspaceAId, "", 10);
    record("10. Safe Empty Query Handling", searchEmpty.totalResults === 0);

    // 11. Cross-Workspace Global Search Isolation
    const searchResB = await searchService.search(workspaceBId, keyword, 20);
    record(
      "11. Strict Cross-Workspace Search Isolation (0 Results for Tenant B)",
      searchResB.totalResults === 0 &&
        searchResB.resultsByGroup.projects.length === 0 &&
        searchResB.resultsByGroup.tasks.length === 0 &&
        searchResB.resultsByGroup.crm.length === 0
    );

    // 12. Sensitive Field Exclusion
    const searchJson = JSON.stringify(searchResA);
    const hasSensitiveData =
      searchJson.includes("passwordHash") ||
      searchJson.includes("refreshToken") ||
      searchJson.includes("JWT_SECRET");
    record("12. Sensitive Security Field Exclusion", !hasSensitiveData);

  } finally {
    // Clean up test tenants
    await prisma.deal.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.lead.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.contact.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.customer.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.task.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.milestone.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.project.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.aIExecution.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.auditEvent.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });

    await prisma.refreshToken.deleteMany({ where: { userId: { in: [userAId, regB.user.id] } } });
    await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: [workspaceAId, workspaceBId] } } });
    await prisma.workspace.deleteMany({ where: { id: { in: [workspaceAId, workspaceBId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [userAId, regB.user.id] } } });
  }

  console.log("\n=======================================================");
  console.log(`PHASE 3 LIVE VERIFICATION RESULT: ${failed === 0 ? "SUCCESS" : "FAILED"}`);
  console.log(`Total Steps: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Live verification fatal error:", err);
  process.exit(1);
});
