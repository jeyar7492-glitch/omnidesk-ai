import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

describe("Tasks REST API Endpoints (/api/v1/tasks)", () => {
  const app = createApp();
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const testUserId = "67b844ec10ec6e3973b5cc33";

  it("POST /api/v1/tasks creates a task and returns 201", async () => {
    const res = await request(app)
      .post("/api/v1/tasks")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read,task:write")
      .send({
        title: "REST Created Task",
        description: "Task description for testing",
        priority: "HIGH",
        status: "todo",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("REST Created Task");
  });

  it("GET /api/v1/tasks lists tasks for workspace", async () => {
    const res = await request(app)
      .get("/api/v1/tasks")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/v1/tasks/:id/move updates task status", async () => {
    const task = await prisma.task.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Task for Moving",
        status: "todo",
      },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/move`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:move,task:write")
      .send({
        targetStatus: "in_progress",
        reason: "Developer started working on task",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe("in_progress");
  });

  it("POST /api/v1/tasks/:id/checklists adds checklist items", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Task for Checklist" },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/checklists`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write")
      .send({
        items: ["Checklist sub-item 1", "Checklist sub-item 2"],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(2);
  });

  it("POST /api/v1/tasks/:id/comments adds comment", async () => {
    const task = await prisma.task.create({
      data: { workspaceId: testWorkspaceId, title: "Task for Commenting" },
    });

    const res = await request(app)
      .post(`/api/v1/tasks/${task.id}/comments`)
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:write,comment:write")
      .send({
        content: "Detailed QA review feedback on task implementation",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.content).toBe("Detailed QA review feedback on task implementation");
  });

  it("GET /api/v1/tasks/workload returns team analytics", async () => {
    const res = await request(app)
      .get("/api/v1/tasks/workload")
      .set("x-workspace-id", testWorkspaceId)
      .set("x-user-id", testUserId)
      .set("x-user-role", "ADMIN")
      .set("x-user-permissions", "task:read");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.members).toBeDefined();
  });
});
