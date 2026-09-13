import React, { useState } from "react";
import { CRMActivitySummary } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import { CheckCircle2, Circle, Clock, Phone, Mail, Calendar, FileText, Plus, Trash2 } from "lucide-react";

interface CRMActivityTimelineProps {
  entityType?: "lead" | "deal" | "customer" | "contact";
  entityId?: string;
  activities: CRMActivitySummary[];
  onActivityChanged: () => void;
}

export const CRMActivityTimeline: React.FC<CRMActivityTimelineProps> = ({
  entityType,
  entityId,
  activities,
  onActivityChanged,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<string>("note");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const getActivityIcon = (actType: string) => {
    switch (actType) {
      case "call":
        return <Phone size={14} style={{ color: "#38bdf8" }} />;
      case "email":
        return <Mail size={14} style={{ color: "#a78bfa" }} />;
      case "meeting":
        return <Calendar size={14} style={{ color: "#34d399" }} />;
      case "note":
      default:
        return <FileText size={14} style={{ color: "#f59e0b" }} />;
    }
  };

  const handleToggleComplete = async (activity: CRMActivitySummary) => {
    try {
      await apiClient.updateActivity(activity.id, {
        isCompleted: !activity.isCompleted,
      });
      onActivityChanged();
    } catch (err: any) {
      setError(err.message || "Failed to update activity");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    try {
      await apiClient.deleteActivity(id);
      onActivityChanged();
    } catch (err: any) {
      setError(err.message || "Failed to delete activity");
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Activity title is required");
      return;
    }
    if (!entityType || !entityId) {
      setError("Entity context missing");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiClient.createActivity({
        entityType,
        entityId,
        title: title.trim(),
        content: content.trim() || undefined,
        type,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setTitle("");
      setContent("");
      setType("note");
      setDueDate("");
      setShowAddForm(false);
      onActivityChanged();
    } catch (err: any) {
      setError(err.message || "Failed to log activity");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header & Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Clock size={16} style={{ color: "var(--brand-cyan)" }} />
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Activity Timeline ({activities.length})
          </h4>
        </div>

        {entityType && entityId && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              background: showAddForm ? "var(--bg-card-hover)" : "var(--brand-blue)",
              color: "#fff",
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            <Plus size={13} /> {showAddForm ? "Cancel" : "Log Activity"}
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid var(--status-danger)",
            color: "#fca5a5",
            fontSize: "0.8rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateActivity}
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 180px", gap: "0.5rem" }}>
            <input
              type="text"
              placeholder="Activity title (e.g. Call with VP of Sales)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "0.5rem 0.75rem",
                fontSize: "0.85rem",
                color: "var(--text-primary)",
              }}
            />

            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-primary)",
              }}
            >
              <option value="note">Note</option>
              <option value="call">Call</option>
              <option value="meeting">Meeting</option>
              <option value="email">Email</option>
              <option value="follow_up">Follow Up</option>
            </select>

            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "6px",
                padding: "0.5rem",
                fontSize: "0.85rem",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <textarea
            placeholder="Details or notes regarding this interaction..."
            rows={2}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              resize: "vertical",
            }}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-subtle)",
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
                color: "var(--text-secondary)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: "var(--brand-cyan)",
                color: "#0a0c10",
                fontWeight: 600,
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.8rem",
              }}
            >
              {submitting ? "Saving..." : "Save Activity"}
            </button>
          </div>
        </form>
      )}

      {/* Timeline List */}
      {activities.length === 0 ? (
        <div
          style={{
            padding: "1.5rem",
            textAlign: "center",
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            background: "var(--bg-secondary)",
            borderRadius: "8px",
            border: "1px dashed var(--border-subtle)",
          }}
        >
          No logged activities yet. Track interactions, calls, and follow-ups here.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {activities.map((act) => (
            <div
              key={act.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                opacity: act.isCompleted ? 0.7 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1 }}>
                <button
                  onClick={() => handleToggleComplete(act)}
                  title={act.isCompleted ? "Mark incomplete" : "Mark completed"}
                  style={{ marginTop: "2px", color: act.isCompleted ? "var(--status-online)" : "var(--text-muted)" }}
                >
                  {act.isCompleted ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {getActivityIcon(act.type)}
                      {act.type}
                    </span>

                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.88rem",
                        color: act.isCompleted ? "var(--text-muted)" : "var(--text-primary)",
                        textDecoration: act.isCompleted ? "line-through" : "none",
                      }}
                    >
                      {act.title}
                    </span>
                  </div>

                  {act.content && (
                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                      {act.content}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "1rem", fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                    {act.dueDate && (
                      <span style={{ color: new Date(act.dueDate) < new Date() && !act.isCompleted ? "var(--status-danger)" : "var(--text-muted)" }}>
                        Due: {new Date(act.dueDate).toLocaleDateString()} {new Date(act.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    <span>Logged {new Date(act.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(act.id)}
                title="Delete Activity"
                style={{
                  color: "var(--text-muted)",
                  padding: "0.25rem",
                  borderRadius: "4px",
                  marginLeft: "0.5rem",
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
