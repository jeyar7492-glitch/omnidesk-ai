import React, { useState, useEffect, useRef, useCallback } from "react";
import { apiClient } from "../../api/client";
import { wsClient } from "../../api/websocket";
import { NotificationSummary } from "@omnidesk/shared-types";
import { Bell } from "lucide-react";
import { NotificationDropdown } from "./NotificationDropdown";
import { NotificationCenterModal } from "./NotificationCenterModal";
import { NotificationPreferencesModal } from "./NotificationPreferencesModal";

interface NotificationBellProps {
  onNavigate?: (url: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationSummary[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isCenterOpen, setIsCenterOpen] = useState<boolean>(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient.getUnreadNotificationCount();
      setUnreadCount(res.unreadCount);
    } catch {
      // Graceful silence on network check
    }
  }, []);

  const fetchRecentNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.listNotifications({ page: 1, limit: 10 });
      setRecentNotifications(res.notifications);
    } catch {
      // Graceful silence
    } finally {
      setLoading(false);
    }
  }, []);

  // Click away listener for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Initial load
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Subscribe to realtime WebSocket notification events
  useEffect(() => {
    const handleNotificationCreated = (event: any) => {
      const payload = event.data || event.payload;
      if (payload) {
        setUnreadCount((prev) => prev + 1);
        setRecentNotifications((prev) => {
          const exists = prev.some((n) => n.id === payload.id);
          if (exists) return prev;
          return [payload, ...prev].slice(0, 10);
        });
      }
    };

    const handleNotificationRead = (event: any) => {
      const payload = event.data || event.payload;
      if (payload?.id) {
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === payload.id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    };

    const handleNotificationUnread = (event: any) => {
      const payload = event.data || event.payload;
      if (payload?.id) {
        setRecentNotifications((prev) =>
          prev.map((n) => (n.id === payload.id ? { ...n, isRead: false, readAt: null } : n))
        );
        setUnreadCount((prev) => prev + 1);
      }
    };

    const unsubCreated = wsClient.subscribe("notification.created", handleNotificationCreated);
    const unsubRead = wsClient.subscribe("notification.read", handleNotificationRead);
    const unsubUnread = wsClient.subscribe("notification.unread", handleNotificationUnread);

    return () => {
      unsubCreated();
      unsubRead();
      unsubUnread();
    };
  }, []);

  const toggleDropdown = () => {
    if (!isDropdownOpen) {
      fetchRecentNotifications();
      fetchUnreadCount();
    }
    setIsDropdownOpen((prev) => !prev);
  };

  const handleMarkRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await apiClient.markNotificationRead(id);
      setRecentNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      console.error("Failed to mark read:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setRecentNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err: any) {
      console.error("Failed to mark all read:", err);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Bell Trigger Button */}
      <button
        onClick={toggleDropdown}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        style={{
          position: "relative",
          padding: "0.45rem",
          background: isDropdownOpen ? "rgba(6, 182, 212, 0.15)" : "var(--bg-elevated, #1a202c)",
          borderRadius: "8px",
          border: isDropdownOpen
            ? "1px solid var(--brand-cyan, #06b6d4)"
            : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: isDropdownOpen ? "var(--brand-cyan, #06b6d4)" : "var(--text-secondary, #cbd5e1)",
          transition: "all 0.15s ease",
        }}
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              minWidth: "16px",
              height: "16px",
              padding: "0 4px",
              borderRadius: "8px",
              background: "#ef4444",
              color: "#ffffff",
              fontSize: "0.65rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
              lineHeight: 1,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-down Dropdown */}
      <NotificationDropdown
        isOpen={isDropdownOpen}
        notifications={recentNotifications}
        unreadCount={unreadCount}
        loading={loading}
        onClose={() => setIsDropdownOpen(false)}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onOpenCenter={() => setIsCenterOpen(true)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onNavigate={onNavigate}
      />

      {/* Full Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isCenterOpen}
        onClose={() => setIsCenterOpen(false)}
        onOpenPreferences={() => setIsPreferencesOpen(true)}
        onNavigate={onNavigate}
        onNotificationChanged={() => {
          fetchUnreadCount();
          fetchRecentNotifications();
        }}
      />

      {/* Preferences Modal */}
      <NotificationPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />
    </div>
  );
};
