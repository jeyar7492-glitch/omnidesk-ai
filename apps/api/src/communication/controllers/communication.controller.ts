import { Request, Response, NextFunction } from "express";
import { CommunicationService } from "../services/communication.service";
import { AttachmentService } from "../services/attachment.service";
import { AppError } from "../../lib/errors";
import {
  CreateDirectConversationSchema,
  CreateGroupConversationSchema,
  CreateConversationSchema,
  UpdateConversationSchema,
  AddConversationMembersSchema,
  SendMessageSchema,
  EditMessageSchema,
  AddReactionSchema,
  ConversationQuerySchema,
  MessageQuerySchema,
  CommunicationSearchSchema,
  TypingIndicatorSchema,
} from "@omnidesk/validation";
import { wsManager } from "../../lib/websocket";

function getAuth(req: Request) {
  const ctx = (req as any).context || (req as any).user;
  if (!ctx || !ctx.workspaceId || !ctx.userId) {
    throw new AppError(401, "Authentication required: Missing user context", "UNAUTHORIZED");
  }
  return {
    workspaceId: ctx.workspaceId as string,
    userId: ctx.userId as string,
    permissions: (ctx.permissions || ctx.userPermissions || []) as string[],
  };
}

export class CommunicationController {
  private service: CommunicationService;
  private attachmentService: AttachmentService;

  constructor() {
    this.service = CommunicationService.getInstance();
    this.attachmentService = AttachmentService.getInstance();
  }

