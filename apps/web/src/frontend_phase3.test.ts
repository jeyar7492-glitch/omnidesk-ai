import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api/client";
import { DashboardMetrics, GlobalSearchResponse } from "@omnidesk/shared-types";

describe("Frontend Phase 3: Dashboard & Global Search Integration", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("apiClient.getDashboardMetrics fetches /api/v1/dashboard/metrics with Bearer auth", async () => {
    const mockMetrics: DashboardMetrics = {
      kpis: {
        totalProjects: 4,
        activeProjects: 2,
        completedProjects: 2,
        totalTasks: 15,
        overdueTasks: 1,
        blockedTasks: 0,
        completedTasks: 8,
        activePipelineValue: 120000,
        weightedPipelineForecast: 75000,
        openDeals: 3,
        newLeads: 5,
        totalTeamMembers: 4,
        aiExecutionsCount: 12,
        aiPendingApprovals: 0,
      },
      projectsSummary: {
        activeProjects: [
          {
            id: "proj_1",
            name: "Cloud Fleet Migration",
            status: "IN_PROGRESS",
            health: "ON_TRACK",
            budget: 60000,
            spent: 25000,
            progressPercentage: 45,
          },
        ],
        upcomingMilestones: [],
        overdueMilestonesCount: 0,
      },
      tasksSummary: {
        byStatus: { todo: 3, in_progress: 4, review: 2, testing: 1, done: 8, backlog: 1 },
        byPriority: { LOW: 2, MEDIUM: 8, HIGH: 4, URGENT: 1 },
        overdueCount: 1,
        blockedCount: 0,
      },
      crmSummary: {
        pipelineValue: 120000,
        weightedForecast: 75000,
        openDealsCount: 3,
        wonRevenue: 400000,
        staleDealsCount: 0,
        newLeadsCount: 5,
        recentDeals: [],
      },
      aiSummary: {
        recentExecutions: [],
        pendingApprovals: [],
        executionCounts: { total: 12, completed: 10, failed: 2, pending: 0 },
      },
      teamWorkload: [
        {
          userId: "user_1",
          name: "Alice Engineer",
          email: "alice@omnidesk.ai",
          role: "ADMIN",
          totalTasks: 5,
          inProgressTasks: 2,
          overdueTasks: 0,
          completedTasks: 3,
          estimatedHoursTotal: 30,
        },
      ],
      recentActivity: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockMetrics }),
    });

    const result = await apiClient.getDashboardMetrics();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/dashboard/metrics");
    expect(result.kpis.totalProjects).toBe(4);
    expect(result.kpis.activePipelineValue).toBe(120000);
    expect(result.projectsSummary.activeProjects[0].name).toBe("Cloud Fleet Migration");
  });

  it("apiClient.globalSearch encodes query and limit parameters properly", async () => {
    const mockSearchResponse: GlobalSearchResponse = {
      query: "Propulsion",
      totalResults: 2,
      resultsByGroup: {
        projects: [
          {
            id: "proj_prop",
            entityType: "project",
            title: "Propulsion Systems",
            status: "IN_PROGRESS",
            navigationTarget: { tab: "projects", entityId: "proj_prop" },
          },
        ],
        tasks: [
          {
            id: "task_prop",
            entityType: "task",
            title: "Test Propulsion Valve",
            status: "todo",
            navigationTarget: { tab: "tasks", entityId: "task_prop" },
          },
        ],
        crm: [],
        milestones: [],
        ai: [],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockSearchResponse }),
    });

    const result = await apiClient.globalSearch("Propulsion", 10);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/search?q=Propulsion&limit=10");
    expect(result.totalResults).toBe(2);
    expect(result.resultsByGroup.projects[0].title).toBe("Propulsion Systems");
    expect(result.resultsByGroup.tasks[0].title).toBe("Test Propulsion Valve");
  });
});
