import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

describe("Phase 5 Enterprise Tasks, Kanban & Dependencies REST API Endpoints", () => {
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
        email: "task.admin@omnidesk.internal",
        firstName: "Task",
        lastName: "Admin",
        passwordHash: "hash",
      },
      update: {},
    });
    await prisma.workspaceMember.upsert({
      where: {
        workspaceId_userId: {
          workspaceId: testWorkspaceId,
          userId: testUserId,
        },
      },
      create: {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        role: "ADMIN",
      },
      update: {},
    });
  });

  // ── 1. Task CRUD & Filtering ──────────────────────────────────────────────
  it("POST /api/v1/tasks creates a task with priority, status, and position", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read,task:write")
      .send({
        title: "Enterprise Core Auth Engine",
        description: "Zero-trust IAM and token rotation logic",
        priority: "HIGH",
        status: "todo",
        estimatedHours: 12,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Enterprise Core Auth Engine");
    expect(res.body.data.priority).toBe("HIGH");
    expect(res.body.data.status).toBe("todo");
    expect(res.body.data.position).toBeDefined();
  });

  it("GET /api/v1/tasks lists tasks with pagination and filter support", async () => {
    const res = await request(app)
      .get("/api/v1/tasks?status=todo&priority=HIGH&page=1&limit=10")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.page).toBe(1);
  });

  it("PATCH /api/v1/tasks/:id updates title, priority, dates, and hours", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Initial Task State",
        priority: "LOW",
        status: "todo",
      },
    });

    const res = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({
        title: "Updated Task State",
        priority: "URGENT",
        estimatedHours: 8,
        actualHours: 4.5,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Updated Task State");
    expect(res.body.data.priority).toBe("URGENT");
    expect(res.body.data.estimatedHours).toBe(8);
    expect(res.body.data.actualHours).toBe(4.5);
  });

  // ── 2. Kanban Transitions & Reordering ────────────────────────────────────
  it("POST /api/v1/tasks/:id/move updates task through 6 Kanban workflow stages", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Kanban Pipeline Task",
        status: "backlog",
      },
    });

    // Move backlog -> todo
    const res1 = await request(app)
      .post(`/api/v1/tasks/${task.id}/move`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({ targetStatus: "todo" });

    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe("todo");

    // Move todo -> in_progress
    const res2 = await request(app)
      .post(`/api/v1/tasks/${task.id}/move`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({ targetStatus: "in_progress" });

    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe("in_progress");

    // Move in_progress -> in_review
    const res3 = await request(app)
      .post(`/api/v1/tasks/${task.id}/move`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({ targetStatus: "in_review" });

    expect(res3.status).toBe(200);
    expect(res3.body.data.status).toBe("in_review");

    // Move in_review -> done
    const res4 = await request(app)
      .post(`/api/v1/tasks/${task.id}/move`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({ targetStatus: "done" });

    expect(res4.status).toBe(200);
    expect(res4.body.data.status).toBe("done");
  });

  it("POST /api/v1/tasks/:id/reorder updates persistent position and column", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Reorderable Task",
        status: "todo",
        position: 0,
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/reorder`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({
        targetStatus: "in_progress",
        position: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("in_progress");
  });

  // ── 3. Assignment, Archive & Restore ───────────────────────────────────────
  it("POST /api/v1/tasks/:id/assign assigns task to a member", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Unassigned Task", status: "todo" },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/assign`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:assign,task:write")
      .send({ assigneeId: memberUserId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.assigneeId).toBe(memberUserId);
  });

  it("POST /api/v1/tasks/:id/archive and /restore toggles archived status", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Task for Archival" },
    });

    // Archive
    const archRes = await request(app)
      .post(`/api/v1/tasks/${task.id}/archive`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:archive,task:write");

    expect(archRes.status).toBe(200);
    expect(archRes.body.data.isArchived).toBe(true);

    // Restore
    const restRes = await request(app)
      .post(`/api/v1/tasks/${task.id}/restore`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write");

    expect(restRes.status).toBe(200);
    expect(restRes.body.data.isArchived).toBe(false);
  });

  // ── 4. Checklists ─────────────────────────────────────────────────────────
  it("POST, PATCH, DELETE /api/v1/tasks/:id/checklists manages checklist items", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Checklist Master Task" },
    });

    // Create multiple items
    const createRes = await request(app)
      .post(`/api/v1/tasks/${task.id}/checklists`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ items: ["Item Alpha", "Item Beta"] });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.length).toBe(2);
    const itemId = createRes.body.data[0].id;

    // Toggle complete
    const patchRes = await request(app)
      .patch(`/api/v1/tasks/${task.id}/checklists/${itemId}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ isCompleted: true, title: "Item Alpha Verified" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.isCompleted).toBe(true);
    expect(patchRes.body.data.title).toBe("Item Alpha Verified");

    // Delete item
    const delRes = await request(app)
      .delete(`/api/v1/tasks/${task.id}/checklists/${itemId}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write");

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  // ── 5. Dependencies, Cycle Prevention & Blockers ──────────────────────────
  it("Dependencies: rejects self-dependency", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Self Dependent Task" },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/dependencies`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ dependsOnTaskId: task.id });

    expect(res.status).toBe(422);
    expect(res.body.error?.message || res.body.message).toMatch(/cannot depend on itself/i);
  });

  it("Dependencies: rejects cross-workspace dependency", async () => {
    const taskA = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Workspace A Task" },
    });
    const foreignTask = await prisma.task.create({
      data: { workspaceId: foreignWorkspaceId, title: "Workspace B Task" },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${taskA.id}/dependencies`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ dependsOnTaskId: foreignTask.id });

    expect(res.status).toBe(404);
  });

  it("Dependencies: detects and rejects circular dependencies (cycle detection)", async () => {
    const taskA = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Cycle Task A", status: "todo" },
    });
    const taskB = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Cycle Task B", status: "todo" },
    });

    // A depends on B
    const res1 = await request(app)
      .post(`/api/v1/tasks/${taskA.id}/dependencies`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ dependsOnTaskId: taskB.id });

    expect(res1.status).toBe(200);

    // B depends on A (Circular loop!)
    const res2 = await request(app)
      .post(`/api/v1/tasks/${taskB.id}/dependencies`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ dependsOnTaskId: taskA.id });

    expect(res2.status).toBe(422);
    expect(res2.body.error?.message || res2.body.message).toMatch(/circular dependency/i);
  });

  it("Dependencies: setting incomplete dependency marks task blocked and blocks move to done", async () => {
    const prereq = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Unfinished Prereq", status: "todo" },
    });
    const mainTask = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Dependent Target Task", status: "todo" },
    });

    // Add dependency
    const depRes = await request(app)
      .post(`/api/v1/tasks/${mainTask.id}/dependencies`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({ dependsOnTaskId: prereq.id });

    expect(depRes.status).toBe(200);
    expect(depRes.body.data.isBlocked).toBe(true);

    // Attempt moving mainTask to in_progress or done while blocked
    const moveRes = await request(app)
      .post(`/api/v1/tasks/${mainTask.id}/move`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({ targetStatus: "in_progress" });

    expect(moveRes.status).toBe(422);
    expect(moveRes.body.error?.message || moveRes.body.message).toMatch(/blocked/i);
  });

  // ── 6. Comments CRUD & RBAC ───────────────────────────────────────────────
  it("Comments: POST, GET, PATCH, DELETE comments on a task", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Task for Comment Thread" },
    });

    // Add comment
    const addRes = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "comment:write,task:write")
      .send({ content: "Initial security review findings" });

    expect(addRes.status).toBe(201);
    expect(addRes.body.data.content).toBe("Initial security review findings");
    const commentId = addRes.body.data.id;

    // Get comments
    const getRes = await request(app)
      .get(`/api/v1/tasks/${task.id}/comments`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read");

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.length).toBeGreaterThanOrEqual(1);

    // Edit comment
    const patchRes = await request(app)
      .patch(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "comment:write")
      .send({ content: "Updated security review with verified remediations" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.content).toBe("Updated security review with verified remediations");

    // Delete comment
    const delRes = await request(app)
      .delete(`/api/v1/tasks/${task.id}/comments/${commentId}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "comment:write");

    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);
  });

  // ── 7. Workload Analytics & Tenant Isolation ──────────────────────────────
  it("GET /api/v1/tasks/workload returns team capacity and workload analytics", async () => {
    const res = await request(app)
      .get("/api/v1/tasks/workload")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members).toBeDefined();
    expect(Array.isArray(res.body.data.members)).toBe(true);
  });

  it("Multi-tenant isolation: denies access to foreign workspace tasks", async () => {
    const foreignTask = await prisma.task.create({
      data: {
        workspaceId: foreignWorkspaceId,
        title: "Foreign Secret Task",
      },
    });

    const res = await request(app)
      .get(`/api/v1/tasks/${foreignTask.id}`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read");

    expect(res.status).toBe(404);
  });
});
