import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

describe("Phase 5 Enterprise Projects & Milestones REST API Endpoints", () => {
  const app = createApp();
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const foreignWorkspaceId = "67b844ec10ec6e3973b5cc22";
  const testUserId = "67b844ec10ec6e3973b5cc33";
  const memberUserId = "67b844ec10ec6e3973b5cc44";

  beforeAll(async () => {
    await prisma.user.upsert({
      where: { id: testUserId },
      create: {
        id: testUserId,
        email: "test.admin@omnidesk.internal",
        firstName: "Test",
        lastName: "Admin",
        passwordHash: "hash",
      },
      update: {},
    });
    await prisma.user.upsert({
      where: { id: memberUserId },
      create: {
        id: memberUserId,
        email: "member.user@omnidesk.internal",
        firstName: "Member",
        lastName: "User",
        passwordHash: "hash",
      },
      update: {},
    });
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: testWorkspaceId,
          userId: memberUserId,
        },
      },
      create: {
        workspaceId: testWorkspaceId,
        userId: memberUserId,
        role: "MEMBER",
      },
      update: {},
    });
  });

  it("POST /api/v1/projects creates a project with auto-generated key and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read,project:write")
      .send({
        name: "Phase 5 Core Cloud Infrastructure",
        description: "Enterprise multi-cloud architecture implementation",
        priority: "HIGH",
        budget: 75000,
        status: "ACTIVE",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Phase 5 Core Cloud Infrastructure");
    expect(res.body.data.key).toMatch(/^PRJ-\d+$/);
    expect(res.body.data.priority).toBe("HIGH");
  });

  it("GET /api/v1/projects lists projects with pagination and metadata", async () => {
    const res = await request(app)
      .get("/api/v1/projects?page=1&limit=10")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.page).toBe(1);
  });

  it("GET /api/v1/projects/:id returns full project detail", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project Detail Inspection",
        key: "PRJ-DET",
        priority: "MEDIUM",
        status: "ACTIVE",
      },
    });

    const res = await request(app)
      .get(`/api/v1/projects/${p.id}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(p.id);
    expect(res.body.data.name).toBe("Project Detail Inspection");
  });

  it("PATCH /api/v1/projects/:id updates project fields", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project to Update",
        priority: "LOW",
        status: "PLANNING",
      },
    });

    const res = await request(app)
      .patch(`/api/v1/projects/${p.id}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:write")
      .send({
        name: "Project Updated Successfully",
        priority: "URGENT",
        status: "ACTIVE",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Project Updated Successfully");
    expect(res.body.data.priority).toBe("URGENT");
    expect(res.body.data.status).toBe("ACTIVE");
  });

  it("POST /api/v1/projects/:id/archive and /restore toggles archive state and status", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Project to Archive and Restore",
        status: "ACTIVE",
      },
    });

    // Archive
    const archiveRes = await request(app)
      .post(`/api/v1/projects/${p.id}/archive`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:archive,project:write")
      .send({ reason: "Completed roadmap cycle" });

    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.success).toBe(true);
    expect(archiveRes.body.data.isArchived).toBe(true);
    expect(archiveRes.body.data.status).toBe("CANCELLED");

    // Restore
    const restoreRes = await request(app)
      .post(`/api/v1/projects/${p.id}/restore`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:write");

    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.success).toBe(true);
    expect(restoreRes.body.data.isArchived).toBe(false);
    expect(restoreRes.body.data.status).toBe("ACTIVE");
  });

  it("GET /api/v1/projects/:id/dashboard returns comprehensive real statistics", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Dashboard Analytics Project",
        status: "ACTIVE",
      },
    });

    // Create tasks in different states
    await prisma.task.createMany({
      data: [
        { workspaceId: testWorkspaceId, projectId: p.id, title: "Task 1", status: "todo", priority: "HIGH" },
        { workspaceId: testWorkspaceId, projectId: p.id, title: "Task 2", status: "in_progress", priority: "URGENT" },
        { workspaceId: testWorkspaceId, projectId: p.id, title: "Task 3", status: "done", priority: "LOW" },
      ],
    });

    const res = await request(app)
      .get(`/api/v1/projects/${p.id}/dashboard`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalTasks).toBeGreaterThanOrEqual(3);
    expect(res.body.data.completedTasks).toBeGreaterThanOrEqual(1);
    expect(res.body.data.inProgressTasks).toBeGreaterThanOrEqual(1);
    expect(res.body.data.completionPercentage).toBeDefined();
    expect(res.body.data.statusDistribution).toBeDefined();
    expect(res.body.data.priorityDistribution).toBeDefined();
  });

  it("POST & GET & DELETE /api/v1/projects/:id/members manages project team", async () => {
    const p = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Team Collaboration Project",
      },
    });

    // Add Member
    const addRes = await request(app)
      .post(`/api/v1/projects/${p.id}/members`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:write")
      .send({
        userId: memberUserId,
        role: "CONTRIBUTOR",
      });

    expect(addRes.status).toBe(201);
    expect(addRes.body.success).toBe(true);
    expect(addRes.body.data.userId).toBe(memberUserId);

    // List Members
    const listRes = await request(app)
      .get(`/api/v1/projects/${p.id}/members`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.some((m: any) => m.userId === memberUserId)).toBe(true);

    // Remove Member
    const delRes = await request(app)
      .delete(`/api/v1/projects/${p.id}/members/${memberUserId}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:write");

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  it("POST /api/v1/projects/:id/milestones and GET milestones returns project roadmap", async () => {
    const p = await prisma.project.create({
      data: { workspaceId: testWorkspaceId, name: "Project Milestones Parent" },
    });

    const createRes = await request(app)
      .post(`/api/v1/projects/${p.id}/milestones`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:write")
      .send({
        title: "Sprint 1 Architecture Sign-off",
        description: "Milestone deliverable review",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.title).toBe("Sprint 1 Architecture Sign-off");

    const getRes = await request(app)
      .get(`/api/v1/projects/${p.id}/milestones`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(getRes.status).toBe(200);
    expect(getRes.body.success).toBe(true);
    expect(getRes.body.data.some((m: any) => m.title === "Sprint 1 Architecture Sign-off")).toBe(true);
  });

  it("RBAC enforcement: denies project mutation when lacking project:write permission", async () => {
    const res = await request(app)
      .post("/api/v1/projects")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "MEMBER")
      .set("x-user-permissions", "project:read") // Read only
      .send({ name: "Unauthorized Project" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("Multi-tenant isolation: denies access to foreign workspace projects", async () => {
    const foreignProject = await prisma.project.create({
      data: {
        workspaceId: foreignWorkspaceId,
        name: "Foreign Tenant Project",
      },
    });

    const res = await request(app)
      .get(`/api/v1/projects/${foreignProject.id}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "project:read");

    expect(res.status).toBe(404);
  });
});
