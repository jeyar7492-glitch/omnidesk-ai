import React, { useState } from "react";
import {
  X,
  Settings,
  UserPlus,
  UserMinus,
  LogOut,
  AlertCircle,
  Save,
} from "lucide-react";
import { ConversationDetail } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";

interface ConversationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: ConversationDetail;
  currentUserId: string;
  onConversationUpdated: (updated: ConversationDetail) => void;
  onLeftConversation: () => void;
}

export const ConversationSettingsModal: React.FC<ConversationSettingsModalProps> = ({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  onConversationUpdated,
  onLeftConversation,
}) => {
  const [title, setTitle] = useState(conversation.title || "");
  const [description, setDescription] = useState(conversation.description || "");
  const [newMemberIds, setNewMemberIds] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentMember = conversation.members.find((m) => m.userId === currentUserId);
  const isOwnerOrAdmin =
    currentMember?.role === "OWNER" || currentMember?.role === "ADMIN";

  const handleUpdateDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    setError(null);
    try {
      const updated = await apiClient.updateConversation(conversation.id, {
        title: title.trim(),
        description: description.trim() || null,
      });
      onConversationUpdated(updated);
    } catch (err: any) {
      setError(err.message || "Failed to update group details");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMembers = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = newMemberIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) return;

    setIsLoading(true);
    setError(null);
    try {
      const updated = await apiClient.addConversationMembers(conversation.id, ids);
      onConversationUpdated(updated);
      setNewMemberIds("");
    } catch (err: any) {
      setError(err.message || "Failed to add members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    setIsLoading(true);
    setError(null);
    try {
      await apiClient.removeConversationMember(conversation.id, targetUserId);
      const updated = await apiClient.getConversation(conversation.id);
      onConversationUpdated(updated);
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm("Are you sure you want to leave this conversation?")) return;

    setIsLoading(true);
    try {
      await apiClient.removeConversationMember(conversation.id, currentUserId);
      onLeftConversation();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to leave conversation");
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
          maxWidth: "560px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
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
            <Settings size={20} color="var(--brand-cyan)" />
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
              Group Settings
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

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {/* Group Details Form */}
          {isOwnerOrAdmin && (
            <form onSubmit={handleUpdateDetails} style={{ marginBottom: "24px" }}>
              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Group Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ marginBottom: "12px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Group topic or purpose"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "var(--brand-cyan)",
                    color: "#0a0c10",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Save size={14} />
                  Save Changes
                </button>
              </div>
            </form>
          )}

          {/* Add Members (Owner/Admin) */}
          {isOwnerOrAdmin && (
            <form onSubmit={handleAddMembers} style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Add Members (comma-separated User IDs)
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  value={newMemberIds}
                  onChange={(e) => setNewMemberIds(e.target.value)}
                  placeholder="user_id_1, user_id_2"
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
                  disabled={!newMemberIds.trim() || isLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    background: "var(--bg-elevated)",
                    color: "var(--brand-cyan)",
                    border: "1px solid var(--border-glow)",
                    cursor: "pointer",
                  }}
                >
                  <UserPlus size={14} />
                  Add
                </button>
              </div>
            </form>
          )}

          {/* Members List */}
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "10px" }}>
              Members ({conversation.members.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {conversation.members.map((m) => {
                const isUserOwner = m.role === "OWNER";
                const isUserAdmin = m.role === "ADMIN";
                const displayName = m.user
                  ? `${m.user.firstName} ${m.user.lastName}`.trim() || m.user.email
                  : m.userId;

                const canRemove =
                  isOwnerOrAdmin &&
                  m.userId !== currentUserId &&
                  !isUserOwner;

                return (
                  <div
                    key={m.userId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--bg-secondary)",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          background: "rgba(6, 182, 212, 0.15)",
                          color: "var(--brand-cyan)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                        }}
                      >
                        {displayName.substring(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: "13px", color: "var(--text-primary)" }}>{displayName}</div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {m.user?.email || m.userId}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          background: isUserOwner
                            ? "rgba(245, 158, 11, 0.15)"
                            : isUserAdmin
                            ? "rgba(99, 102, 241, 0.15)"
                            : "var(--bg-card)",
                          color: isUserOwner
                            ? "#f59e0b"
                            : isUserAdmin
                            ? "var(--brand-indigo)"
                            : "var(--text-muted)",
                        }}
                      >
                        {m.role}
                      </span>

                      {canRemove && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          title="Remove from group"
                          style={{
                            padding: "4px",
                            borderRadius: "4px",
                            color: "#ef4444",
                            cursor: "pointer",
                          }}
                        >
                          <UserMinus size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: Leave Conversation */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleLeave}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#ef4444",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              cursor: "pointer",
            }}
          >
            <LogOut size={14} />
            Leave Group
          </button>

          <button
            onClick={onClose}
            style={{
              padding: "6px 16px",
              borderRadius: "6px",
              fontSize: "12px",
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
