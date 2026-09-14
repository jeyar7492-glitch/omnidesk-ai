import React, { useEffect, useState, useMemo } from "react";
import { apiClient } from "../../api/client";
import { TaskSummary, ProjectSummary } from "@omnidesk/shared-types";
import {
  RefreshCw,
  Search,
  Plus,
  Columns,
  List,
  BarChart2,
  AlertTriangle,
  X,
  ShieldAlert,
} from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { TaskDetailModal } from "./TaskDetailModal";

const KANBAN_STAGES = [
  { key: "backlog", label: "Backlog", color: "#94a3b8" },
  { key: "todo", label: "To Do", color: "#38bdf8" },
  { key: "in_progress", label: "In Progress", color: "#818cf8" },
  { key: "in_review", label: "In Review", color: "#f59e0b" },
  { key: "blocked", label: "Blocked", color: "#ef4444" },
  { key: "done", label: "Done", color: "#10b981" },
];

export const TasksView: React.FC = () => {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View Mode: 'kanban' | 'list' | 'workload'
  const [viewMode, setViewMode] = useState<"kanban" | "list" | "workload">("kanban");

  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [quickFilter, setQuickFilter] = useState<"all" | "blocked" | "overdue">("all");

  // Modals
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskProject, setNewTaskProject] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creating, setCreating] = useState(false);

  // Drag and drop
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [t, p, w] = await Promise.all([
        apiClient.getTasks({
          isOverdue: quickFilter === "overdue" ? true : undefined,
          isBlocked: quickFilter === "blocked" ? true : undefined,
          limit: 200,
        }),
        apiClient.getProjects().catch(() => []),
        apiClient.getTeamWorkload().catch(() => null),
      ]);
      setTasks(t || []);
      setProjects(p || []);
      setWorkload(w);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [quickFilter]);

  // Live WebSocket updates
  useLiveEvents("task.created", () => fetchData());
  useLiveEvents("task.updated", () => fetchData());
  useLiveEvents("task.status.changed", () => fetchData());
  useLiveEvents("task.reordered", () => fetchData());
  useLiveEvents("task.deleted", () => fetchData());

  // Drag & drop with optimistic UI and rollback
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedTaskId;
    if (!id) return;

    const taskToMove = tasks.find((t) => t.id === id);
    if (!taskToMove || taskToMove.status.toLowerCase() === targetStatus.toLowerCase()) {
      setDraggedTaskId(null);
      return;
    }

    const originalTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: targetStatus.toLowerCase() } : t))
    );

    try {
      await apiClient.reorderTask(id, 0, targetStatus);
      setDraggedTaskId(null);
    } catch (err: any) {
      setTasks(originalTasks);
      setError(err.message || "Cannot move task to requested column. Rolling back.");
      setDraggedTaskId(null);
    }
  };

  // Create Task Submit
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      setCreating(true);
      setError(null);
      await apiClient.createTask({
        title: newTaskTitle.trim(),
        projectId: newTaskProject || undefined,
        status: newTaskStatus,
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      });
      setNewTaskTitle("");
      setNewTaskDueDate("");
      setShowCreateModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q));
      const matchProject = projectFilter === "ALL" || t.projectId === projectFilter;
      const matchStatus = statusFilter === "ALL" || t.status.toLowerCase() === statusFilter.toLowerCase();
      const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
      return matchSearch && matchProject && matchStatus && matchPriority;
    });
  }, [tasks, search, projectFilter, statusFilter, priorityFilter]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", padding: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Global Tasks & Workload
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem", margin: 0 }}>
            Unified view of tasks across all workspace projects, team workload, and dependencies.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* View Mode Toggle */}
          <div style={{ display: "flex", backgroundColor: "var(--bg-card)", padding: "0.25rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
            <button
              onClick={() => setViewMode("kanban")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: viewMode === "kanban" ? "var(--bg-elevated)" : "transparent",
                color: viewMode === "kanban" ? "#60a5fa" : "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Columns size={14} /> Board
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: viewMode === "list" ? "var(--bg-elevated)" : "transparent",
                color: viewMode === "list" ? "#60a5fa" : "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setViewMode("workload")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.35rem 0.65rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: viewMode === "workload" ? "var(--bg-elevated)" : "transparent",
                color: viewMode === "workload" ? "#60a5fa" : "var(--text-secondary)",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <BarChart2 size={14} /> Workload
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              backgroundColor: "#2563eb",
              color: "#fff",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={15} /> New Task
          </button>
          <button
            onClick={fetchData}
            title="Refresh"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              padding: "0.45rem",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} className={loading ? "pulse-animation" : ""} />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          style={{
            padding: "0.6rem 1rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderRadius: "8px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          padding: "0.75rem 1rem",
          backgroundColor: "var(--bg-card)",
          borderRadius: "8px",
          border: "1px solid var(--border-subtle)",
          marginBottom: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "200px" }}>
          <Search size={15} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search across all tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
        </div>

        {/* Project Selector */}
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: "6px",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Status Selector */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: "6px",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="backlog">Backlog</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="in_review">In Review</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          style={{
            padding: "0.35rem 0.6rem",
            borderRadius: "6px",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>

        {/* Quick Blocker / Overdue buttons */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() => setQuickFilter(quickFilter === "blocked" ? "all" : "blocked")}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: quickFilter === "blocked" ? "rgba(239, 68, 68, 0.2)" : "var(--bg-elevated)",
              color: quickFilter === "blocked" ? "#ef4444" : "var(--text-secondary)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Blocked Only
          </button>
          <button
            onClick={() => setQuickFilter(quickFilter === "overdue" ? "all" : "overdue")}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              backgroundColor: quickFilter === "overdue" ? "rgba(245, 158, 11, 0.2)" : "var(--bg-elevated)",
              color: quickFilter === "overdue" ? "#f59e0b" : "var(--text-secondary)",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Overdue Only
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* VIEW 1: SIX-STAGE KANBAN */}
        {viewMode === "kanban" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(260px, 1fr))",
              gap: "1rem",
              minWidth: "1600px",
              paddingBottom: "1.5rem",
            }}
          >
            {KANBAN_STAGES.map((col) => {
              const colTasks = filteredTasks.filter((t) => {
                const s = t.status.toLowerCase();
                if (col.key === "in_review") return s === "in_review" || s === "review" || s === "testing";
                return s === col.key;
              });

              return (
                <div
                  key={col.key}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.key)}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "calc(100vh - 250px)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      backgroundColor: "var(--bg-elevated)",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: col.color }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{col.label}</span>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.45rem", borderRadius: "10px", backgroundColor: "rgba(255,255,255,0.08)", fontWeight: 600 }}>
                      {colTasks.length}
                    </span>
                  </div>

                  <div style={{ padding: "0.75rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1, minHeight: "100px" }}>
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => setSelectedTaskId(t.id)}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "8px",
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                          cursor: "grab",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        {t.projectName && (
                          <span style={{ fontSize: "0.7rem", color: "#60a5fa", fontWeight: 600 }}>
                            {t.projectName}
                          </span>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</span>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.35rem", borderRadius: "4px", backgroundColor: "rgba(255,255,255,0.08)" }}>
                            {t.priority}
                          </span>
                        </div>

                        {t.isBlocked && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#f59e0b" }}>
                            <AlertTriangle size={12} />
                            <span>Blocked</span>
                          </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          <span>{t.assigneeName ? t.assigneeName.split(" ")[0] : "—"}</span>
                          {t.dueDate && <span>{new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: LIST VIEW */}
        {viewMode === "list" && (
          <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "10px", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Task Title</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Project</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Priority</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Assignee</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                      No tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTaskId(t.id)}
                      style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</td>
                      <td style={{ padding: "0.75rem 1rem", color: "#60a5fa" }}>{t.projectName || "—"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", backgroundColor: "rgba(255,255,255,0.06)" }}>
                          {t.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>{t.priority}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>{t.assigneeName || "—"}</td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 3: TEAM WORKLOAD */}
        {viewMode === "workload" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {workload?.members?.map((m: any) => (
                <div
                  key={m.userId}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-subtle)",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.email}</div>
                    </div>
                    <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#c084fc", fontWeight: 600 }}>
                      {m.role}
                    </span>
                  </div>

                  {/* Workload Stats Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", backgroundColor: "var(--bg-elevated)", padding: "0.75rem", borderRadius: "6px" }}>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Active</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#60a5fa" }}>
                        {m.totalTasks - m.completedTasks}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Done</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10b981" }}>{m.completedTasks}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Overdue</span>
                      <div style={{ fontSize: "1.1rem", fontWeight: 700, color: m.overdueTasks > 0 ? "#ef4444" : "var(--text-muted)" }}>
                        {m.overdueTasks}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    Estimated Workload: <strong>{m.estimatedHoursTotal || 0} hrs</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => fetchData()}
          onTaskDeleted={() => {
            setSelectedTaskId(null);
            fetchData();
          }}
        />
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "var(--bg-card)", borderRadius: "10px", padding: "1.5rem", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Create New Task</h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Title *</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Project</label>
                <select
                  value={newTaskProject}
                  onChange={(e) => setNewTaskProject(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  <option value="">No Project (Standalone Task)</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Status</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="in_review">In Review</option>
                    <option value="blocked">Blocked</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Due Date</label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" disabled={creating} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#2563eb", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                  {creating ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
