import React, { useEffect, useState, useCallback } from "react";

interface HealthData {
  status: string;
  service?: string;
  version?: string;
  environment?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export function App(): React.ReactElement {
  const [apiStatus, setApiStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [wsStatus, setWsStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [lastChecked, setLastChecked] = useState<string>("");

  const checkHealth = useCallback(async () => {
    setApiStatus("checking");
    const start = performance.now();
    try {
      const response = await fetch("/api/v1/health");
      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as HealthData;
      setHealthData(data);
      setApiStatus("connected");
      setErrorMessage(null);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err: unknown) {
      setApiStatus("disconnected");
      setHealthData(null);
      setErrorMessage(err instanceof Error ? err.message : "Failed to reach API");
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  // WebSocket Foundation Check
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setWsStatus("connected");
      socket.onerror = () => setWsStatus("disconnected");
      socket.onclose = () => setWsStatus("disconnected");
    } catch {
      setWsStatus("disconnected");
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, []);

  return (
    <div className="container">
      {/* Header */}
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
              OmniDesk AI
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
              Phase 1: Scratch-to-Production Monorepo Foundation & System Initialization
            </p>
          </div>
          <button onClick={checkHealth} style={{ fontSize: "0.85rem" }}>
            ↻ Refresh Health
          </button>
        </div>
      </header>

      {/* Verification Cards */}
      <div className="grid-cols-2">
        {/* Frontend Status */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
              Frontend Runtime
            </span>
            <span className="status-badge online">
              <span className="pulse-dot"></span> Online
            </span>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>React 18 + Vite + TypeScript</div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              SPA Gateway running on http://localhost:5173
            </div>
          </div>
        </div>

        {/* API Status */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
              API Gateway Status
            </span>
            <span
              className={`status-badge ${
                apiStatus === "connected"
                  ? "online"
                  : apiStatus === "checking"
                  ? "pending"
                  : "offline"
              }`}
            >
              <span className="pulse-dot"></span>{" "}
              {apiStatus === "connected"
                ? "Connected"
                : apiStatus === "checking"
                ? "Checking..."
                : "Disconnected"}
            </span>
          </div>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>
              Node.js + Express + TypeScript
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
              Target: GET /api/v1/health {latencyMs !== null ? `(${latencyMs}ms latency)` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* WebSocket & Architecture Details */}
      <div className="grid-cols-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
              WebSocket Gateway
            </span>
            <span
              className={`status-badge ${
                wsStatus === "connected" ? "online" : wsStatus === "checking" ? "pending" : "offline"
              }`}
            >
              <span className="pulse-dot"></span>{" "}
              {wsStatus === "connected"
                ? "Connected"
                : wsStatus === "checking"
                ? "Connecting..."
                : "Disconnected"}
            </span>
          </div>
          <div style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Real-time event transport channel: /ws
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", fontWeight: 500 }}>
              Legacy Decommission
            </span>
            <span className="status-badge online">
              <span className="pulse-dot"></span> Complete
            </span>
          </div>
          <div style={{ marginTop: "0.75rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Old PHP/MariaDB/Python runtime removed from active tree
          </div>
        </div>
      </div>

      {/* Live API Health Payload */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Live Backend Health Response</h3>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontFamily: "var(--font-mono)" }}>
            Last polled: {lastChecked || "Never"}
          </span>
        </div>

        {apiStatus === "connected" && healthData ? (
          <pre>{JSON.stringify(healthData, null, 2)}</pre>
        ) : apiStatus === "checking" ? (
          <div style={{ color: "var(--text-muted)", padding: "1rem 0" }}>Querying API health endpoint...</div>
        ) : (
          <div style={{ color: "var(--accent-red)", padding: "1rem 0" }}>
            <strong>Connection Failed:</strong> {errorMessage}
          </div>
        )}
      </div>

      {/* Monorepo Package Verification Summary */}
      <div className="card">
        <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Monorepo Architecture Structure
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>apps/web</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>React 18 + Vite (SPA)</div>
          </div>
          <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>apps/api</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Express + TypeScript</div>
          </div>
          <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>packages/shared-types</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Domain DTOs & Contracts</div>
          </div>
          <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>packages/validation</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Zod Runtime Schemas</div>
          </div>
          <div style={{ padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "6px" }}>
            <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>packages/config</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Shared Constants</div>
          </div>
        </div>
      </div>
    </div>
  );
}
