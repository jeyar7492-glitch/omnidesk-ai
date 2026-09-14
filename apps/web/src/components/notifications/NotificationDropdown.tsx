import React from "react";
import { NotificationSummary, NotificationPriority } from "@omnidesk/shared-types";
import { Check, CheckCheck, Clock, Settings, Inbox, Maximize2 } from "lucide-react";

interface NotificationDropdownProps {
  isOpen: boolean;
  notifications: NotificationSummary[];
  unreadCount: number;
  loading: boolean;
  onClose: () => void;
  onMarkRead: (id: string, e?: React.MouseEvent) => void;
  onMarkAllRead: () => void;
  onOpenCenter: () => void;
  onOpenPreferences: () => void;
  onNavigate?: (url: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  notifications,
  unreadCount,
  loading,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onOpenCenter,
  onOpenPreferences,
  onNavigate,
}) => {
  if (!isOpen) return null;

  const handleItemClick = (notification: NotificationSummary) => {
    if (!notification.isRead) {
      onMarkRead(notification.id);
    }
    if (notification.actionUrl) {
      if (onNavigate) {
        onNavigate(notification.actionUrl);
        onClose();
      } else {
        window.location.href = notification.actionUrl;
      }
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case "URGENT":
        return "#f87171";
      case "HIGH":
        return "#fbbf24";
      case "MEDIUM":
        return "#818cf8";
      default:
        return "transparent";
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: "380px",
        maxHeight: "500px",
        background: "var(--bg-card, #131722)",
        border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
        borderRadius: "10px",
        boxShadow: "0 15px 35px rgba(0, 0, 0, 0.5)",
        display: "flex",
        flexDirection: "column",
        zIndex: 900,
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          padding: "0.85rem 1rem",
          borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-elevated, #1a202c)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary, #fff)" }}>
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: "0.7rem",
                padding: "0.1rem 0.45rem",
                borderRadius: "10px",
                background: "var(--brand-cyan, #06b6d4)",
                color: "#0f172a",
                fontWeight: 700,
              }}
            >
              {unreadCount}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              title="Mark all as read"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "0.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.75rem",
              }}
            >
              <CheckCheck size={14} />
              <span>Mark read</span>
            </button>
          )}

          <button
            onClick={() => {
              onClose();
              onOpenPreferences();
            }}
            title="Notification Settings"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: "380px" }}>
        {loading && notifications.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted, #94a3b8)", fontSize: "0.85rem" }}>
            Loading notifications...
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              padding: "3rem 1rem",
              textAlign: "center",
              color: "var(--text-muted, #94a3b8)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <Inbox size={32} color="var(--text-muted, #64748b)" />
            <div style={{ fontSize: "0.85rem", fontWeight: 500 }}>No notifications yet</div>
            <div style={{ fontSize: "0.75rem" }}>You'll see activity updates here</div>
          </div>
        ) : (
          notifications.slice(0, 8).map((n) => {
            const isUnread = !n.isRead;
            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                style={{
                  padding: "0.75rem 1rem",
                  borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))",
                  background: isUnread ? "rgba(6, 182, 212, 0.04)" : "transparent",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.65rem",
                  cursor: n.actionUrl ? "pointer" : "default",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = isUnread
                    ? "rgba(6, 182, 212, 0.08)"
                    : "rgba(255, 255, 255, 0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isUnread ? "rgba(6, 182, 212, 0.04)" : "transparent";
                }}
              >
                <div
                  style={{
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: isUnread ? "var(--brand-cyan, #06b6d4)" : "transparent",
                    marginTop: "0.35rem",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontWeight: isUnread ? 600 : 500,
                        fontSize: "0.85rem",
                        color: "var(--text-primary, #fff)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {n.title}
                    </span>
                    {n.priority === "URGENT" || n.priority === "HIGH" ? (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: getPriorityColor(n.priority),
                          flexShrink: 0,
                        }}
                      >
                        {n.priority}
                      </span>
                    ) : null}
                  </div>
                  <p
                    style={{
                      margin: "0.2rem 0 0 0",
                      fontSize: "0.75rem",
                      color: "var(--text-secondary, #94a3b8)",
                      lineHeight: 1.35,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.message}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-muted, #64748b)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <Clock size={10} />
                      {new Date(n.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {isUnread && (
                      <button
                        onClick={(e) => onMarkRead(n.id, e)}
                        title="Mark as read"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted, #64748b)",
                          cursor: "pointer",
                          padding: "0.15rem",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <Check size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "0.65rem 1rem",
          borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
          background: "var(--bg-elevated, #1a202c)",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => {
            onClose();
            onOpenCenter();
          }}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--brand-cyan, #06b6d4)",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          <Maximize2 size={13} />
          <span>View All in Notification Center</span>
        </button>
      </div>
    </div>
  );
};
