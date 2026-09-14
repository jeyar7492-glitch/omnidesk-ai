import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";
import { authService } from "../../auth/services/auth.service";
import { NotificationService } from "../services/notification.service";
import { toolExecutor } from "../../ai/tools/tool.executor";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";

describe("Phase 8 Enterprise Notifications & Communication Infrastructure Tests", () => {
  const app = createApp();

  let testWorkspaceId: string;
  let testOrgId: string;
  let foreignWorkspaceId: string;
  let foreignOrgId: string;

  let testUserId: string;
  let viewerUserId: string;
  let foreignUserId: string;

  let adminToken: string;
  let foreignToken: string;

  let adminHeaders: Record<string, string>;
  let viewerHeaders: Record<string, string>;
  let foreignHeaders: Record<string, string>;

  beforeAll(async () => {
    // 1. Setup Tenant A
    const regAdmin = await authService.register({
      email: `notif_admin_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "NotifAdmin",
      lastName: "Tester",
      organizationName: `Notif Org ${Date.now()}`,
      workspaceName: "Notif Main WS",
    });
    testUserId = regAdmin.user.id;
    testWorkspaceId = regAdmin.user.activeWorkspaceId;
    adminToken = regAdmin.tokens.accessToken;

    const wsA = await prisma.workspace.findUnique({ where: { id: testWorkspaceId } });
    testOrgId = wsA!.organizationId;

    // Create Viewer in Tenant A
    const regViewer = await authService.register({
      email: `notif_viewer_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "NotifViewer",
      lastName: "Tester",
    });
    viewerUserId = regViewer.user.id;
    await prisma.workspaceMember.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: viewerUserId,
        role: "VIEWER",
        permissions: ["notification:read"],
      },
    });

    // 2. Setup Tenant B (foreign tenant)
    const regForeign = await authService.register({
      email: `notif_foreign_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "ForeignUser",
      lastName: "Tester",
      organizationName: `Foreign Org ${Date.now()}`,
      workspaceName: "Foreign WS",
    });
    foreignUserId = regForeign.user.id;
    foreignWorkspaceId = regForeign.user.activeWorkspaceId;
    foreignToken = regForeign.tokens.accessToken;

    const wsB = await prisma.workspace.findUnique({ where: { id: foreignWorkspaceId } });
    foreignOrgId = wsB!.organizationId;

    // Headers with Bearer tokens
    adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "x-workspace-id": testWorkspaceId,
    };

    viewerHeaders = {
      "x-workspace-id": testWorkspaceId,
      "x-user-id": viewerUserId,
      "x-user-role": "VIEWER",
      "x-user-permissions": "notification:read",
    };

    foreignHeaders = {
      Authorization: `Bearer ${foreignToken}`,
      "x-workspace-id": foreignWorkspaceId,
    };
  });

  afterAll(async () => {
    // Deterministic test data cleanup
    const wsIds = [testWorkspaceId, foreignWorkspaceId].filter(Boolean);
    const userIds = [testUserId, viewerUserId, foreignUserId].filter(Boolean);
    const orgIds = [testOrgId, foreignOrgId].filter(Boolean);

    await prisma.notificationDelivery.deleteMany({
      where: {
        notification: {
          workspaceId: { in: wsIds },
        },
      },
    });
    await prisma.notification.deleteMany({
      where: { workspaceId: { in: wsIds } },
    });
    await prisma.notificationPreference.deleteMany({
      where: { workspaceId: { in: wsIds } },
    });
    await prisma.workspaceMember.deleteMany({
      where: { workspaceId: { in: wsIds } },
    });
    await prisma.workspace.deleteMany({
      where: { id: { in: wsIds } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: orgIds } },
    });
    await prisma.refreshToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  });

  // ── 1. Notification Creation & Preferences ───────────────────────────────
  describe("NotificationService core capabilities", () => {
    it("creates an in-app notification with valid fields and defaults", async () => {
      const created = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "TASK_ASSIGNED",
        title: "Test Task Assigned",
        message: "You have been assigned to test task 1",
        priority: "HIGH",
        entityType: "task",
        entityId: "67b844ec10ec6e3973b50001",
        actionUrl: "/tasks?selected=67b844ec10ec6e3973b50001",
      });

      expect(created).toBeDefined();
      expect(created?.title).toBe("Test Task Assigned");
      expect(created?.type).toBe("TASK_ASSIGNED");
      expect(created?.priority).toBe("HIGH");
      expect(created?.isRead).toBe(false);
      expect(created?.isArchived).toBe(false);

      // Verify delivery record was created
      const delivery = await prisma.notificationDelivery.findFirst({
        where: { notificationId: created?.id },
      });
      expect(delivery).toBeDefined();
      expect(delivery?.channel).toBe("in_app");
      expect(delivery?.status).toBe("delivered");
    });

    it("prevents duplicate notification within 5-minute deduplication window", async () => {
      const first = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "DEAL_WON",
        title: "Deal Alpha Won",
        message: "Deal Alpha closed successfully",
        priority: "HIGH",
        entityType: "deal",
        entityId: "67b844ec10ec6e3973b50002",
      });
      expect(first).toBeDefined();

      // Duplicate attempt with same entityId and type
      const second = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "DEAL_WON",
        title: "Deal Alpha Won",
        message: "Deal Alpha closed successfully",
        priority: "HIGH",
        entityType: "deal",
        entityId: "67b844ec10ec6e3973b50002",
      });

      expect(second).toBeDefined();
      expect(second?.id).toBe(first?.id); // deduplicated to existing notification
    });

    it("rejects cross-workspace notification creation attempt", async () => {
      // Trying to create notification for foreignUserId in testWorkspaceId (where they are not a member)
      const result = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: foreignUserId,
        type: "TASK_ASSIGNED",
        title: "Cross-tenant intrusion attempt",
        message: "This should be rejected",
      });

      expect(result).toBeNull();
    });

    it("suppresses notification when user preference disables category", async () => {
      // Disable CRM category for testUserId
      await NotificationService.getInstance().updatePreferences(testWorkspaceId, testUserId, {
        crmCategory: false,
      });

      const result = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "LEAD_ASSIGNED",
        title: "Suppressed Lead Assignment",
        message: "Should be filtered by user preference",
      });

      expect(result).toBeNull();

      // Re-enable CRM category
      await NotificationService.getInstance().updatePreferences(testWorkspaceId, testUserId, {
        crmCategory: true,
      });
    });

    it("suppresses notification when priority is below user minimum priority threshold", async () => {
      // Set minPriority to HIGH
      await NotificationService.getInstance().updatePreferences(testWorkspaceId, testUserId, {
        minPriority: "HIGH",
      });

      const lowResult = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "DOCUMENT_PROCESSED",
        title: "Low Priority Notice",
        message: "Should be suppressed",
        priority: "LOW",
      });
      expect(lowResult).toBeNull();

      const highResult = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "DOCUMENT_FAILED",
        title: "High Priority Notice",
        message: "Should be delivered",
        priority: "HIGH",
      });
      expect(highResult).toBeDefined();

      // Reset minPriority to LOW
      await NotificationService.getInstance().updatePreferences(testWorkspaceId, testUserId, {
        minPriority: "LOW",
      });
    });
  });

  // ── 2. REST API Endpoints ────────────────────────────────────────────────
  describe("Notification REST APIs", () => {
    let testNotificationId: string;

    beforeAll(async () => {
      const n = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "INVOICE_SENT",
        title: "Invoice INV-001 Sent",
        message: "Invoice was successfully sent to customer",
        priority: "MEDIUM",
        entityType: "invoice",
        entityId: "67b844ec10ec6e3973b50003",
        actionUrl: "/finance?tab=invoices&selected=67b844ec10ec6e3973b50003",
      });
      testNotificationId = n!.id;
    });

    it("GET /api/v1/notifications returns paginated notifications for current user", async () => {
      const res = await request(app)
        .get("/api/v1/notifications")
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.notifications)).toBe(true);
      expect(res.body.data.total).toBeGreaterThan(0);
      expect(res.body.data.unreadCount).toBeGreaterThan(0);
    });

    it("GET /api/v1/notifications/unread-count returns accurate count", async () => {
      const res = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.unreadCount).toBe("number");
      expect(res.body.data.unreadCount).toBeGreaterThan(0);
    });

    it("GET /api/v1/notifications/:id returns details with delivery logs", async () => {
      const res = await request(app)
        .get(`/api/v1/notifications/${testNotificationId}`)
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testNotificationId);
      expect(res.body.data.title).toBe("Invoice INV-001 Sent");
      expect(Array.isArray(res.body.data.deliveries)).toBe(true);
    });

    it("PATCH /api/v1/notifications/:id/read marks notification as read", async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${testNotificationId}/read`)
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
      expect(res.body.data.readAt).toBeDefined();
    });

    it("PATCH /api/v1/notifications/:id/unread marks notification as unread", async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${testNotificationId}/unread`)
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(false);
      expect(res.body.data.readAt).toBeNull();
    });

    it("POST /api/v1/notifications/read-all marks all unread notifications as read", async () => {
      const res = await request(app)
        .post("/api/v1/notifications/read-all")
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.updatedCount).toBe("number");

      // Verify unread count is now 0
      const countRes = await request(app)
        .get("/api/v1/notifications/unread-count")
        .set(adminHeaders)
        .expect(200);

      expect(countRes.body.data.unreadCount).toBe(0);
    });

    it("PATCH /api/v1/notifications/:id/archive archives notification", async () => {
      const res = await request(app)
        .patch(`/api/v1/notifications/${testNotificationId}/archive`)
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.isArchived).toBe(true);
    });
  });

  // ── 3. Notification Preferences REST API ─────────────────────────────────
  describe("Notification Preferences REST APIs", () => {
    it("GET /api/v1/notification-preferences returns user preference settings", async () => {
      const res = await request(app)
        .get("/api/v1/notification-preferences")
        .set(adminHeaders)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.workspaceId).toBe(testWorkspaceId);
      expect(res.body.data.userId).toBe(testUserId);
      expect(res.body.data.inAppEnabled).toBe(true);
      expect(res.body.data.minPriority).toBe("LOW");
    });

    it("PUT /api/v1/notification-preferences updates user preferences with validation", async () => {
      const res = await request(app)
        .put("/api/v1/notification-preferences")
        .set(adminHeaders)
        .send({
          emailEnabled: true,
          emailAddress: "override@omnidesk.ai",
          minPriority: "MEDIUM",
          tasksCategory: false,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.emailEnabled).toBe(true);
      expect(res.body.data.emailAddress).toBe("override@omnidesk.ai");
      expect(res.body.data.minPriority).toBe("MEDIUM");
      expect(res.body.data.tasksCategory).toBe(false);

      // Verify persistence
      const getRes = await request(app)
        .get("/api/v1/notification-preferences")
        .set(adminHeaders)
        .expect(200);

      expect(getRes.body.data.tasksCategory).toBe(false);
    });

    it("PUT /api/v1/notification-preferences rejects invalid email", async () => {
      await request(app)
        .put("/api/v1/notification-preferences")
        .set(adminHeaders)
        .send({
          emailAddress: "not-an-email",
        })
        .expect(400);
    });
  });

  // ── 4. Security & Tenant Isolation ───────────────────────────────────────
  describe("Security & Workspace Isolation", () => {
    let foreignNotifId: string;

    beforeAll(async () => {
      const n = await NotificationService.getInstance().createNotification({
        workspaceId: foreignWorkspaceId,
        userId: foreignUserId,
        type: "SYSTEM_ALERT",
        title: "Foreign Workspace Alert",
        message: "This notification belongs strictly to the foreign workspace",
      });
      foreignNotifId = n!.id;
    });

    it("blocks unauthenticated requests with 401", async () => {
      await request(app)
        .get("/api/v1/notifications")
        .expect(401);
    });

    it("blocks foreign workspace access to another workspace's notification (404/403 IDOR prevention)", async () => {
      // testUserId tries to view foreignNotifId belonging to foreignWorkspaceId
      await request(app)
        .get(`/api/v1/notifications/${foreignNotifId}`)
        .set(adminHeaders)
        .expect(404);
    });

    it("blocks cross-tenant marking as read", async () => {
      // testUserId tries to mark foreignNotifId as read
      await request(app)
        .patch(`/api/v1/notifications/${foreignNotifId}/read`)
        .set(adminHeaders)
        .expect(404);
    });

    it("blocks cross-tenant notification archiving", async () => {
      // testUserId tries to archive foreignNotifId
      await request(app)
        .patch(`/api/v1/notifications/${foreignNotifId}/archive`)
        .set(adminHeaders)
        .expect(404);
    });

    it("enforces RBAC permissions: VIEWER cannot archive notifications without write permission", async () => {
      // Create notification for viewer
      const viewerNotif = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: viewerUserId,
        type: "MILESTONE_DUE",
        title: "Milestone Due for Viewer",
        message: "Viewer milestone notification",
      });

      // Viewer lacks notification:write permission
      await request(app)
        .patch(`/api/v1/notifications/${viewerNotif!.id}/archive`)
        .set(viewerHeaders)
        .expect(403);
    });
  });

  // ── 5. AI Tool Execution ─────────────────────────────────────────────────
  describe("Notification AI Tools Integration", () => {
    let aiNotifId: string;

    let execContext: AgentExecutionContext;

    beforeAll(async () => {
      execContext = {
        workspaceId: testWorkspaceId,
        userId: testUserId,
        userRole: "ADMIN",
        userPermissions: ["notification:read", "notification:write"],
        requestId: "req_ai_test_01",
      };

      const n = await NotificationService.getInstance().createNotification({
        workspaceId: testWorkspaceId,
        userId: testUserId,
        type: "PAYMENT_RECEIVED",
        title: "AI Test Payment Notification",
        message: "A payment of $5,000 has been recorded",
        priority: "MEDIUM",
      });
      aiNotifId = n!.id;
    });

    it("executes notification_list tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "notification_list",
        arguments: { limit: 10 },
        reason: "Test notification list",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_01",
        agentId: "executive_agent",
      });
      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(data).toBeDefined();
      expect(Array.isArray(data.notifications)).toBe(true);
    });

    it("executes notification_unread_count tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "notification_unread_count",
        arguments: {},
        reason: "Test unread count",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_02",
        agentId: "executive_agent",
      });
      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(typeof data.unreadCount).toBe("number");
    });

    it("executes notification_get tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "notification_get",
        arguments: { notificationId: aiNotifId },
        reason: "Test notification get",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_03",
        agentId: "executive_agent",
      });
      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      const notifObj = data.notification || data;
      expect(notifObj.id).toBe(aiNotifId);
      expect(notifObj.title).toBe("AI Test Payment Notification");
    });

    it("executes notification_mark_read tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "notification_mark_read",
        arguments: { notificationId: aiNotifId },
        reason: "Test notification mark read",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_04",
        agentId: "executive_agent",
      });
      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(data.isRead).toBe(true);
    });

    it("executes notification_mark_all_read tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "notification_mark_all_read",
        arguments: {},
        reason: "Test mark all notifications read",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_05",
        agentId: "executive_agent",
      });
      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(typeof data.updatedCount).toBe("number");
    });
  });
});
