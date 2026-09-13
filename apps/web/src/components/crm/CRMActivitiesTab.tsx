import React, { useEffect, useState } from "react";
import { CRMActivitySummary, PaginatedResponse } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Search,
  CheckCircle2,
  Circle,
  Phone,
  Mail,
  Calendar,
  FileText,
  Trash2,
  RefreshCw,
} from "lucide-react";

export const CRMActivitiesTab: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CRMActivitySummary>>({
    items: [],
    total: 0,
    page: 1,
    limit: 15,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [type, setType] = useState("");
  const [isCompleted, setIsCompleted] = useState("");
  const [page, setPage] = useState(1);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getActivitiesPaginated({
        search: search.trim() || undefined,
        entityType: entityType || undefined,
        type: type || undefined,
        isCompleted: isCompleted || undefined,
        page,
        limit: 15,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load CRM activities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [search, entityType, type, isCompleted, page]);

  const handleToggleComplete = async (act: CRMActivitySummary) => {
    try {
      await apiClient.updateActivity(act.id, {
        isCompleted: !act.isCompleted,
      });
      fetchActivities();
    } catch (err: any) {
      alert(err.message || "Failed to update activity status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this activity?")) return;
    try {
      await apiClient.deleteActivity(id);
      fetchActivities();
    } catch (err: any) {
      alert(err.message || "Failed to delete activity");
    }
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Search & Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              width: "240px",
            }}
          >
            <Search size={14} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search activities..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", width: "100%" }}
            />
          </div>

          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Entities</option>
            <option value="lead">Leads</option>
            <option value="deal">Deals</option>
            <option value="customer">Customers</option>
            <option value="contact">Contacts</option>
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Types</option>
            <option value="call">Call</option>
            <option value="email">Email</option>
            <option value="meeting">Meeting</option>
            <option value="note">Note</option>
            <option value="follow_up">Follow Up</option>
          </select>

          <select
            value={isCompleted}
            onChange={(e) => {
              setIsCompleted(e.target.value);
              setPage(1);
            }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All Statuses</option>
            <option value="false">Pending</option>
            <option value="true">Completed</option>
          </select>
        </div>

        <button
          onClick={fetchActivities}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            padding: "0.45rem 0.75rem",
            borderRadius: "6px",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw size={13} className={loading ? "pulse-animation" : ""} /> Refresh
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

      {/* Activity List */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {data.items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {loading ? "Loading CRM activities..." : "No activities found matching criteria."}
          </div>
        ) : (
          data.items.map((act) => (
            <div
              key={act.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                padding: "0.85rem 1rem",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                opacity: act.isCompleted ? 0.65 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", flex: 1 }}>
                <button
                  onClick={() => handleToggleComplete(act)}
                  title={act.isCompleted ? "Mark incomplete" : "Mark completed"}
                  style={{ marginTop: "2px", color: act.isCompleted ? "var(--status-online)" : "var(--text-muted)" }}
                >
                  {act.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </button>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1 }}>
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
                        fontSize: "0.7rem",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px",
                        background: "var(--bg-card)",
                        color: "var(--brand-cyan)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {act.entityType}
                    </span>

                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: "0.9rem",
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
          ))
        )}

        {/* Pagination Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.5rem",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            borderTop: "1px solid var(--border-subtle)",
            marginTop: "0.5rem",
          }}
        >
          <div>
            Showing {data.items.length} of {data.total} activities
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                padding: "0.3rem 0.6rem",
                borderRadius: "4px",
                opacity: page <= 1 ? 0.5 : 1,
              }}
            >
              Previous
            </button>
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            <button
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-subtle)",
                padding: "0.3rem 0.6rem",
                borderRadius: "4px",
                opacity: page >= data.totalPages ? 0.5 : 1,
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
