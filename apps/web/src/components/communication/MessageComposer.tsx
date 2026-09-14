import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Paperclip,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  MessageAttachmentSummary,
  ConversationMemberSummary,
  MessageSummary,
} from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";

interface MessageComposerProps {
  conversationId: string;
  members: ConversationMemberSummary[];
  onSendMessage: (content: string, attachmentIds: string[]) => Promise<void>;
  editingMessage: MessageSummary | null;
  onSaveEdit: (newContent: string) => Promise<void>;
  onCancelEdit: () => void;
  disabled?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  conversationId,
  members,
  onSendMessage,
  editingMessage,
  onSaveEdit,
  onCancelEdit,
  disabled = false,
}) => {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachmentSummary[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync editing message
  useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  // Handle typing indicator
  const notifyTyping = () => {
    apiClient.sendTyping(conversationId, true).catch(() => {});
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      apiClient.sendTyping(conversationId, false).catch(() => {});
    }, 3000);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    notifyTyping();

    // Check for @mention trigger
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);

    if (match) {
      setMentionFilter(match[1].toLowerCase());
      setShowMentionPicker(true);
    } else {
      setShowMentionPicker(false);
    }
  };

  const insertMention = (member: ConversationMemberSummary) => {
    const name = member.user
      ? `${member.user.firstName} ${member.user.lastName}`.trim() || member.user.email
      : member.userId;

    const cursor = textareaRef.current?.selectionStart || content.length;
    const textBeforeCursor = content.slice(0, cursor);
    const textAfterCursor = content.slice(cursor);
    const newTextBefore = textBeforeCursor.replace(/@([a-zA-Z0-9_-]*)$/, `@${name} `);

    setContent(newTextBefore + textAfterCursor);
    setShowMentionPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const att = await apiClient.uploadAttachment(conversationId, file);
      setAttachments((prev) => [...prev, att]);
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim() && attachments.length === 0) return;

    if (editingMessage) {
      await onSaveEdit(content.trim());
      setContent("");
      return;
    }

    try {
      await onSendMessage(
        content.trim(),
        attachments.map((a) => a.id)
      );
      setContent("");
      setAttachments([]);
      setShowMentionPicker(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      apiClient.sendTyping(conversationId, false).catch(() => {});
    } catch (err: any) {
      setUploadError(err.message || "Failed to send message");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const filteredMembers = members.filter((m) => {
    const name = m.user
      ? `${m.user.firstName} ${m.user.lastName} ${m.user.email}`.toLowerCase()
      : m.userId.toLowerCase();
    return name.includes(mentionFilter);
  });

  return (
    <div
      style={{
        padding: "12px 20px",
        borderTop: "1px solid var(--border-subtle)",
        background: "var(--bg-secondary)",
        position: "relative",
      }}
    >
      {/* Editing Banner */}
      {editingMessage && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            background: "rgba(6, 182, 212, 0.1)",
            borderRadius: "6px",
            marginBottom: "8px",
            fontSize: "12px",
            color: "var(--brand-cyan)",
          }}
        >
          <span>Editing message</span>
          <button
            onClick={onCancelEdit}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "6px",
            color: "#ef4444",
            fontSize: "12px",
            marginBottom: "8px",
          }}
        >
          <AlertCircle size={14} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
          {attachments.map((att) => (
            <div
              key={att.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                background: "var(--bg-card)",
                border: "1px solid var(--border-medium)",
                borderRadius: "6px",
                fontSize: "12px",
                color: "var(--text-primary)",
              }}
            >
              <FileText size={14} color="var(--brand-cyan)" />
              <span style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {att.fileName}
              </span>
              <button
                onClick={() => removeAttachment(att.id)}
                style={{
                  padding: "2px",
                  borderRadius: "50%",
                  background: "transparent",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Mention Autocomplete Dropdown */}
      {showMentionPicker && filteredMembers.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: "20px",
            width: "240px",
            maxHeight: "180px",
            overflowY: "auto",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-medium)",
            borderRadius: "8px",
            boxShadow: "var(--shadow-elevated)",
            marginBottom: "6px",
            zIndex: 100,
          }}
        >
          <div style={{ padding: "6px 10px", fontSize: "11px", fontWeight: 600, color: "var(--text-muted)" }}>
            Members
          </div>
          {filteredMembers.map((m) => {
            const displayName = m.user
              ? `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email
              : m.userId;
            return (
              <div
                key={m.userId}
                onClick={() => insertMention(m)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "rgba(6, 182, 212, 0.2)",
                    color: "var(--brand-cyan)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 700,
                  }}
                >
                  {displayName.substring(0, 1).toUpperCase()}
                </div>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input Box Row */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "8px",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "8px 12px",
        }}
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: "none" }}
        />

        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || disabled}
          title="Attach file (images, documents, pdfs up to 15MB)"
          style={{
            padding: "6px",
            borderRadius: "6px",
            color: isUploading ? "var(--brand-cyan)" : "var(--text-muted)",
            cursor: isUploading ? "wait" : "pointer",
          }}
        >
          <Paperclip size={18} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message... (Enter to send, Shift+Enter for newline, @ to mention)"
          disabled={disabled}
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            maxHeight: "120px",
            fontSize: "14px",
            lineHeight: "1.4",
            color: "var(--text-primary)",
            padding: "4px 0",
          }}
        />

        {/* Send Button */}
        <button
          type="button"
          onClick={() => handleSubmit()}
          disabled={(!content.trim() && attachments.length === 0) || disabled}
          style={{
            padding: "8px",
            borderRadius: "6px",
            background: content.trim() || attachments.length > 0 ? "var(--brand-cyan)" : "transparent",
            color: content.trim() || attachments.length > 0 ? "#0a0c10" : "var(--text-muted)",
            cursor: content.trim() || attachments.length > 0 ? "pointer" : "default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};
