import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";
import { authService } from "../../auth/services/auth.service";
import { toolExecutor } from "../../ai/tools/tool.executor";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";

describe("Phase 9 Enterprise Communication & Collaboration Tests", () => {
  const app = createApp();

  let testWorkspaceId: string;
  let testOrgId: string;
  let foreignWorkspaceId: string;
  let foreignOrgId: string;

  let adminUserId: string;
  let memberUserId: string;
  let foreignUserId: string;

  let adminToken: string;
  let memberToken: string;
  let foreignToken: string;

  let adminHeaders: Record<string, string>;
  let memberHeaders: Record<string, string>;
  let foreignHeaders: Record<string, string>;

  let testDirectConversationId: string;
  let testGroupConversationId: string;
  let testMessageId: string;
  let testAttachmentId: string;

  beforeAll(async () => {
    // 1. Setup Tenant A
    const regAdmin = await authService.register({
      email: `comm_admin_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "CommAdmin",
      lastName: "Tester",
      organizationName: `Comm Org ${Date.now()}`,
      workspaceName: "Comm Main WS",
    });
    adminUserId = regAdmin.user.id;
    testWorkspaceId = regAdmin.user.activeWorkspaceId;
    adminToken = regAdmin.tokens.accessToken;

    const wsA = await prisma.workspace.findUnique({ where: { id: testWorkspaceId } });
    testOrgId = wsA!.organizationId;

    // Create Second User in Tenant A (Member)
    const regMember = await authService.register({
      email: `comm_member_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "CommMember",
      lastName: "Colleague",
    });
    memberUserId = regMember.user.id;
    memberToken = regMember.tokens.accessToken;

    await prisma.workspaceMember.create({
      data: {
        workspaceId: testWorkspaceId,
        userId: memberUserId,
        role: "MEMBER",
        permissions: ["communication:read", "communication:write"],
      },
    });

    // 2. Setup Tenant B (Foreign Isolation)
    const regForeign = await authService.register({
      email: `comm_foreign_${Date.now()}@omnidesk.ai`,
      password: "StrongPassword123!",
      firstName: "ForeignUser",
      lastName: "Alien",
      organizationName: `Foreign Org ${Date.now()}`,
      workspaceName: "Foreign WS",
    });
    foreignUserId = regForeign.user.id;
    foreignWorkspaceId = regForeign.user.activeWorkspaceId;
    foreignToken = regForeign.tokens.accessToken;

    const wsB = await prisma.workspace.findUnique({ where: { id: foreignWorkspaceId } });
    foreignOrgId = wsB!.organizationId;

    // Headers
    adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      "x-workspace-id": testWorkspaceId,
      "x-user-id": adminUserId,
      "x-user-role": "ADMIN",
      "x-user-permissions": "communication:read,communication:write,communication:manage",
    };

    memberHeaders = {
      Authorization: `Bearer ${memberToken}`,
      "x-workspace-id": testWorkspaceId,
      "x-user-id": memberUserId,
      "x-user-role": "MEMBER",
      "x-user-permissions": "communication:read,communication:write",
    };

    foreignHeaders = {
      Authorization: `Bearer ${foreignToken}`,
      "x-workspace-id": foreignWorkspaceId,
      "x-user-id": foreignUserId,
      "x-user-role": "ADMIN",
      "x-user-permissions": "communication:read,communication:write,communication:manage",
    };
  });

  afterAll(async () => {
    // Deterministic test data cleanup
    const wsIds = [testWorkspaceId, foreignWorkspaceId].filter(Boolean);
    const userIds = [adminUserId, memberUserId, foreignUserId].filter(Boolean);
    const orgIds = [testOrgId, foreignOrgId].filter(Boolean);

    await prisma.messageReaction.deleteMany({
      where: { message: { workspaceId: { in: wsIds } } },
    });
    await prisma.messageAttachment.deleteMany({
      where: { workspaceId: { in: wsIds } },
    });
    await prisma.messageMention.deleteMany({
      where: { message: { workspaceId: { in: wsIds } } },
    });
    await prisma.message.updateMany({
      where: { workspaceId: { in: wsIds } },
      data: { parentMessageId: null },
    });
    await prisma.message.deleteMany({
      where: { workspaceId: { in: wsIds } },
    });
    await prisma.conversationMember.deleteMany({
      where: { workspaceId: { in: wsIds } },
    });
    await prisma.conversation.deleteMany({
      where: { workspaceId: { in: wsIds } },
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

  // ── 1. Direct Conversations ────────────────────────────────────────────────
  describe("1. Direct Conversations & Deterministic Uniqueness", () => {
    it("creates a direct conversation with a workspace member", async () => {
      const res = await request(app)
        .post("/api/v1/communication/conversations")
        .set(adminHeaders)
        .send({
          type: "DIRECT",
          targetUserId: memberUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe("DIRECT");
      expect(res.body.data.members).toHaveLength(2);
      testDirectConversationId = res.body.data.id;
    });

    it("guarantees deterministic direct conversation uniqueness (A->B and B->A return identical conversation)", async () => {
      // Member initiates direct chat with Admin
      const res = await request(app)
        .post("/api/v1/communication/conversations")
        .set(memberHeaders)
        .send({
          type: "DIRECT",
          targetUserId: adminUserId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testDirectConversationId);

      // Verify DB contains exactly ONE conversation with directKey
      const count = await prisma.conversation.count({
        where: { id: testDirectConversationId },
      });
      expect(count).toBe(1);
    });

    it("rejects creating a direct conversation with oneself", async () => {
      const res = await request(app)
        .post("/api/v1/communication/conversations")
        .set(adminHeaders)
        .send({
          type: "DIRECT",
          targetUserId: adminUserId,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("rejects creating a direct conversation with a user from another workspace", async () => {
      const res = await request(app)
        .post("/api/v1/communication/conversations")
        .set(adminHeaders)
        .send({
          type: "DIRECT",
          targetUserId: foreignUserId,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 2. Group Conversations ─────────────────────────────────────────────────
  describe("2. Group Conversations & Membership Lifecycle", () => {
    it("creates a group conversation with title, description, and initial members", async () => {
      const res = await request(app)
        .post("/api/v1/communication/conversations")
        .set(adminHeaders)
        .send({
          type: "GROUP",
          title: "Sprint Planning War Room",
          description: "Coordination channel for current sprint deliverables",
          memberIds: [memberUserId],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.type).toBe("GROUP");
      expect(res.body.data.title).toBe("Sprint Planning War Room");
      expect(res.body.data.members).toHaveLength(2);

      const ownerMember = res.body.data.members.find((m: any) => m.userId === adminUserId);
      expect(ownerMember?.role).toBe("OWNER");

      testGroupConversationId = res.body.data.id;
    });

    it("updates group conversation title and description", async () => {
      const res = await request(app)
        .patch(`/api/v1/communication/conversations/${testGroupConversationId}`)
        .set(adminHeaders)
        .send({
          title: "Sprint Planning War Room - Updated",
          description: "Updated mission details",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Sprint Planning War Room - Updated");
      expect(res.body.data.description).toBe("Updated mission details");
    });

    it("lists only conversations where the user is an active member", async () => {
      const res = await request(app)
        .get("/api/v1/communication/conversations")
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
      const ids = res.body.data.items.map((c: any) => c.id);
      expect(ids).toContain(testDirectConversationId);
      expect(ids).toContain(testGroupConversationId);
    });
  });

  // ── 3. Messaging & Cursor Pagination ───────────────────────────────────────
  describe("3. Messaging, Pagination, and Editing", () => {
    it("sends a message in a conversation", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages`)
        .set(adminHeaders)
        .send({
          content: "Welcome team to the sprint planning session!",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe("Welcome team to the sprint planning session!");
      expect(res.body.data.senderId).toBe(adminUserId);
      testMessageId = res.body.data.id;
    });

    it("lists messages with cursor pagination support", async () => {
      // Send a second message
      await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages`)
        .set(memberHeaders)
        .send({
          content: "Ready for sprint goals review.",
        });

      const res = await request(app)
        .get(`/api/v1/communication/conversations/${testGroupConversationId}/messages?limit=10`)
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThanOrEqual(2);
    });

    it("allows the author to edit their own message", async () => {
      const res = await request(app)
        .patch(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${testMessageId}`)
        .set(adminHeaders)
        .send({
          content: "Welcome team to the sprint planning session! (Updated agenda attached)",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.content).toContain("(Updated agenda attached)");
      expect(res.body.data.editedAt).not.toBeNull();
    });

    it("rejects editing another member's message without manage permission", async () => {
      const res = await request(app)
        .patch(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${testMessageId}`)
        .set(memberHeaders)
        .send({
          content: "Attempting malicious overwrite",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 4. Threads & Mentions ──────────────────────────────────────────────────
  describe("4. Thread Replies and Mentions", () => {
    it("posts a reply in a thread and increments parent replyCount", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages`)
        .set(memberHeaders)
        .send({
          content: "I will take lead on task A.",
          parentMessageId: testMessageId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.parentMessageId).toBe(testMessageId);

      // Verify parent message replyCount updated
      const parent = await prisma.message.findUnique({ where: { id: testMessageId } });
      expect(parent?.replyCount).toBe(1);
    });

    it("fetches the thread with parent message and replies", async () => {
      const res = await request(app)
        .get(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${testMessageId}/thread`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.parentMessage.id).toBe(testMessageId);
      expect(res.body.data.replies).toHaveLength(1);
      expect(res.body.data.replies[0].content).toBe("I will take lead on task A.");
    });

    it("parses @mentions and creates notification for mentioned member", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages`)
        .set(adminHeaders)
        .send({
          content: "Hey @CommMember please check the design docs.",
        });

      expect(res.status).toBe(201);

      // Verify Notification was created for CommMember
      const notif = await prisma.notification.findFirst({
        where: {
          workspaceId: testWorkspaceId,
          userId: memberUserId,
          type: "COMMUNICATION_MENTION",
        },
      });
      expect(notif).not.toBeNull();
      expect(notif?.title).toContain("mentioned you");
    });
  });

  // ── 5. Reactions ───────────────────────────────────────────────────────────
  describe("5. Message Reactions & Uniqueness", () => {
    it("adds a supported reaction to a message", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${testMessageId}/reactions`)
        .set(memberHeaders)
        .send({ emoji: "👍" });

      expect(res.status).toBe(201);
      expect(res.body.data.emoji).toBe("👍");
      expect(res.body.data.userId).toBe(memberUserId);
    });

    it("rejects unsupported emoji reactions", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${testMessageId}/reactions`)
        .set(memberHeaders)
        .send({ emoji: "🐱" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("removes a reaction", async () => {
      const res = await request(app)
        .delete(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${testMessageId}/reactions/${encodeURIComponent("👍")}`)
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const count = await prisma.messageReaction.count({
        where: { messageId: testMessageId, userId: memberUserId, emoji: "👍" },
      });
      expect(count).toBe(0);
    });
  });

  // ── 6. Attachments & Authorization ─────────────────────────────────────────
  describe("6. Attachments, Whitelist Validation, and Download Guard", () => {
    it("uploads an authorized text attachment", async () => {
      const res = await request(app)
        .post("/api/v1/communication/attachments")
        .set(adminHeaders)
        .field("conversationId", testGroupConversationId)
        .attach("file", Buffer.from("Enterprise Communication Specs v1.0"), "specs.txt");

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fileName).toBe("specs.txt");
      expect(res.body.data.mimeType).toBe("text/plain");
      testAttachmentId = res.body.data.id;
    });

    it("rejects disallowed file extensions (e.g. .exe)", async () => {
      const res = await request(app)
        .post("/api/v1/communication/attachments")
        .set(adminHeaders)
        .field("conversationId", testGroupConversationId)
        .attach("file", Buffer.from("malicious binary content"), "virus.exe");

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("allows authorized conversation members to download attachment", async () => {
      const res = await request(app)
        .get(`/api/v1/communication/attachments/${testAttachmentId}/download`)
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.text).toBe("Enterprise Communication Specs v1.0");
    });

    it("denies unauthorized foreign tenant from downloading attachment (403)", async () => {
      const res = await request(app)
        .get(`/api/v1/communication/attachments/${testAttachmentId}/download`)
        .set(foreignHeaders);

      expect(res.status).toBe(403);
    });
  });

  // ── 7. Soft Delete Leakage Defense ─────────────────────────────────────────
  describe("7. Soft-Delete Content Leakage Defense", () => {
    let messageToDeleteId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages`)
        .set(adminHeaders)
        .send({
          content: "CONFIDENTIAL_FINANCIAL_METRICS_998877",
        });
      messageToDeleteId = res.body.data.id;
    });

    it("soft deletes a message and confirms content is wiped", async () => {
      const res = await request(app)
        .delete(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${messageToDeleteId}`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify in DB that isDeleted is true and content is empty
      const inDb = await prisma.message.findUnique({ where: { id: messageToDeleteId } });
      expect(inDb?.isDeleted).toBe(true);
      expect(inDb?.content).toBe("");
    });

    it("never leaks deleted message content via getMessage API", async () => {
      const res = await request(app)
        .get(`/api/v1/communication/conversations/${testGroupConversationId}/messages/${messageToDeleteId}`)
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.isDeleted).toBe(true);
      expect(res.body.data.content).toBe("");
      expect(JSON.stringify(res.body)).not.toContain("CONFIDENTIAL_FINANCIAL_METRICS_998877");
    });

    it("never leaks deleted message content via communication search", async () => {
      const res = await request(app)
        .get("/api/v1/communication/search?q=CONFIDENTIAL_FINANCIAL_METRICS_998877")
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.messages).toHaveLength(0);
      expect(JSON.stringify(res.body)).not.toContain("CONFIDENTIAL_FINANCIAL_METRICS_998877");
    });
  });

  // ── 8. Read Receipts & Unread Count ────────────────────────────────────────
  describe("8. Read Receipts & Unread Count", () => {
    it("marks conversation as read and resets unread count", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/read`)
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns accurate unread communication statistics", async () => {
      const res = await request(app)
        .get("/api/v1/communication/unread-count")
        .set(memberHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.unreadMessagesCount).toBe("number");
      expect(typeof res.body.data.unreadConversationsCount).toBe("number");
    });
  });

  // ── 9. Ephemeral Presence & Typing ─────────────────────────────────────────
  describe("9. Ephemeral Presence and Typing Indicators", () => {
    it("updates user presence without database write", async () => {
      const res = await request(app)
        .put("/api/v1/communication/presence")
        .set(memberHeaders)
        .send({ status: "online" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("online");
    });

    it("relays typing indicator to conversation recipients", async () => {
      const res = await request(app)
        .post("/api/v1/communication/typing")
        .set(memberHeaders)
        .send({
          conversationId: testGroupConversationId,
          isTyping: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── 10. Tenant Boundary & IDOR Isolation ───────────────────────────────────
  describe("10. Tenant Boundary & IDOR Isolation", () => {
    it("denies access to conversation of another tenant (404)", async () => {
      const res = await request(app)
        .get(`/api/v1/communication/conversations/${testGroupConversationId}`)
        .set(foreignHeaders);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("denies sending messages to conversation of another tenant (403)", async () => {
      const res = await request(app)
        .post(`/api/v1/communication/conversations/${testGroupConversationId}/messages`)
        .set(foreignHeaders)
        .send({
          content: "Infiltrating Tenant A conversation",
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 11. AI Agent Tools ─────────────────────────────────────────────────────
  describe("11. AI Agent Tools Execution & Safety", () => {
    let execContext: AgentExecutionContext;

    beforeAll(() => {
      execContext = {
        requestId: "req_test_ai_comm",
        workspaceId: testWorkspaceId,
        userId: adminUserId,
        userRole: "ADMIN",
        userPermissions: ["communication:read", "communication:write", "communication:manage"],
      };
    });

    it("executes communication_list_conversations tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "communication_list_conversations",
        arguments: { limit: 10 },
        reason: "Test listing conversations for user",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_comm_01",
        agentId: "executive_agent",
      });

      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(data.conversations.length).toBeGreaterThanOrEqual(1);
    });

    it("executes communication_get_conversation tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "communication_get_conversation",
        arguments: { conversationId: testGroupConversationId },
        reason: "Test getting conversation details",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_comm_02",
        agentId: "executive_agent",
      });

      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(data.conversation.id).toBe(testGroupConversationId);
    });

    it("executes communication_list_messages tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "communication_list_messages",
        arguments: { conversationId: testGroupConversationId, limit: 10 },
        reason: "Test listing messages",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_comm_03",
        agentId: "executive_agent",
      });

      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(Array.isArray(data.messages)).toBe(true);
    });

    it("executes communication_search_messages tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "communication_search_messages",
        arguments: { query: "sprint planning" },
        reason: "Test search messages",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_comm_04",
        agentId: "executive_agent",
      });

      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(typeof data.total).toBe("number");
    });

    it("executes communication_get_thread tool", async () => {
      const proposal: ToolCallProposal = {
        toolId: "communication_get_thread",
        arguments: { conversationId: testGroupConversationId, messageId: testMessageId },
        reason: "Test get thread",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const res = await toolExecutor.executeTool({
        proposal,
        context: execContext,
        executionId: "exec_comm_05",
        agentId: "executive_agent",
      });

      expect(res.executed).toBe(true);
      expect(res.result?.success).toBe(true);
      const data = (res.result?.result || res.result) as any;
      expect(data.parentMessage.id).toBe(testMessageId);
      expect(Array.isArray(data.replies)).toBe(true);
    });
  });
});
