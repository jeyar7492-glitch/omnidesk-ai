import React, { useEffect, useState } from "react";
import { CRMDealSummary, DealDetail, CRMCustomerSummary, PaginatedResponse } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Briefcase,
  Search,
  Plus,
  Building2,
  Edit2,
  Archive,
  Trash2,
  X,
  RefreshCw,
} from "lucide-react";
import { CRMActivityTimeline } from "./CRMActivityTimeline";

export const CRMDealsTab: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CRMDealSummary>>({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [customers, setCustomers] = useState<CRMCustomerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);

  // Modals & Detail
  const [selectedDeal, setSelectedDeal] = useState<DealDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CRMDealSummary | null>(null);

  // Create/Edit Form State
  const [formData, setFormData] = useState({
    title: "",
    dealValue: 25000,
    currency: "USD",
    probability: 40,
    stage: "QUALIFICATION",
    priority: "MEDIUM",
    expectedClose: "",
    customerId: "",
    contactId: "",
    notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchDependencies = async () => {
    try {
      const custList = await apiClient.getCustomers({ limit: 100 }).catch(() => []);
      setCustomers(custList);
    } catch {
      // ignore
    }
  };

  const fetchDeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getDealsPaginated({
        search: search.trim() || undefined,
        stage: stage || undefined,
        priority: priority || undefined,
        customerId: customerId || undefined,
        includeArchived: includeArchived ? "true" : undefined,
        page,
        limit: 10,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load deals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [search, stage, priority, customerId, includeArchived, page]);

  const openDealDetail = async (id: string) => {
    try {
      const detail = await apiClient.getDeal(id);
      setSelectedDeal(detail);
    } catch (err: any) {
      alert(err.message || "Failed to load deal details");
    }
  };

  const handleOpenCreate = () => {
    setEditingDeal(null);
    setFormData({
      title: "",
      dealValue: 25000,
      currency: "USD",
      probability: 40,
      stage: "QUALIFICATION",
      priority: "MEDIUM",
      expectedClose: "",
      customerId: customerId || "",
      contactId: "",
      notes: "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (deal: CRMDealSummary) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      dealValue: deal.dealValue,
      currency: deal.currency || "USD",
      probability: deal.probability,
      stage: deal.stage,
      priority: deal.priority,
      expectedClose: deal.expectedClose ? deal.expectedClose.slice(0, 10) : "",
      customerId: deal.customerId || "",
      contactId: deal.contactId || "",
      notes: deal.notes || "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Deal title is required");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingDeal) {
        await apiClient.updateDeal(editingDeal.id, {
          title: formData.title.trim(),
          dealValue: Number(formData.dealValue),
          currency: formData.currency,
          probability: Number(formData.probability),
          stage: formData.stage,
          priority: formData.priority,
          expectedClose: formData.expectedClose ? new Date(formData.expectedClose).toISOString() : undefined,
          customerId: formData.customerId || null,
          contactId: formData.contactId || null,
          notes: formData.notes.trim() || null,
        });
      } else {
        await apiClient.createDeal({
          title: formData.title.trim(),
          dealValue: Number(formData.dealValue),
          currency: formData.currency,
          probability: Number(formData.probability),
          stage: formData.stage,
          priority: formData.priority,
          expectedClose: formData.expectedClose ? new Date(formData.expectedClose).toISOString() : undefined,
          customerId: formData.customerId || undefined,
          contactId: formData.contactId || undefined,
          notes: formData.notes.trim() || undefined,
        });
      }
      setShowCreateModal(false);
      fetchDeals();
      if (selectedDeal && editingDeal?.id === selectedDeal.id) {
        openDealDetail(selectedDeal.id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save deal");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this deal?")) return;
    try {
      await apiClient.archiveDeal(id);
      fetchDeals();
      if (selectedDeal?.id === id) setSelectedDeal(null);
    } catch (err: any) {
      alert(err.message || "Failed to archive deal");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this deal?")) return;
    try {
      await apiClient.deleteDeal(id);
      fetchDeals();
      if (selectedDeal?.id === id) setSelectedDeal(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete deal");
    }
  };

  const getStageColor = (st: string) => {
    switch (st) {
      case "WON":
        return { bg: "rgba(16, 185, 129, 0.15)", color: "var(--status-online)" };
      case "LOST":
        return { bg: "rgba(239, 68, 68, 0.15)", color: "var(--status-danger)" };
      case "NEGOTIATION":
        return { bg: "rgba(168, 85, 247, 0.15)", color: "var(--brand-purple)" };
      case "PROPOSAL":
        return { bg: "rgba(59, 130, 246, 0.15)", color: "var(--brand-blue)" };
      default:
        return { bg: "rgba(6, 182, 212, 0.15)", color: "var(--brand-cyan)" };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Search & Actions Bar */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
          {/* Search */}
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
              placeholder="Search deals..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", width: "100%" }}
            />
          </div>

          {/* Stage Filter */}
          <select
            value={stage}
            onChange={(e) => {
              setStage(e.target.value);
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
            <option value="">All Stages</option>
            <option value="QUALIFICATION">QUALIFICATION</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="PROPOSAL">PROPOSAL</option>
            <option value="NEGOTIATION">NEGOTIATION</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>

          {/* Customer filter */}
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setPage(1);
            }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.82rem",
              color: "var(--text-primary)",
              maxWidth: "200px",
            }}
          >
            <option value="">All Accounts</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName || c.name}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
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
            <option value="">All Priorities</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>

          {/* Archived */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "var(--text-secondary)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            Show Archived
          </label>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={fetchDeals}
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

          <button
            onClick={handleOpenCreate}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "var(--brand-cyan)",
              color: "#0a0c10",
              fontWeight: 600,
              padding: "0.45rem 0.85rem",
              borderRadius: "6px",
              fontSize: "0.82rem",
            }}
          >
            <Plus size={15} /> Add Deal
          </button>
        </div>
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

      {/* Deals Table */}
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Opportunity</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Customer Account</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Value</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Stage</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Probability</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Priority</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Expected Close</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  {loading ? "Loading opportunities..." : "No deals found."}
                </td>
              </tr>
            ) : (
              data.items.map((deal) => {
                const stageStyle = getStageColor(deal.stage);
                return (
                  <tr
                    key={deal.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      opacity: deal.isArchived ? 0.6 : 1,
                    }}
                  >
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Briefcase size={16} style={{ color: "var(--brand-cyan)" }} />
                        <button
                          onClick={() => openDealDetail(deal.id)}
                          style={{ fontWeight: 600, color: "var(--text-primary)", textAlign: "left" }}
                        >
                          {deal.title}
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                      {deal.customerName ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                          <Building2 size={13} style={{ color: "var(--text-muted)" }} />
                          {deal.customerName}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--brand-cyan)" }}>
                      ${deal.dealValue.toLocaleString()}
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          background: stageStyle.bg,
                          color: stageStyle.color,
                        }}
                      >
                        {deal.stage}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>{deal.probability}%</span>
                        <div style={{ width: "40px", height: "4px", background: "var(--bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${deal.probability}%`, height: "100%", background: "var(--status-online)" }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          background:
                            deal.priority === "URGENT" || deal.priority === "HIGH"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(100, 116, 139, 0.15)",
                          color:
                            deal.priority === "URGENT" || deal.priority === "HIGH"
                              ? "var(--status-danger)"
                              : "var(--text-muted)",
                        }}
                      >
                        {deal.priority}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                      {deal.expectedClose ? new Date(deal.expectedClose).toLocaleDateString() : "—"}
                    </td>
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                        <button
                          onClick={() => handleOpenEdit(deal)}
                          title="Edit Deal"
                          style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleArchive(deal.id)}
                          title={deal.isArchived ? "Archived" : "Archive Deal"}
                          style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          title="Delete Deal"
                          style={{ color: "var(--status-danger)", padding: "0.25rem" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 1rem",
            background: "var(--bg-secondary)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
          }}
        >
          <div>
            Showing {data.items.length} of {data.total} deals
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{
                background: "var(--bg-card)",
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
                background: "var(--bg-card)",
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

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-medium)",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "540px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {editingDeal ? "Edit Opportunity" : "Create New Opportunity"}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div
                style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid var(--status-danger)",
                  color: "#fca5a5",
                  fontSize: "0.8rem",
                  marginBottom: "0.75rem",
                }}
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Deal Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Global Infrastructure Contract"
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.85rem",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Deal Value ($) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formData.dealValue}
                    onChange={(e) => setFormData({ ...formData, dealValue: Number(e.target.value) })}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Probability ({formData.probability}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    style={{ width: "100%", marginTop: "0.4rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Stage
                  </label>
                  <select
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="QUALIFICATION">QUALIFICATION</option>
                    <option value="CONTACTED">CONTACTED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="NEGOTIATION">NEGOTIATION</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Customer Account
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="">None / Direct</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Target Close Date
                  </label>
                  <input
                    type="date"
                    value={formData.expectedClose}
                    onChange={(e) => setFormData({ ...formData, expectedClose: e.target.value })}
                    style={{
                      width: "100%",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.5rem",
                      fontSize: "0.85rem",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Contract terms, stakeholders, next actions..."
                  style={{
                    width: "100%",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "6px",
                    padding: "0.5rem 0.75rem",
                    fontSize: "0.85rem",
                    color: "var(--text-primary)",
                    resize: "vertical",
                  }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    padding: "0.45rem 1rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  style={{
                    background: "var(--brand-cyan)",
                    color: "#0a0c10",
                    fontWeight: 600,
                    padding: "0.45rem 1rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  {formSubmitting ? "Saving..." : editingDeal ? "Update Opportunity" : "Create Opportunity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deal Detail Modal */}
      {selectedDeal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 90,
          }}
        >
          <div
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-medium)",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "1.5rem",
              boxShadow: "var(--shadow-elevated)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Briefcase size={22} style={{ color: "var(--brand-cyan)" }} />
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{selectedDeal.title}</h3>
                </div>

                <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  <span>Stage: {selectedDeal.stage}</span>
                  <span style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
                    Value: ${selectedDeal.dealValue.toLocaleString()} ({selectedDeal.probability}%)
                  </span>
                  {selectedDeal.customer && <span>Account: {selectedDeal.customer.companyName || selectedDeal.customer.name}</span>}
                </div>
              </div>

              <button onClick={() => setSelectedDeal(null)} style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            {selectedDeal.notes && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  padding: "0.85rem",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                {selectedDeal.notes}
              </div>
            )}

            {/* Associated Activities */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <CRMActivityTimeline
                entityType="deal"
                entityId={selectedDeal.id}
                activities={selectedDeal.activities || []}
                onActivityChanged={() => openDealDetail(selectedDeal.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
