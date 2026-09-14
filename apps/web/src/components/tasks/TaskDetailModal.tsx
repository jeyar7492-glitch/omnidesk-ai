import React, { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { TaskDetail } from "@omnidesk/shared-types";
import {
  X,
  Calendar,
  Clock,
  User,
  AlertTriangle,
  CheckSquare,
  MessageSquare,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onTaskUpdated?: () => void;
  onTaskDeleted?: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  taskId,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedHours, setEstimatedHours] = useState<number | "">("");
  const [actualHours, setActualHours] = useState<number | "">("");

  // Checklists
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [checklistLoading, setChecklistLoading] = useState(false);

  // Dependencies
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [selectedDepId, setSelectedDepId] = useState("");
  const [depLoading, setDepLoading] = useState(false);

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getTask(taskId);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || "");
      setStatus(data.status);
      setPriority(data.priority);
      setStartDate(data.startDate ? data.startDate.substring(0, 10) : "");
      setDueDate(data.dueDate ? data.dueDate.substring(0, 10) : "");
      setEstimatedHours(data.estimatedHours ?? "");
      setActualHours(data.actualHours ?? "");

      // Load comments
      const comms = await apiClient.getComments(taskId).catch(() => []);
      setComments(comms);

      // Load sibling tasks for dependency selection
      if (data.projectId) {
        const siblingRes = await apiClient.getTasks({ projectId: data.projectId, limit: 100 }).catch(() => []);
        setProjectTasks(siblingRes.filter((t: any) => t.id !== taskId));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load task details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Live WebSocket updates
  useLiveEvents("task.updated", (evt: any) => {
    if (evt?.taskId === taskId) {
      fetchTaskDetails();
    }
  });
  useLiveEvents("task.comment.created", (evt: any) => {
    if (evt?.taskId === taskId) {
      apiClient.getComments(taskId).then(setComments).catch(() => {});
    }
  });
  useLiveEvents("task.comment.deleted", (evt: any) => {
    if (evt?.taskId === taskId) {
      apiClient.getComments(taskId).then(setComments).catch(() => {});
    }
  });
  useLiveEvents("task.checklist.updated", (evt: any) => {
    if (evt?.taskId === taskId) {
      fetchTaskDetails();
    }
  });
  useLiveEvents("task.dependency.updated", (evt: any) => {
    if (evt?.taskId === taskId) {
      fetchTaskDetails();
    }
  });

  const handleUpdateField = async (fields: Record<string, any>) => {
    try {
      setError(null);
      await apiClient.updateTask(taskId, fields);
      if (onTaskUpdated) onTaskUpdated();
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Failed to update task");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setError(null);
      await apiClient.moveTask(taskId, newStatus);
      setStatus(newStatus);
      if (onTaskUpdated) onTaskUpdated();
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Cannot transition to selected status");
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this task?")) return;
    try {
      await apiClient.deleteTask(taskId);
      if (onTaskDeleted) onTaskDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete task");
    }
  };

  // Checklist handlers
  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    try {
      setChecklistLoading(true);
      await apiClient.addChecklist(taskId, { title: newChecklistTitle.trim() });
      setNewChecklistTitle("");
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Failed to add checklist item");
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleToggleChecklist = async (checklistId: string, currentStatus: boolean) => {
    try {
      await apiClient.updateChecklistItem(taskId, checklistId, { isCompleted: !currentStatus });
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Failed to update checklist item");
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      await apiClient.deleteChecklistItem(taskId, checklistId);
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Failed to delete checklist item");
    }
  };

  // Dependency handlers
  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepId) return;
    try {
      setDepLoading(true);
      setError(null);
      await apiClient.addDependency(taskId, selectedDepId);
      setSelectedDepId("");
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Failed to add dependency");
    } finally {
      setDepLoading(false);
    }
  };

  const handleRemoveDependency = async (depId: string) => {
    try {
      setError(null);
      await apiClient.removeDependency(taskId, depId);
      fetchTaskDetails();
    } catch (err: any) {
      setError(err.message || "Failed to remove dependency");
    }
  };

  // Comment handlers
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setCommentSubmitting(true);
      setError(null);
      await apiClient.addComment(taskId, newComment.trim());
      setNewComment("");
      const comms = await apiClient.getComments(taskId);
      setComments(comms);
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiClient.deleteComment(taskId, commentId);
      const comms = await apiClient.getComments(taskId);
      setComments(comms);
    } catch (err: any) {
      setError(err.message || "Failed to delete comment");
    }
  };

  const totalChecklists = task?.checklists?.length || 0;
  const completedChecklists = task?.checklists?.filter((c) => c.isCompleted).length || 0;
  const checklistPercent = totalChecklists > 0 ? Math.round((completedChecklists / totalChecklists) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(10, 14, 26, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "1.5rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          maxHeight: "92vh",
          backgroundColor: "var(--bg-card, #131b2e)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle, #1e293b)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle, #1e293b)",
            backgroundColor: "var(--bg-elevated, #182238)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {task?.project && (
              <span
                style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.3)",
                }}
              >
                {task.project.key || task.project.name}
              </span>
            )}
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>
              Task #{taskId.slice(-6).toUpperCase()}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={handleDeleteTask}
              title="Delete Task"
              style={{
                background: "transparent",
                border: "none",
                color: "#ef4444",
                cursor: "pointer",
                padding: "0.4rem",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-secondary, #94a3b8)",
                cursor: "pointer",
                padding: "0.4rem",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              borderBottom: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ShieldAlert size={16} />
            {error}
          </div>
        )}

        {/* Blocker Alert */}
        {task?.isBlocked && (
          <div
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "rgba(245, 158, 11, 0.15)",
              borderBottom: "1px solid rgba(245, 158, 11, 0.3)",
              color: "#fcd34d",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertTriangle size={16} />
            <span>
              <strong>Blocked:</strong> {task.blockedReason || "This task has unfinished blocking dependencies."}
            </span>
          </div>
        )}

        {/* Content Body */}
        {loading && !task ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading task details...
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1.5rem",
              display: "grid",
              gridTemplateColumns: "1fr 280px",
              gap: "1.5rem",
            }}
          >
            {/* Left Column: Title, Description, Checklists, Dependencies, Comments */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Title Editable */}
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    if (title.trim() && title !== task?.title) {
                      handleUpdateField({ title: title.trim() });
                    }
                  }}
                  placeholder="Task title..."
                  style={{
                    width: "100%",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--text-primary, #f8fafc)",
                    backgroundColor: "transparent",
                    border: "1px solid transparent",
                    borderRadius: "6px",
                    padding: "0.35rem 0.5rem",
                    outline: "none",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--border-subtle, #334155)")}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary, #94a3b8)", marginBottom: "0.35rem", display: "block" }}>
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => {
                    if (description !== task?.description) {
                      handleUpdateField({ description });
                    }
                  }}
                  placeholder="Add detailed task description, acceptance criteria, or technical specifications..."
                  rows={4}
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    color: "var(--text-primary, #f8fafc)",
                    backgroundColor: "var(--bg-elevated, #182238)",
                    border: "1px solid var(--border-subtle, #334155)",
                    borderRadius: "6px",
                    padding: "0.65rem",
                    resize: "vertical",
                    outline: "none",
                  }}
                />
              </div>

              {/* Checklist Section */}
              <div
                style={{
                  backgroundColor: "var(--bg-elevated, #182238)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle, #334155)",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <CheckSquare size={16} color="#38bdf8" />
                    <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Checklist</span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.25rem" }}>
                      ({completedChecklists}/{totalChecklists})
                    </span>
                  </div>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#38bdf8" }}>{checklistPercent}%</span>
                </div>

                {/* Progress bar */}
                <div style={{ height: "6px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${checklistPercent}%`,
                      backgroundColor: checklistPercent === 100 ? "#10b981" : "#38bdf8",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                {/* Checklist items */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {task?.checklists?.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "6px",
                        backgroundColor: "rgba(255, 255, 255, 0.02)",
                      }}
                    >
                      <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", flex: 1 }}>
                        <input
                          type="checkbox"
                          checked={item.isCompleted}
                          onChange={() => handleToggleChecklist(item.id, item.isCompleted)}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                        <span
                          style={{
                            fontSize: "0.85rem",
                            textDecoration: item.isCompleted ? "line-through" : "none",
                            color: item.isCompleted ? "var(--text-muted, #64748b)" : "var(--text-primary, #f8fafc)",
                          }}
                        >
                          {item.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteChecklist(item.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "0.2rem",
                        }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add checklist item form */}
                <form onSubmit={handleAddChecklist} style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                  <input
                    type="text"
                    value={newChecklistTitle}
                    onChange={(e) => setNewChecklistTitle(e.target.value)}
                    placeholder="Add an action item..."
                    disabled={checklistLoading}
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      padding: "0.4rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle, #334155)",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    disabled={checklistLoading || !newChecklistTitle.trim()}
                    style={{
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      border: "none",
                      backgroundColor: "var(--primary-btn, #2563eb)",
                      color: "#fff",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                    }}
                  >
                    <Plus size={14} /> Add
                  </button>
                </form>
              </div>

              {/* Dependencies Section */}
              <div
                style={{
                  backgroundColor: "var(--bg-elevated, #182238)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle, #334155)",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <ExternalLink size={16} color="#a855f7" />
                  <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Task Dependencies</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    ({task?.resolvedDependencies?.length || 0})
                  </span>
                </div>

                {/* Dependency list */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.75rem" }}>
                  {task?.resolvedDependencies && task.resolvedDependencies.length > 0 ? (
                    task.resolvedDependencies.map((dep) => (
                      <div
                        key={dep.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                          <span
                            style={{
                              padding: "0.15rem 0.4rem",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              backgroundColor: dep.isCompleted ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
                              color: dep.isCompleted ? "#10b981" : "#f59e0b",
                            }}
                          >
                            {dep.status.toUpperCase()}
                          </span>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{dep.title}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({dep.assigneeName})</span>
                        </div>
                        <button
                          onClick={() => handleRemoveDependency(dep.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "0.2rem",
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No blocking dependencies defined.
                    </div>
                  )}
                </div>

                {/* Add dependency form */}
                {projectTasks.length > 0 && (
                  <form onSubmit={handleAddDependency} style={{ display: "flex", gap: "0.5rem" }}>
                    <select
                      value={selectedDepId}
                      onChange={(e) => setSelectedDepId(e.target.value)}
                      disabled={depLoading}
                      style={{
                        flex: 1,
                        fontSize: "0.8rem",
                        padding: "0.4rem 0.6rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle, #334155)",
                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                        color: "var(--text-primary)",
                        outline: "none",
                      }}
                    >
                      <option value="">Select prerequisite task...</option>
                      {projectTasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.status})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={depLoading || !selectedDepId}
                      style={{
                        padding: "0.4rem 0.75rem",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#8b5cf6",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Plus size={14} /> Add Blocker
                    </button>
                  </form>
                )}
              </div>

              {/* Comments Section */}
              <div
                style={{
                  backgroundColor: "var(--bg-elevated, #182238)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-subtle, #334155)",
                  padding: "1rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
                  <MessageSquare size={16} color="#60a5fa" />
                  <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Comments & Activity</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({comments.length})</span>
                </div>

                {/* Comments feed */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                  {comments.length > 0 ? (
                    comments.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: "0.6rem 0.8rem",
                          borderRadius: "6px",
                          backgroundColor: "rgba(255, 255, 255, 0.02)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#93c5fd" }}>
                            {c.user ? `${c.user.firstName} ${c.user.lastName}` : "User"}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                padding: "0.1rem",
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", margin: 0, whiteSpace: "pre-wrap" }}>
                          {c.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                      No comments yet. Start the conversation below.
                    </div>
                  )}
                </div>

                {/* Add comment form */}
                <form onSubmit={handleAddComment}>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment or update..."
                    rows={2}
                    disabled={commentSubmitting}
                    style={{
                      width: "100%",
                      fontSize: "0.85rem",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle, #334155)",
                      backgroundColor: "rgba(0, 0, 0, 0.2)",
                      color: "var(--text-primary)",
                      outline: "none",
                      resize: "vertical",
                      marginBottom: "0.5rem",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      disabled={commentSubmitting || !newComment.trim()}
                      style={{
                        padding: "0.4rem 1rem",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {commentSubmitting ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Column: Status, Priority, Assignee, Dates, Estimates */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                borderLeft: "1px solid var(--border-subtle, #1e293b)",
                paddingLeft: "1.25rem",
              }}
            >
              {/* Status */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle, #334155)",
                    backgroundColor: "var(--bg-elevated, #182238)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                >
                  <option value="backlog">Backlog</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    handleUpdateField({ priority: e.target.value });
                  }}
                  style={{
                    width: "100%",
                    fontSize: "0.85rem",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle, #334155)",
                    backgroundColor: "var(--bg-elevated, #182238)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Assignee
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.45rem 0.6rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border-subtle, #334155)",
                    backgroundColor: "var(--bg-elevated, #182238)",
                    fontSize: "0.85rem",
                    color: "var(--text-primary)",
                  }}
                >
                  <User size={14} color="#94a3b8" />
                  <span>
                    {task?.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Unassigned"}
                  </span>
                </div>
              </div>

              {/* Dates */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Start Date
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Calendar size={14} color="#94a3b8" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onBlur={() => {
                      if (startDate !== (task?.startDate ? task.startDate.substring(0, 10) : "")) {
                        handleUpdateField({ startDate: startDate ? new Date(startDate).toISOString() : null });
                      }
                    }}
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle, #334155)",
                      backgroundColor: "var(--bg-elevated, #182238)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Due Date
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Calendar size={14} color="#94a3b8" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    onBlur={() => {
                      if (dueDate !== (task?.dueDate ? task.dueDate.substring(0, 10) : "")) {
                        handleUpdateField({ dueDate: dueDate ? new Date(dueDate).toISOString() : null });
                      }
                    }}
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle, #334155)",
                      backgroundColor: "var(--bg-elevated, #182238)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Hours */}
              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Estimated Hours
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock size={14} color="#94a3b8" />
                  <input
                    type="number"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(e.target.value ? Number(e.target.value) : "")}
                    onBlur={() => {
                      const num = estimatedHours === "" ? null : Number(estimatedHours);
                      if (num !== task?.estimatedHours) {
                        handleUpdateField({ estimatedHours: num });
                      }
                    }}
                    placeholder="e.g. 8"
                    min={0}
                    step={0.5}
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle, #334155)",
                      backgroundColor: "var(--bg-elevated, #182238)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
                  Actual Hours
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Clock size={14} color="#94a3b8" />
                  <input
                    type="number"
                    value={actualHours}
                    onChange={(e) => setActualHours(e.target.value ? Number(e.target.value) : "")}
                    onBlur={() => {
                      const num = actualHours === "" ? null : Number(actualHours);
                      if (num !== task?.actualHours) {
                        handleUpdateField({ actualHours: num });
                      }
                    }}
                    placeholder="e.g. 6.5"
                    min={0}
                    step={0.5}
                    style={{
                      flex: 1,
                      fontSize: "0.8rem",
                      padding: "0.35rem 0.5rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle, #334155)",
                      backgroundColor: "var(--bg-elevated, #182238)",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
