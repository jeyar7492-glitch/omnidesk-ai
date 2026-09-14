import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api/client";
import { ProjectSummary, ProjectDashboardStats } from "@omnidesk/shared-types";

describe("Frontend Phase 5: Projects, Kanban & Tasks Client Integration", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("apiClient.getProjects fetches /projects with workspace context headers", async () => {
    const mockProjects: ProjectSummary[] = [
      {
        id: "p1",
        name: "OmniDesk Core Engine",
        key: "PRJ-01",
        status: "ACTIVE",
        priority: "HIGH",
        health: "GOOD",
        budget: 50000,
        spent: 12000,
        isArchived: false,
        progressPercentage: 65,
        progress: 65,
        totalTasks: 20,
        completedTasks: 13,
        createdAt: new Date().toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProjects }),
    });

    const res = await apiClient.getProjects({ isArchived: "false" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects?isArchived=false"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-workspace-id": expect.any(String),
        }),
      })
    );
    expect(res.length).toBe(1);
    expect(res[0].name).toBe("OmniDesk Core Engine");
    expect(res[0].key).toBe("PRJ-01");
  });

  it("apiClient.getProjectsPaginated builds pagination query params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [{ id: "p2", name: "AI Agent Orchestration" }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      }),
    });

    const res = await apiClient.getProjectsPaginated({ page: 1, limit: 10 });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects?page=1&limit=10"),
      expect.any(Object)
    );
    expect(res.items.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it("apiClient.createProject posts new project definition", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: "p3", name: "New Cloud Infra", key: "INFRA", priority: "HIGH" },
      }),
    });

    const res = await apiClient.createProject({
      name: "New Cloud Infra",
      key: "INFRA",
      priority: "HIGH",
      budget: 100000,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "New Cloud Infra",
          key: "INFRA",
          priority: "HIGH",
          budget: 100000,
        }),
      })
    );
    expect(res.name).toBe("New Cloud Infra");
  });

  it("apiClient.getProjectDashboard retrieves real project analytics", async () => {
    const mockStats: ProjectDashboardStats = {
      totalTasks: 35,
      completedTasks: 20,
      inProgressTasks: 8,
      todoTasks: 5,
      reviewTasks: 1,
      blockedTasks: 1,
      overdueTasks: 2,
      completionPercentage: 57.1,
      upcomingDeadlines: [],
      milestoneProgress: [],
      memberWorkload: [],
      statusDistribution: { todo: 5, in_progress: 8, done: 20 },
      priorityDistribution: { LOW: 10, MEDIUM: 15, HIGH: 10 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockStats }),
    });

    const res = await apiClient.getProjectDashboard("p1");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/projects/p1/dashboard"),
      expect.any(Object)
    );
    expect(res.totalTasks).toBe(35);
    expect(res.completionPercentage).toBe(57.1);
  });

  it("apiClient.reorderTask sends persistent Kanban position update", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "t1", status: "in_progress", position: 3 },
      }),
    });

    const res = await apiClient.reorderTask("t1", 3, "in_progress");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks/t1/reorder"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ position: 3, targetStatus: "in_progress" }),
      })
    );
    expect(res.status).toBe("in_progress");
  });

  it("apiClient.addChecklist creates task checklist item", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: [{ id: "chk1", title: "Verify automated tests", isCompleted: false }],
      }),
    });

    const res = await apiClient.addChecklist("t1", { title: "Verify automated tests" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks/t1/checklists"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "Verify automated tests" }),
      })
    );
    expect(res.length).toBe(1);
    expect(res[0].title).toBe("Verify automated tests");
  });

  it("apiClient.addDependency establishes blocking relationship", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "t2", isBlocked: true },
      }),
    });

    const res = await apiClient.addDependency("t2", "t1");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks/t2/dependencies"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ dependsOnTaskId: "t1" }),
      })
    );
    expect(res.isBlocked).toBe(true);
  });

  it("apiClient.addComment posts real-time task comment", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: "com1", content: "Code review sign-off completed." },
      }),
    });

    const res = await apiClient.addComment("t1", "Code review sign-off completed.");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks/t1/comments"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Code review sign-off completed." }),
      })
    );
    expect(res.content).toBe("Code review sign-off completed.");
  });

  it("apiClient.getTeamWorkload fetches workspace team capacity", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          totalActiveTasks: 14,
          totalOverdueTasks: 2,
          members: [{ userId: "u1", name: "Alex Chen", totalTasks: 5 }],
        },
      }),
    });

    const res = await apiClient.getTeamWorkload();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/tasks/workload"),
      expect.any(Object)
    );
    expect(res.totalActiveTasks).toBe(14);
    expect(res.members.length).toBe(1);
  });
});
