import React, { useEffect, useState } from "react";
import { CRMDashboardMetrics, DealStage } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Award,
  RefreshCw,
  Building2,
  Flame,
} from "lucide-react";
import { CRMActivityTimeline } from "./CRMActivityTimeline";

interface CRMDashboardTabProps {
  onNavigateTab: (tab: string) => void;
}

export const CRMDashboardTab: React.FC<CRMDashboardTabProps> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState<CRMDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.getCRMDashboard();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || "Failed to load CRM dashboard metrics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const stagesOrder: DealStage[] = ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Banner & Quick Refresh */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
            CRM Revenue & Pipeline Intelligence
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Aggregated database telemetry on pipeline conversion, account health, and sales velocity.
          </p>
        </div>

        <button
          onClick={fetchDashboard}
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
          <RefreshCw size={13} className={loading ? "pulse-animation" : ""} /> Refresh Analytics
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

      {/* Primary KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        {/* Active Pipeline */}
        <div
          onClick={() => onNavigateTab("pipeline")}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.1rem",
            cursor: "pointer",
            transition: "transform 0.15s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Active Pipeline
            </span>
            <DollarSign size={16} style={{ color: "var(--brand-cyan)" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--brand-cyan)", marginTop: "0.4rem" }}>
            {formatCurrency(metrics?.totalPipelineValue || 0)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {metrics?.openDeals ?? 0} active opportunities
          </div>
        </div>

        {/* Weighted Forecast */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Weighted Forecast
            </span>
            <TrendingUp size={16} style={{ color: "var(--status-online)" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--status-online)", marginTop: "0.4rem" }}>
            {formatCurrency(metrics?.weightedPipelineValue || 0)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Probability-adjusted projection
          </div>
        </div>

        {/* Won Revenue */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Won Revenue
            </span>
            <Award size={16} style={{ color: "var(--brand-purple)" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--brand-purple)", marginTop: "0.4rem" }}>
            {formatCurrency(metrics?.wonRevenue || 0)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {metrics?.wonDeals ?? 0} closed won deals
          </div>
        </div>

        {/* Conversion Rate */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase" }}>
              Deal Win Rate
            </span>
            <Target size={16} style={{ color: "var(--brand-blue)" }} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--brand-blue)", marginTop: "0.4rem" }}>
            {metrics?.conversionRate ?? 0}%
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {metrics?.wonDeals ?? 0} won vs {metrics?.lostDeals ?? 0} lost
          </div>
        </div>
      </div>

      {/* Secondary Quick Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          onClick={() => onNavigateTab("customers")}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.9rem 1.1rem",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            <Building2 size={14} /> Total Accounts
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.3rem" }}>
            {metrics?.totalCustomers ?? 0}
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem" }}>
              ({metrics?.activeCustomers ?? 0} active)
            </span>
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("contacts")}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.9rem 1.1rem",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            <Users size={14} /> Total Contacts
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.3rem" }}>
            {metrics?.totalContacts ?? 0}
          </div>
        </div>

        <div
          onClick={() => onNavigateTab("leads")}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "0.9rem 1.1rem",
            cursor: "pointer",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.75rem" }}>
            <Flame size={14} style={{ color: "var(--status-warning)" }} /> Open Leads
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.3rem" }}>
            {metrics?.openLeads ?? 0}
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)", marginLeft: "0.4rem" }}>
              ({metrics?.convertedLeads ?? 0} converted)
            </span>
          </div>
        </div>
      </div>

      {/* Pipeline Stage Funnel Breakdown */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Sales Pipeline Stage Distribution
            </h4>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Breakdown of opportunities and revenue across standard stages
            </span>
          </div>
          <button
            onClick={() => onNavigateTab("pipeline")}
            style={{
              fontSize: "0.78rem",
              color: "var(--brand-cyan)",
              background: "transparent",
              fontWeight: 500,
            }}
          >
            Open Kanban Board &rarr;
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {stagesOrder.map((stage) => {
            const data = metrics?.pipelineByStage?.[stage] || { count: 0, totalValue: 0, weightedValue: 0 };
            const isWon = stage === "WON";
            const isLost = stage === "LOST";
            return (
              <div
                key={stage}
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.85rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: isWon ? "var(--status-online)" : isLost ? "var(--status-danger)" : "var(--brand-blue)",
                    }}
                  >
                    {stage}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    {data.count}
                  </span>
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {formatCurrency(data.totalValue)}
                </div>
                {!isWon && !isLost && (
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                    Weighted: {formatCurrency(data.weightedValue)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Leads Distribution & Recent Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
        {/* Lead Distribution */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
              Lead Stage & Priority Mix
            </h4>
            <button
              onClick={() => onNavigateTab("leads")}
              style={{ fontSize: "0.75rem", color: "var(--brand-cyan)" }}
            >
              View Leads &rarr;
            </button>
          </div>

          {/* Lead Stages */}
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>BY STAGE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {metrics?.leadDistribution?.byStage &&
                Object.entries(metrics.leadDistribution.byStage).map(([st, cnt]) => (
                  <div
                    key={st}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>{st}:</span>{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{cnt}</strong>
                  </div>
                ))}
            </div>
          </div>

          {/* Lead Priorities */}
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>BY PRIORITY</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {metrics?.leadDistribution?.byPriority &&
                Object.entries(metrics.leadDistribution.byPriority).map(([pr, cnt]) => (
                  <div
                    key={pr}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.4rem 0.6rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)" }}>{pr}:</span>{" "}
                    <strong style={{ color: "var(--text-primary)" }}>{cnt}</strong>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Recent CRM Activities */}
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1.25rem",
          }}
        >
          <CRMActivityTimeline
            activities={metrics?.recentActivities || []}
            onActivityChanged={fetchDashboard}
          />
        </div>
      </div>
    </div>
  );
};
