import React, { useState } from "react";
import { AIExecutionStep } from "@omnidesk/shared-types";
import { CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Database } from "lucide-react";

export const ToolCard: React.FC<{ step: AIExecutionStep }> = ({ step }) => {
  const [expanded, setExpanded] = useState(false);
  const toolCall = step.toolCall;

  if (!toolCall) return null;

  const isSuccess = step.toolResult?.success !== false;
  const toolDisplayName = toolCall.toolId.replace(/_/g, " ").toUpperCase();

  return (
    <div
      style={{
        margin: "0.5rem 0",
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        overflow: "hidden",
        fontSize: "0.85rem",
      }}
    >
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "0.6rem 0.85rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          background: expanded ? "var(--bg-card-hover)" : "transparent",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              padding: "0.25rem",
              background: "rgba(59, 130, 246, 0.15)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Database size={13} color="var(--brand-blue)" />
          </div>
          <span style={{ fontWeight: 600, fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
            {toolDisplayName}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              fontFamily: "var(--font-mono)",
            }}
          >
            step {step.stepNumber}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {step.toolResult ? (
            isSuccess ? (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  color: "var(--status-online)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={13} /> Completed
              </span>
            ) : (
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  color: "var(--status-danger)",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
              >
                <XCircle size={13} /> Error
              </span>
            )
          ) : (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                color: "var(--status-warning)",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              <Clock size={13} className="pulse-animation" /> Executing
            </span>
          )}

          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: "0.75rem", borderTop: "1px solid var(--border-subtle)", background: "#0d0f17" }}>
          {/* Tool Arguments */}
          <div style={{ marginBottom: "0.5rem" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem", fontWeight: 600 }}>
              INPUT PARAMETERS
            </div>
            <pre style={{ margin: 0, padding: "0.5rem", fontSize: "0.75rem" }}>
              {JSON.stringify(toolCall.arguments || {}, null, 2)}
            </pre>
          </div>

          {/* Tool Result */}
          {step.toolResult && (
            <div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.2rem", fontWeight: 600 }}>
                MONGODB OUTPUT
              </div>
              <pre style={{ margin: 0, padding: "0.5rem", fontSize: "0.75rem", color: isSuccess ? "#86efac" : "#fca5a5" }}>
                {JSON.stringify(step.toolResult.result || step.toolResult.error || {}, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
