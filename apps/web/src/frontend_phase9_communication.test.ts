import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api/client";
import {
  ConversationSummary,
  ConversationDetail,
  MessageSummary,
  MessageReactionSummary,
  UnreadCommunicationCountResponse,
} from "@omnidesk/shared-types";

describe("Frontend Phase 9: Enterprise Communication & Collaboration Client Logic", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  // 1. List Conversations
  it("apiClient.listConversations fetches /communication/conversations with query params", async () => {
    const mockConversations: ConversationSummary[] = [
      {
        id: "conv-001",
        workspaceId: "ws-test-1",
        type: "DIRECT",
        title: "Alice Cooper",
        directKey: "u1:u2",
        createdById: "user-1",
        isArchived: false,
        membersCount: 2,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        createdAt: "2026-09-14T10:00:00.000Z",
        updatedAt: "2026-09-14T10:00:00.000Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { items: mockConversations, nextCursor: null, hasMore: false },
      }),
    });

    const res = await apiClient.listConversations({ type: "DIRECT", limit: 20 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations?type=DIRECT&limit=20"),
      expect.anything()
    );
    expect(res.items).toHaveLength(1);
    expect(res.items[0].type).toBe("DIRECT");
  });

  // 2. Get Conversation Detail
  it("apiClient.getConversation fetches conversation details", async () => {
    const mockDetail: ConversationDetail = {
      id: "conv-002",
      workspaceId: "ws-test-1",
      type: "GROUP",
      title: "Core Engineering",
      description: "Architecture and systems",
      directKey: null,
      createdById: "user-admin",
      lastMessage: null,
      lastMessageAt: null,
      unreadCount: 0,
      isArchived: false,
      membersCount: 1,
      members: [
        {
          id: "mem-01",
          workspaceId: "ws-test-1",
          conversationId: "conv-002",
          userId: "user-admin",
          role: "OWNER",
          lastReadAt: null,
          isMuted: false,
          isArchived: false,
          joinedAt: "2026-09-14T10:00:00.000Z",
        },
      ],
      createdAt: "2026-09-14T10:00:00.000Z",
      updatedAt: "2026-09-14T10:00:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockDetail,
      }),
    });

    const res = await apiClient.getConversation("conv-002");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations/conv-002"),
      expect.anything()
    );
    expect(res.title).toBe("Core Engineering");
    expect(res.members).toHaveLength(1);
  });

  // 3. Create Direct and Group Conversations
  it("apiClient.createDirectConversation posts with type: DIRECT", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: "conv-direct", type: "DIRECT" },
      }),
    });

    const res = await apiClient.createDirectConversation({ targetUserId: "target-user-123" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ type: "DIRECT", targetUserId: "target-user-123" }),
      })
    );
    expect(res.id).toBe("conv-direct");
  });

  it("apiClient.createGroupConversation posts with type: GROUP", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: "conv-group", type: "GROUP", title: "DevOps Squad" },
      }),
    });

    const res = await apiClient.createGroupConversation({
      title: "DevOps Squad",
      description: "Infra team",
      memberIds: ["u1", "u2"],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "GROUP",
          title: "DevOps Squad",
          description: "Infra team",
          memberIds: ["u1", "u2"],
        }),
      })
    );
    expect(res.title).toBe("DevOps Squad");
  });

  // 4. Send, List, and Edit Messages
  it("apiClient.sendMessage sends POST /communication/conversations/:id/messages", async () => {
    const mockMessage: MessageSummary = {
      id: "msg-001",
      workspaceId: "ws-test-1",
      conversationId: "conv-001",
      senderId: "user-1",
      content: "Hello team!",
      type: "TEXT",
      isEdited: false,
      isDeleted: false,
      replyCount: 0,
      createdAt: "2026-09-14T10:05:00.000Z",
      updatedAt: "2026-09-14T10:05:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: mockMessage,
      }),
    });

    const res = await apiClient.sendMessage("conv-001", { content: "Hello team!" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations/conv-001/messages"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ content: "Hello team!" }),
      })
    );
    expect(res.content).toBe("Hello team!");
  });

  it("apiClient.editMessage sends PATCH to edit content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "msg-001", content: "Updated content", editedAt: "2026-09-14T10:06:00.000Z" },
      }),
    });

    const res = await apiClient.editMessage("conv-001", "msg-001", { content: "Updated content" });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations/conv-001/messages/msg-001"),
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ content: "Updated content" }),
      })
    );
    expect(res.content).toBe("Updated content");
  });

  it("apiClient.deleteMessage sends DELETE for soft deletion", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { success: true, messageId: "msg-001" },
      }),
    });

    const res = await apiClient.deleteMessage("conv-001", "msg-001");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations/conv-001/messages/msg-001"),
      expect.objectContaining({
        method: "DELETE",
      })
    );
    expect(res.success).toBe(true);
  });

  // 5. Reactions and Read Receipts
  it("apiClient.addReaction posts emoji reaction", async () => {
    const mockReaction: MessageReactionSummary = {
      id: "rx-01",
      messageId: "msg-001",
      userId: "user-1",
      emoji: "👍",
      createdAt: "2026-09-14T10:07:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: mockReaction,
      }),
    });

    const res = await apiClient.addReaction("conv-001", "msg-001", "👍");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations/conv-001/messages/msg-001/reactions"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ emoji: "👍" }),
      })
    );
    expect(res.emoji).toBe("👍");
  });

  it("apiClient.markConversationRead posts to /read endpoint", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { success: true, lastReadAt: "2026-09-14T10:08:00.000Z", unreadCount: 0 },
      }),
    });

    const res = await apiClient.markConversationRead("conv-001");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/conversations/conv-001/read"),
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(res.success).toBe(true);
  });

  // 6. Presence and Typing
  it("apiClient.updatePresence sends PUT /communication/presence", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { userId: "user-1", status: "online", lastSeen: "2026-09-14T10:09:00.000Z" },
      }),
    });

    const res = await apiClient.updatePresence("online");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/presence"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ status: "online" }),
      })
    );
    expect(res.status).toBe("online");
  });

  it("apiClient.sendTyping sends POST /communication/typing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { success: true },
      }),
    });

    const res = await apiClient.sendTyping("conv-001", true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/typing"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ conversationId: "conv-001", isTyping: true }),
      })
    );
    expect(res.success).toBe(true);
  });

  // 7. Unread counts & attachment download URL
  it("apiClient.getCommunicationUnreadCounts fetches unread counts", async () => {
    const mockCounts: UnreadCommunicationCountResponse = {
      unreadMessagesCount: 5,
      unreadConversationsCount: 2,
      workspaceId: "ws-test-1",
      userId: "user-1",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockCounts,
      }),
    });

    const res = await apiClient.getCommunicationUnreadCounts();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/communication/unread-count"),
      expect.anything()
    );
    expect(res.unreadMessagesCount).toBe(5);
    expect(res.unreadConversationsCount).toBe(2);
  });

  it("apiClient.getAttachmentDownloadUrl returns correct download URL path", () => {
    const url = apiClient.getAttachmentDownloadUrl("att-999");
    expect(url).toContain("/communication/attachments/att-999/download");
  });
});
