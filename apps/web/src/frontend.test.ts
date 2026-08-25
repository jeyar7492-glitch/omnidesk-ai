import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient } from "./api/client";
import { wsClient, LiveEvent } from "./api/websocket";

describe("OmniDesk AI Frontend Integration Suite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("1. ApiClient initializes with authoritative context headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: "exec_001", status: "COMPLETED", finalResponse: "Done" },
      }),
    });
    global.fetch = mockFetch;

    await apiClient.executeAI({ prompt: "Show my overdue tasks" });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/ai/executions");
    expect(options.method).toBe("POST");
    expect(options.headers["x-workspace-id"]).toBe("67b844ec10ec6e3973b5cc11");
    expect(options.headers["x-user-id"]).toBe("67b844ec10ec6e3973b5cc33");
    expect(options.headers["x-user-role"]).toBe("ADMIN");
  });

  it("2. ApiClient handles approval decision endpoints correctly (Approve)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { success: true, status: "APPROVED" },
      }),
    });
    global.fetch = mockFetch;

    const result = await apiClient.approveAction("approval_123", "Operator approved");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/ai/approvals/approval_123/approve");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ decision: "APPROVED", reason: "Operator approved" });
    expect(result.status).toBe("APPROVED");
  });

  it("3. ApiClient handles approval decision endpoints correctly (Reject)", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { success: true, status: "REJECTED" },
      }),
    });
    global.fetch = mockFetch;

    const result = await apiClient.rejectAction("approval_123", "Denied by security");

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/v1/ai/approvals/approval_123/reject");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ decision: "REJECTED", reason: "Denied by security" });
    expect(result.status).toBe("REJECTED");
  });

  it("4. ApiClient translates 503 AI_PROVIDER_NOT_CONFIGURED error cleanly", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        success: false,
        error: {
          code: "AI_PROVIDER_NOT_CONFIGURED",
          message: "No AI provider configured in environment",
        },
      }),
    });
    global.fetch = mockFetch;

    await expect(apiClient.executeAI({ prompt: "Hello" })).rejects.toThrow(
      "No AI provider configured in environment"
    );
  });

  it("5. ApiClient loads execution audit records from GET /api/v1/ai/executions", async () => {
    const mockHistory = [
      { id: "exec_1", prompt: "Show overdue tasks", status: "COMPLETED", createdAt: new Date().toISOString() },
      { id: "exec_2", prompt: "Archive project", status: "WAITING_APPROVAL", createdAt: new Date().toISOString() },
    ];

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { count: 2, executions: mockHistory },
      }),
    });
    global.fetch = mockFetch;

    const history = await apiClient.getAIExecutions();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(history.length).toBe(2);
    expect(history[0].id).toBe("exec_1");
  });

  it("6. WebSocketClient manages subscription dispatch to registered event listeners", () => {
    const receivedEvents: LiveEvent[] = [];
    const callback = (event: LiveEvent) => {
      receivedEvents.push(event);
    };

    const unsubscribe = wsClient.subscribe("ai:tool_completed", callback);

    // Simulate event delivery via internal dispatch
    const testEvent: LiveEvent = {
      eventType: "ai:tool_completed",
      workspaceId: "67b844ec10ec6e3973b5cc11",
      executionId: "exec_999",
      timestamp: new Date().toISOString(),
      data: { toolId: "task_find", success: true },
    };

    // @ts-ignore - trigger listener
    const listeners = (wsClient as any).listeners.get("ai:tool_completed");
    listeners.forEach((cb: any) => cb(testEvent));

    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].eventType).toBe("ai:tool_completed");
    expect(receivedEvents[0].data.toolId).toBe("task_find");

    unsubscribe();
    // @ts-ignore
    expect((wsClient as any).listeners.has("ai:tool_completed")).toBe(false);
  });

  it("7. Domain APIs: Project, Task, and CRM endpoints format requests accurately", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    global.fetch = mockFetch;

    await apiClient.getProjects();
    expect(mockFetch).toHaveBeenLastCalledWith("/api/v1/projects", expect.anything());

    await apiClient.getTasks({ isOverdue: true, isBlocked: true });
    expect(mockFetch).toHaveBeenLastCalledWith("/api/v1/tasks?isOverdue=true&isBlocked=true", expect.anything());

    await apiClient.getPipelineSummary();
    expect(mockFetch).toHaveBeenLastCalledWith("/api/v1/crm/pipeline/summary", expect.anything());

    await apiClient.getDeals();
    expect(mockFetch).toHaveBeenLastCalledWith("/api/v1/crm/deals", expect.anything());
  });
});
