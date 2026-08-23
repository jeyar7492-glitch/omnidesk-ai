import React, { useState } from "react";
import { Check, X, ShieldAlert } from "lucide-react";

interface ApprovalCardProps {
  approvalId: string;
  actionName: string;
  riskLevel: string;
  params?: any;
  reason?: string;
  status: string;
  onApprove: (approvalId: string, reason?: string) => Promise<void>;
  onReject: (approvalId: string, reason?: string) => Promise<void>;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  approvalId,
  actionName,
  riskLevel,
  params,
  reason,
  status,
  onApprove,
  onReject,
}) => {
  const [deciding, setDeciding] = useState(false);
  const [operatorNote, setOperatorNote] = useState("");

  const handleApprove = async () => {
    setDeciding(true);
    await onApprove(approvalId, operatorNote || "Approved by workspace operator");
    setDeciding(false);
  };

  const handleReject = async () => {
    setDeciding(true);
    await onReject(approvalId, operatorNote || "Rejected by workspace operator");
    setDeciding(false);
  };

  const isPending = status === "PENDING" || status === "WAITING_APPROVAL";

  return (
    <div
      style={{
        margin: "0.85rem 0",
        background: "rgba(245, 158, 11, 0.06)",
        border: "1px solid rgba(245, 158, 11, 0.4)",
        borderRadius: "10px",
        padding: "1rem 1.25rem",
        boxShadow: "0 0 20px rgba(245, 158, 11, 0.1)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              padding: "0.35rem",
              background: "rgba(245, 158, 11, 0.2)",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ShieldAlert size={16} color="var(--status-warning)" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#fde68a" }}>
              Human Authorization Required
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Enterprise Governance Gate — Approval #{approvalId.slice(0, 8)}
            </div>
          </div>
        </div>

        <span
          style={{
            padding: "0.2rem 0.6rem",
            borderRadius: "4px",
            background: riskLevel === "CRITICAL" ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)",
            color: riskLevel === "CRITICAL" ? "#fca5a5" : "#fcd34d",
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "var(--font-mono)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
          }}
        >
          {riskLevel} RISK
        </span>
      </div>

      <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.4 }}>
        <strong>Action:</strong> <code style={{ color: "var(--brand-cyan)", fontFamily: "var(--font-mono)" }}>{actionName}</code>
        <p style={{ marginTop: "0.25rem" }}>{reason || "This operation modifies persistent records and requires confirmation."}</p>
      </div>

      {params && (
        <pre
          style={{
            marginBottom: "0.85rem",
            padding: "0.5rem 0.75rem",
            background: "#0c0e15",
            fontSize: "0.75rem",
            maxHeight: "120px",
            overflowY: "auto",
          }}
        >
          {JSON.stringify(params, null, 2)}
        </pre>
      )}

      {isPending ? (
        <div>
          <input
            type="text"
            placeholder="Optional operator authorization note..."
            value={operatorNote}
            onChange={(e) => setOperatorNote(e.target.value)}
            disabled={deciding}
            style={{
              width: "100%",
              padding: "0.45rem 0.75rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              fontSize: "0.8rem",
              marginBottom: "0.75rem",
            }}
          />

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              onClick={handleApprove}
              disabled={deciding}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                background: "linear-gradient(135deg, #059669, #10b981)",
                color: "#ffffff",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
              }}
            >
              <Check size={14} /> {deciding ? "Authorizing..." : "Approve Action"}
            </button>

            <button
              onClick={handleReject}
              disabled={deciding}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#f87171",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                fontWeight: 600,
                fontSize: "0.85rem",
              }}
            >
              <X size={14} /> {deciding ? "Rejecting..." : "Reject Action"}
            </button>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: "0.5rem",
            borderRadius: "6px",
            background: status === "APPROVED" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
            color: status === "APPROVED" ? "#34d399" : "#f87171",
            fontWeight: 600,
            fontSize: "0.8rem",
            textAlign: "center",
          }}
        >
          Decision recorded: {status}
        </div>
      )}
    </div>
  );
};
