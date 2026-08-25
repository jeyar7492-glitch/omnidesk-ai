import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { TaskSummary } from "@omnidesk/shared-types";
import { Users, RefreshCw } from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [filter, setFilter] = useState<"all" | "overdue" | "blocked">("all");
  const [loading, setLoading] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const [t, w] = await Promise.all([
        apiClient.getTasks({
          isOverdue: filter === "overdue" ? true : undefined,
          isBlocked: filter === "blocked" ? true : undefined,
        }),
        apiClient.getTeamWorkload().catch(() => null),
      ]);
      setTasks(t || []);
      setWorkload(w);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  // Live real-time updates
  useLiveEvents("task:created", () => fetchTasks());
  useLiveEvents("task:updated", () => fetchTasks());
  useLiveEvents("task:moved", () => fetchTasks());

  const stages = [
    { key: "todo", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "review", label: "Review" },
    { key: "testing", label: "Testing" },
    { key: "done", label: "Done" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Task Execution Board & Workload</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            Governed task workflows, blocker resolution, checklists, and team capacity.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {/* Filters */}
          <button
            onClick={() => setFilter("all")}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              background: filter === "all" ? "var(--bg-elevated)" : "var(--bg-card)",
              border: filter === "all" ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
              color: filter === "all" ? "var(--text-primary)" : "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setFilter("overdue")}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              background: filter === "overdue" ? "var(--bg-elevated)" : "var(--bg-card)",
              border: filter === "overdue" ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
              color: filter === "overdue" ? "var(--status-danger)" : "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            Overdue
          </button>
          <button
            onClick={() => setFilter("blocked")}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              background: filter === "blocked" ? "var(--bg-elevated)" : "var(--bg-card)",
              border: filter === "blocked" ? "1px solid var(--border-glow)" : "1px solid var(--border-subtle)",
              color: filter === "blocked" ? "var(--status-warning)" : "var(--text-secondary)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            Blocked
          </button>
          <button
            onClick={fetchTasks}
            style={{
              padding: "0.4rem",
              background: "var(--bg-card)",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <RefreshCw size={14} className={loading ? "pulse-animation" : ""} />
          </button>
        </div>
      </div>

      {/* Team Workload Summary Bar */}
      {workload && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "10px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <Users size={18} color="var(--brand-cyan)" />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Active Team Capacity</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {workload.totalActiveTasks} active tasks across team members
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.5rem" }}>
            {workload.members?.map((m: any) => (
              <div key={m.userId} style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--brand-cyan)" }}>
                  {m.activeTasksCount} tasks ({m.estimatedHoursTotal}h)
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Columns Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
        {stages.map((stage) => {
          const stageTasks = tasks.filter((t) => t.status === stage.key);

          return (
            <div
              key={stage.key}
              style={{
                background: "var(--bg-secondary)",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                minHeight: "450px",
              }}
            >
              {/* Column Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-subtle)",
                  marginBottom: "0.75rem",
                }}
              >
                <span style={{ fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {stage.label}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    background: "var(--bg-elevated)",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "4px",
                  }}
                >
                  {stageTasks.length}
                </span>
              </div>

              {/* Tasks in Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
                {stageTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      background: "var(--bg-card)",
                      border: task.isBlocked
                        ? "1px solid rgba(245, 158, 11, 0.4)"
                        : "1px solid var(--border-subtle)",
                      borderRadius: "8px",
                      padding: "0.75rem",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.35rem", lineHeight: 1.3 }}>
                      {task.title}
                    </div>

                    {task.description && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          marginBottom: "0.5rem",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {task.description}
                      </div>
                    )}

                    {/* Priority & Blocker Tags */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "3px",
                          fontWeight: 700,
                          background:
                            task.priority === "URGENT" || task.priority === "HIGH"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(59, 130, 246, 0.15)",
                          color:
                            task.priority === "URGENT" || task.priority === "HIGH"
                              ? "#f87171"
                              : "#60a5fa",
                        }}
                      >
                        {task.priority}
                      </span>

                      {task.isBlocked && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.1rem 0.35rem",
                            borderRadius: "3px",
                            fontWeight: 700,
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "#fbbf24",
                          }}
                        >
                          BLOCKED
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
