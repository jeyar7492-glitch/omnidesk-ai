import React from "react";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusBadge } from "../common/StatusBadge";
import { RefreshCw, ShieldCheck } from "lucide-react";

export const Header: React.FC<{ activeTabTitle: string }> = ({ activeTabTitle }) => {
  const { wsStatus, apiStatus, refreshHealth, context } = useWorkspace();

  return (
    <header className="top-header">
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-0.01em" }}>
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
          workspace: {context.workspaceId.slice(0, 8)}...
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
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
          }}
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </header>
  );
};
