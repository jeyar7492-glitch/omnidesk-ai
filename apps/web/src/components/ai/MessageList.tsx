import React from "react";
import { ChatMessage } from "../../hooks/useAIExecution";
import { ToolCard } from "./ToolCard";
import { ApprovalCard } from "./ApprovalCard";
import { User, Bot, Clock, AlertCircle } from "lucide-react";

interface MessageListProps {
  messages: ChatMessage[];
  safeStatus: string | null;
  isExecuting: boolean;
  onApprove: (approvalId: string, reason?: string) => Promise<void>;
  onReject: (approvalId: string, reason?: string) => Promise<void>;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  safeStatus,
  isExecuting,
  onApprove,
  onReject,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", padding: "1rem 0" }}>
      {messages.map((msg) => {
        const isUser = msg.role === "user";

        return (
          <div
            key={msg.id}
            style={{
              display: "flex",
              gap: "0.85rem",
              alignSelf: isUser ? "flex-end" : "flex-start",
              maxWidth: isUser ? "75%" : "88%",
            }}
            className="animate-fade-in"
          >
            {/* Avatar */}
            {!isUser && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-indigo))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 0 10px rgba(6, 182, 212, 0.25)",
                }}
              >
                <Bot size={18} color="#ffffff" />
              </div>
            )}

            <div style={{ flex: 1 }}>
              <div
                style={{
                  padding: "0.85rem 1.1rem",
                  borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: isUser
                    ? "linear-gradient(135deg, #1e3a8a, #2563eb)"
                    : "var(--bg-card)",
                  border: isUser ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid var(--border-subtle)",
                  color: "var(--text-primary)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Content */}
                {msg.content ? (
                  <div style={{ fontSize: "0.9rem", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                    {msg.content}
                  </div>
                ) : (
                  msg.safeProgress && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        color: "var(--brand-cyan)",
                        fontSize: "0.85rem",
                        fontStyle: "italic",
                      }}
                    >
                      <Clock size={14} className="pulse-animation" />
                      <span>{msg.safeProgress}</span>
                    </div>
                  )
                )}

                {/* Error Banner */}
                {msg.error && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "var(--status-danger)",
                      fontSize: "0.85rem",
                      marginTop: "0.5rem",
                      padding: "0.5rem",
                      background: "rgba(239, 68, 68, 0.1)",
                      borderRadius: "6px",
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{msg.error}</span>
                  </div>
                )}
              </div>

              {/* Tool Execution Cards */}
              {msg.steps && msg.steps.length > 0 && (
                <div style={{ marginTop: "0.5rem" }}>
                  {msg.steps.map((step, idx) => (
                    <ToolCard key={`step_${msg.id}_${idx}`} step={step} />
                  ))}
                </div>
              )}

              {/* Human Approval Card */}
              {msg.approvalRequest && (
                <ApprovalCard
                  approvalId={msg.approvalRequest.id}
                  actionName={msg.approvalRequest.actionName}
                  riskLevel={msg.approvalRequest.riskLevel}
                  params={msg.approvalRequest.params}
                  reason={msg.approvalRequest.reason}
                  status={msg.approvalRequest.status}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              )}

              <div
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  marginTop: "0.25rem",
                  textAlign: isUser ? "right" : "left",
                }}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* User Avatar */}
            {isUser && (
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <User size={16} color="var(--text-secondary)" />
              </div>
            )}
          </div>
        );
      })}

      {/* Global Live Safe Status */}
      {isExecuting && safeStatus && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "rgba(6, 182, 212, 0.08)",
            border: "1px solid rgba(6, 182, 212, 0.25)",
            padding: "0.4rem 0.85rem",
            borderRadius: "9999px",
            color: "var(--brand-cyan)",
            fontSize: "0.8rem",
            fontWeight: 500,
            alignSelf: "flex-start",
          }}
          className="animate-fade-in"
        >
          <Clock size={13} className="pulse-animation" />
          <span>{safeStatus}</span>
        </div>
      )}
    </div>
  );
};
