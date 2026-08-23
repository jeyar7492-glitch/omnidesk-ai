import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

describe("Projects and Milestones REST API Endpoints (/api/v1/projects, /api/v1/milestones)", () => {
  const app = createApp();
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const testUserId = "67b844ec10ec6e3973b5cc33";

  it("POST /api/v1/projects creates a project and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read,project:write")
      .send({
        name: "REST API Project Gamma",
        description: "Testing project creation via REST API",
        budget: 50000,
        status: "ACTIVE",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("REST API Project Gamma");
  });

  it("GET /api/v1/projects lists projects for workspace", async () => {
    const res = await request(app)
      .get("/api/v1/projects")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("GET /api/v1/projects/:id/health returns real computed health", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Health Endpoint Project",
        budget: 30000,
        spent: 10000,
      },
    });

    const res = await request(app)
      .get(`/api/v1/projects/${p.id}/health`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.overallHealth).toBeDefined();
  });

  it("POST /api/v1/milestones creates a milestone and returns 201", async () => {
    const p = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Milestone Parent Project" },
    });

    const res = await request(app)
      .post("/api/v1/milestones")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "milestone:write,project:write")
      .send({
        projectId: p.id,
        title: "REST Created Milestone 1",
        description: "Milestone deliverable specification",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("REST Created Milestone 1");
  });

  it("POST /api/v1/milestones/:id/complete marks milestone complete", async () => {
    const p = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Complete Milestone Project" },
    });
    const m = await prisma.milestone.create({
      data: { workspaceId: testWorkspaceId, projectId: p.id, title: "Milestone to Signoff" },
    });

    const res = await request(app)
      .post(`/api/v1/milestones/${m.id}/complete`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "milestone:write,project:write")
      .send({ notes: "All deliverables verified and signed off" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("completed");
  });
});
