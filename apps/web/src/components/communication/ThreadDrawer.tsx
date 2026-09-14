import React, { useState, useEffect } from "react";
import {
  X,
  Send,
  CornerDownRight,
  FileText,
} from "lucide-react";
import { MessageSummary, ConversationMemberSummary } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";

interface ThreadDrawerProps {
  parentMessage: MessageSummary;
  conversationId: string;
  members: ConversationMemberSummary[];
  currentUserId: string;
  onClose: () => void;
  onReplyAdded: (reply: MessageSummary) => void;
}

export const ThreadDrawer: React.FC<ThreadDrawerProps> = ({
  parentMessage,
  conversationId,
  members: _members,
  currentUserId: _currentUserId,
  onClose,
  onReplyAdded,
}) => {
  const [replies, setReplies] = useState<MessageSummary[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadThread();
  }, [parentMessage.id]);

  const loadThread = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getThread(conversationId, parentMessage.id);
      setReplies(res.replies || []);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSending) return;

    setIsSending(true);
    try {
      const reply = await apiClient.sendMessage(conversationId, {
        content: replyText.trim(),
        parentMessageId: parentMessage.id,
      });
      setReplies((prev) => [...prev, reply]);
      onReplyAdded(reply);
      setReplyText("");
    } catch {
      // Handle error
    } finally {
      setIsSending(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const parentSenderName = parentMessage.sender
    ? `${parentMessage.sender.firstName} ${parentMessage.sender.lastName}`.trim() ||
      parentMessage.sender.email
    : "Member";

  return (
    <div
      style={{
        width: "360px",
        minWidth: "360px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-subtle)",
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <CornerDownRight size={18} color="var(--brand-cyan)" />
          <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            Thread
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "4px",
          }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Parent Message Card */}
        <div
          style={{
            padding: "12px",
            background: "var(--bg-card)",
            borderRadius: "8px",
            border: "1px solid var(--border-medium)",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
              {parentSenderName}
            </span>
            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              {formatTimestamp(parentMessage.createdAt)}
            </span>
          </div>

          {parentMessage.isDeleted ? (
            <div style={{ fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic" }}>
              This message was deleted.
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: "13px",
                  lineHeight: "1.4",
                  color: "var(--text-primary)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {parentMessage.content}
              </div>

              {parentMessage.attachments && parentMessage.attachments.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                  {parentMessage.attachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "4px 8px",
                        background: "var(--bg-elevated)",
                        borderRadius: "6px",
                        fontSize: "11px",
                      }}
                    >
                      <FileText size={12} color="var(--brand-cyan)" />
                      <span style={{ maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {att.fileName}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Separator with reply count */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
            {replies.length} {replies.length === 1 ? "Reply" : "Replies"}
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
        </div>

        {/* Replies List */}
        {isLoading ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            Loading replies...
          </div>
        ) : (
          replies.map((reply) => {
            const sender = reply.sender
              ? `${reply.sender.firstName} ${reply.sender.lastName}`.trim() || reply.sender.email
              : "Member";

            return (
              <div
                key={reply.id}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.04)",
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.2)",
                    color: "var(--brand-indigo)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {sender.substring(0, 2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>
                      {sender}
                    </span>
                    <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                      {formatTimestamp(reply.createdAt)}
                    </span>
                  </div>

                  {reply.isDeleted ? (
                    <div style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>
                      This message was deleted.
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: "13px",
                        lineHeight: "1.4",
                        color: "var(--text-primary)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {reply.content}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Composer */}
      <form
        onSubmit={handleSendReply}
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          display: "flex",
          gap: "8px",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Reply to thread..."
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "6px",
            color: "var(--text-primary)",
            fontSize: "13px",
          }}
        />
        <button
          type="submit"
          disabled={!replyText.trim() || isSending}
          style={{
            padding: "8px 12px",
            borderRadius: "6px",
            background: replyText.trim() ? "var(--brand-cyan)" : "var(--bg-secondary)",
            color: replyText.trim() ? "#0a0c10" : "var(--text-muted)",
            border: "none",
            cursor: replyText.trim() ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
          }}
        >
          <Send size={14} />
        </button>
      </form>
    </div>
  );
};
