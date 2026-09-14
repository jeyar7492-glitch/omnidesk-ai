import React, { useEffect, useState, useMemo } from "react";
import { apiClient } from "../../api/client";
import { ProjectSummary } from "@omnidesk/shared-types";
import {
  Plus,
  RefreshCw,
  Search,
  Archive,
  RotateCcw,
  Clock,
  ArrowRight,
  FolderKanban,
  X,
  ShieldAlert,
} from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { ProjectWorkspaceView } from "./ProjectWorkspaceView";

export const ProjectsView: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active workspace drilldown
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [showArchived, setShowArchived] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 12;

  // New Project Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [newStartDate, setNewStartDate] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");
  const [newBudget, setNewBudget] = useState<number | "">("");
  const [creating, setCreating] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getProjects({
        isArchived: showArchived ? true : false,
      });
      setProjects(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [showArchived]);

  // Live WebSocket subscriptions
  useLiveEvents("project:created", () => fetchProjects());
  useLiveEvents("project.created", () => fetchProjects());
  useLiveEvents("project:updated", () => fetchProjects());
  useLiveEvents("project.updated", () => fetchProjects());
  useLiveEvents("project:archived", () => fetchProjects());
  useLiveEvents("project.archived", () => fetchProjects());

  // Archive / Restore
  const handleToggleArchive = async (e: React.MouseEvent, p: ProjectSummary) => {
    e.stopPropagation();
    try {
      setError(null);
      if (p.isArchived) {
        await apiClient.restoreProject(p.id);
      } else {
        if (!window.confirm(`Archive project '${p.name}'?`)) return;
        await apiClient.archiveProject(p.id, "Archived from project list");
      }
      fetchProjects();
    } catch (err: any) {
      setError(err.message || "Operation failed");
    }
  };

  // Create project form submit
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      setCreating(true);
      setError(null);
      const created = await apiClient.createProject({
        name: newName.trim(),
        key: newKey.trim() || undefined,
        description: newDescription.trim() || undefined,
        priority: newPriority,
        startDate: newStartDate ? new Date(newStartDate).toISOString() : undefined,
        targetDate: newTargetDate ? new Date(newTargetDate).toISOString() : undefined,
        budget: newBudget !== "" ? Number(newBudget) : undefined,
      });
      setShowCreateModal(false);
      setNewName("");
      setNewKey("");
      setNewDescription("");
      setNewStartDate("");
      setNewTargetDate("");
      setNewBudget("");
      fetchProjects();
      setActiveProjectId(created.id);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  // Filtered & Paginated projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.key && p.key.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));
      const matchStatus = statusFilter === "ALL" || p.status.toUpperCase() === statusFilter.toUpperCase();
      const matchPriority = priorityFilter === "ALL" || p.priority === priorityFilter;
      return matchQuery && matchStatus && matchPriority;
    });
  }, [projects, search, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filteredProjects.length / perPage) || 1;
  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * perPage;
    return filteredProjects.slice(start, start + perPage);
  }, [filteredProjects, page, perPage]);

  // If a project workspace is active, render ProjectWorkspaceView
  if (activeProjectId) {
    return (
      <ProjectWorkspaceView
        projectId={activeProjectId}
        onBack={() => {
          setActiveProjectId(null);
          fetchProjects();
        }}
      />
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Projects & Roadmaps
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.25rem", margin: 0 }}>
            Manage enterprise roadmaps, cross-functional initiatives, and real-time execution health.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              backgroundColor: "#2563eb",
              color: "#fff",
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              border: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> New Project
          </button>
          <button
            onClick={fetchProjects}
            title="Refresh"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--bg-card)",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} className={loading ? "pulse-animation" : ""} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderRadius: "8px",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <ShieldAlert size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters Toolbar */}
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: "220px" }}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search projects by name, key, or details..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "0.4rem 0.6rem",
            borderRadius: "6px",
            backgroundColor: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
          }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PLANNING">Planning</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setPage(1);
          }}
          style={{
            padding: "0.4rem 0.6rem",
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

        {/* Show archived toggle */}
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => {
              setShowArchived(e.target.checked);
              setPage(1);
            }}
          />
          Show Archived
        </label>
      </div>

      {/* Projects Grid */}
      {loading && projects.length === 0 ? (
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
          <RefreshCw size={24} className="pulse-animation" />
          <p style={{ marginTop: "0.75rem" }}>Loading projects...</p>
        </div>
      ) : paginatedProjects.length === 0 ? (
        <div
          style={{
            padding: "4rem",
            textAlign: "center",
            backgroundColor: "var(--bg-card)",
            borderRadius: "10px",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-muted)",
          }}
        >
          <FolderKanban size={40} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <h3 style={{ fontSize: "1.1rem", color: "var(--text-primary)", margin: 0 }}>No projects found</h3>
          <p style={{ fontSize: "0.85rem", marginTop: "0.4rem" }}>
            {search || statusFilter !== "ALL"
              ? "Try adjusting your search criteria or filters."
              : "Get started by creating your first enterprise project."}
          </p>
          {!search && statusFilter === "ALL" && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                backgroundColor: "#2563eb",
                color: "#fff",
                border: "none",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + Create Project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.25rem" }}>
          {paginatedProjects.map((p) => (
            <div
              key={p.id}
              onClick={() => setActiveProjectId(p.id)}
              style={{
                backgroundColor: "var(--bg-card)",
                borderRadius: "10px",
                border: "1px solid var(--border-subtle)",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                cursor: "pointer",
                transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-subtle)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Card Header: Key, Priority, Status */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    style={{
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      backgroundColor: "rgba(59, 130, 246, 0.15)",
                      color: "#60a5fa",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                    }}
                  >
                    {p.key || "PRJ"}
                  </span>
                  <span
                    style={{
                      padding: "0.15rem 0.45rem",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor:
                        p.priority === "URGENT"
                          ? "rgba(239, 68, 68, 0.15)"
                          : p.priority === "HIGH"
                          ? "rgba(245, 158, 11, 0.15)"
                          : "rgba(100, 116, 139, 0.15)",
                      color:
                        p.priority === "URGENT"
                          ? "#ef4444"
                          : p.priority === "HIGH"
                          ? "#f59e0b"
                          : "#94a3b8",
                    }}
                  >
                    {p.priority}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span
                    style={{
                      padding: "0.2rem 0.5rem",
                      borderRadius: "12px",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      backgroundColor:
                        p.status === "COMPLETED"
                          ? "rgba(16, 185, 129, 0.15)"
                          : p.status === "CANCELLED"
                          ? "rgba(239, 68, 68, 0.15)"
                          : "rgba(59, 130, 246, 0.15)",
                      color:
                        p.status === "COMPLETED"
                          ? "#10b981"
                          : p.status === "CANCELLED"
                          ? "#ef4444"
                          : "#60a5fa",
                    }}
                  >
                    {p.status}
                  </span>
                  <button
                    onClick={(e) => handleToggleArchive(e, p)}
                    title={p.isArchived ? "Restore Project" : "Archive Project"}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      padding: "0.2rem",
                    }}
                  >
                    {p.isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
                  </button>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
                  {p.name}
                </h3>
                <p
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    margin: "0.35rem 0 0 0",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    lineHeight: 1.4,
                  }}
                >
                  {p.description || "No description provided."}
                </p>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.3rem" }}>
                  <span style={{ color: "var(--text-muted)" }}>Progress</span>
                  <span style={{ fontWeight: 600, color: "#38bdf8" }}>{p.progress}%</span>
                </div>
                <div style={{ height: "6px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${p.progress}%`,
                      backgroundColor: p.progress === 100 ? "#10b981" : "#38bdf8",
                    }}
                  />
                </div>
              </div>

              {/* Footer: Manager, Date, Open Link */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                }}
              >
                <div>
                  {p.targetDate ? (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Clock size={12} />
                      <span>Due {new Date(p.targetDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  ) : (
                    <span>No deadline</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "#60a5fa", fontWeight: 600 }}>
                  <span>Open Workspace</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem", marginTop: "1rem" }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: page === 1 ? "var(--text-muted)" : "var(--text-primary)",
              cursor: page === 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              color: page === totalPages ? "var(--text-muted)" : "var(--text-primary)",
              cursor: page === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "var(--bg-card)",
              borderRadius: "12px",
              border: "1px solid var(--border-subtle)",
              padding: "1.75rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Create Enterprise Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. NextGen Core Cloud Architecture"
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Project Key (Optional)
                  </label>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                    placeholder="e.g. CLOUD"
                    maxLength={10}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.55rem 0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Outline key objectives, deliverables, and scope..."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                      color: "var(--text-primary)",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Budget ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newBudget}
                  onChange={(e) => setNewBudget(e.target.value ? Number(e.target.value) : "")}
                  placeholder="e.g. 50000"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "6px",
                    backgroundColor: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newName.trim()}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: "6px",
                    backgroundColor: "#2563eb",
                    border: "none",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {creating ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
