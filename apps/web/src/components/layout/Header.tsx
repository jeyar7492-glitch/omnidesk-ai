import React from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusBadge } from "../common/StatusBadge";
import { RefreshCw, ShieldCheck, LogOut, User } from "lucide-react";

export const Header: React.FC<{ activeTabTitle: string }> = ({ activeTabTitle }) => {
  const { wsStatus, apiStatus, refreshHealth, context, user, logout } = useWorkspace();

  return (
    <header className="top-header">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
          {activeTabTitle}
        </h2>
        <span
          style={{
            fontSize: "0.75rem",
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            padding: "0.2rem 0.5rem",
            borderRadius: "4px",
            fontFamily: "var(--font-mono)",
          }}
        >
          ws: {context.workspaceId.slice(0, 8)}...
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        {/* Realtime WebSocket Badge */}
        <StatusBadge
          status={wsStatus === "connected" ? "online" : wsStatus === "connecting" ? "pending" : "danger"}
          label={wsStatus === "connected" ? "Realtime WS" : wsStatus === "connecting" ? "WS Connecting" : "WS Offline"}
        />

        {/* API Backend Health Badge */}
        <StatusBadge
          status={apiStatus === "online" ? "online" : apiStatus === "checking" ? "pending" : "danger"}
          label={apiStatus === "online" ? "API Online" : apiStatus === "checking" ? "Checking" : "API Offline"}
        />

        {/* User Role Badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--bg-elevated)",
            padding: "0.3rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <ShieldCheck size={14} color="var(--brand-cyan)" />
          <span>{context.userRole}</span>
        </div>

        {/* User Profile Pill */}
        {user && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--bg-card)",
              padding: "0.25rem 0.65rem",
              borderRadius: "20px",
              border: "1px solid var(--border-subtle)",
              fontSize: "0.8rem",
            }}
          >
            <div
              style={{
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "var(--brand-indigo)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={12} color="#ffffff" />
            </div>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {user.firstName} {user.lastName}
            </span>
          </div>
        )}

        {/* Refresh Health Button */}
        <button
          onClick={refreshHealth}
          title="Refresh Backend Status"
          style={{
            padding: "0.4rem",
            background: "var(--bg-elevated)",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw size={14} />
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign Out"
          style={{
            padding: "0.4rem 0.65rem",
            background: "rgba(239, 68, 68, 0.1)",
            borderRadius: "6px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            cursor: "pointer",
            color: "#fca5a5",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
