import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { authService } from "../auth/services/auth.service";


describe("Dashboard REST API (/api/v1/dashboard)", () => {
  const app = createApp();

  let tokenA: string;
  let workspaceAId: string;
  let userAId: string;

  let tokenB: string;
  let workspaceBId: string;
  let userBId: string;

  beforeAll(async () => {
    // Setup Workspace A
    const regA = await authService.register({
      email: `dash_test_a_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "Alice",
      lastName: "Director",
      organizationName: "Alpha Dashboard Corp",
      workspaceName: "Alpha Workspace",
    });
    tokenA = regA.tokens.accessToken;
    workspaceAId = regA.user.activeWorkspaceId;
    userAId = regA.user.id;

    // Seed some data in Workspace A
    await prisma.project.create({
      data: {
        workspaceId: workspaceAId,
        name: "Alpha Project Apollo",
        status: "ACTIVE",
        health: "ON_TRACK",
        budget: 50000,
        spent: 12000,
      },
    });


    await prisma.task.create({
      data: {
        workspaceId: workspaceAId,
        title: "Task Alpha 1",
        status: "todo",
        priority: "HIGH",
      },
    });

    await prisma.deal.create({
      data: {
        workspaceId: workspaceAId,
        title: "Alpha Enterprise License",
        dealValue: 75000,
        stage: "PROPOSAL",
        probability: 60,
      },
    });

    // Setup Workspace B (Empty)
    const regB = await authService.register({
      email: `dash_test_b_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "Bob",
      lastName: "Viewer",
      organizationName: "Beta Dashboard Corp",
      workspaceName: "Beta Workspace",
    });
    tokenB = regB.tokens.accessToken;
    workspaceBId = regB.user.activeWorkspaceId;
    userBId = regB.user.id;
  });

  it("GET /api/v1/dashboard/metrics returns 200 with complete aggregated metrics", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const metrics = res.body.data;
    expect(metrics.kpis).toBeDefined();
    expect(metrics.kpis.totalProjects).toBeGreaterThanOrEqual(1);
    expect(metrics.kpis.totalTasks).toBeGreaterThanOrEqual(1);
    expect(metrics.kpis.activePipelineValue).toBeGreaterThanOrEqual(75000);
    expect(metrics.kpis.weightedPipelineForecast).toBeGreaterThanOrEqual(45000);

    expect(metrics.projectsSummary.activeProjects.length).toBeGreaterThanOrEqual(1);
    expect(metrics.projectsSummary.activeProjects[0].name).toBe("Alpha Project Apollo");

    expect(metrics.tasksSummary.byStatus.todo).toBeGreaterThanOrEqual(1);
    expect(metrics.tasksSummary.byPriority.HIGH).toBeGreaterThanOrEqual(1);

    expect(metrics.crmSummary.openDealsCount).toBeGreaterThanOrEqual(1);
    expect(metrics.crmSummary.recentDeals.length).toBeGreaterThanOrEqual(1);

    expect(Array.isArray(metrics.teamWorkload)).toBe(true);
    expect(metrics.teamWorkload.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /api/v1/dashboard/metrics handles empty workspace returning safe zero values", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const metrics = res.body.data;
    expect(metrics.kpis.totalProjects).toBe(0);
    expect(metrics.kpis.activeProjects).toBe(0);
    expect(metrics.kpis.totalTasks).toBe(0);
    expect(metrics.kpis.activePipelineValue).toBe(0);
    expect(metrics.kpis.openDeals).toBe(0);
    expect(metrics.projectsSummary.activeProjects).toEqual([]);
    expect(metrics.crmSummary.recentDeals).toEqual([]);
  });

  it("GET /api/v1/dashboard/metrics rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/v1/dashboard/metrics");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/v1/dashboard/metrics prevents cross-workspace data leakage", async () => {
    const resA = await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Authorization", `Bearer ${tokenA}`);

    const resB = await request(app)
      .get("/api/v1/dashboard/metrics")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(resA.body.data.kpis.totalProjects).toBeGreaterThanOrEqual(1);
    expect(resB.body.data.kpis.totalProjects).toBe(0);

    const namesInB = resB.body.data.projectsSummary.activeProjects.map((p: any) => p.name);
    expect(namesInB).not.toContain("Alpha Project Apollo");
  });
});
