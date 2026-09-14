import React, { useEffect, useRef } from "react";
import { MessageSummary } from "@omnidesk/shared-types";
import {
  MessageSquare,
  Smile,
  Edit2,
  Trash2,
  FileText,
  Download,
  CornerDownRight,
} from "lucide-react";
import { apiClient } from "../../api/client";

interface MessageTimelineProps {
  conversationId: string;
  messages: MessageSummary[];
  currentUserId: string;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onOpenThread: (message: MessageSummary) => void;
  onEditMessage: (message: MessageSummary) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const SUPPORTED_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "🚀"];

export const MessageTimeline: React.FC<MessageTimelineProps> = ({
  conversationId: _conversationId,
  messages,
  currentUserId,
  isLoading,
  hasMore,
  onLoadMore,
  onOpenThread,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [reactionMenuMessageId, setReactionMenuMessageId] = React.useState<string | null>(null);

  // Auto-scroll to bottom on initial load or message count change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTimestamp = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      {/* Load More Button */}
      {hasMore && (
        <div style={{ textAlign: "center", marginBottom: "8px" }}>
          <button
            onClick={onLoadMore}
            disabled={isLoading}
            style={{
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 500,
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              color: "var(--text-secondary)",
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "Loading earlier messages..." : "Load earlier messages"}
          </button>
        </div>
      )}

      {messages.length === 0 && !isLoading && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
            gap: "12px",
            minHeight: "200px",
          }}
        >
          <MessageSquare size={36} color="var(--border-medium)" />
          <p style={{ fontSize: "14px", margin: 0 }}>This is the beginning of your conversation.</p>
        </div>
      )}

      {messages.map((msg) => {
        const isSelf = msg.senderId === currentUserId;
        const senderName = msg.sender
          ? `${msg.sender.firstName} ${msg.sender.lastName}`.trim() || msg.sender.email
          : "System / Member";

        // Group reactions by emoji
        const reactionCounts: Record<string, { count: number; users: string[]; reactedByMe: boolean }> = {};
        if (msg.reactions && !msg.isDeleted) {
          msg.reactions.forEach((r) => {
            if (!reactionCounts[r.emoji]) {
              reactionCounts[r.emoji] = { count: 0, users: [], reactedByMe: false };
            }
            reactionCounts[r.emoji].count += 1;
            reactionCounts[r.emoji].users.push(r.userId);
            if (r.userId === currentUserId) {
              reactionCounts[r.emoji].reactedByMe = true;
            }
          });
        }

        return (
          <div
            key={msg.id}
            className="message-row"
            style={{
              display: "flex",
              gap: "12px",
              padding: "8px 12px",
              borderRadius: "8px",
              position: "relative",
              background: isSelf ? "rgba(6, 182, 212, 0.03)" : "transparent",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              const actions = e.currentTarget.querySelector(".message-actions") as HTMLElement;
              if (actions) actions.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              const actions = e.currentTarget.querySelector(".message-actions") as HTMLElement;
              if (actions) actions.style.opacity = "0";
              setReactionMenuMessageId(null);
            }}
          >
            {/* Sender Avatar */}
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: isSelf ? "rgba(6, 182, 212, 0.2)" : "rgba(139, 92, 246, 0.2)",
                border: `1px solid ${isSelf ? "var(--brand-cyan)" : "var(--brand-purple)"}`,
                color: isSelf ? "var(--brand-cyan)" : "var(--brand-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {senderName.substring(0, 2).toUpperCase()}
            </div>

            {/* Message Body */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Header: Name, timestamp, edited */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  {senderName}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                  {formatTimestamp(msg.createdAt)}
                </span>
                {msg.editedAt && !msg.isDeleted && (
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
                    (edited)
                  </span>
                )}
              </div>

              {/* Content or Deleted Placeholder */}
              {msg.isDeleted ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "var(--text-muted)",
                    fontSize: "13px",
                    fontStyle: "italic",
                    padding: "4px 0",
                  }}
                >
                  <Trash2 size={13} />
                  <span>This message was deleted.</span>
                </div>
              ) : (
                <>
                  {/* Text Content */}
                  <div
                    style={{
                      fontSize: "14px",
                      lineHeight: "1.5",
                      color: "var(--text-primary)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.content}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                      {msg.attachments.map((att) => {
                        const isImage = att.mimeType.startsWith("image/");
                        const downloadUrl = apiClient.getAttachmentDownloadUrl(att.id);

                        return (
                          <div
                            key={att.id}
                            style={{
                              border: "1px solid var(--border-medium)",
                              borderRadius: "8px",
                              overflow: "hidden",
                              background: "var(--bg-card)",
                              maxWidth: isImage ? "280px" : "320px",
                            }}
                          >
                            {isImage ? (
                              <div>
                                <img
                                  src={downloadUrl}
                                  alt={att.fileName}
                                  style={{
                                    maxWidth: "100%",
                                    maxHeight: "200px",
                                    display: "block",
                                    objectFit: "cover",
                                    cursor: "pointer",
                                  }}
                                  onClick={() => window.open(downloadUrl, "_blank")}
                                />
                                <div
                                  style={{
                                    padding: "6px 10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    fontSize: "11px",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {att.fileName}
                                  </span>
                                  <a
                                    href={downloadUrl}
                                    download={att.fileName}
                                    style={{ display: "flex", alignItems: "center", color: "var(--brand-cyan)" }}
                                  >
                                    <Download size={12} />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "10px",
                                  padding: "10px 12px",
                                }}
                              >
                                <FileText size={24} color="var(--brand-cyan)" />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: 500,
                                      color: "var(--text-primary)",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {att.fileName}
                                  </div>
                                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                                    {formatFileSize(att.fileSize)}
                                  </div>
                                </div>
                                <a
                                  href={downloadUrl}
                                  download={att.fileName}
                                  style={{
                                    padding: "6px",
                                    borderRadius: "4px",
                                    background: "var(--bg-secondary)",
                                    color: "var(--brand-cyan)",
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <Download size={14} />
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Reactions Pill List */}
                  {Object.keys(reactionCounts).length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                      {Object.entries(reactionCounts).map(([emoji, data]) => (
                        <button
                          key={emoji}
                          onClick={() => {
                            if (data.reactedByMe) {
                              onRemoveReaction(msg.id, emoji);
                            } else {
                              onAddReaction(msg.id, emoji);
                            }
                          }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            background: data.reactedByMe ? "rgba(6, 182, 212, 0.15)" : "var(--bg-card)",
                            border: `1px solid ${data.reactedByMe ? "var(--brand-cyan)" : "var(--border-subtle)"}`,
                            color: data.reactedByMe ? "var(--brand-cyan)" : "var(--text-secondary)",
                            cursor: "pointer",
                          }}
                        >
                          <span>{emoji}</span>
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>{data.count}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Thread Replies Button */}
                  {(msg.replyCount || 0) > 0 && (
                    <button
                      onClick={() => onOpenThread(msg)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginTop: "8px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--brand-cyan)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                      }}
                    >
                      <CornerDownRight size={14} />
                      <span>
                        {msg.replyCount} {msg.replyCount === 1 ? "reply" : "replies"}
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Hover Actions Bar (Only if message is not deleted) */}
            {!msg.isDeleted && (
              <div
                className="message-actions"
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "12px",
                  opacity: reactionMenuMessageId === msg.id ? 1 : 0,
                  display: "flex",
                  alignItems: "center",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-medium)",
                  borderRadius: "6px",
                  boxShadow: "var(--shadow-card)",
                  padding: "2px",
                  gap: "2px",
                  transition: "opacity 0.15s ease",
                  zIndex: 10,
                }}
              >
                {/* Reply in thread */}
                <button
                  onClick={() => onOpenThread(msg)}
                  title="Reply in thread"
                  style={{
                    padding: "5px",
                    borderRadius: "4px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <CornerDownRight size={14} />
                </button>

                {/* React trigger */}
                <button
                  onClick={() =>
                    setReactionMenuMessageId(reactionMenuMessageId === msg.id ? null : msg.id)
                  }
                  title="Add reaction"
                  style={{
                    padding: "5px",
                    borderRadius: "4px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  <Smile size={14} />
                </button>

                {/* Edit (if author) */}
                {isSelf && (
                  <button
                    onClick={() => onEditMessage(msg)}
                    title="Edit message"
                    style={{
                      padding: "5px",
                      borderRadius: "4px",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                )}

                {/* Delete (if author) */}
                {isSelf && (
                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    title="Delete message"
                    style={{
                      padding: "5px",
                      borderRadius: "4px",
                      color: "#ef4444",
                      cursor: "pointer",
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {/* Reaction Picker Popup */}
                {reactionMenuMessageId === msg.id && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: "100%",
                      right: 0,
                      marginBottom: "6px",
                      display: "flex",
                      gap: "4px",
                      padding: "6px 8px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-medium)",
                      borderRadius: "8px",
                      boxShadow: "var(--shadow-elevated)",
                    }}
                  >
                    {SUPPORTED_REACTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          onAddReaction(msg.id, emoji);
                          setReactionMenuMessageId(null);
                        }}
                        style={{
                          fontSize: "16px",
                          padding: "4px",
                          cursor: "pointer",
                          borderRadius: "4px",
                          background: "transparent",
                          transition: "transform 0.1s ease",
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <div ref={bottomRef} />
    </div>
  );
};
