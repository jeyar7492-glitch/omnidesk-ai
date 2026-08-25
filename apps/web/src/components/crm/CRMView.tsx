import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { CRMDealSummary, CRMLeadSummary, PipelineSummary } from "@omnidesk/shared-types";
import { RefreshCw } from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";

export const CRMView: React.FC = () => {
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [deals, setDeals] = useState<CRMDealSummary[]>([]);
  const [leads, setLeads] = useState<CRMLeadSummary[]>([]);
  const [staleDeals, setStaleDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCRMData = async () => {
    setLoading(true);
    try {
      const [p, d, l, s] = await Promise.all([
        apiClient.getPipelineSummary().catch(() => null),
        apiClient.getDeals().catch(() => []),
        apiClient.getLeads().catch(() => []),
        apiClient.getStaleDeals().catch(() => ({ staleDeals: [] })),
      ]);
      setPipeline(p);
      setDeals(d);
      setLeads(l);
      setStaleDeals(Array.isArray(s) ? s : (s as any).staleDeals || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCRMData();
  }, []);

  // Live real-time updates
  useLiveEvents("crm:deal_created", () => fetchCRMData());
  useLiveEvents("crm:deal_stage_changed", () => fetchCRMData());
  useLiveEvents("crm:lead_created", () => fetchCRMData());

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>CRM Sales Pipeline & Customer Accounts</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Revenue forecasting, deal stage progression, lead qualification, and account health.
          </p>
        </div>

        <button
          onClick={fetchCRMData}
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

      {/* Pipeline Summary Cards */}
      {pipeline && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            marginBottom: "1.5rem",
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
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ACTIVE PIPELINE VALUE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--brand-cyan)", marginTop: "0.25rem" }}>
              ${pipeline.totalActivePipelineValue?.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              {pipeline.totalDeals} opportunities
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
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>WEIGHTED FORECAST</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--status-online)", marginTop: "0.25rem" }}>
              ${pipeline.totalWeightedPipelineValue?.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Probability adjusted</div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>WON REVENUE</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#a78bfa", marginTop: "0.25rem" }}>
              ${pipeline.totalWonValue?.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Closed won deals</div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "1rem 1.25rem",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>STALE OPPORTUNITIES</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: staleDeals.length > 0 ? "var(--status-warning)" : "var(--text-muted)", marginTop: "0.25rem" }}>
              {staleDeals.length}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Inactivity &gt; 14 days</div>
          </div>
        </div>
      )}

      {/* Grid: Deals & Leads */}
      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "1.25rem" }}>
        {/* Deals Table */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Active Deals</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{deals.length} deals</span>
          </div>

          {deals.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>No deals in CRM.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {deals.map((d) => (
                <div
                  key={d.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{d.title}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Customer: {d.customerName || "Direct"} | Stage: {d.stage}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--brand-cyan)" }}>
                      ${d.dealValue?.toLocaleString()}
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {d.probability}% prob
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Inbound Leads</h3>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{leads.length} leads</span>
          </div>

          {leads.length === 0 ? (
            <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "1rem 0" }}>No leads in CRM.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {leads.map((l) => (
                <div
                  key={l.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      {l.title}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {l.customerName || "Inbound Account"}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      fontWeight: 600,
                      background: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                    }}
                  >
                    {l.stage}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
