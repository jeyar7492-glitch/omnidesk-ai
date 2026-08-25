import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { ProjectSummary, MilestoneSummary } from "@omnidesk/shared-types";
import { RefreshCw } from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getProjects();
      setProjects(data || []);
      if (data && data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectDetails = async (projectId: string) => {
    try {
      const [h, p, m] = await Promise.all([
        apiClient.getProjectHealth(projectId).catch(() => null),
        apiClient.getProjectProgress(projectId).catch(() => null),
        apiClient.getMilestones(projectId).catch(() => []),
      ]);
      setHealthData(h);
      setProgressData(p);
      setMilestones(m);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    }
  }, [selectedProjectId]);

  // Live real-time updates
  useLiveEvents("project:created", () => fetchProjects());
  useLiveEvents("project:updated", () => {
    fetchProjects();
    if (selectedProjectId) fetchProjectDetails(selectedProjectId);
  });
  useLiveEvents("milestone:created", () => {
    if (selectedProjectId) fetchProjectDetails(selectedProjectId);
  });

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Project Roadmap & Health Diagnostics</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Real-time project health, task completion metrics, and milestone roadmaps.
          </p>
        </div>
        <button
          onClick={fetchProjects}
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

      {/* Grid: Project List & Project Diagnostics */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "1.25rem" }}>
        {/* Project List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {projects.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)", background: "var(--bg-card)", borderRadius: "8px" }}>
              {loading ? "Loading projects..." : "No projects found."}
            </div>
          ) : (
            projects.map((p) => {
              const isSelected = selectedProjectId === p.id;
              const isAtRisk = p.health === "at_risk" || p.health === "critical";

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProjectId(p.id)}
                  style={{
                    padding: "1rem",
                    background: isSelected ? "var(--bg-elevated)" : "var(--bg-card)",
                    border: isSelected ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: isSelected ? "var(--shadow-glow)" : "var(--shadow-card)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        fontWeight: 600,
                        background: isAtRisk ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: isAtRisk ? "#f87171" : "#34d399",
                      }}
                    >
                      {p.health || "healthy"}
                    </span>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                    Budget: ${p.budget?.toLocaleString()} | Spent: ${p.spent?.toLocaleString()}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    <span>Status: {p.status}</span>
                    <span>{p.progressPercentage || 0}% Complete</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Project Detailed Diagnostics */}
        {selectedProjectId && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Top Metrics Banner */}
            {progressData && (
              <div
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "10px",
                  padding: "1.25rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "1rem",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>COMPLETION RATE</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--brand-cyan)", marginTop: "0.2rem" }}>
                    {progressData.progressPercentage}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {progressData.taskBreakdown?.completed} of {progressData.taskBreakdown?.total} tasks
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>HEALTH SCORE</div>
                  <div
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 700,
                      color: healthData?.overallHealth === "at_risk" ? "var(--status-danger)" : "var(--status-online)",
                      marginTop: "0.2rem",
                    }}
                  >
                    {healthData?.healthScore || 100}/100
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {healthData?.overallHealth || "healthy"}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>BUDGET BURN</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fcd34d", marginTop: "0.2rem" }}>
                    {healthData?.budgetBurnPercentage || 0}%
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    ${healthData?.totalSpent?.toLocaleString()} / ${healthData?.totalBudget?.toLocaleString()}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>BLOCKERS / OVERDUE</div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#f87171", marginTop: "0.2rem" }}>
                    {healthData?.blockedTasksCount || 0} / {healthData?.overdueTasksCount || 0}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Blocked / Overdue tasks</div>
                </div>
              </div>
            )}

            {/* Milestones Card */}
            <div
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "10px",
                padding: "1.25rem",
              }}
            >
              <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.75rem" }}>Project Milestones</h3>
              {milestones.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No milestones attached to this project.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {milestones.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.6rem 0.85rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{m.title}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Due: {m.dueDate ? new Date(m.dueDate).toLocaleDateString() : "No deadline"}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontWeight: 600,
                          background: m.status === "completed" ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                          color: m.status === "completed" ? "#34d399" : "#60a5fa",
                        }}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
