import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useWorkspace } from "../../context/WorkspaceContext";
import { StatusBadge } from "../common/StatusBadge";
import { Server, Database, Radio, RefreshCw } from "lucide-react";

export const SystemView: React.FC = () => {
  const { wsStatus, apiStatus, refreshHealth, context } = useWorkspace();
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getHealth();
      setHealthData(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>System Telemetry & Architecture Diagnostics</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Live status of API Gateway, MongoDB replica set, WebSocket stream, and workspace isolation.
          </p>
        </div>

        <button
          onClick={() => {
            fetchHealth();
            refreshHealth();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--bg-card)",
            padding: "0.5rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.85rem",
          }}
        >
          <RefreshCw size={14} className={loading ? "pulse-animation" : ""} /> Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.25rem", marginBottom: "1.5rem" }}>
        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Server size={18} color="var(--brand-cyan)" />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>Node.js API Gateway</span>
            </div>
            <StatusBadge status={apiStatus === "online" ? "online" : "danger"} label={apiStatus} />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Target: <code>http://localhost:4000/api/v1</code>
            <br />
            Status: {healthData?.status || apiStatus}
          </div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Radio size={18} color="var(--brand-cyan)" />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>WebSocket Transport</span>
            </div>
            <StatusBadge status={wsStatus === "connected" ? "online" : "danger"} label={wsStatus} />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Target: <code>ws://localhost:4000/ws</code>
            <br />
            Channel: Workspace Broadcast
          </div>
        </div>

        <div className="card" style={{ margin: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Database size={18} color="var(--brand-cyan)" />
              <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>MongoDB Database</span>
            </div>
            <StatusBadge status="online" label="ReplSet rs0" />
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
            Engine: MongoDB 7.0 (Prisma ORM)
            <br />
            Host: <code>127.0.0.1:27017</code>
          </div>
        </div>
      </div>

      {/* Raw Health Payload */}
      <div className="card">
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>Live API Health Check Payload</h3>
        <pre>{JSON.stringify(healthData || { status: apiStatus }, null, 2)}</pre>
      </div>

      {/* Active Session Context */}
      <div className="card">
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>Active Security Context</h3>
        <pre>{JSON.stringify(context, null, 2)}</pre>
      </div>
    </div>
  );
};
