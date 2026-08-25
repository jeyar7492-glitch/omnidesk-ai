import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { authService } from "../auth/services/auth.service";

describe("Global Search REST API (/api/v1/search)", () => {
  const app = createApp();

  let tokenA: string;
  let workspaceAId: string;

  let tokenB: string;
  let workspaceBId: string;

  beforeAll(async () => {
    // Setup Workspace A
    const regA = await authService.register({
      email: `search_test_a_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "Sarah",
      lastName: "Searcher",
      organizationName: "Search Alpha Org",
      workspaceName: "Search Workspace A",
    });
    tokenA = regA.tokens.accessToken;
    workspaceAId = regA.user.activeWorkspaceId;

    // Seed diverse searchable entities in Workspace A
    const project = await prisma.project.create({
      data: {
        workspaceId: workspaceAId,
        name: "Quantum Propulsion System 2026",
        description: "Next-generation propulsion mechanics and telemetry",
        status: "ACTIVE",
      },
    });

    await prisma.milestone.create({
      data: {
        workspaceId: workspaceAId,
        projectId: project.id,
        title: "Quantum Core Prototype Completion",
        dueDate: new Date("2026-11-30"),
      },
    });

    await prisma.task.create({
      data: {
        workspaceId: workspaceAId,
        projectId: project.id,
        title: "Implement Quantum Cryo Cooler Controller",
        description: "Subsystem controller firmware integration",
        status: "in_progress",
        priority: "HIGH",
        labels: ["quantum", "firmware"],
      },
    });

    const customer = await prisma.customer.create({
      data: {
        workspaceId: workspaceAId,
        companyName: "Quantum Dynamics Labs",
        contactPerson: "Dr. Walter Quantum",
        email: "walter@quantumdynamics.org",
      },
    });

    await prisma.contact.create({
      data: {
        workspaceId: workspaceAId,
        customerId: customer.id,
        firstName: "Walter",
        lastName: "Quantum",
        email: "walter@quantumdynamics.org",
        jobTitle: "Lead Quantum Researcher",
      },
    });

    await prisma.deal.create({
      data: {
        workspaceId: workspaceAId,
        customerId: customer.id,
        title: "Quantum Defense Research Agreement",
        dealValue: 500000,
        stage: "NEGOTIATION",
      },
    });

    await prisma.aIExecution.create({
      data: {
        workspaceId: workspaceAId,
        userId: regA.user.id,
        agentId: "supervisor",
        prompt: "Analyze Quantum Propulsion roadmap risks",
        status: "COMPLETED",
        finalResponse: "Quantum propulsion system risks are moderate.",
      },
    });


    // Setup Workspace B
    const regB = await authService.register({
      email: `search_test_b_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "Brian",
      lastName: "Beta",
      organizationName: "Search Beta Org",
      workspaceName: "Search Workspace B",
    });
    tokenB = regB.tokens.accessToken;
    workspaceBId = regB.user.activeWorkspaceId;
  });

  it("GET /api/v1/search?q=Quantum returns multi-entity matches grouped by type", async () => {
    const res = await request(app)
      .get("/api/v1/search?q=Quantum")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const searchData = res.body.data;
    expect(searchData.query).toBe("Quantum");
    expect(searchData.totalResults).toBeGreaterThanOrEqual(4);

    expect(searchData.resultsByGroup.projects.length).toBeGreaterThanOrEqual(1);
    expect(searchData.resultsByGroup.projects[0].title).toContain("Quantum");

    expect(searchData.resultsByGroup.tasks.length).toBeGreaterThanOrEqual(1);
    expect(searchData.resultsByGroup.tasks[0].title).toContain("Quantum");

    expect(searchData.resultsByGroup.crm.length).toBeGreaterThanOrEqual(1);
    expect(searchData.resultsByGroup.milestones.length).toBeGreaterThanOrEqual(1);
    expect(searchData.resultsByGroup.ai.length).toBeGreaterThanOrEqual(1);

    // Verify safe navigation metadata
    expect(searchData.resultsByGroup.projects[0].navigationTarget.tab).toBe("projects");
    expect(searchData.resultsByGroup.tasks[0].navigationTarget.tab).toBe("tasks");
    expect(searchData.resultsByGroup.crm[0].navigationTarget.tab).toBe("crm");
  });

  it("GET /api/v1/search enforces result limit per group", async () => {
    const res = await request(app)
      .get("/api/v1/search?q=Quantum&limit=1")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    const searchData = res.body.data;
    expect(searchData.resultsByGroup.projects.length).toBeLessThanOrEqual(1);
    expect(searchData.resultsByGroup.tasks.length).toBeLessThanOrEqual(1);
  });

  it("GET /api/v1/search rejects empty or invalid query string with 400", async () => {
    const res = await request(app)
      .get("/api/v1/search?q=")
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
  });

  it("GET /api/v1/search rejects unauthenticated request with 401", async () => {
    const res = await request(app).get("/api/v1/search?q=Quantum");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/search prevents cross-workspace entity search leakage", async () => {
    const resA = await request(app)
      .get("/api/v1/search?q=Quantum")
      .set("Authorization", `Bearer ${tokenA}`);

    const resB = await request(app)
      .get("/api/v1/search?q=Quantum")
      .set("Authorization", `Bearer ${tokenB}`);

    expect(resA.body.data.totalResults).toBeGreaterThanOrEqual(4);
    expect(resB.body.data.totalResults).toBe(0);
    expect(resB.body.data.resultsByGroup.projects).toEqual([]);
    expect(resB.body.data.resultsByGroup.tasks).toEqual([]);
  });

  it("GET /api/v1/search never returns sensitive credentials or password hashes", async () => {
    const res = await request(app)
      .get("/api/v1/search?q=Quantum")
      .set("Authorization", `Bearer ${tokenA}`);

    const rawString = JSON.stringify(res.body);
    expect(rawString).not.toContain("passwordHash");
    expect(rawString).not.toContain("refreshToken");
    expect(rawString).not.toContain("JWT_SECRET");
  });
});
