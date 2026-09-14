import React, { useState } from "react";
import { X, UserPlus, Users, MessageSquare, AlertCircle } from "lucide-react";
import { apiClient } from "../../api/client";
import { ConversationDetail } from "@omnidesk/shared-types";

interface CreateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: (conversation: ConversationDetail) => void;
}

export const CreateConversationModal: React.FC<CreateConversationModalProps> = ({
  isOpen,
  onClose,
  onConversationCreated,
}) => {
  const [tab, setTab] = useState<"direct" | "group">("direct");
  const [targetUserId, setTargetUserId] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [memberIdsInput, setMemberIdsInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId.trim()) {
      setError("Please enter the user ID to message.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const conv = await apiClient.createDirectConversation({
        targetUserId: targetUserId.trim(),
      });
      onConversationCreated(conv);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to start direct conversation");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) {
      setError("Group title is required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const members = memberIdsInput
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

      const conv = await apiClient.createGroupConversation({
        title: groupTitle.trim(),
        description: groupDescription.trim() || undefined,
        memberIds: members,
      });
      onConversationCreated(conv);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create group conversation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="modal-content"
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-elevated)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <MessageSquare size={20} color="var(--brand-cyan)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              New Conversation
            </h3>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              color: "var(--text-secondary)",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "flex",
            padding: "8px 20px",
            gap: "8px",
            borderBottom: "1px solid var(--border-subtle)",
            background: "var(--bg-secondary)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setTab("direct");
              setError(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              background: tab === "direct" ? "var(--bg-elevated)" : "transparent",
              color: tab === "direct" ? "var(--brand-cyan)" : "var(--text-secondary)",
              border: tab === "direct" ? "1px solid var(--border-glow)" : "1px solid transparent",
            }}
          >
            <UserPlus size={16} />
            Direct Message
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("group");
              setError(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              background: tab === "group" ? "var(--bg-elevated)" : "transparent",
              color: tab === "group" ? "var(--brand-cyan)" : "var(--text-secondary)",
              border: tab === "group" ? "1px solid var(--border-glow)" : "1px solid transparent",
            }}
          >
            <Users size={16} />
            Group Chat
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              margin: "16px 20px 0",
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "8px",
              color: "#ef4444",
              fontSize: "13px",
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Tab Forms */}
        {tab === "direct" ? (
          <form onSubmit={handleCreateDirect} style={{ padding: "20px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Target User ID or Email
              </label>
              <input
                type="text"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="e.g. 67b844ec10ec6e3973b5cc33 or member ID"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                Direct conversations are uniquely determined between you and the recipient.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--brand-cyan)",
                  color: "#0a0c10",
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Starting Chat..." : "Start Direct Chat"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateGroup} style={{ padding: "20px" }}>
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Group Title *
              </label>
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="e.g. Engineering Leadership, Project Alpha War Room"
                required
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Description (Optional)
              </label>
              <input
                type="text"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Brief purpose of this group"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Initial Member IDs (comma-separated)
              </label>
              <input
                type="text"
                value={memberIdsInput}
                onChange={(e) => setMemberIdsInput(e.target.value)}
                placeholder="user_id_1, user_id_2"
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                }}
              />
              <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
                You will automatically be made the Group Owner.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: "var(--brand-cyan)",
                  color: "#0a0c10",
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
              >
                {isLoading ? "Creating Group..." : "Create Group Chat"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
