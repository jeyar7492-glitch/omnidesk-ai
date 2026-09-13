import React, { useEffect, useState } from "react";
import { CRMCustomerSummary, CustomerDetail, PaginatedResponse } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Building2,
  Search,
  Plus,
  ExternalLink,
  Edit2,
  Archive,
  Trash2,
  X,
  RefreshCw,
  Activity,
} from "lucide-react";
import { CRMActivityTimeline } from "./CRMActivityTimeline";

export const CRMCustomersTab: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CRMCustomerSummary>>({
    items: [],
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [industry, setIndustry] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);

  // Modals & Detail
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CRMCustomerSummary | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    industry: "",
    status: "ACTIVE",
    healthScore: 80,
    notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getCustomersPaginated({
        search: search.trim() || undefined,
        status: status || undefined,
        industry: industry.trim() || undefined,
        includeArchived: includeArchived ? "true" : undefined,
        page,
        limit: 10,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, status, industry, includeArchived, page]);

  const openCustomerDetail = async (id: string) => {
    try {
      const detail = await apiClient.getCustomer(id);
      setSelectedCustomer(detail);
    } catch (err: any) {
      alert(err.message || "Failed to load customer details");
    }
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    setFormData({
      name: "",
      domain: "",
      industry: "",
      status: "ACTIVE",
      healthScore: 80,
      notes: "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (cust: CRMCustomerSummary) => {
    setEditingCustomer(cust);
    setFormData({
      name: cust.companyName || cust.name || "",
      domain: cust.website || cust.domain || "",
      industry: cust.industry || "",
      status: cust.status,
      healthScore: cust.healthScore ?? 80,
      notes: cust.notes || "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError("Customer account name is required");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingCustomer) {
        await apiClient.updateCustomer(editingCustomer.id, {
          name: formData.name.trim(),
          domain: formData.domain.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          status: formData.status,
          healthScore: Number(formData.healthScore),
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await apiClient.createCustomer({
          name: formData.name.trim(),
          domain: formData.domain.trim() || undefined,
          industry: formData.industry.trim() || undefined,
          status: formData.status,
          healthScore: Number(formData.healthScore),
          notes: formData.notes.trim() || undefined,
        });
      }
      setShowCreateModal(false);
      fetchCustomers();
      if (selectedCustomer && editingCustomer?.id === selectedCustomer.id) {
        openCustomerDetail(selectedCustomer.id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save customer");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this customer account?")) return;
    try {
      await apiClient.archiveCustomer(id);
      fetchCustomers();
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    } catch (err: any) {
      alert(err.message || "Failed to archive customer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this customer? This cannot be undone.")) return;
    try {
      await apiClient.deleteCustomer(id);
      fetchCustomers();
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete customer");
    }
  };

  const getHealthBadge = (score: number) => {
    let color = "var(--status-online)";
    let bg = "rgba(16, 185, 129, 0.15)";
    if (score < 50) {
      color = "var(--status-danger)";
      bg = "rgba(239, 68, 68, 0.15)";
    } else if (score < 75) {
      color = "var(--status-warning)";
      bg = "rgba(245, 158, 11, 0.15)";
    }
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.25rem",
          padding: "0.15rem 0.5rem",
          borderRadius: "999px",
          fontSize: "0.75rem",
          fontWeight: 700,
          color,
          backgroundColor: bg,
        }}
      >
        <Activity size={12} /> {score}%
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Search & Actions Bar */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.6rem" }}>
          {/* Search Input */}
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
              placeholder="Search customers..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", width: "100%" }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
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
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="CHURNED">Churned</option>
          </select>

          {/* Industry Filter */}
          <input
            type="text"
            placeholder="Filter industry..."
            value={industry}
            onChange={(e) => {
              setIndustry(e.target.value);
              setPage(1);
            }}
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "6px",
              padding: "0.45rem 0.75rem",
              fontSize: "0.82rem",
              width: "140px",
            }}
          />

          {/* Archived Toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              cursor: "pointer",
            }}
          >
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
            onClick={fetchCustomers}
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
            <Plus size={15} /> Add Customer
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

      {/* Customers Table */}
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
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Account Name</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Domain</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Industry</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Health</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Created</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  {loading ? "Loading customer accounts..." : "No customer accounts found."}
                </td>
              </tr>
            ) : (
              data.items.map((cust) => (
                <tr
                  key={cust.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    opacity: cust.isArchived ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Building2 size={16} style={{ color: "var(--brand-cyan)" }} />
                      <button
                        onClick={() => openCustomerDetail(cust.id)}
                        style={{
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          textAlign: "left",
                        }}
                      >
                        {cust.companyName || cust.name}
                      </button>
                      {cust.isArchived && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            padding: "0.1rem 0.35rem",
                            background: "var(--bg-elevated)",
                            color: "var(--text-muted)",
                            borderRadius: "4px",
                          }}
                        >
                          Archived
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    {cust.website || cust.domain ? (
                      <a
                        href={`https://${(cust.website || cust.domain)?.replace(/^https?:\/\//, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", color: "var(--brand-blue)" }}
                      >
                        {cust.website || cust.domain} <ExternalLink size={11} />
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    {cust.industry || "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        background:
                          cust.status === "ACTIVE"
                            ? "rgba(16, 185, 129, 0.15)"
                            : cust.status === "CHURNED"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(100, 116, 139, 0.15)",
                        color:
                          cust.status === "ACTIVE"
                            ? "var(--status-online)"
                            : cust.status === "CHURNED"
                            ? "var(--status-danger)"
                            : "var(--text-muted)",
                      }}
                    >
                      {cust.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>{getHealthBadge(cust.healthScore ?? 80)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.78rem" }}>
                    {cust.createdAt ? new Date(cust.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <button
                        onClick={() => handleOpenEdit(cust)}
                        title="Edit Customer"
                        style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(cust.id)}
                        title={cust.isArchived ? "Archived" : "Archive Customer"}
                        style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cust.id)}
                        title="Delete Customer"
                        style={{ color: "var(--status-danger)", padding: "0.25rem" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
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
            Showing {data.items.length} of {data.total} customers
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

      {/* Create / Edit Customer Modal */}
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
              maxWidth: "520px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {editingCustomer ? "Edit Customer Account" : "Create Customer Account"}
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
                  Account / Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Acme Corp"
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Domain
                  </label>
                  <input
                    type="text"
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    placeholder="acme.com"
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
                    Industry
                  </label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    placeholder="SaaS / Enterprise"
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
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="CHURNED">CHURNED</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Health Score ({formData.healthScore}%)
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={formData.healthScore}
                    onChange={(e) => setFormData({ ...formData, healthScore: Number(e.target.value) })}
                    style={{ width: "100%", marginTop: "0.4rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key account background, tier, renewal dates..."
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
                  {formSubmitting ? "Saving..." : editingCustomer ? "Update Account" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
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
              maxWidth: "780px",
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
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <Building2 size={22} style={{ color: "var(--brand-cyan)" }} />
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{selectedCustomer.companyName || selectedCustomer.name}</h3>
                  {getHealthBadge(selectedCustomer.healthScore ?? 80)}
                </div>
                <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  {(selectedCustomer.website || selectedCustomer.domain) && (
                    <span>Website: {selectedCustomer.website || selectedCustomer.domain}</span>
                  )}
                  {selectedCustomer.industry && <span>Industry: {selectedCustomer.industry}</span>}
                  <span>Status: {selectedCustomer.status}</span>
                </div>
              </div>

              <button onClick={() => setSelectedCustomer(null)} style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            {selectedCustomer.notes && (
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
                {selectedCustomer.notes}
              </div>
            )}

            {/* Quick Metrics */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              <div style={{ background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>CONTACTS</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selectedCustomer.contacts?.length || 0}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>LEADS</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selectedCustomer.leads?.length || 0}</div>
              </div>
              <div style={{ background: "var(--bg-secondary)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>DEALS</div>
                <div style={{ fontSize: "1.2rem", fontWeight: 700 }}>{selectedCustomer.deals?.length || 0}</div>
              </div>
            </div>

            {/* Linked Deals */}
            {selectedCustomer.deals && selectedCustomer.deals.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.5rem" }}>Deals Pipeline</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {selectedCustomer.deals.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "0.6rem 0.75rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "0.82rem",
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600 }}>{d.title}</span>
                        <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>({d.stage})</span>
                      </div>
                      <div style={{ fontWeight: 700, color: "var(--brand-cyan)" }}>
                        ${d.dealValue.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Associated Activities */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <CRMActivityTimeline
                entityType="customer"
                entityId={selectedCustomer.id}
                activities={selectedCustomer.activities || []}
                onActivityChanged={() => openCustomerDetail(selectedCustomer.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
