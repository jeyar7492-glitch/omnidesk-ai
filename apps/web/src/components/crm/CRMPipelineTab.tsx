import React, { useEffect, useState } from "react";
import { CRMDealSummary, DealDetail, PipelineSummary, DealStage } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Briefcase,
  RefreshCw,
  Building2,
  AlertTriangle,
  XCircle,
  X,
} from "lucide-react";
import { CRMActivityTimeline } from "./CRMActivityTimeline";

const PIPELINE_COLUMNS: DealStage[] = [
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

const ALLOWED_DEAL_TRANSITIONS: Record<DealStage, DealStage[]> = {
  QUALIFICATION: ["CONTACTED", "LOST"],
  CONTACTED: ["PROPOSAL", "LOST"],
  PROPOSAL: ["NEGOTIATION", "LOST"],
  NEGOTIATION: ["WON", "LOST"],
  WON: [],
  LOST: [],
};

interface CRMPipelineTabProps {
  onDealSelected?: (dealId: string) => void;
}

export const CRMPipelineTab: React.FC<CRMPipelineTabProps> = () => {
  const [pipelineSummary, setPipelineSummary] = useState<PipelineSummary | null>(null);
  const [deals, setDeals] = useState<CRMDealSummary[]>([]);
  const [staleDeals, setStaleDeals] = useState<CRMDealSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selected Deal Detail
  const [selectedDeal, setSelectedDeal] = useState<DealDetail | null>(null);

  const fetchPipelineData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, allDeals, stale] = await Promise.all([
        apiClient.getPipelineSummary().catch(() => null),
        apiClient.getDeals({ limit: 150 }).catch(() => []),
        apiClient.getStaleDeals().catch(() => []),
      ]);
      setPipelineSummary(summary);
      setDeals(allDeals);
      setStaleDeals(stale);
    } catch (err: any) {
      setError(err.message || "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  const openDealDetail = async (id: string) => {
    try {
      const detail = await apiClient.getDeal(id);
      setSelectedDeal(detail);
    } catch (err: any) {
      alert(err.message || "Failed to load deal detail");
    }
  };

  const handleMoveDeal = async (deal: CRMDealSummary, targetStage: DealStage) => {
    const currentStage = deal.stage;
    const allowed = ALLOWED_DEAL_TRANSITIONS[currentStage] || [];
    if (!allowed.includes(targetStage)) {
      setError(`Invalid stage transition: cannot move deal from ${currentStage} to ${targetStage}`);
      return;
    }

    // Optimistic Update
    const previousDeals = [...deals];
    setDeals((prev) =>
      prev.map((d) => (d.id === deal.id ? { ...d, stage: targetStage } : d))
    );
    setError(null);

    try {
      await apiClient.moveDeal(deal.id, targetStage);
      // Re-fetch summary in background
      apiClient.getPipelineSummary().then((s) => setPipelineSummary(s)).catch(() => {});
    } catch (err: any) {
      // Rollback
      setDeals(previousDeals);
      setError(err.message || `Failed to move deal to ${targetStage}`);
    }
  };

  const getStageColor = (st: DealStage) => {
    switch (st) {
      case "WON":
        return "var(--status-online)";
      case "LOST":
        return "var(--status-danger)";
      case "NEGOTIATION":
        return "var(--brand-purple)";
      case "PROPOSAL":
        return "var(--brand-blue)";
      default:
        return "var(--brand-cyan)";
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Top Banner & Pipeline KPI Metrics */}
      {pipelineSummary && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Active Pipeline Value
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--brand-cyan)", marginTop: "0.25rem" }}>
              {formatCurrency(pipelineSummary.totalActivePipelineValue)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {pipelineSummary.totalDeals} opportunities
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Weighted Projection
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--status-online)", marginTop: "0.25rem" }}>
              {formatCurrency(pipelineSummary.totalWeightedPipelineValue)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Probability adjusted
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Won Revenue
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--brand-purple)", marginTop: "0.25rem" }}>
              {formatCurrency(pipelineSummary.totalWonValue)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Closed opportunities
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
              Stale Deals (&gt;14d)
            </div>
            <div
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: staleDeals.length > 0 ? "var(--status-warning)" : "var(--text-muted)",
                marginTop: "0.25rem",
              }}
            >
              {staleDeals.length}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Needs immediate action
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Visual Deal Pipeline Kanban
        </h3>

        <button
          onClick={fetchPipelineData}
          disabled={loading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--bg-card)",
            padding: "0.45rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw size={13} className={loading ? "pulse-animation" : ""} /> Refresh Pipeline
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--status-danger)",
            color: "#fca5a5",
            fontSize: "0.85rem",
          }}
        >
          {error}
        </div>
      )}

      {/* 6-Column Kanban Board */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(260px, 1fr))",
          gap: "0.85rem",
          overflowX: "auto",
          paddingBottom: "1rem",
        }}
      >
        {PIPELINE_COLUMNS.map((stage) => {
          const columnDeals = deals.filter((d) => d.stage === stage);
          const totalColValue = columnDeals.reduce((sum, d) => sum + d.dealValue, 0);
          const color = getStageColor(stage);

          return (
            <div
              key={stage}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                display: "flex",
                flexDirection: "column",
                minHeight: "580px",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  padding: "0.85rem 1rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderTop: `3px solid ${color}`,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color }}>{stage}</div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                    {formatCurrency(totalColValue)}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: "var(--bg-secondary)",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "4px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {columnDeals.length}
                </span>
              </div>

              {/* Cards Container */}
              <div
                style={{
                  padding: "0.75rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.65rem",
                  flex: 1,
                  overflowY: "auto",
                }}
              >
                {columnDeals.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      color: "var(--text-muted)",
                      fontSize: "0.78rem",
                      padding: "2rem 0",
                    }}
                  >
                    No deals in {stage}
                  </div>
                ) : (
                  columnDeals.map((deal) => {
                    const isStale = staleDeals.some((s) => s.id === deal.id);
                    const allowedTransitions = ALLOWED_DEAL_TRANSITIONS[deal.stage] || [];
                    const nextStage = allowedTransitions.find((s) => s !== "LOST");

                    return (
                      <div
                        key={deal.id}
                        style={{
                          background: "var(--bg-secondary)",
                          border: isStale ? "1px solid var(--status-warning)" : "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          padding: "0.85rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <button
                            onClick={() => openDealDetail(deal.id)}
                            style={{
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              color: "var(--text-primary)",
                              textAlign: "left",
                              flex: 1,
                            }}
                          >
                            {deal.title}
                          </button>
                          {isStale && (
                            <span
                              title="Stale deal: No updates >14 days"
                              style={{ color: "var(--status-warning)", display: "flex", alignItems: "center" }}
                            >
                              <AlertTriangle size={14} />
                            </span>
                          )}
                        </div>

                        {deal.customerName && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                            <Building2 size={12} style={{ color: "var(--text-muted)" }} />
                            {deal.customerName}
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.2rem" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--brand-cyan)" }}>
                            ${deal.dealValue.toLocaleString()}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {deal.probability}% prob
                          </span>
                        </div>

                        {/* Transition Actions */}
                        {allowedTransitions.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              borderTop: "1px solid var(--border-subtle)",
                              paddingTop: "0.45rem",
                              marginTop: "0.25rem",
                            }}
                          >
                            {nextStage ? (
                              <button
                                onClick={() => handleMoveDeal(deal, nextStage)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  background: "var(--bg-card)",
                                  border: "1px solid var(--border-subtle)",
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "4px",
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: "var(--brand-cyan)",
                                }}
                              >
                                Advance &rarr; {nextStage}
                              </button>
                            ) : (
                              <span />
                            )}

                            {allowedTransitions.includes("LOST") && (
                              <button
                                onClick={() => handleMoveDeal(deal, "LOST")}
                                title="Mark deal as Lost"
                                style={{
                                  color: "var(--status-danger)",
                                  padding: "0.25rem",
                                  fontSize: "0.7rem",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.2rem",
                                }}
                              >
                                <XCircle size={12} /> Lost
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 90,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-medium)",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "var(--shadow-elevated)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Briefcase size={22} style={{ color: "var(--brand-cyan)" }} />
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{selectedDeal.title}</h3>
                </div>

                <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  <span>Stage: {selectedDeal.stage}</span>
                  <span style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
                    Value: ${selectedDeal.dealValue.toLocaleString()} ({selectedDeal.probability}%)
                  </span>
                  {selectedDeal.customer && <span>Account: {selectedDeal.customer.companyName || selectedDeal.customer.name}</span>}
                </div>
              </div>

              <button onClick={() => setSelectedDeal(null)} style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            {selectedDeal.notes && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                {selectedDeal.notes}
              </div>
            )}

            {/* Associated Activities */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <CRMActivityTimeline
                entityType="deal"
                entityId={selectedDeal.id}
                activities={selectedDeal.activities || []}
                onActivityChanged={() => openDealDetail(selectedDeal.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
