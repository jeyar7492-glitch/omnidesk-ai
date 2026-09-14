import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api/client";
import {
  NotificationDetail,
  NotificationPreferenceSummary,
  NotificationListResponse,
  UnreadNotificationCountResponse,
} from "@omnidesk/shared-types";

describe("Frontend Phase 8: Notifications & Preferences Client Logic", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. NOTIFICATIONS LIST & QUERY PARAMS
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.listNotifications fetches /notifications with query parameters", async () => {
    const mockListResponse: NotificationListResponse = {
      notifications: [
        {
          id: "notif-001",
          workspaceId: "ws-test-1",
          userId: "user-1",
          type: "TASK_ASSIGNED",
          title: "Assigned to Task Alpha",
          message: "You have been assigned to task Alpha",
          priority: "HIGH",
          entityType: "task",
          entityId: "task-001",
          actionUrl: "/tasks?selected=task-001",
          isRead: false,
          readAt: null,
          isArchived: false,
          archivedAt: null,
          createdAt: "2026-09-14T10:00:00.000Z",
          updatedAt: "2026-09-14T10:00:00.000Z",
        },
      ],
      total: 1,
      unreadCount: 1,
      page: 1,
      perPage: 15,
      totalPages: 1,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockListResponse,
      }),
    });

    const res = await apiClient.listNotifications({
      page: 1,
      limit: 15,
      unreadOnly: true,
      type: "TASK_ASSIGNED",
      priority: "HIGH",
      search: "Alpha",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/notifications\?page=1&limit=15&type=TASK_ASSIGNED&priority=HIGH&unreadOnly=true&search=Alpha/),
      expect.anything()
    );
    expect(res.notifications).toHaveLength(1);
    expect(res.notifications[0].title).toBe("Assigned to Task Alpha");
    expect(res.unreadCount).toBe(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. UNREAD COUNT
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getUnreadNotificationCount fetches unread count", async () => {
    const mockCount: UnreadNotificationCountResponse = {
      unreadCount: 5,
      workspaceId: "ws-test-1",
      userId: "user-1",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockCount,
      }),
    });

    const res = await apiClient.getUnreadNotificationCount();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/unread-count"),
      expect.anything()
    );
    expect(res.unreadCount).toBe(5);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. GET NOTIFICATION BY ID
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getNotificationById fetches notification with deliveries", async () => {
    const mockDetail: NotificationDetail = {
      id: "notif-001",
      workspaceId: "ws-test-1",
      userId: "user-1",
      type: "DEAL_WON",
      title: "Deal Beta Won",
      message: "Deal Beta marked as WON",
      priority: "HIGH",
      isRead: true,
      readAt: "2026-09-14T11:00:00.000Z",
      isArchived: false,
      archivedAt: null,
      deliveries: [
        {
          id: "del-1",
          notificationId: "notif-001",
          channel: "in_app",
          status: "delivered",
          sentAt: "2026-09-14T10:00:00.000Z",
          createdAt: "2026-09-14T10:00:00.000Z",
        },
      ],
      createdAt: "2026-09-14T10:00:00.000Z",
      updatedAt: "2026-09-14T11:00:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockDetail,
      }),
    });

    const res = await apiClient.getNotificationById("notif-001");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/notif-001"),
      expect.anything()
    );
    expect(res.id).toBe("notif-001");
    expect(res.deliveries).toHaveLength(1);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. READ & UNREAD ACTIONS
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.markNotificationRead sends PATCH /notifications/:id/read", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "notif-001", isRead: true, readAt: "2026-09-14T12:00:00.000Z" },
      }),
    });

    const res = await apiClient.markNotificationRead("notif-001");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/notif-001/read"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(res.isRead).toBe(true);
  });

  it("apiClient.markNotificationUnread sends PATCH /notifications/:id/unread", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "notif-001", isRead: false, readAt: null },
      }),
    });

    const res = await apiClient.markNotificationUnread("notif-001");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/notif-001/unread"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(res.isRead).toBe(false);
  });

  it("apiClient.markAllNotificationsRead sends POST /notifications/read-all", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { updatedCount: 4 },
      }),
    });

    const res = await apiClient.markAllNotificationsRead();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/read-all"),
      expect.objectContaining({ method: "POST" })
    );
    expect(res.updatedCount).toBe(4);
  });

  it("apiClient.archiveNotification sends PATCH /notifications/:id/archive", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "notif-001", isArchived: true },
      }),
    });

    const res = await apiClient.archiveNotification("notif-001");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notifications/notif-001/archive"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(res.isArchived).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. NOTIFICATION PREFERENCES
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getNotificationPreferences fetches /notification-preferences", async () => {
    const mockPrefs: NotificationPreferenceSummary = {
      id: "pref-001",
      workspaceId: "ws-test-1",
      userId: "user-1",
      inAppEnabled: true,
      emailEnabled: true,
      emailAddress: "user@omnidesk.ai",
      tasksCategory: true,
      projectsCategory: true,
      crmCategory: true,
      financeCategory: true,
      documentsCategory: true,
      systemCategory: true,
      minPriority: "LOW",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockPrefs,
      }),
    });

    const res = await apiClient.getNotificationPreferences();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notification-preferences"),
      expect.anything()
    );
    expect(res.emailEnabled).toBe(true);
    expect(res.emailAddress).toBe("user@omnidesk.ai");
  });

  it("apiClient.updateNotificationPreferences sends PUT /notification-preferences", async () => {
    const updatedPrefs: NotificationPreferenceSummary = {
      id: "pref-001",
      workspaceId: "ws-test-1",
      userId: "user-1",
      inAppEnabled: true,
      emailEnabled: false,
      emailAddress: null,
      tasksCategory: true,
      projectsCategory: true,
      crmCategory: false,
      financeCategory: true,
      documentsCategory: true,
      systemCategory: true,
      minPriority: "HIGH",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-14T12:00:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: updatedPrefs,
      }),
    });

    const res = await apiClient.updateNotificationPreferences({
      emailEnabled: false,
      crmCategory: false,
      minPriority: "HIGH",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/notification-preferences"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          emailEnabled: false,
          crmCategory: false,
          minPriority: "HIGH",
        }),
      })
    );
    expect(res.crmCategory).toBe(false);
    expect(res.minPriority).toBe("HIGH");
  });
});
