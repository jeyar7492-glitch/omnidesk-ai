import React, { useEffect, useState, useMemo } from "react";
import { apiClient } from "../../api/client";
import {
  ProjectDetail,
  ProjectDashboardStats,
  MilestoneSummary,
  ProjectMemberSummary,
  TaskSummary,
} from "@omnidesk/shared-types";
import {
  ArrowLeft,
  Layout,
  Columns,
  List,
  Calendar as CalendarIcon,
  GitCommit,
  BarChart3,
  Flag,
  Users,
  Plus,
  RefreshCw,
  Archive,
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
  ShieldAlert,
} from "lucide-react";
import { TaskDetailModal } from "../tasks/TaskDetailModal";
import { useLiveEvents } from "../../hooks/useLiveEvents";

interface ProjectWorkspaceViewProps {
  projectId: string;
  onBack: () => void;
}

type WorkspaceTab =
  | "overview"
  | "board"
  | "list"
  | "calendar"
  | "timeline"
  | "dashboard"
  | "milestones"
  | "members";

const KANBAN_STAGES = [
  { key: "backlog", label: "Backlog", color: "#94a3b8" },
  { key: "todo", label: "To Do", color: "#38bdf8" },
  { key: "in_progress", label: "In Progress", color: "#818cf8" },
  { key: "in_review", label: "In Review", color: "#f59e0b" },
  { key: "blocked", label: "Blocked", color: "#ef4444" },
  { key: "done", label: "Done", color: "#10b981" },
];

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  projectId,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("overview");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [dashboard, setDashboard] = useState<ProjectDashboardStats | null>(null);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [milestones, setMilestones] = useState<MilestoneSummary[]>([]);
  const [members, setMembers] = useState<ProjectMemberSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected task for detail modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Modals for "+ Add Task", "+ Add Milestone", "+ Add Member"
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [showCreateMilestoneModal, setShowCreateMilestoneModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIUM");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");

  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState("");

  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("CONTRIBUTOR");

  // List view search & filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");

  const loadProjectData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projData, dashData, tasksData, milesData, membersData] = await Promise.all([
        apiClient.getProject(projectId),
        apiClient.getProjectDashboard(projectId).catch(() => null),
        apiClient.getTasks({ projectId, limit: 150 }).catch(() => []),
        apiClient.getProjectMilestones(projectId).catch(() => []),
        apiClient.getProjectMembers(projectId).catch(() => []),
      ]);
      setProject(projData);
      setDashboard(dashData);
      setTasks(tasksData);
      setMilestones(milesData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, [projectId]);

  // Live WebSocket subscriptions
  useLiveEvents("task.created", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });
  useLiveEvents("task.updated", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });
  useLiveEvents("task.status.changed", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });
  useLiveEvents("task.reordered", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });
  useLiveEvents("project.updated", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });
  useLiveEvents("project.member.updated", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });
  useLiveEvents("milestone.updated", (evt: any) => {
    if (evt?.projectId === projectId) loadProjectData();
  });

  // Drag and drop handlers with optimistic update & rollback
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

    // Backup current state for rollback
    const originalTasks = [...tasks];

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: targetStatus.toLowerCase() } : t
      )
    );

    try {
      await apiClient.reorderTask(id, 0, targetStatus);
      setDraggedTaskId(null);
      // Reload stats
      apiClient.getProjectDashboard(projectId).then(setDashboard).catch(() => {});
    } catch (err: any) {
      // Rollback on failure
      setTasks(originalTasks);
      setError(err.message || "Failed to move task. Reverting.");
      setDraggedTaskId(null);
    }
  };

  // Archive / Restore
  const handleToggleArchive = async () => {
    if (!project) return;
    try {
      setError(null);
      if (project.isArchived) {
        await apiClient.restoreProject(project.id);
      } else {
        if (!window.confirm("Archive this project? It will be marked inactive.")) return;
        await apiClient.archiveProject(project.id, "Archived from project workspace");
      }
      loadProjectData();
    } catch (err: any) {
      setError(err.message || "Operation failed");
    }
  };

  // Create task modal handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      setError(null);
      await apiClient.createTask({
        title: newTaskTitle.trim(),
        projectId,
        status: newTaskStatus,
        priority: newTaskPriority,
        dueDate: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      });
      setNewTaskTitle("");
      setShowCreateTaskModal(false);
      loadProjectData();
    } catch (err: any) {
      setError(err.message || "Failed to create task");
    }
  };

  // Create milestone modal handler
  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;
    try {
      setError(null);
      await apiClient.createProjectMilestone(projectId, {
        title: newMilestoneTitle.trim(),
        description: newMilestoneDesc.trim() || undefined,
        dueDate: newMilestoneDueDate ? new Date(newMilestoneDueDate).toISOString() : undefined,
      });
      setNewMilestoneTitle("");
      setNewMilestoneDesc("");
      setShowCreateMilestoneModal(false);
      loadProjectData();
    } catch (err: any) {
      setError(err.message || "Failed to create milestone");
    }
  };

  // Add member modal handler
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    try {
      setError(null);
      await apiClient.addProjectMember(projectId, {
        userEmail: newMemberEmail.trim(),
        role: newMemberRole,
      });
      setNewMemberEmail("");
      setShowAddMemberModal(false);
      loadProjectData();
    } catch (err: any) {
      setError(err.message || "Failed to add project member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Remove member from project?")) return;
    try {
      await apiClient.removeProjectMember(projectId, userId);
      loadProjectData();
    } catch (err: any) {
      setError(err.message || "Failed to remove member");
    }
  };

  // Filtered tasks for List view
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        !searchQuery ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === "ALL" || t.status.toLowerCase() === statusFilter.toLowerCase();
      const matchPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  if (loading && !project) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
        <RefreshCw size={24} className="pulse-animation" />
        <span style={{ marginLeft: "0.75rem" }}>Loading Project Workspace...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <h3>Project not found or access denied.</h3>
        <button
          onClick={onBack}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            borderRadius: "6px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            cursor: "pointer",
          }}
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Top Banner & Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          backgroundColor: "var(--bg-card, #131b2e)",
          borderBottom: "1px solid var(--border-subtle, #1e293b)",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {/* Breadcrumb & Project Actions */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={onBack}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: "0.85rem",
                padding: "0.2rem 0.4rem",
                borderRadius: "4px",
              }}
            >
              <ArrowLeft size={16} /> Projects
            </button>
            <span style={{ color: "var(--text-muted)" }}>/</span>
            <span
              style={{
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 700,
                backgroundColor: "rgba(59, 130, 246, 0.15)",
                color: "#60a5fa",
                border: "1px solid rgba(59, 130, 246, 0.3)",
              }}
            >
              {project.key || "PRJ"}
            </span>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              {project.name}
            </h1>
            <span
              style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "12px",
                fontSize: "0.75rem",
                fontWeight: 600,
                backgroundColor:
                  project.status === "COMPLETED"
                    ? "rgba(16, 185, 129, 0.15)"
                    : project.status === "CANCELLED"
                    ? "rgba(239, 68, 68, 0.15)"
                    : "rgba(59, 130, 246, 0.15)",
                color:
                  project.status === "COMPLETED"
                    ? "#10b981"
                    : project.status === "CANCELLED"
                    ? "#ef4444"
                    : "#60a5fa",
              }}
            >
              {project.status}
            </span>
            {project.isArchived && (
              <span
                style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  backgroundColor: "rgba(245, 158, 11, 0.2)",
                  color: "#fbbf24",
                  fontWeight: 600,
                }}
              >
                ARCHIVED
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => setShowCreateTaskModal(true)}
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
              onClick={handleToggleArchive}
              title={project.isArchived ? "Restore Project" : "Archive Project"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.45rem 0.75rem",
                borderRadius: "6px",
                backgroundColor: "var(--bg-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              {project.isArchived ? <RotateCcw size={15} /> : <Archive size={15} />}
              {project.isArchived ? "Restore" : "Archive"}
            </button>
            <button
              onClick={loadProjectData}
              title="Refresh Data"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-secondary)",
                padding: "0.45rem",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs (8 tabs) */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.25rem" }}>
          {[
            { id: "overview", label: "Overview", icon: Layout },
            { id: "board", label: "Board", icon: Columns, count: tasks.length },
            { id: "list", label: "List", icon: List, count: tasks.length },
            { id: "calendar", label: "Calendar", icon: CalendarIcon },
            { id: "timeline", label: "Timeline", icon: GitCommit },
            { id: "dashboard", label: "Dashboard", icon: BarChart3 },
            { id: "milestones", label: "Milestones", icon: Flag, count: milestones.length },
            { id: "members", label: "Members", icon: Users, count: members.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as WorkspaceTab)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isActive ? "rgba(59, 130, 246, 0.15)" : "transparent",
                  color: isActive ? "#60a5fa" : "var(--text-secondary)",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      padding: "0.1rem 0.35rem",
                      borderRadius: "10px",
                      backgroundColor: isActive ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div
          style={{
            padding: "0.6rem 1.5rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Workspace Tab View Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "1200px" }}>
            {/* Top Cards: Progress, Health, Tasks, Milestones */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div style={{ backgroundColor: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>PROGRESS</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginTop: "0.4rem" }}>
                  <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "#38bdf8" }}>{project.progress}%</span>
                </div>
                <div style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "3px", overflow: "hidden", marginTop: "0.75rem" }}>
                  <div style={{ height: "100%", width: `${project.progress}%`, backgroundColor: "#38bdf8" }} />
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>HEALTH STATUS</span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <span
                    style={{
                      padding: "0.3rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      backgroundColor:
                        project.health === "GOOD" ? "rgba(16, 185, 129, 0.15)" : project.health === "CRITICAL" ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
                      color:
                        project.health === "GOOD" ? "#10b981" : project.health === "CRITICAL" ? "#ef4444" : "#f59e0b",
                    }}
                  >
                    {project.health || "GOOD"}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>TOTAL TASKS</span>
                <div style={{ fontSize: "1.75rem", fontWeight: 700, marginTop: "0.4rem", color: "var(--text-primary)" }}>
                  {dashboard?.totalTasks ?? tasks.length}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {dashboard?.completedTasks ?? tasks.filter((t) => t.status === "done").length} completed
                </span>
              </div>

              <div style={{ backgroundColor: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>BUDGET VS SPENT</span>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.4rem", color: "var(--text-primary)" }}>
                  ${project.spent?.toLocaleString() ?? 0} / ${project.budget?.toLocaleString() ?? 0}
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {project.budget && project.budget > 0 ? Math.round(((project.spent || 0) / project.budget) * 100) : 0}% burn rate
                </span>
              </div>
            </div>

            {/* Description & Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
              <div style={{ backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem" }}>Project Overview</h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                  {project.description || "No project description provided."}
                </p>

                {/* Milestone Progress */}
                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginTop: "1.5rem", marginBottom: "0.75rem" }}>
                  Milestones ({milestones.length})
                </h4>
                {milestones.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No milestones defined yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {milestones.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: "0.75rem",
                          borderRadius: "8px",
                          backgroundColor: "var(--bg-elevated)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{m.title}</div>
                          {m.dueDate && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                              Due: {new Date(m.dueDate).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            padding: "0.2rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor: m.status === "COMPLETED" ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                            color: m.status === "COMPLETED" ? "#10b981" : "#60a5fa",
                          }}
                        >
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Metadata Panel */}
              <div style={{ backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Details</h3>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Manager / Owner</label>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                    {project.manager ? `${project.manager.firstName} ${project.manager.lastName}` : "Unassigned"}
                  </div>
                </div>
                {project.customer && (
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Customer</label>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginTop: "0.2rem" }}>
                      {project.customer.companyName || project.customer.name}
                    </div>
                  </div>
                )}
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Priority</label>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#f59e0b", marginTop: "0.2rem" }}>
                    {project.priority}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Target Date</label>
                  <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", marginTop: "0.2rem" }}>
                    {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : "No deadline"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SIX-STAGE KANBAN BOARD */}
        {activeTab === "board" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, minmax(260px, 1fr))",
              gap: "1rem",
              alignItems: "start",
              minWidth: "1600px",
              paddingBottom: "2rem",
            }}
          >
            {KANBAN_STAGES.map((col) => {
              const colTasks = tasks.filter((t) => {
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
                    backgroundColor: "var(--bg-card, #131b2e)",
                    borderRadius: "10px",
                    border: "1px solid var(--border-subtle, #1e293b)",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "calc(100vh - 220px)",
                    overflow: "hidden",
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderBottom: "1px solid var(--border-subtle, #1e293b)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      backgroundColor: "var(--bg-elevated, #182238)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: col.color }} />
                      <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{col.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "10px",
                        backgroundColor: "rgba(255, 255, 255, 0.08)",
                        fontWeight: 600,
                      }}
                    >
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Task Cards Column */}
                  <div
                    style={{
                      padding: "0.75rem",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      flex: 1,
                      minHeight: "120px",
                    }}
                  >
                    {colTasks.map((t) => (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t.id)}
                        onClick={() => setSelectedTaskId(t.id)}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "8px",
                          backgroundColor: "var(--bg-elevated, #182238)",
                          border: "1px solid var(--border-subtle, #334155)",
                          cursor: "grab",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.6rem",
                          transition: "transform 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#38bdf8")}
                        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle, #334155)")}
                      >
                        {/* Card Title & Priority */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>
                            {t.title}
                          </span>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "0.15rem 0.35rem",
                              borderRadius: "4px",
                              backgroundColor:
                                t.priority === "URGENT"
                                  ? "rgba(239, 68, 68, 0.2)"
                                  : t.priority === "HIGH"
                                  ? "rgba(245, 158, 11, 0.2)"
                                  : "rgba(59, 130, 246, 0.2)",
                              color:
                                t.priority === "URGENT"
                                  ? "#ef4444"
                                  : t.priority === "HIGH"
                                  ? "#f59e0b"
                                  : "#60a5fa",
                            }}
                          >
                            {t.priority}
                          </span>
                        </div>

                        {/* Blocker Pill */}
                        {t.isBlocked && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              fontSize: "0.7rem",
                              color: "#f59e0b",
                              backgroundColor: "rgba(245, 158, 11, 0.1)",
                              padding: "0.2rem 0.4rem",
                              borderRadius: "4px",
                            }}
                          >
                            <AlertTriangle size={12} />
                            <span>Blocked by dependencies</span>
                          </div>
                        )}

                        {/* Bottom Metadata */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            {t.dueDate && (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                                <Clock size={12} />
                                <span>{new Date(t.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                              </div>
                            )}
                            {t.checklistCount !== undefined && t.checklistCount > 0 && (
                              <div style={{ display: "flex", alignItems: "center", gap: "0.2rem" }}>
                                <CheckCircle2 size={12} color={t.completedChecklistCount === t.checklistCount ? "#10b981" : "#94a3b8"} />
                                <span>
                                  {t.completedChecklistCount}/{t.checklistCount}
                                </span>
                              </div>
                            )}
                          </div>

                          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                            {t.assigneeName ? t.assigneeName.split(" ")[0] : "—"}
                          </span>
                        </div>
                      </div>
                    ))}

                    {colTasks.length === 0 && (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic" }}>
                        Drop tasks here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: LIST VIEW */}
        {activeTab === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Filter bar */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  width: "240px",
                }}
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
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

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{
                  padding: "0.45rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-card)",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="ALL">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Task Table */}
            <div style={{ backgroundColor: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border-subtle)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "var(--bg-elevated)", borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Task Title</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Status</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Priority</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Assignee</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Due Date</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Checklist</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                        No tasks match criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTaskId(t.id)}
                        style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background-color 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-elevated)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "var(--text-primary)" }}>{t.title}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              padding: "0.2rem 0.5rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              backgroundColor: t.status === "done" ? "rgba(16, 185, 129, 0.15)" : "rgba(59, 130, 246, 0.15)",
                              color: t.status === "done" ? "#10b981" : "#60a5fa",
                            }}
                          >
                            {t.status.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>{t.priority}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>{t.assigneeName || "—"}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {t.checklistCount ? `${t.completedChecklistCount || 0}/${t.checklistCount}` : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CALENDAR */}
        {activeTab === "calendar" && (
          <div style={{ backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Project Task Calendar</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.5rem" }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} style={{ padding: "0.5rem", textAlign: "center", fontWeight: 700, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {d}
                </div>
              ))}
              {Array.from({ length: 35 }).map((_, i) => {
                const dayNum = i + 1;
                return (
                  <div
                    key={i}
                    style={{
                      height: "90px",
                      backgroundColor: "var(--bg-elevated)",
                      borderRadius: "6px",
                      padding: "0.4rem",
                      border: "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{dayNum <= 31 ? dayNum : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: TIMELINE / ROADMAP */}
        {activeTab === "timeline" && (
          <div style={{ backgroundColor: "var(--bg-card)", padding: "1.5rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Roadmap & Timeline</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {tasks.slice(0, 10).map((t) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: "200px", fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.title}
                  </div>
                  <div style={{ flex: 1, height: "24px", backgroundColor: "var(--bg-elevated)", borderRadius: "4px", position: "relative", overflow: "hidden" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "10%",
                        width: "50%",
                        height: "100%",
                        backgroundColor: t.status === "done" ? "#10b981" : "#3b82f6",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        paddingLeft: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#fff",
                      }}
                    >
                      {t.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
              {[
                { label: "Total Tasks", val: dashboard?.totalTasks ?? tasks.length, color: "#60a5fa" },
                { label: "Completed", val: dashboard?.completedTasks ?? 0, color: "#10b981" },
                { label: "In Progress", val: dashboard?.inProgressTasks ?? 0, color: "#818cf8" },
                { label: "Review", val: dashboard?.reviewTasks ?? 0, color: "#f59e0b" },
                { label: "Blocked", val: dashboard?.blockedTasks ?? 0, color: "#ef4444" },
                { label: "Overdue", val: dashboard?.overdueTasks ?? 0, color: "#f43f5e" },
              ].map((m) => (
                <div key={m.label} style={{ backgroundColor: "var(--bg-card)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>{m.label.toUpperCase()}</span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 700, color: m.color, marginTop: "0.3rem" }}>{m.val}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: MILESTONES */}
        {activeTab === "milestones" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Project Milestones</h3>
              <button
                onClick={() => setShowCreateMilestoneModal(true)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Milestone
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1rem" }}>
              {milestones.map((m) => (
                <div key={m.id} style={{ backgroundColor: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>{m.title}</h4>
                    <span style={{ padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem", backgroundColor: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
                      {m.status}
                    </span>
                  </div>
                  {m.dueDate && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                      Due Date: {new Date(m.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: MEMBERS */}
        {activeTab === "members" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Team Members</h3>
              <button
                onClick={() => setShowAddMemberModal(true)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "6px",
                  backgroundColor: "#2563eb",
                  color: "#fff",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Add Member
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
              {members.map((mem) => (
                <div key={mem.id} style={{ backgroundColor: "var(--bg-card)", padding: "1.25rem", borderRadius: "10px", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: "0.9rem", fontWeight: 700 }}>{mem.user ? `${mem.user.firstName} ${mem.user.lastName}` : "User"}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>{mem.user?.email}</div>
                    <span style={{ display: "inline-block", marginTop: "0.5rem", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", backgroundColor: "rgba(139, 92, 246, 0.15)", color: "#c084fc", fontWeight: 600 }}>
                      {mem.role}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(mem.userId)}
                    style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.4rem" }}
                  >
                    <X size={16} />
                  </button>
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
          onTaskUpdated={() => loadProjectData()}
          onTaskDeleted={() => {
            setSelectedTaskId(null);
            loadProjectData();
          }}
        />
      )}

      {/* Quick Task Creation Modal */}
      {showCreateTaskModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: "100%", maxWidth: "480px", backgroundColor: "var(--bg-card)", borderRadius: "10px", padding: "1.5rem", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Create New Task</h3>
              <button onClick={() => setShowCreateTaskModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
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
                <button type="button" onClick={() => setShowCreateTaskModal(false)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#2563eb", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Milestone Modal */}
      {showCreateMilestoneModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: "100%", maxWidth: "460px", backgroundColor: "var(--bg-card)", borderRadius: "10px", padding: "1.5rem", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>New Milestone</h3>
              <button onClick={() => setShowCreateMilestoneModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateMilestone} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Title</label>
                <input
                  type="text"
                  required
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. Beta Release 1.0"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Description</label>
                <textarea
                  value={newMilestoneDesc}
                  onChange={(e) => setNewMilestoneDesc(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Due Date</label>
                <input
                  type="date"
                  value={newMilestoneDueDate}
                  onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowCreateMilestoneModal(false)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#2563eb", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ width: "100%", maxWidth: "440px", backgroundColor: "var(--bg-card)", borderRadius: "10px", padding: "1.5rem", border: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>Add Project Member</h3>
              <button onClick={() => setShowAddMemberModal(false)} style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddMember} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>User Email</label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="colleague@omnidesk.ai"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>Role</label>
                <select
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", color: "var(--text-primary)" }}
                >
                  <option value="CONTRIBUTOR">Contributor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: "0.5rem 1rem", borderRadius: "6px", background: "#2563eb", border: "none", color: "#fff", fontWeight: 600, cursor: "pointer" }}>
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
