import React, { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../api/client";
import { DashboardMetrics } from "@omnidesk/shared-types";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import {
  FolderKanban,
  CheckSquare,
  TrendingUp,
  Bot,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  ArrowUpRight,
  ShieldAlert,
  Activity,
} from "lucide-react";


export const DashboardView: React.FC<{ onNavigateTab?: (tab: string) => void }> = ({ onNavigateTab }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null);
      const data = await apiClient.getDashboardMetrics();
      setMetrics(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Real-time updates on relevant WebSocket events
  useLiveEvents("project:created", fetchMetrics);
  useLiveEvents("project:updated", fetchMetrics);
  useLiveEvents("task:created", fetchMetrics);
  useLiveEvents("task:updated", fetchMetrics);
  useLiveEvents("task:moved", fetchMetrics);
  useLiveEvents("crm:deal_created", fetchMetrics);
  useLiveEvents("crm:deal_stage_changed", fetchMetrics);
  useLiveEvents("crm:lead_created", fetchMetrics);
  useLiveEvents("ai:execution_completed", fetchMetrics);
  useLiveEvents("ai:approval_requested", fetchMetrics);
  useLiveEvents("ai:approval_decided", fetchMetrics);

  if (loading && !metrics) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem" }}>
        <div className="pulse-animation" style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--brand-cyan)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Activity size={24} color="#ffffff" />
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>Aggregating real-time workspace metrics...</div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--accent-red)", padding: "1.5rem", borderRadius: "12px", maxWidth: "500px", margin: "0 auto" }}>
          <AlertTriangle size={32} color="var(--accent-red)" style={{ marginBottom: "0.5rem" }} />
          <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-primary)" }}>Dashboard Error</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0 0 1rem 0" }}>{error}</p>
          <button onClick={fetchMetrics} className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  const kpis = metrics?.kpis || {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalTasks: 0,
    overdueTasks: 0,
    blockedTasks: 0,
    completedTasks: 0,
    activePipelineValue: 0,
    weightedPipelineForecast: 0,
    openDeals: 0,
    newLeads: 0,
    totalTeamMembers: 0,
    aiExecutionsCount: 0,
    aiPendingApprovals: 0,
  };

  return (
    <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            Workspace Command Center
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: "0.25rem 0 0 0" }}>
            Real-time multi-agent telemetry, roadmaps, pipeline, and team capacity
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Synced: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={fetchMetrics}
            className="btn btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
            title="Refresh dashboard metrics"
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        {/* Total & Active Projects */}
        <div className="card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Projects</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderKanban size={18} color="var(--brand-cyan)" />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {kpis.activeProjects} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>/ {kpis.totalProjects} Total</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
              <CheckCircle2 size={12} /> {kpis.completedProjects} Completed
            </span>
          </div>
        </div>

        {/* Task Velocity & Health */}
        <div className="card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Tasks & Flow</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(99, 102, 241, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckSquare size={18} color="var(--brand-indigo)" />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {kpis.totalTasks} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>Total</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.75rem" }}>
            {kpis.overdueTasks > 0 && (
              <span style={{ color: "var(--accent-red)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                <Clock size={12} /> {kpis.overdueTasks} Overdue
              </span>
            )}
            {kpis.blockedTasks > 0 && (
              <span style={{ color: "var(--accent-amber)", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                <AlertTriangle size={12} /> {kpis.blockedTasks} Blocked
              </span>
            )}
            {kpis.overdueTasks === 0 && kpis.blockedTasks === 0 && (
              <span style={{ color: "var(--accent-green)" }}>All tasks on track</span>
            )}
          </div>
        </div>

        {/* Active CRM Pipeline */}
        <div className="card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>CRM Pipeline</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <TrendingUp size={18} color="var(--accent-green)" />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            ${kpis.activePipelineValue.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
            Weighted Forecast: <span style={{ color: "var(--brand-cyan)", fontWeight: 600 }}>${kpis.weightedPipelineForecast.toLocaleString()}</span> ({kpis.openDeals} Deals)
          </div>
        </div>

        {/* AI Agent Telemetry & Approvals */}
        <div className="card" style={{ padding: "1.2rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>AI Agent Activity</span>
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(168, 85, 247, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={18} color="#c084fc" />
            </div>
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {kpis.aiExecutionsCount} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 400 }}>Executions</span>
          </div>
          <div style={{ fontSize: "0.75rem" }}>
            {kpis.aiPendingApprovals > 0 ? (
              <span style={{ color: "var(--accent-amber)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <ShieldAlert size={12} /> {kpis.aiPendingApprovals} Pending Human Approvals
              </span>
            ) : (
              <span style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <CheckCircle2 size={12} /> No pending approvals
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Projects Overview & Tasks Status */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1.5rem" }}>
        {/* Active Projects Widget */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FolderKanban size={18} color="var(--brand-cyan)" />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Active Projects Roadmap</h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("projects")}
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
              >
                View all <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          {metrics?.projectsSummary.activeProjects.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No active projects in this workspace yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {metrics?.projectsSummary.activeProjects.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "var(--bg-elevated)",
                    padding: "0.85rem 1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--text-primary)" }}>{p.name}</span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "4px",
                        fontWeight: 600,
                        background:
                          p.health === "ON_TRACK" || p.health === "healthy"
                            ? "rgba(16, 185, 129, 0.2)"
                            : p.health === "AT_RISK"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(239, 68, 68, 0.2)",
                        color:
                          p.health === "ON_TRACK" || p.health === "healthy"
                            ? "var(--accent-green)"
                            : p.health === "AT_RISK"
                            ? "var(--accent-amber)"
                            : "var(--accent-red)",
                      }}
                    >
                      {p.health || "ON_TRACK"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ flex: 1, background: "var(--bg-secondary)", height: "6px", borderRadius: "3px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${p.progressPercentage}%`,
                          height: "100%",
                          background: "linear-gradient(90deg, var(--brand-cyan), var(--brand-indigo))",
                          borderRadius: "3px",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                      {p.progressPercentage}%
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    <span>Budget: ${p.budget.toLocaleString()} (${p.spent.toLocaleString()} spent)</span>
                    {p.deadline && <span>Due: {new Date(p.deadline).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Milestones */}
          {metrics && metrics.projectsSummary.upcomingMilestones.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                Upcoming Milestones
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {metrics.projectsSummary.upcomingMilestones.map((m) => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-primary)" }}>{m.title} <span style={{ color: "var(--text-muted)" }}>({m.projectName})</span></span>
                    <span style={{ color: "var(--brand-cyan)" }}>{new Date(m.dueDate).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tasks & Priority Breakdown Widget */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <CheckSquare size={18} color="var(--brand-indigo)" />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Task Pipeline & Status</h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("tasks")}
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
              >
                View all <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          {/* Status Breakdown Pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Todo</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)" }}>{metrics?.tasksSummary.byStatus.todo || 0}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--brand-cyan)" }}>In Progress</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--brand-cyan)" }}>{metrics?.tasksSummary.byStatus.in_progress || 0}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--accent-green)" }}>Done</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-green)" }}>{metrics?.tasksSummary.byStatus.done || 0}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "#c084fc" }}>Review</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#c084fc" }}>{metrics?.tasksSummary.byStatus.review || 0}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--accent-amber)" }}>Testing</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-amber)" }}>{metrics?.tasksSummary.byStatus.testing || 0}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px", textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Backlog</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-muted)" }}>{metrics?.tasksSummary.byStatus.backlog || 0}</div>
            </div>
          </div>

          {/* Priority Breakdown */}
          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Priority Distribution
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(239, 68, 68, 0.15)", color: "var(--accent-red)", fontWeight: 600 }}>
                Urgent: {metrics?.tasksSummary.byPriority.URGENT || 0}
              </span>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(245, 158, 11, 0.15)", color: "var(--accent-amber)", fontWeight: 600 }}>
                High: {metrics?.tasksSummary.byPriority.HIGH || 0}
              </span>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", fontWeight: 600 }}>
                Medium: {metrics?.tasksSummary.byPriority.MEDIUM || 0}
              </span>
              <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "4px", background: "rgba(107, 114, 128, 0.15)", color: "#9ca3af", fontWeight: 600 }}>
                Low: {metrics?.tasksSummary.byPriority.LOW || 0}
              </span>
            </div>
          </div>

          {/* Overdue and Blocked Alerts */}
          {(kpis.overdueTasks > 0 || kpis.blockedTasks > 0) && (
            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "8px", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={18} color="var(--accent-amber)" />
              <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>
                Attention needed: {kpis.overdueTasks} overdue tasks and {kpis.blockedTasks} blocked items requiring review.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: CRM Pipeline & Team Workload */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))", gap: "1.5rem" }}>
        {/* CRM Overview */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <TrendingUp size={18} color="var(--accent-green)" />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>CRM Pipeline & Revenue</h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("crm")}
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
              >
                View all <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.75rem" }}>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Closed-Won Revenue</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--accent-green)" }}>
                ${(metrics?.crmSummary.wonRevenue || 0).toLocaleString()}
              </div>
            </div>
            <div style={{ background: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Stale Deals (&gt;30d)</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: (metrics?.crmSummary.staleDealsCount || 0) > 0 ? "var(--accent-amber)" : "var(--text-primary)" }}>
                {metrics?.crmSummary.staleDealsCount || 0}
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
              Recent Opportunities
            </div>
            {metrics?.crmSummary.recentDeals.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0.5rem 0" }}>No deals logged yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {metrics?.crmSummary.recentDeals.map((d) => (
                  <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", padding: "0.35rem 0.5rem", background: "var(--bg-elevated)", borderRadius: "4px" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{d.title}</span>
                    <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>${d.dealValue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Team Capacity & Workload */}
        <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={18} color="var(--brand-cyan)" />
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Team Workload & Capacity</h3>
            </div>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab("tasks")}
                className="btn btn-ghost"
                style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
              >
                Manage <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          {metrics?.teamWorkload.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No members registered in this workspace yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {metrics?.teamWorkload.map((member) => (
                <div
                  key={member.userId}
                  style={{
                    background: "var(--bg-elevated)",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{member.name}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{member.role} • {member.email}</div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>
                      <strong>{member.totalTasks}</strong> tasks ({member.inProgressTasks} active)
                    </span>
                    {member.overdueTasks > 0 && (
                      <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>
                        {member.overdueTasks} overdue
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Unified Activity Stream */}
      <div className="card" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Activity size={18} color="var(--brand-indigo)" />
          <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600 }}>Unified Workspace Activity Feed</h3>
        </div>

        {metrics?.recentActivity.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No recent activity recorded in this workspace.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {metrics?.recentActivity.map((act) => (
              <div
                key={act.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.6rem 0.85rem",
                  background: "var(--bg-elevated)",
                  borderRadius: "6px",
                  fontSize: "0.8rem",
                  borderLeft: "3px solid var(--brand-cyan)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{act.title}</span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{act.description}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  <span>{act.user}</span>
                  <span>{new Date(act.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
