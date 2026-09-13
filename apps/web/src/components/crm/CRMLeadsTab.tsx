import React, { useEffect, useState } from "react";
import { CRMLeadSummary, LeadDetail, CRMCustomerSummary, PaginatedResponse } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Flame,
  Search,
  Plus,
  ArrowRightCircle,
  Edit2,
  Archive,
  Trash2,
  X,
  RefreshCw,
  CheckCircle,
} from "lucide-react";
import { CRMActivityTimeline } from "./CRMActivityTimeline";

export const CRMLeadsTab: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<CRMLeadSummary>>({
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
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);

  // Modals & Detail
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<CRMLeadSummary | null>(null);
  const [convertingLead, setConvertingLead] = useState<CRMLeadSummary | null>(null);

  // Create/Edit Form State
  const [formData, setFormData] = useState({
    title: "",
    dealValue: 0,
    stage: "NEW",
    priority: "MEDIUM",
    source: "WEBSITE",
    customerName: "",
    customerId: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Convert Form State
  const [convertData, setConvertData] = useState({
    createCustomer: true,
    customerName: "",
    existingCustomerId: "",
    createContact: true,
    contactFirstName: "",
    contactLastName: "",
    contactEmail: "",
    createDeal: true,
    dealTitle: "",
    dealValue: 0,
  });
  const [convertSubmitting, setConvertSubmitting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertSuccess, setConvertSuccess] = useState<string | null>(null);

  const fetchCustomersList = async () => {
    try {
      const res = await apiClient.getCustomers({ limit: 100 });
      setCustomers(res);
    } catch {
      // ignore
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getLeadsPaginated({
        search: search.trim() || undefined,
        stage: stage || undefined,
        priority: priority || undefined,
        includeArchived: includeArchived ? "true" : undefined,
        page,
        limit: 10,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersList();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [search, stage, priority, includeArchived, page]);

  const openLeadDetail = async (id: string) => {
    try {
      const detail = await apiClient.getLead(id);
      setSelectedLead(detail);
    } catch (err: any) {
      alert(err.message || "Failed to load lead details");
    }
  };

  const handleOpenCreate = () => {
    setEditingLead(null);
    setFormData({
      title: "",
      dealValue: 10000,
      stage: "NEW",
      priority: "MEDIUM",
      source: "WEBSITE",
      customerName: "",
      customerId: "",
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      notes: "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (l: CRMLeadSummary) => {
    setEditingLead(l);
    setFormData({
      title: l.title,
      dealValue: l.dealValue,
      stage: l.stage,
      priority: l.priority,
      source: l.source || "WEBSITE",
      customerName: l.customerName || "",
      customerId: l.customerId || "",
      contactName: l.contactName || "",
      contactEmail: l.contactEmail || "",
      contactPhone: l.contactPhone || "",
      notes: l.notes || "",
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("Lead title is required");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingLead) {
        await apiClient.updateLead(editingLead.id, {
          title: formData.title.trim(),
          dealValue: Number(formData.dealValue),
          stage: formData.stage,
          priority: formData.priority,
          source: formData.source,
          customerName: formData.customerName.trim() || undefined,
          customerId: formData.customerId || undefined,
          contactName: formData.contactName.trim() || undefined,
          contactEmail: formData.contactEmail.trim().toLowerCase() || undefined,
          contactPhone: formData.contactPhone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
      } else {
        await apiClient.createLead({
          title: formData.title.trim(),
          dealValue: Number(formData.dealValue),
          stage: formData.stage,
          priority: formData.priority,
          source: formData.source,
          customerName: formData.customerName.trim() || undefined,
          customerId: formData.customerId || undefined,
          contactName: formData.contactName.trim() || undefined,
          contactEmail: formData.contactEmail.trim().toLowerCase() || undefined,
          contactPhone: formData.contactPhone.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        });
      }
      setShowCreateModal(false);
      fetchLeads();
      if (selectedLead && editingLead?.id === selectedLead.id) {
        openLeadDetail(selectedLead.id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save lead");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleOpenConvert = (lead: CRMLeadSummary) => {
    const nameParts = (lead.contactName || "").trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || (firstName ? "Contact" : "");

    setConvertingLead(lead);
    setConvertData({
      createCustomer: !lead.customerId,
      customerName: lead.customerName || `${lead.title} Inc`,
      existingCustomerId: lead.customerId || "",
      createContact: !!lead.contactEmail,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactEmail: lead.contactEmail || "",
      createDeal: true,
      dealTitle: lead.title,
      dealValue: lead.dealValue || 10000,
    });
    setConvertError(null);
    setConvertSuccess(null);
  };

  const handleSubmitConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    setConvertSubmitting(true);
    setConvertError(null);
    try {
      const res = await apiClient.convertLead(convertingLead.id, {
        createCustomer: convertData.createCustomer,
        customerName: convertData.customerName.trim() || undefined,
        existingCustomerId: !convertData.createCustomer && convertData.existingCustomerId ? convertData.existingCustomerId : undefined,
        createContact: convertData.createContact,
        contactFirstName: convertData.contactFirstName.trim() || undefined,
        contactLastName: convertData.contactLastName.trim() || undefined,
        contactEmail: convertData.contactEmail.trim().toLowerCase() || undefined,
        createDeal: convertData.createDeal,
        dealTitle: convertData.dealTitle.trim() || undefined,
        dealValue: Number(convertData.dealValue),
      });

      setConvertSuccess(
        `Lead successfully converted! Customer: ${res.customer?.name || "Linked"} | Deal: ${res.deal?.title || "None"}`
      );
      setTimeout(() => {
        setConvertingLead(null);
        setConvertSuccess(null);
        fetchLeads();
      }, 1500);
    } catch (err: any) {
      setConvertError(err.message || "Failed to convert lead");
    } finally {
      setConvertSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this lead?")) return;
    try {
      await apiClient.archiveLead(id);
      fetchLeads();
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch (err: any) {
      alert(err.message || "Failed to archive lead");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return;
    try {
      await apiClient.deleteLead(id);
      fetchLeads();
      if (selectedLead?.id === id) setSelectedLead(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete lead");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Search & Actions */}
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
              placeholder="Search leads..."
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
            <option value="NEW">NEW</option>
            <option value="QUALIFYING">QUALIFYING</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="PROPOSAL">PROPOSAL</option>
            <option value="WON">WON</option>
            <option value="LOST">LOST</option>
          </select>

          {/* Priority Filter */}
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
            onClick={fetchLeads}
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
            <Plus size={15} /> Add Lead
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

      {/* Leads Table */}
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
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Lead Opportunity</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Account / Contact</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Est. Value</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Stage</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Priority</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  {loading ? "Loading leads..." : "No leads found."}
                </td>
              </tr>
            ) : (
              data.items.map((lead) => (
                <tr
                  key={lead.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    opacity: lead.isArchived ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Flame size={16} style={{ color: "var(--status-warning)" }} />
                      <button
                        onClick={() => openLeadDetail(lead.id)}
                        style={{ fontWeight: 600, color: "var(--text-primary)", textAlign: "left" }}
                      >
                        {lead.title}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    <div>{lead.customerName || "—"}</div>
                    {lead.contactName && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        {lead.contactName} {lead.contactEmail ? `(${lead.contactEmail})` : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 700, color: "var(--brand-cyan)" }}>
                    ${lead.dealValue.toLocaleString()}
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "var(--brand-blue)",
                      }}
                    >
                      {lead.stage}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "4px",
                        background:
                          lead.priority === "URGENT" || lead.priority === "HIGH"
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(100, 116, 139, 0.15)",
                        color:
                          lead.priority === "URGENT" || lead.priority === "HIGH"
                            ? "var(--status-danger)"
                            : "var(--text-muted)",
                      }}
                    >
                      {lead.priority}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem" }}>
                    {lead.isConverted ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.15rem 0.45rem",
                          borderRadius: "4px",
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "var(--status-online)",
                        }}
                      >
                        <CheckCircle size={11} /> CONVERTED
                      </span>
                    ) : (
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>OPEN</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      {!lead.isConverted && (
                        <button
                          onClick={() => handleOpenConvert(lead)}
                          title="Convert to Account / Deal"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            background: "var(--bg-card-hover)",
                            border: "1px solid var(--border-medium)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            color: "var(--brand-cyan)",
                            fontWeight: 600,
                          }}
                        >
                          <ArrowRightCircle size={13} /> Convert
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(lead)}
                        title="Edit Lead"
                        style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(lead.id)}
                        title={lead.isArchived ? "Archived" : "Archive Lead"}
                        style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(lead.id)}
                        title="Delete Lead"
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
            Showing {data.items.length} of {data.total} leads
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

      {/* Convert Lead Modal */}
      {convertingLead && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 110,
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
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--brand-cyan)" }}>
                  Convert Lead to Pipeline Opportunity
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Lead: {convertingLead.title}
                </p>
              </div>
              <button onClick={() => setConvertingLead(null)} style={{ color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            {convertError && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid var(--status-danger)",
                  color: "#fca5a5",
                  fontSize: "0.82rem",
                  marginBottom: "0.85rem",
                }}
              >
                {convertError}
              </div>
            )}

            {convertSuccess && (
              <div
                style={{
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  background: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid var(--status-online)",
                  color: "#6ee7b7",
                  fontSize: "0.82rem",
                  marginBottom: "0.85rem",
                }}
              >
                {convertSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitConvert} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Account conversion */}
              <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginBottom: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={convertData.createCustomer}
                    onChange={(e) => setConvertData({ ...convertData, createCustomer: e.target.checked })}
                  />
                  Create New Customer Account
                </label>

                {convertData.createCustomer ? (
                  <input
                    type="text"
                    required
                    placeholder="Customer Account Name"
                    value={convertData.customerName}
                    onChange={(e) => setConvertData({ ...convertData, customerName: e.target.value })}
                    style={{
                      width: "100%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.45rem 0.75rem",
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                    }}
                  />
                ) : (
                  <select
                    value={convertData.existingCustomerId}
                    onChange={(e) => setConvertData({ ...convertData, existingCustomerId: e.target.value })}
                    style={{
                      width: "100%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "6px",
                      padding: "0.45rem",
                      fontSize: "0.82rem",
                      color: "var(--text-primary)",
                    }}
                  >
                    <option value="">Select Existing Account</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName || c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Contact conversion */}
              <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginBottom: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={convertData.createContact}
                    onChange={(e) => setConvertData({ ...convertData, createContact: e.target.checked })}
                  />
                  Create Primary Contact
                </label>

                {convertData.createContact && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                    <input
                      type="text"
                      placeholder="First Name"
                      value={convertData.contactFirstName}
                      onChange={(e) => setConvertData({ ...convertData, contactFirstName: e.target.value })}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "0.45rem 0.6rem",
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Last Name"
                      value={convertData.contactLastName}
                      onChange={(e) => setConvertData({ ...convertData, contactLastName: e.target.value })}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "0.45rem 0.6rem",
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                      }}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={convertData.contactEmail}
                      onChange={(e) => setConvertData({ ...convertData, contactEmail: e.target.value })}
                      style={{
                        gridColumn: "span 2",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "0.45rem 0.6rem",
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Deal conversion */}
              <div style={{ background: "var(--bg-secondary)", padding: "0.85rem", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginBottom: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={convertData.createDeal}
                    onChange={(e) => setConvertData({ ...convertData, createDeal: e.target.checked })}
                  />
                  Create Opportunity in Sales Pipeline
                </label>

                {convertData.createDeal && (
                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.5rem" }}>
                    <input
                      type="text"
                      required
                      placeholder="Deal Title"
                      value={convertData.dealTitle}
                      onChange={(e) => setConvertData({ ...convertData, dealTitle: e.target.value })}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "0.45rem 0.6rem",
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                      }}
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Deal Value ($)"
                      value={convertData.dealValue}
                      onChange={(e) => setConvertData({ ...convertData, dealValue: Number(e.target.value) })}
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        padding: "0.45rem 0.6rem",
                        fontSize: "0.82rem",
                        color: "var(--text-primary)",
                      }}
                    />
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
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
                  disabled={convertSubmitting}
                  style={{
                    background: "var(--brand-cyan)",
                    color: "#0a0c10",
                    fontWeight: 700,
                    padding: "0.45rem 1.25rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem",
                  }}
                >
                  {convertSubmitting ? "Converting..." : "Complete Conversion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                {editingLead ? "Edit Lead Opportunity" : "Create New Inbound Lead"}
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
                  Lead Opportunity Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enterprise Migration License..."
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
                    Estimated Value ($)
                  </label>
                  <input
                    type="number"
                    min={0}
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
                    <option value="NEW">NEW</option>
                    <option value="QUALIFYING">QUALIFYING</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="PROPOSAL">PROPOSAL</option>
                    <option value="WON">WON</option>
                    <option value="LOST">LOST</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    Lead Source
                  </label>
                  <input
                    type="text"
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    placeholder="Website, Referral, Inbound..."
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
                    Account Name
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Prospect Company"
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
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    placeholder="John Doe"
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
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="john@prospect.com"
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
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+1 555-0188"
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

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key discovery notes or interest..."
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
                  {formSubmitting ? "Saving..." : editingLead ? "Update Lead" : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Detail Modal */}
      {selectedLead && (
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
                  <Flame size={22} style={{ color: "var(--status-warning)" }} />
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>{selectedLead.title}</h3>
                </div>

                <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  <span>Stage: {selectedLead.stage}</span>
                  <span>Priority: {selectedLead.priority}</span>
                  <span style={{ color: "var(--brand-cyan)", fontWeight: 700 }}>
                    Value: ${selectedLead.dealValue.toLocaleString()}
                  </span>
                </div>
              </div>

              <button onClick={() => setSelectedLead(null)} style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            {selectedLead.notes && (
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
                {selectedLead.notes}
              </div>
            )}

            {/* Associated Activities */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <CRMActivityTimeline
                entityType="lead"
                entityId={selectedLead.id}
                activities={selectedLead.activities || []}
                onActivityChanged={() => openLeadDetail(selectedLead.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
