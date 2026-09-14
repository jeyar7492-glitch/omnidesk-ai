import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "../../api/client";
import {
  NotificationSummary,
  NotificationType,
  NotificationPriority,
} from "@omnidesk/shared-types";
import {
  X,
  Bell,
  Check,
  CheckCheck,
  Archive,
  Search,
  ExternalLink,
  Inbox,
  Clock,
  ChevronLeft,
  ChevronRight,
  Settings,
} from "lucide-react";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreferences?: () => void;
  onNavigate?: (url: string) => void;
  onNotificationChanged?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onOpenPreferences,
  onNavigate,
  onNotificationChanged,
}) => {
  const [notifications, setNotifications] = useState<NotificationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "tasks" | "crm" | "finance" | "documents" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");

  const fetchNotifications = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    try {
      let unreadOnly: boolean | undefined = undefined;
      let includeArchived: boolean | undefined = false;
      let type: NotificationType | undefined = undefined;

      if (activeTab === "unread") {
        unreadOnly = true;
      } else if (activeTab === "archived") {
        includeArchived = true;
      }

      const res = await apiClient.listNotifications({
        page,
        limit: 15,
        unreadOnly,
        includeArchived,
        type,
        priority: priorityFilter ? (priorityFilter as NotificationPriority) : undefined,
        search: searchQuery.trim() || undefined,
      });

      // Filter locally for tab categories if not backend type
      let items = res.notifications;
      if (activeTab === "tasks") {
        items = items.filter((n) => n.type.startsWith("TASK_") || n.type.startsWith("PROJECT_"));
      } else if (activeTab === "crm") {
        items = items.filter((n) => n.type.startsWith("LEAD_") || n.type.startsWith("DEAL_") || n.type.startsWith("CRM_"));
      } else if (activeTab === "finance") {
        items = items.filter((n) => n.type.startsWith("INVOICE_") || n.type.startsWith("PAYMENT_") || n.type.startsWith("EXPENSE_"));
      } else if (activeTab === "documents") {
        items = items.filter((n) => n.type.startsWith("DOCUMENT_") || n.type.startsWith("KNOWLEDGE_"));
      }

      setNotifications(items);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, [isOpen, page, activeTab, priorityFilter, searchQuery]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      if (onNotificationChanged) onNotificationChanged();
    } catch (err: any) {
      console.error("Mark read failed:", err);
    }
  };

  const handleMarkUnread = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiClient.markNotificationUnread(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false, readAt: null } : n))
      );
      if (onNotificationChanged) onNotificationChanged();
    } catch (err: any) {
      console.error("Mark unread failed:", err);
    }
  };

  const handleArchive = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiClient.archiveNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (onNotificationChanged) onNotificationChanged();
    } catch (err: any) {
      console.error("Archive failed:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      if (onNotificationChanged) onNotificationChanged();
    } catch (err: any) {
      console.error("Mark all read failed:", err);
    }
  };

  const handleItemClick = (notification: NotificationSummary) => {
    if (!notification.isRead) {
      handleMarkRead(notification.id);
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

  const getPriorityBadge = (priority: NotificationPriority) => {
    switch (priority) {
      case "URGENT":
        return <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(239, 68, 68, 0.2)", color: "#f87171", fontWeight: 600 }}>URGENT</span>;
      case "HIGH":
        return <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(245, 158, 11, 0.2)", color: "#fbbf24", fontWeight: 600 }}>HIGH</span>;
      case "MEDIUM":
        return <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(99, 102, 241, 0.2)", color: "#818cf8", fontWeight: 600 }}>MED</span>;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card, #131722)",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "800px",
          height: "85vh",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(6, 182, 212, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={18} color="var(--brand-cyan, #06b6d4)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                Notification Center
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>
                {total} total notifications in this workspace
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {onOpenPreferences && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPreferences();
                }}
                title="Notification Preferences"
                style={{
                  padding: "0.4rem 0.6rem",
                  borderRadius: "6px",
                  background: "var(--bg-elevated, #1a202c)",
                  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                  color: "var(--text-secondary, #cbd5e1)",
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                }}
              >
                <Settings size={14} />
                <span>Preferences</span>
              </button>
            )}
            <button
              onClick={handleMarkAllRead}
              title="Mark all as read"
              style={{
                padding: "0.4rem 0.6rem",
                borderRadius: "6px",
                background: "var(--bg-elevated, #1a202c)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                color: "var(--text-secondary, #cbd5e1)",
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <CheckCheck size={14} />
              <span>Mark all read</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "0.25rem",
                marginLeft: "0.5rem",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter bar & Tabs */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            background: "var(--bg-elevated, #1a202c)",
          }}
        >
          {/* Tabs */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {[
              { id: "all", label: "All" },
              { id: "unread", label: "Unread" },
              { id: "tasks", label: "Tasks" },
              { id: "crm", label: "CRM" },
              { id: "finance", label: "Finance" },
              { id: "documents", label: "Docs" },
              { id: "archived", label: "Archived" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setPage(1);
                }}
                style={{
                  padding: "0.3rem 0.65rem",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  background: activeTab === tab.id ? "var(--brand-cyan, #06b6d4)" : "transparent",
                  color: activeTab === tab.id ? "#0f172a" : "var(--text-secondary, #cbd5e1)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Priority */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "var(--bg-card, #131722)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
              }}
            >
              <Search size={13} color="var(--text-muted, #94a3b8)" />
              <input
                type="text"
                placeholder="Filter notifications..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary, #fff)",
                  fontSize: "0.8rem",
                  width: "140px",
                }}
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              style={{
                background: "var(--bg-card, #131722)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                borderRadius: "6px",
                padding: "0.25rem 0.5rem",
                color: "var(--text-secondary, #cbd5e1)",
                fontSize: "0.8rem",
              }}
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted, #94a3b8)" }}>
              Loading notifications...
            </div>
          ) : error ? (
            <div
              style={{
                padding: "1rem",
                borderRadius: "8px",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#fca5a5",
                fontSize: "0.85rem",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1rem",
                color: "var(--text-muted, #94a3b8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <Inbox size={40} strokeWidth={1.5} color="var(--text-muted, #64748b)" />
              <div style={{ fontSize: "1rem", fontWeight: 500 }}>No notifications found</div>
              <div style={{ fontSize: "0.8rem" }}>
                {activeTab === "unread" ? "You're all caught up! No unread notifications." : "There are no notifications matching your filter."}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {notifications.map((n) => {
                const isUnread = !n.isRead;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "8px",
                      background: isUnread ? "rgba(6, 182, 212, 0.05)" : "var(--bg-elevated, #1a202c)",
                      border: isUnread
                        ? "1px solid rgba(6, 182, 212, 0.25)"
                        : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.05))",
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      cursor: n.actionUrl ? "pointer" : "default",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1 }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: isUnread ? "var(--brand-cyan, #06b6d4)" : "transparent",
                          marginTop: "0.45rem",
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <span style={{ fontWeight: isUnread ? 600 : 500, fontSize: "0.9rem", color: "var(--text-primary, #fff)" }}>
                            {n.title}
                          </span>
                          {getPriorityBadge(n.priority)}
                          <span
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-muted, #94a3b8)",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.2rem",
                            }}
                          >
                            <Clock size={11} />
                            {new Date(n.createdAt).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary, #cbd5e1)", lineHeight: 1.4 }}>
                          {n.message}
                        </p>
                        {n.actionUrl && (
                          <div
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              fontSize: "0.75rem",
                              color: "var(--brand-cyan, #06b6d4)",
                              marginTop: "0.4rem",
                            }}
                          >
                            <span>Open details</span>
                            <ExternalLink size={11} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        marginLeft: "1rem",
                        flexShrink: 0,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isUnread ? (
                        <button
                          onClick={(e) => handleMarkRead(n.id, e)}
                          title="Mark as read"
                          style={{
                            padding: "0.3rem",
                            background: "transparent",
                            border: "none",
                            borderRadius: "4px",
                            color: "var(--text-muted, #94a3b8)",
                            cursor: "pointer",
                          }}
                        >
                          <Check size={15} />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleMarkUnread(n.id, e)}
                          title="Mark as unread"
                          style={{
                            padding: "0.3rem",
                            background: "transparent",
                            border: "none",
                            borderRadius: "4px",
                            color: "var(--text-muted, #94a3b8)",
                            cursor: "pointer",
                          }}
                        >
                          <Bell size={14} />
                        </button>
                      )}
                      {!n.isArchived && (
                        <button
                          onClick={(e) => handleArchive(n.id, e)}
                          title="Archive"
                          style={{
                            padding: "0.3rem",
                            background: "transparent",
                            border: "none",
                            borderRadius: "4px",
                            color: "var(--text-muted, #94a3b8)",
                            cursor: "pointer",
                          }}
                        >
                          <Archive size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with Pagination */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-elevated, #1a202c)",
          }}
        >
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>
            Page {page} of {totalPages} ({total} items)
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "0.3rem 0.5rem",
                borderRadius: "4px",
                background: "var(--bg-card, #131722)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                color: "var(--text-secondary, #cbd5e1)",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "0.3rem 0.5rem",
                borderRadius: "4px",
                background: "var(--bg-card, #131722)",
                border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
                color: "var(--text-secondary, #cbd5e1)",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
