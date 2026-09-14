import React, { useState } from "react";
import {
  Search,
  Plus,
  MessageSquare,
  Users,
  User,
} from "lucide-react";
import { ConversationSummary, PresenceStatus } from "@omnidesk/shared-types";

interface ConversationListProps {
  conversations: ConversationSummary[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onOpenNewModal: () => void;
  isLoading: boolean;
  presenceMap?: Record<string, { status: PresenceStatus; lastSeen: string }>;
  currentUserId: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onOpenNewModal,
  isLoading,
  presenceMap = {},
  currentUserId,
}) => {
  const [filter, setFilter] = useState<"ALL" | "DIRECT" | "GROUP">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((c) => {
    if (filter === "DIRECT" && c.type !== "DIRECT") return false;
    if (filter === "GROUP" && c.type !== "GROUP") return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (c.title || "").toLowerCase().includes(q);
      const msgMatch = (c.lastMessage?.content || "").toLowerCase().includes(q);
      return titleMatch || msgMatch;
    }
    return true;
  });

  const getPresenceColor = (status?: PresenceStatus) => {
    const s = status ? String(status).toLowerCase() : "offline";
    switch (s) {
      case "online":
        return "#10b981"; // green
      case "away":
        return "#f59e0b"; // amber
      case "busy":
        return "#ef4444"; // red
      case "offline":
      default:
        return "#64748b"; // muted slate
    }
  };

  const formatTimestamp = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "320px",
        minWidth: "320px",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Top Header with New Button */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={18} color="var(--brand-cyan)" />
          <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
            Messages
          </h2>
        </div>
        <button
          onClick={onOpenNewModal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "var(--brand-cyan)",
            color: "#0a0c10",
            border: "none",
            borderRadius: "6px",
            padding: "5px 10px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={14} />
          New
        </button>
      </div>

      {/* Search Input */}
      <div style={{ padding: "12px 16px 8px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "6px 12px",
          }}
        >
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              fontSize: "13px",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          padding: "4px 16px 8px",
          gap: "6px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {(["ALL", "DIRECT", "GROUP"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              flex: 1,
              padding: "4px 0",
              fontSize: "11px",
              fontWeight: 600,
              borderRadius: "6px",
              textAlign: "center",
              background: filter === tab ? "var(--bg-elevated)" : "transparent",
              color: filter === tab ? "var(--brand-cyan)" : "var(--text-secondary)",
              border: filter === tab ? "1px solid var(--border-glow)" : "1px solid transparent",
            }}
          >
            {tab === "ALL" ? "All" : tab === "DIRECT" ? "Direct" : "Groups"}
          </button>
        ))}
      </div>

      {/* Conversation List Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px" }}>
        {isLoading && conversations.length === 0 ? (
          <div style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            Loading conversations...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
            {searchQuery ? "No matching conversations found" : "No conversations yet. Start a new one!"}
          </div>
        ) : (
          filteredConversations.map((c) => {
            const isSelected = c.id === selectedConversationId;
            const hasUnread = (c.unreadCount || 0) > 0;

            // In direct conversation, show presence of the other member
            let targetPresenceStatus: PresenceStatus = "offline";
            if (c.type === "DIRECT") {
              const otherMember = (c as any).members?.find((m: any) => m.userId !== currentUserId);
              if (otherMember && presenceMap[otherMember.userId]) {
                targetPresenceStatus = presenceMap[otherMember.userId].status;
              }
            }

            return (
              <div
                key={c.id}
                onClick={() => onSelectConversation(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  marginBottom: "4px",
                  background: isSelected ? "var(--bg-card-hover)" : "transparent",
                  border: isSelected ? "1px solid var(--border-glow)" : "1px solid transparent",
                  transition: "background 0.15s ease",
                }}
              >
                {/* Avatar with Presence Dot */}
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: c.type === "GROUP" ? "10px" : "50%",
                      background: c.type === "GROUP" ? "rgba(99, 102, 241, 0.15)" : "rgba(6, 182, 212, 0.15)",
                      border: `1px solid ${c.type === "GROUP" ? "var(--brand-indigo)" : "var(--brand-cyan)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: c.type === "GROUP" ? "var(--brand-indigo)" : "var(--brand-cyan)",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {c.type === "GROUP" ? (
                      <Users size={18} />
                    ) : (
                      c.title ? c.title.substring(0, 2).toUpperCase() : <User size={18} />
                    )}
                  </div>
                  {c.type === "DIRECT" && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-1px",
                        right: "-1px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: getPresenceColor(targetPresenceStatus),
                        border: "2px solid var(--bg-secondary)",
                      }}
                      title={`Status: ${targetPresenceStatus.toLowerCase()}`}
                    />
                  )}
                </div>

                {/* Conversation Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: hasUnread ? 700 : 500,
                        color: hasUnread ? "var(--text-primary)" : "var(--text-secondary)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "160px",
                      }}
                    >
                      {c.title || "Direct Conversation"}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {formatTimestamp(c.lastMessageAt || c.updatedAt)}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: hasUnread ? "var(--text-primary)" : "var(--text-muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "180px",
                      }}
                    >
                      {c.lastMessage?.isDeleted
                        ? "Message was deleted"
                        : c.lastMessage?.content || "No messages yet"}
                    </span>

                    {/* Unread badge */}
                    {hasUnread && (
                      <div
                        style={{
                          minWidth: "18px",
                          height: "18px",
                          borderRadius: "9px",
                          background: "var(--brand-cyan)",
                          color: "#0a0c10",
                          fontSize: "10px",
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: "0 5px",
                        }}
                      >
                        {c.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
