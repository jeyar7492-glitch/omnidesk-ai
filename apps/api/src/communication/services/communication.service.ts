import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { logger } from "../../lib/logger";
import { NotificationService } from "../../notifications/services/notification.service";
import { AppError } from "../../lib/errors";
import {
  ConversationType,
  ConversationMemberRole,
  MessageType,
  ConversationSummary,
  ConversationDetail,
  ConversationMemberSummary,
  MessageSummary,
  MessageAttachmentSummary,
  MessageReactionSummary,
  MessageMentionSummary,
  CreateDirectConversationInput,
  CreateGroupConversationInput,
  UpdateConversationInput,
  SendMessageInput,
  EditMessageInput,
  ConversationListQuery,
  MessageListQuery,
  CommunicationSearchQuery,
  UnreadCommunicationCountResponse,
  PresenceStatus,
} from "@omnidesk/shared-types";

const ALLOWED_REACTIONS = new Set(["👍", "❤️", "😂", "🎉", "👀", "🚀"]);

export class CommunicationService {
  private static instance: CommunicationService;
  private notificationService: NotificationService;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): CommunicationService {
    if (!CommunicationService.instance) {
      CommunicationService.instance = new CommunicationService();
    }
    return CommunicationService.instance;
  }

  /**
   * Deterministic direct conversation key generator.
   */
  public getDirectKey(workspaceId: string, userA: string, userB: string): string {
    const sorted = [userA, userB].sort();
    return `${workspaceId}:${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Create or retrieve an existing direct conversation deterministically.
   */
  public async getOrCreateDirectConversation(
    workspaceId: string,
    currentUserId: string,
    input: CreateDirectConversationInput
  ): Promise<ConversationDetail> {
    const targetUserId = input.targetUserId;

    if (currentUserId === targetUserId) {
      throw new AppError(400, "Cannot create a direct conversation with yourself", "INVALID_TARGET_USER");
    }

    // Verify target user belongs to workspace
    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUserId,
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
      },
    });

    if (!targetMember) {
      throw new AppError(404, "Target user is not a member of this workspace", "TARGET_NOT_FOUND");
    }

    const directKey = this.getDirectKey(workspaceId, currentUserId, targetUserId);

    // Check for existing direct conversation
    let conversation = await prisma.conversation.findUnique({
      where: {
        workspaceId_directKey: {
          workspaceId,
          directKey,
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      // Create atomically
      conversation = await prisma.conversation.create({
        data: {
          workspaceId,
          type: "DIRECT",
          directKey,
          createdById: currentUserId,
          members: {
            create: [
              {
                workspaceId,
                userId: currentUserId,
                role: "MEMBER",
              },
              {
                workspaceId,
                userId: targetUserId,
                role: "MEMBER",
              },
            ],
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
              },
            },
          },
        },
      });

      // Audit Log
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: currentUserId,
          action: "communication.direct_conversation.created",
          entityType: "Conversation",
          entityId: conversation.id,
          details: { targetUserId },
        },
      });

      // Realtime notification to target user
      wsManager.sendToUser(workspaceId, targetUserId, "conversation.created", {
        conversationId: conversation.id,
        type: "DIRECT",
        createdById: currentUserId,
      });
    }

    return this.mapToConversationDetail(conversation, currentUserId);
  }

  /**
   * Create a group conversation.
   */
  public async createGroupConversation(
    workspaceId: string,
    creatorUserId: string,
    input: CreateGroupConversationInput
  ): Promise<ConversationDetail> {
    const uniqueMemberIds = Array.from(new Set([creatorUserId, ...input.memberIds]));

    // Verify all members belong to workspace
    const membersInWs = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { in: uniqueMemberIds },
      },
      select: { userId: true },
    });

    const validIds = new Set(membersInWs.map((m) => m.userId));
    if (validIds.size !== uniqueMemberIds.length) {
      throw new AppError(400, "One or more invited users do not belong to this workspace", "INVALID_MEMBERS");
    }

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        type: "GROUP",
        title: input.title.trim(),
        description: input.description?.trim() || null,
        createdById: creatorUserId,
        members: {
          create: uniqueMemberIds.map((userId) => ({
            workspaceId,
            userId,
            role: userId === creatorUserId ? "OWNER" : "MEMBER",
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    // Audit Log
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: creatorUserId,
        action: "communication.group_conversation.created",
        entityType: "Conversation",
        entityId: conversation.id,
        details: { title: input.title, memberCount: uniqueMemberIds.length },
      },
    });

    // Realtime notification to all invited members
    wsManager.sendToUsers(
      workspaceId,
      uniqueMemberIds.filter((id) => id !== creatorUserId),
      "conversation.created",
      {
        conversationId: conversation.id,
        title: conversation.title,
        type: "GROUP",
        createdById: creatorUserId,
      }
    );

    return this.mapToConversationDetail(conversation, creatorUserId);
  }

  /**
   * List conversations for the authenticated user in the workspace.
   */
  public async listConversations(
    workspaceId: string,
    userId: string,
    query: ConversationListQuery
  ): Promise<{ conversations: ConversationSummary[]; total: number }> {
    const limit = query.limit || 50;

    const membershipConditions: any = {
      workspaceId,
      userId,
    };
    if (query.isArchived !== undefined) {
      membershipConditions.isArchived = query.isArchived;
    }

    const memberships = await prisma.conversationMember.findMany({
      where: membershipConditions,
      select: { conversationId: true, lastReadAt: true, isMuted: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);
    if (!conversationIds.length) {
      return { conversations: [], total: 0 };
    }

    const whereClause: any = {
      id: { in: conversationIds },
      workspaceId,
    };

    if (query.type) {
      whereClause.type = query.type;
    }
    if (query.isArchived !== undefined) {
      whereClause.isArchived = query.isArchived;
    }
    if (query.search) {
      whereClause.OR = [
        { title: { contains: query.search, mode: "insensitive" } },
        { lastMessageText: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where: whereClause }),
      prisma.conversation.findMany({
        where: whereClause,
        include: {
          members: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
              },
            },
          },
        },
        orderBy: { lastMessageAt: "desc" },
        take: limit,
      }),
    ]);

    const memberMap = new Map(memberships.map((m) => [m.conversationId, m]));
    const presenceMap = wsManager.getPresence(workspaceId);

    const summaries: ConversationSummary[] = await Promise.all(
      conversations.map(async (conv) => {
        const mem = memberMap.get(conv.id);
        const lastReadAt = mem?.lastReadAt || new Date(0);

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            workspaceId,
            createdAt: { gt: lastReadAt },
            senderId: { not: userId },
            isDeleted: false,
          },
        });

        // For DIRECT conversations, identify the other party
        let otherMember: ConversationSummary["otherMember"] = null;
        if (conv.type === "DIRECT") {
          const other = conv.members.find((m) => m.userId !== userId);
          if (other?.user) {
            const pres = presenceMap[other.userId]?.status || "offline";
            otherMember = {
              id: other.user.id,
              firstName: other.user.firstName,
              lastName: other.user.lastName,
              email: other.user.email,
              avatarUrl: other.user.avatarUrl,
              presence: pres as PresenceStatus,
            };
          }
        }

        const lastMsg = conv.messages[0] ? this.mapToMessageSummary(conv.messages[0], userId) : null;

        return {
          id: conv.id,
          workspaceId: conv.workspaceId,
          type: conv.type as ConversationType,
          title: conv.title,
          description: conv.description,
          directKey: conv.directKey,
          createdById: conv.createdById,
          lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
          lastMessageText: conv.lastMessageText,
          isArchived: conv.isArchived,
          archivedAt: conv.archivedAt ? conv.archivedAt.toISOString() : null,
          membersCount: conv.members.length,
          unreadCount,
          lastReadAt: lastReadAt.toISOString(),
          isMuted: mem?.isMuted ?? false,
          otherMember,
          lastMessage: lastMsg,
          createdAt: conv.createdAt.toISOString(),
          updatedAt: conv.updatedAt.toISOString(),
        };
      })
    );

    return { conversations: summaries, total };
  }

  /**
   * Get details of a single conversation with access verification.
   */
  public async getConversation(
    workspaceId: string,
    userId: string,
    conversationId: string
  ): Promise<ConversationDetail> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found or access denied", "NOT_FOUND");
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!conversation || conversation.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    }

    return this.mapToConversationDetail(conversation, userId, membership.lastReadAt, membership.isMuted);
  }

  /**
   * Update a conversation (title/description for group; or user mute/archive status).
   */
  public async updateConversation(
    workspaceId: string,
    userId: string,
    conversationId: string,
    input: UpdateConversationInput,
    userPermissions: string[] = []
  ): Promise<ConversationDetail> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!conv || conv.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    }

    // If updating group title/description, check permissions
    if (input.title !== undefined || input.description !== undefined) {
      if (conv.type !== "GROUP") {
        throw new AppError(400, "Cannot update metadata for a direct conversation", "BAD_REQUEST");
      }
      const canManage =
        membership.role === "OWNER" ||
        membership.role === "ADMIN" ||
        userPermissions.includes("communication:manage");

      if (!canManage) {
        throw new AppError(403, "Access denied: Only conversation owners/admins can update group metadata", "FORBIDDEN");
      }

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          title: input.title !== undefined ? input.title.trim() : conv.title,
          description: input.description !== undefined ? input.description?.trim() : conv.description,
        },
      });
    }

    // Member-specific mute / archive update
    if (input.isMuted !== undefined || input.isArchived !== undefined) {
      await prisma.conversationMember.update({
        where: { id: membership.id },
        data: {
          isMuted: input.isMuted !== undefined ? input.isMuted : membership.isMuted,
          isArchived: input.isArchived !== undefined ? input.isArchived : membership.isArchived,
        },
      });
    }

    // Refresh conversation
    const updated = await this.getConversation(workspaceId, userId, conversationId);

    // Notify members of group updates
    if (input.title !== undefined || input.description !== undefined) {
      wsManager.sendToUsers(
        workspaceId,
        conv.members.map((m) => m.userId),
        "conversation.updated",
        {
          conversationId,
          title: updated.title,
          description: updated.description,
        }
      );
    }

    return updated;
  }

  /**
   * Add members to a group conversation.
   */
  public async addMembers(
    workspaceId: string,
    userId: string,
    conversationId: string,
    memberIds: string[],
    userPermissions: string[] = []
  ): Promise<ConversationDetail> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv || conv.workspaceId !== workspaceId || conv.type !== "GROUP") {
      throw new AppError(400, "Members can only be added to group conversations", "BAD_REQUEST");
    }

    const canManage =
      membership.role === "OWNER" ||
      membership.role === "ADMIN" ||
      userPermissions.includes("communication:manage");

    if (!canManage) {
      throw new AppError(403, "Access denied: Missing permission to add members", "FORBIDDEN");
    }

    // Filter out existing members
    const currentMemberIds = new Set(conv.members.map((m) => m.userId));
    const newMemberIds = memberIds.filter((id) => !currentMemberIds.has(id));

    if (!newMemberIds.length) {
      return this.getConversation(workspaceId, userId, conversationId);
    }

    // Validate in workspace
    const wsMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
        userId: { in: newMemberIds },
      },
      select: { userId: true },
    });

    const validIds = new Set(wsMembers.map((m) => m.userId));
    if (validIds.size !== newMemberIds.length) {
      throw new AppError(400, "One or more users do not belong to this workspace", "INVALID_MEMBERS");
    }

    // Create member records
    await prisma.conversationMember.createMany({
      data: newMemberIds.map((id) => ({
        workspaceId,
        conversationId,
        userId: id,
        role: "MEMBER",
      })),
    });

    // Notify newly added users
    for (const newId of newMemberIds) {
      await this.notificationService.createNotification({
        workspaceId,
        recipientId: newId,
        type: "COMMUNICATION_MESSAGE",
        title: "Added to conversation",
        message: `You were added to the group "${conv.title || "Conversation"}"`,
        priority: "LOW",
        entityType: "Conversation",
        entityId: conv.id,
        actionUrl: `/communication?conversationId=${conv.id}`,
        senderId: userId,
      });
    }

    const updated = await this.getConversation(workspaceId, userId, conversationId);

    // Realtime event to all members
    wsManager.sendToUsers(
      workspaceId,
      updated.members.map((m) => m.userId),
      "conversation.member_added",
      {
        conversationId,
        addedUserIds: newMemberIds,
        memberCount: updated.members.length,
      }
    );

    return updated;
  }

  /**
   * Remove member or leave conversation.
   */
  public async removeMember(
    workspaceId: string,
    requestingUserId: string,
    conversationId: string,
    targetUserId: string,
    userPermissions: string[] = []
  ): Promise<void> {
    const requestingMembership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: requestingUserId,
        },
      },
    });

    if (!requestingMembership || requestingMembership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });

    if (!conv || conv.workspaceId !== workspaceId || conv.type !== "GROUP") {
      throw new AppError(400, "Members can only be removed from group conversations", "BAD_REQUEST");
    }

    const isSelf = requestingUserId === targetUserId;
    if (!isSelf) {
      const canManage =
        requestingMembership.role === "OWNER" ||
        requestingMembership.role === "ADMIN" ||
        userPermissions.includes("communication:manage");

      if (!canManage) {
        throw new AppError(403, "Access denied: Missing permission to remove other members", "FORBIDDEN");
      }
    }

    // If removing the sole OWNER, prevent unless no other members remain
    const targetMembership = conv.members.find((m) => m.userId === targetUserId);
    if (!targetMembership) {
      throw new AppError(404, "Target user is not a member of this conversation", "NOT_FOUND");
    }

    if (targetMembership.role === "OWNER") {
      const ownerCount = conv.members.filter((m) => m.role === "OWNER").length;
      if (ownerCount === 1 && conv.members.length > 1) {
        throw new AppError(400, "Cannot remove the only owner. Transfer ownership before leaving.", "OWNER_REQUIRED");
      }
    }

    await prisma.conversationMember.delete({
      where: { id: targetMembership.id },
    });

    // Notify remaining members
    const remainingIds = conv.members.filter((m) => m.userId !== targetUserId).map((m) => m.userId);
    wsManager.sendToUsers(workspaceId, [...remainingIds, targetUserId], "conversation.member_removed", {
      conversationId,
      removedUserId: targetUserId,
    });
  }

  /**
   * Send a message in a conversation.
   */
  public async sendMessage(
    workspaceId: string,
    senderId: string,
    conversationId: string,
    input: SendMessageInput
  ): Promise<MessageSummary> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(403, "Access denied: You are not a member of this conversation", "FORBIDDEN");
    }

    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!conv || conv.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found", "NOT_FOUND");
    }

    // Validate parent message for thread integrity
    let parentMsg: any = null;
    if (input.parentMessageId) {
      parentMsg = await prisma.message.findUnique({
        where: { id: input.parentMessageId },
      });

      if (!parentMsg || parentMsg.workspaceId !== workspaceId || parentMsg.conversationId !== conversationId) {
        throw new AppError(400, "Parent message does not belong to this conversation", "INVALID_PARENT_MESSAGE");
      }
    }

    // Parse and validate mentioned users
    const memberIdSet = new Set(conv.members.map((m) => m.userId));
    const extractedMentionIds = new Set(input.mentionedUserIds || []);

    // Also parse inline @mentions from content
    const mentionRegex = /@([a-zA-Z0-9_.-]+)/g;
    let match;
    while ((match = mentionRegex.exec(input.content)) !== null) {
      const token = match[1].toLowerCase();
      for (const m of conv.members) {
        if (
          m.userId.toLowerCase() === token ||
          m.user?.firstName.toLowerCase() === token ||
          m.user?.lastName.toLowerCase() === token ||
          m.user?.email.toLowerCase() === token ||
          `${m.user?.firstName}${m.user?.lastName}`.toLowerCase() === token
        ) {
          extractedMentionIds.add(m.userId);
        }
      }
    }

    const validMentionIds = Array.from(extractedMentionIds).filter(
      (id) => memberIdSet.has(id) && id !== senderId
    );

    // Create message in database
    const message = await prisma.message.create({
      data: {
        workspaceId,
        conversationId,
        senderId,
        content: input.content.trim(),
        type: input.type || "TEXT",
        parentMessageId: input.parentMessageId || null,
        mentions: {
          create: validMentionIds.map((userId) => ({
            workspaceId,
            userId,
          })),
        },
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: true,
        mentions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    // If attachments specified, attach them
    if (input.attachmentIds && input.attachmentIds.length > 0) {
      await prisma.messageAttachment.updateMany({
        where: {
          id: { in: input.attachmentIds },
          conversationId,
          workspaceId,
          uploadedById: senderId,
        },
        data: {
          messageId: message.id,
        },
      });
    }

    // If reply in thread, increment parent reply count
    if (parentMsg) {
      await prisma.message.update({
        where: { id: parentMsg.id },
        data: { replyCount: { increment: 1 } },
      });
    }

    // Update conversation lastMessage metadata
    const snippet = message.content.length > 100 ? `${message.content.substring(0, 97)}...` : message.content;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: message.createdAt,
        lastMessageText: snippet,
      },
    });

    // Sender automatically reads their own message
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: message.createdAt },
    });

    const summary = this.mapToMessageSummary(message, senderId);

    // Realtime WebSocket delivery to all members
    const recipientIds = conv.members.map((m) => m.userId);
    wsManager.sendToUsers(
      workspaceId,
      recipientIds,
      "message.created",
      {
        conversationId,
        message: summary,
      },
      { userId: senderId }
    );

    // Notifications for Mentions
    const senderName = `${message.sender.firstName} ${message.sender.lastName}`.trim();
    for (const mentionedId of validMentionIds) {
      await this.notificationService.createNotification({
        workspaceId,
        recipientId: mentionedId,
        type: "COMMUNICATION_MENTION",
        title: `${senderName} mentioned you`,
        message: snippet,
        priority: "MEDIUM",
        entityType: "Message",
        entityId: message.id,
        actionUrl: `/communication?conversationId=${conversationId}&messageId=${message.id}`,
        senderId,
      });
    }

    // Notifications for Direct Message
    if (conv.type === "DIRECT") {
      const otherId = conv.members.find((m) => m.userId !== senderId)?.userId;
      if (otherId && !validMentionIds.includes(otherId)) {
        await this.notificationService.createNotification({
          workspaceId,
          recipientId: otherId,
          type: "COMMUNICATION_MESSAGE",
          title: `New message from ${senderName}`,
          message: snippet,
          priority: "LOW",
          entityType: "Message",
          entityId: message.id,
          actionUrl: `/communication?conversationId=${conversationId}`,
          senderId,
        });
      }
    }

    // Notifications for Thread Replies
    if (parentMsg && parentMsg.senderId !== senderId && !validMentionIds.includes(parentMsg.senderId)) {
      await this.notificationService.createNotification({
        workspaceId,
        recipientId: parentMsg.senderId,
        type: "COMMUNICATION_REPLY",
        title: `${senderName} replied to your message`,
        message: snippet,
        priority: "LOW",
        entityType: "Message",
        entityId: message.id,
        actionUrl: `/communication?conversationId=${conversationId}&messageId=${parentMsg.id}`,
        senderId,
      });
    }

    return summary;
  }

  /**
   * List messages in a conversation with cursor pagination and thread support.
   */
  public async listMessages(
    workspaceId: string,
    userId: string,
    conversationId: string,
    query: MessageListQuery
  ): Promise<{ messages: MessageSummary[]; nextCursor?: string; hasMore: boolean }> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found or access denied", "NOT_FOUND");
    }

    const limit = Math.min(query.limit || 50, 100);
    const whereClause: any = {
      workspaceId,
      conversationId,
    };

    if (query.parentMessageId) {
      whereClause.parentMessageId = query.parentMessageId;
    } else {
      // By default list top-level messages
      whereClause.parentMessageId = null;
    }

    if (query.cursor) {
      if (query.direction === "after") {
        whereClause.id = { gt: query.cursor };
      } else {
        whereClause.id = { lt: query.cursor };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      take: limit + 1,
      orderBy: { createdAt: "desc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        mentions: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        parentMessage: {
          select: {
            id: true,
            content: true,
            senderId: true,
            isDeleted: true,
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? resultMessages[resultMessages.length - 1].id : undefined;

    // Return in chronological order (oldest to newest)
    const sorted = resultMessages.reverse().map((m) => this.mapToMessageSummary(m, userId));

    return {
      messages: sorted,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Get thread replies for a message.
   */
  public async getThread(
    workspaceId: string,
    userId: string,
    conversationId: string,
    parentMessageId: string
  ): Promise<{ parentMessage: MessageSummary; replies: MessageSummary[] }> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found or access denied", "NOT_FOUND");
    }

    const parent = await prisma.message.findUnique({
      where: { id: parentMessageId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        mentions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!parent || parent.workspaceId !== workspaceId || parent.conversationId !== conversationId) {
      throw new AppError(404, "Parent message not found", "NOT_FOUND");
    }

    const replies = await prisma.message.findMany({
      where: {
        workspaceId,
        conversationId,
        parentMessageId,
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        mentions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    return {
      parentMessage: this.mapToMessageSummary(parent, userId),
      replies: replies.map((r) => this.mapToMessageSummary(r, userId)),
    };
  }

  /**
   * Get a single message by ID with membership check.
   */
  public async getMessage(
    workspaceId: string,
    userId: string,
    conversationId: string,
    messageId: string
  ): Promise<MessageSummary> {
    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation not found or access denied", "NOT_FOUND");
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        mentions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    if (!message || message.workspaceId !== workspaceId || message.conversationId !== conversationId) {
      throw new AppError(404, "Message not found", "NOT_FOUND");
    }

    return this.mapToMessageSummary(message, userId);
  }

  /**
   * Edit message content (author only, or moderator with permission).
   */
  public async editMessage(
    workspaceId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    input: EditMessageInput,
    userPermissions: string[] = []
  ): Promise<MessageSummary> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        conversation: {
          include: { members: true },
        },
      },
    });

    if (!message || message.workspaceId !== workspaceId || message.conversationId !== conversationId) {
      throw new AppError(404, "Message not found", "NOT_FOUND");
    }

    if (message.isDeleted) {
      throw new AppError(400, "Cannot edit a deleted message", "BAD_REQUEST");
    }

    const canEdit = message.senderId === userId || userPermissions.includes("communication:manage");
    if (!canEdit) {
      throw new AppError(403, "Access denied: You can only edit your own messages", "FORBIDDEN");
    }

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: input.content.trim(),
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        attachments: true,
        reactions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        mentions: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });

    const summary = this.mapToMessageSummary(updated, userId);

    // Emit WS update
    wsManager.sendToUsers(
      workspaceId,
      message.conversation.members.map((m) => m.userId),
      "message.updated",
      {
        conversationId,
        message: summary,
      }
    );

    return summary;
  }

  /**
   * Soft-delete a message (preserves audit trail & thread references).
   */
  public async deleteMessage(
    workspaceId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    userPermissions: string[] = []
  ): Promise<void> {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { members: true },
        },
      },
    });

    if (!message || message.workspaceId !== workspaceId || message.conversationId !== conversationId) {
      throw new AppError(404, "Message not found", "NOT_FOUND");
    }

    const canDelete = message.senderId === userId || userPermissions.includes("communication:manage");
    if (!canDelete) {
      throw new AppError(403, "Access denied: You can only delete your own messages", "FORBIDDEN");
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: "",
        deletedAt: new Date(),
      },
    });

    // Audit Log
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId,
        action: "communication.message.deleted",
        entityType: "Message",
        entityId: messageId,
        details: { conversationId },
      },
    });

    // Emit WS delete event
    wsManager.sendToUsers(
      workspaceId,
      message.conversation.members.map((m) => m.userId),
      "message.deleted",
      {
        conversationId,
        messageId,
      }
    );
  }

  /**
   * Add a reaction to a message.
   */
  public async addReaction(
    workspaceId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    emoji: string
  ): Promise<MessageReactionSummary> {
    if (!ALLOWED_REACTIONS.has(emoji)) {
      throw new AppError(400, `Reaction ${emoji} is not supported`, "INVALID_REACTION");
    }

    // Verify membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(403, "Access denied: Not a member of this conversation", "FORBIDDEN");
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { members: true },
        },
      },
    });

    if (!message || message.workspaceId !== workspaceId || message.conversationId !== conversationId) {
      throw new AppError(404, "Message not found", "NOT_FOUND");
    }

    // Unique compound key prevents duplicate reaction from same user on same message
    const reaction = await prisma.messageReaction.upsert({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      update: {},
      create: {
        workspaceId,
        messageId,
        userId,
        emoji,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    const summary: MessageReactionSummary = {
      id: reaction.id,
      messageId: reaction.messageId,
      userId: reaction.userId,
      emoji: reaction.emoji,
      createdAt: reaction.createdAt.toISOString(),
      user: reaction.user,
    };

    // Emit WS event
    wsManager.sendToUsers(
      workspaceId,
      message.conversation.members.map((m) => m.userId),
      "message.reaction_added",
      {
        conversationId,
        messageId,
        reaction: summary,
      }
    );

    return summary;
  }

  /**
   * Remove a reaction from a message.
   */
  public async removeReaction(
    workspaceId: string,
    userId: string,
    conversationId: string,
    messageId: string,
    emoji: string
  ): Promise<void> {
    const reaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
      include: {
        message: {
          include: {
            conversation: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!reaction || reaction.workspaceId !== workspaceId) {
      return; // Idempotent
    }

    await prisma.messageReaction.delete({
      where: { id: reaction.id },
    });

    // Emit WS event
    wsManager.sendToUsers(
      workspaceId,
      reaction.message.conversation.members.map((m) => m.userId),
      "message.reaction_removed",
      {
        conversationId,
        messageId,
        userId,
        emoji,
      }
    );
  }

  /**
   * Mark conversation as read up to current time.
   */
  public async markConversationRead(
    workspaceId: string,
    userId: string,
    conversationId: string
  ): Promise<void> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(404, "Conversation membership not found", "NOT_FOUND");
    }

    const now = new Date();
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: now },
    });

    wsManager.sendToUser(workspaceId, userId, "conversation.read", {
      conversationId,
      lastReadAt: now.toISOString(),
    });
  }

  /**
   * Get unread communication count across all conversations.
   */
  public async getUnreadCount(
    workspaceId: string,
    userId: string
  ): Promise<UnreadCommunicationCountResponse> {
    const memberships = await prisma.conversationMember.findMany({
      where: {
        workspaceId,
        userId,
        isArchived: false,
      },
      select: { conversationId: true, lastReadAt: true },
    });

    if (!memberships.length) {
      return {
        unreadMessagesCount: 0,
        unreadConversationsCount: 0,
        workspaceId,
        userId,
      };
    }

    let unreadMessagesCount = 0;
    let unreadConversationsCount = 0;

    await Promise.all(
      memberships.map(async (m) => {
        const count = await prisma.message.count({
          where: {
            conversationId: m.conversationId,
            workspaceId,
            createdAt: { gt: m.lastReadAt },
            senderId: { not: userId },
            isDeleted: false,
          },
        });

        if (count > 0) {
          unreadMessagesCount += count;
          unreadConversationsCount += 1;
        }
      })
    );

    return {
      unreadMessagesCount,
      unreadConversationsCount,
      workspaceId,
      userId,
    };
  }

  /**
   * Search messages across conversations the user is a member of.
   */
  public async searchMessages(
    workspaceId: string,
    userId: string,
    query: CommunicationSearchQuery
  ): Promise<{ messages: MessageSummary[]; total: number }> {
    const trimmed = (query.query || query.q || "").trim();
    if (!trimmed) {
      return { messages: [], total: 0 };
    }

    // Get user's conversation memberships
    const memberships = await prisma.conversationMember.findMany({
      where: { workspaceId, userId },
      select: { conversationId: true },
    });

    const conversationIds = memberships.map((m) => m.conversationId);
    if (!conversationIds.length) {
      return { messages: [], total: 0 };
    }

    const limit = Math.min(query.limit || 20, 50);

    const [total, messages] = await Promise.all([
      prisma.message.count({
        where: {
          workspaceId,
          conversationId: { in: conversationIds },
          isDeleted: false,
          content: { contains: trimmed, mode: "insensitive" },
        },
      }),
      prisma.message.findMany({
        where: {
          workspaceId,
          conversationId: { in: conversationIds },
          isDeleted: false,
          content: { contains: trimmed, mode: "insensitive" },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          attachments: true,
          reactions: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
          mentions: {
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
          },
        },
      }),
    ]);

    return {
      messages: messages.map((m) => this.mapToMessageSummary(m, userId)),
      total,
    };
  }

  /**
   * Relay typing indicator to other conversation members.
   */
  public async handleTyping(
    workspaceId: string,
    userId: string,
    conversationId: string,
    isTyping: boolean
  ): Promise<void> {
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      include: {
        user: { select: { firstName: true, lastName: true } },
        conversation: {
          include: { members: { select: { userId: true } } },
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      return;
    }

    const senderName = `${membership.user.firstName} ${membership.user.lastName}`.trim();
    const recipientIds = membership.conversation.members.map((m) => m.userId);

    wsManager.relayTyping(workspaceId, conversationId, userId, senderName, recipientIds, isTyping);
  }

  // ── Mapping Helpers ──────────────────────────────────────────────────────────

  private mapToConversationDetail(
    conv: any,
    currentUserId: string,
    lastReadAt?: Date,
    isMuted?: boolean
  ): ConversationDetail {
    const presenceMap = wsManager.getPresence(conv.workspaceId);

    let otherMember: ConversationSummary["otherMember"] = null;
    if (conv.type === "DIRECT") {
      const other = conv.members.find((m: any) => m.userId !== currentUserId);
      if (other?.user) {
        const pres = presenceMap[other.userId]?.status || "offline";
        otherMember = {
          id: other.user.id,
          firstName: other.user.firstName,
          lastName: other.user.lastName,
          email: other.user.email,
          avatarUrl: other.user.avatarUrl,
          presence: pres as PresenceStatus,
        };
      }
    }

    const members: ConversationMemberSummary[] = conv.members.map((m: any) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      conversationId: m.conversationId,
      userId: m.userId,
      role: m.role as ConversationMemberRole,
      joinedAt: m.joinedAt.toISOString(),
      lastReadAt: m.lastReadAt.toISOString(),
      isMuted: m.isMuted,
      isArchived: m.isArchived,
      user: m.user,
    }));

    return {
      id: conv.id,
      workspaceId: conv.workspaceId,
      type: conv.type as ConversationType,
      title: conv.title,
      description: conv.description,
      directKey: conv.directKey,
      createdById: conv.createdById,
      lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
      lastMessageText: conv.lastMessageText,
      isArchived: conv.isArchived,
      archivedAt: conv.archivedAt ? conv.archivedAt.toISOString() : null,
      membersCount: conv.members.length,
      unreadCount: 0,
      lastReadAt: lastReadAt ? lastReadAt.toISOString() : conv.createdAt.toISOString(),
      isMuted: isMuted ?? false,
      otherMember,
      members,
      createdAt: conv.createdAt.toISOString(),
      updatedAt: conv.updatedAt.toISOString(),
    };
  }

  public mapToMessageSummary(m: any, _currentUserId: string): MessageSummary {
    const isDeleted = m.isDeleted === true;

    const parentMessage = m.parentMessage
      ? {
          id: m.parentMessage.id,
          content: m.parentMessage.isDeleted ? "[Message deleted]" : m.parentMessage.content,
          senderId: m.parentMessage.senderId,
          senderName: m.parentMessage.sender
            ? `${m.parentMessage.sender.firstName} ${m.parentMessage.sender.lastName}`.trim()
            : undefined,
        }
      : null;

    const attachments: MessageAttachmentSummary[] = isDeleted
      ? []
      : (m.attachments || []).map((att: any) => ({
          id: att.id,
          workspaceId: att.workspaceId,
          conversationId: att.conversationId,
          messageId: att.messageId,
          uploadedById: att.uploadedById,
          fileName: att.fileName,
          fileSize: att.fileSize,
          mimeType: att.mimeType,
          storageKey: att.storageKey,
          storageProvider: att.storageProvider,
          checksum: att.checksum,
          createdAt: att.createdAt.toISOString(),
          downloadUrl: `/api/v1/communication/attachments/${att.id}/download`,
        }));

    const reactions: MessageReactionSummary[] = (m.reactions || []).map((r: any) => ({
      id: r.id,
      messageId: r.messageId,
      userId: r.userId,
      emoji: r.emoji,
      createdAt: r.createdAt.toISOString(),
      user: r.user,
    }));

    const mentions: MessageMentionSummary[] = (m.mentions || []).map((men: any) => ({
      id: men.id,
      messageId: men.messageId,
      userId: men.userId,
      createdAt: men.createdAt.toISOString(),
      user: men.user,
    }));

    return {
      id: m.id,
      workspaceId: m.workspaceId,
      conversationId: m.conversationId,
      senderId: m.senderId,
      // Mask deleted message content
      content: isDeleted ? "" : m.content,
      type: m.type as MessageType,
      parentMessageId: m.parentMessageId,
      replyCount: m.replyCount || 0,
      isEdited: m.isEdited,
      editedAt: m.editedAt ? m.editedAt.toISOString() : null,
      isDeleted,
      deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
      sender: m.sender,
      attachments,
      reactions,
      mentions,
      parentMessage,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}
