import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { AIExecutionSummary } from "@omnidesk/shared-types";
import { History, X, RefreshCw } from "lucide-react";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExecution?: (executionId: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, onSelectExecution }) => {
  const [executions, setExecutions] = useState<AIExecutionSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAIExecutions();
      setExecutions(Array.isArray(data) ? data : (data as any).executions || (data as any).items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "380px",
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-elevated)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
      }}
      className="animate-fade-in"
    >
      {/* Drawer Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <History size={16} color="var(--brand-cyan)" />
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>AI Execution Audit Log</h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button onClick={fetchHistory} disabled={loading} style={{ padding: "0.3rem" }}>
            <RefreshCw size={14} className={loading ? "pulse-animation" : ""} />
          </button>
          <button onClick={onClose} style={{ padding: "0.3rem" }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Execution List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        {executions.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem 0", fontSize: "0.85rem" }}>
            {loading ? "Loading audit records..." : "No execution history found."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {executions.map((exec) => {
              const isSuccess = exec.status === "COMPLETED";
              const isWaiting = exec.status === "WAITING_APPROVAL";

              return (
                <div
                  key={exec.id}
                  onClick={() => onSelectExecution && onSelectExecution(exec.id)}
                  style={{
                    padding: "0.85rem",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    cursor: onSelectExecution ? "pointer" : "default",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontFamily: "var(--font-mono)",
                        color: "var(--brand-cyan)",
                        fontWeight: 600,
                      }}
                    >
                      #{exec.id.slice(0, 8)}
                    </span>
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        fontWeight: 700,
                        background: isSuccess
                          ? "rgba(16, 185, 129, 0.15)"
                          : isWaiting
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                        color: isSuccess ? "#34d399" : isWaiting ? "#fbbf24" : "#f87171",
                      }}
                    >
                      {exec.status}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: "0.82rem",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: "0.35rem",
                      lineHeight: 1.3,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {exec.prompt}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>Agent: {exec.agentId}</span>
                    <span>{new Date(exec.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