  public createConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);

      // Support either discriminated union with `type` or legacy direct/group body
      const body = req.body;
      if (body.type === "DIRECT" || body.targetUserId) {
        const validated = CreateDirectConversationSchema.parse(body);
        const conversation = await this.service.getOrCreateDirectConversation(workspaceId, userId, validated);
        return res.status(201).json({ success: true, data: conversation });
      } else if (body.type === "GROUP" || body.title) {
        const validated = CreateGroupConversationSchema.parse(body);
        const conversation = await this.service.createGroupConversation(workspaceId, userId, validated);
        return res.status(201).json({ success: true, data: conversation });
      } else {
        const validated = CreateConversationSchema.parse(body);
        if (validated.type === "DIRECT") {
          const conversation = await this.service.getOrCreateDirectConversation(workspaceId, userId, {
            targetUserId: validated.targetUserId,
          });
          return res.status(201).json({ success: true, data: conversation });
        } else {
          const conversation = await this.service.createGroupConversation(workspaceId, userId, {
            title: validated.title,
            description: validated.description,
            memberIds: validated.memberIds,
          });
          return res.status(201).json({ success: true, data: conversation });
        }
      }
    } catch (err) {
      next(err);
    }
  };

  public listConversations = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const query = ConversationQuerySchema.parse(req.query);
      const result = await this.service.listConversations(workspaceId, userId, query);
      return res.status(200).json({
        success: true,
        data: {
          items: result.conversations,
          conversations: result.conversations,
          total: result.total,
        },
        items: result.conversations,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  public getConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const conversation = await this.service.getConversation(workspaceId, userId, conversationId);
      return res.status(200).json({ success: true, data: conversation });
    } catch (err) {
      next(err);
    }
  };

  public updateConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, permissions } = getAuth(req);
      const conversationId = req.params.conversationId;
      const input = UpdateConversationSchema.parse(req.body);
      const updated = await this.service.updateConversation(workspaceId, userId, conversationId, input, permissions);
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public addMembers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, permissions } = getAuth(req);
      const conversationId = req.params.conversationId;
      const input = AddConversationMembersSchema.parse(req.body);
      const updated = await this.service.addMembers(workspaceId, userId, conversationId, input.memberIds, permissions);
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  };

  public removeMember = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, permissions } = getAuth(req);
      const conversationId = req.params.conversationId;
      const targetUserId = req.params.userId;
      await this.service.removeMember(workspaceId, userId, conversationId, targetUserId, permissions);
      return res.status(200).json({ success: true, message: "Member removed successfully" });
    } catch (err) {
      next(err);
    }
  };

  public listMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const query = MessageQuerySchema.parse(req.query);
      const result = await this.service.listMessages(workspaceId, userId, conversationId, query);
      return res.status(200).json({
        success: true,
        data: {
          items: result.messages,
          messages: result.messages,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        },
        items: result.messages,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      });
    } catch (err) {
      next(err);
    }
  };

  public sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const input = SendMessageSchema.parse(req.body);
      const message = await this.service.sendMessage(workspaceId, userId, conversationId, input);
      return res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  };

  public getThread = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const messageId = req.params.messageId;
      const thread = await this.service.getThread(workspaceId, userId, conversationId, messageId);
      return res.status(200).json({ success: true, data: thread });
    } catch (err) {
      next(err);
    }
  };

  public getMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const messageId = req.params.messageId;
      const message = await this.service.getMessage(workspaceId, userId, conversationId, messageId);
      return res.status(200).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  };

  public editMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, permissions } = getAuth(req);
      const conversationId = req.params.conversationId;
      const messageId = req.params.messageId;
      const input = EditMessageSchema.parse(req.body);
      const message = await this.service.editMessage(workspaceId, userId, conversationId, messageId, input, permissions);
      return res.status(200).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  };

  public deleteMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId, permissions } = getAuth(req);
      const conversationId = req.params.conversationId;
      const messageId = req.params.messageId;
      await this.service.deleteMessage(workspaceId, userId, conversationId, messageId, permissions);
      return res.status(200).json({ success: true, message: "Message deleted successfully" });
    } catch (err) {
      next(err);
    }
  };

  public addReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const messageId = req.params.messageId;
      const input = AddReactionSchema.parse(req.body);
      const reaction = await this.service.addReaction(workspaceId, userId, conversationId, messageId, input.emoji);
      return res.status(201).json({ success: true, data: reaction });
    } catch (err) {
      next(err);
    }
  };

  public removeReaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      const messageId = req.params.messageId;
      const emoji = decodeURIComponent(req.params.emoji);
      await this.service.removeReaction(workspaceId, userId, conversationId, messageId, emoji);
      return res.status(200).json({ success: true, message: "Reaction removed successfully" });
    } catch (err) {
      next(err);
    }
  };

  public markConversationRead = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.params.conversationId;
      await this.service.markConversationRead(workspaceId, userId, conversationId);
      return res.status(200).json({ success: true, message: "Conversation marked as read" });
    } catch (err) {
      next(err);
    }
  };

  public getUnreadCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const result = await this.service.getUnreadCount(workspaceId, userId);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  public searchMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const query = CommunicationSearchSchema.parse(req.query);
      const result = await this.service.searchMessages(workspaceId, userId, query);
      return res.status(200).json({
        success: true,
        data: {
          items: result.messages,
          messages: result.messages,
          total: result.total,
        },
        items: result.messages,
        messages: result.messages,
        total: result.total,
      });
    } catch (err) {
      next(err);
    }
  };

  public handleTyping = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const input = TypingIndicatorSchema.parse(req.body);
      await this.service.handleTyping(workspaceId, userId, input.conversationId, input.isTyping);
      return res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  public getPresence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId } = getAuth(req);
      const userIds = req.query.userIds ? (req.query.userIds as string).split(",") : undefined;
      const presence = wsManager.getPresence(workspaceId, userIds);
      return res.status(200).json({ success: true, data: presence });
    } catch (err) {
      next(err);
    }
  };

  public updatePresence = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const status = req.body.status || "online";
      wsManager.addPresence(workspaceId, userId, status);
      return res.status(200).json({
        success: true,
        data: { userId, status, lastSeen: new Date().toISOString() },
      });
    } catch (err) {
      next(err);
    }
  };

  public uploadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const conversationId = req.body.conversationId || req.params.conversationId;

      if (!conversationId) {
        throw new AppError(400, "conversationId is required", "BAD_REQUEST");
      }

      if (!req.file) {
        throw new AppError(400, "No file uploaded", "FILE_REQUIRED");
      }

      const attachment = await this.attachmentService.uploadAttachment({
        workspaceId,
        conversationId,
        userId,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        buffer: req.file.buffer,
      });

      return res.status(201).json({ success: true, data: attachment });
    } catch (err) {
      next(err);
    }
  };

  public downloadAttachment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, userId } = getAuth(req);
      const attachmentId = req.params.attachmentId;

      const { attachment, fileBuffer } = await this.attachmentService.getAttachmentForDownload({
        workspaceId,
        userId,
        attachmentId,
      });

      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);
      res.setHeader("Content-Length", fileBuffer.length);
      return res.send(fileBuffer);
    } catch (err) {
      next(err);
    }
  };
}
