import { Router } from "express";
import multer from "multer";
import { CommunicationController } from "../controllers/communication.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

export const communicationRouter = Router();
const controller = new CommunicationController();

communicationRouter.use(requireAuthContext);

// ── Presence & Typing ────────────────────────────────────────────────────────
communicationRouter.get(
  "/presence",
  requirePermission("communication:read"),
  controller.getPresence
);

communicationRouter.put(
  "/presence",
  requirePermission("communication:write"),
  controller.updatePresence
);

communicationRouter.post(
  "/typing",
  requirePermission("communication:write"),
  controller.handleTyping
);

// ── Global & Unread Stats ───────────────────────────────────────────────────
communicationRouter.get(
  "/unread-count",
  requirePermission("communication:read"),
  controller.getUnreadCount
);

communicationRouter.get(
  "/search",
  requirePermission("communication:read"),
  controller.searchMessages
);

// ── Attachments ─────────────────────────────────────────────────────────────
communicationRouter.post(
  "/attachments",
  requirePermission("communication:write"),
  upload.single("file"),
  controller.uploadAttachment
);

communicationRouter.get(
  "/attachments/:attachmentId/download",
  requirePermission("communication:read"),
  controller.downloadAttachment
);

// ── Conversations ───────────────────────────────────────────────────────────
communicationRouter.post(
  "/conversations",
  requirePermission("communication:write"),
  controller.createConversation
);

communicationRouter.get(
  "/conversations",
  requirePermission("communication:read"),
  controller.listConversations
);

communicationRouter.get(
  "/conversations/:conversationId",
  requirePermission("communication:read"),
  controller.getConversation
);

communicationRouter.patch(
  "/conversations/:conversationId",
  requirePermission("communication:write"),
  controller.updateConversation
);

communicationRouter.post(
  "/conversations/:conversationId/read",
  requirePermission("communication:read"),
  controller.markConversationRead
);

// ── Conversation Members ────────────────────────────────────────────────────
communicationRouter.post(
  "/conversations/:conversationId/members",
  requirePermission("communication:write"),
  controller.addMembers
);

communicationRouter.delete(
  "/conversations/:conversationId/members/:userId",
  requirePermission("communication:write"),
  controller.removeMember
);

// ── Messages & Threads ──────────────────────────────────────────────────────
communicationRouter.get(
  "/conversations/:conversationId/messages",
  requirePermission("communication:read"),
  controller.listMessages
);

communicationRouter.post(
  "/conversations/:conversationId/messages",
  requirePermission("communication:write"),
  controller.sendMessage
);

communicationRouter.get(
  "/conversations/:conversationId/messages/:messageId",
  requirePermission("communication:read"),
  controller.getMessage
);

communicationRouter.get(
  "/conversations/:conversationId/messages/:messageId/thread",
  requirePermission("communication:read"),
  controller.getThread
);

communicationRouter.patch(
  "/conversations/:conversationId/messages/:messageId",
  requirePermission("communication:write"),
  controller.editMessage
);

communicationRouter.delete(
  "/conversations/:conversationId/messages/:messageId",
  requirePermission("communication:write"),
  controller.deleteMessage
);

// ── Reactions ───────────────────────────────────────────────────────────────
communicationRouter.post(
  "/conversations/:conversationId/messages/:messageId/reactions",
  requirePermission("communication:write"),
  controller.addReaction
);

communicationRouter.delete(
  "/conversations/:conversationId/messages/:messageId/reactions/:emoji",
  requirePermission("communication:write"),
  controller.removeReaction
);
