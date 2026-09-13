import React, { useEffect, useState } from "react";
import { ContactSummary, ContactDetail, CRMCustomerSummary, PaginatedResponse } from "@omnidesk/shared-types";
import { apiClient } from "../../api/client";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  Building2,
  Edit2,
  Archive,
  Trash2,
  X,
  RefreshCw,
  Star,
} from "lucide-react";
import { CRMActivityTimeline } from "./CRMActivityTimeline";

export const CRMContactsTab: React.FC = () => {
  const [data, setData] = useState<PaginatedResponse<ContactSummary>>({
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
  const [customerId, setCustomerId] = useState<string>("");
  const [isPrimary, setIsPrimary] = useState<string>("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);

  // Modals & Detail
  const [selectedContact, setSelectedContact] = useState<ContactDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactSummary | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    customerId: "",
    isPrimary: false,
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchCustomersList = async () => {
    try {
      const res = await apiClient.getCustomers({ limit: 100 });
      setCustomers(res);
    } catch {
      // ignore
    }
  };

  const fetchContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getContactsPaginated({
        search: search.trim() || undefined,
        customerId: customerId || undefined,
        isPrimary: isPrimary ? isPrimary : undefined,
        includeArchived: includeArchived ? "true" : undefined,
        page,
        limit: 10,
      });
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomersList();
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [search, customerId, isPrimary, includeArchived, page]);

  const openContactDetail = async (id: string) => {
    try {
      const detail = await apiClient.getContact(id);
      setSelectedContact(detail);
    } catch (err: any) {
      alert(err.message || "Failed to load contact details");
    }
  };

  const handleOpenCreate = () => {
    setEditingContact(null);
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      jobTitle: "",
      customerId: customerId || "",
      isPrimary: false,
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (c: ContactSummary) => {
    setEditingContact(c);
    setFormData({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email || "",
      phone: c.phone || "",
      jobTitle: c.jobTitle || "",
      customerId: c.customerId || "",
      isPrimary: c.isPrimary,
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
      setFormError("First name, last name, and email are required");
      return;
    }

    setFormSubmitting(true);
    setFormError(null);
    try {
      if (editingContact) {
        await apiClient.updateContact(editingContact.id, {
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          jobTitle: formData.jobTitle.trim() || undefined,
          customerId: formData.customerId || null,
          isPrimary: formData.isPrimary,
        });
      } else {
        await apiClient.createContact({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim() || undefined,
          jobTitle: formData.jobTitle.trim() || undefined,
          customerId: formData.customerId || undefined,
          isPrimary: formData.isPrimary,
        });
      }
      setShowCreateModal(false);
      fetchContacts();
      if (selectedContact && editingContact?.id === selectedContact.id) {
        openContactDetail(selectedContact.id);
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save contact");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Are you sure you want to archive this contact?")) return;
    try {
      await apiClient.archiveContact(id);
      fetchContacts();
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch (err: any) {
      alert(err.message || "Failed to archive contact");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this contact?")) return;
    try {
      await apiClient.deleteContact(id);
      fetchContacts();
      if (selectedContact?.id === id) setSelectedContact(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete contact");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Search & Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
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
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ fontSize: "0.82rem", width: "100%" }}
            />
          </div>

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

          {/* Primary filter */}
          <select
            value={isPrimary}
            onChange={(e) => {
              setIsPrimary(e.target.value);
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
            <option value="">All Roles</option>
            <option value="true">Primary Contacts</option>
          </select>

          {/* Archived Toggle */}
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
            onClick={fetchContacts}
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
            <Plus size={15} /> Add Contact
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

      {/* Contacts Table */}
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
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Contact Name</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Email</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Phone</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Job Title</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Account / Company</th>
              <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                  {loading ? "Loading contacts..." : "No contacts found."}
                </td>
              </tr>
            ) : (
              data.items.map((contact) => (
                <tr
                  key={contact.id}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    opacity: contact.isArchived ? 0.6 : 1,
                  }}
                >
                  <td style={{ padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Users size={16} style={{ color: "var(--brand-blue)" }} />
                      <button
                        onClick={() => openContactDetail(contact.id)}
                        style={{ fontWeight: 600, color: "var(--text-primary)", textAlign: "left" }}
                      >
                        {contact.firstName} {contact.lastName}
                      </button>
                      {contact.isPrimary && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.2rem",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            padding: "0.1rem 0.35rem",
                            borderRadius: "4px",
                            background: "rgba(245, 158, 11, 0.15)",
                            color: "var(--status-warning)",
                          }}
                        >
                          <Star size={10} /> PRIMARY
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    <a
                      href={`mailto:${contact.email}`}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--brand-cyan)" }}
                    >
                      <Mail size={12} /> {contact.email}
                    </a>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    {contact.phone ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <Phone size={12} /> {contact.phone}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                    {contact.jobTitle || "—"}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "var(--text-primary)" }}>
                    {contact.customerName ? (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <Building2 size={13} style={{ color: "var(--text-muted)" }} />
                        {contact.customerName}
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>Direct / Unlinked</span>
                    )}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <button
                        onClick={() => handleOpenEdit(contact)}
                        title="Edit Contact"
                        style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleArchive(contact.id)}
                        title={contact.isArchived ? "Archived" : "Archive Contact"}
                        style={{ color: "var(--text-secondary)", padding: "0.25rem" }}
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        title="Delete Contact"
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
            Showing {data.items.length} of {data.total} contacts
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
              maxWidth: "520px",
              padding: "1.5rem",
              boxShadow: "var(--shadow-elevated)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                {editingContact ? "Edit Contact" : "Create New Contact"}
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
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Jane"
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
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Doe"
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
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane.doe@company.com"
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
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 555-0199"
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
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    placeholder="Chief Technology Officer"
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
                  <option value="">None / Direct Contact</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName || c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.isPrimary}
                    onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  />
                  Mark as Primary Contact for account
                </label>
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
                  {formSubmitting ? "Saving..." : editingContact ? "Update Contact" : "Create Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contact Detail Modal */}
      {selectedContact && (
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
                  <Users size={22} style={{ color: "var(--brand-blue)" }} />
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700 }}>
                    {selectedContact.firstName} {selectedContact.lastName}
                  </h3>
                  {selectedContact.isPrimary && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        padding: "0.15rem 0.4rem",
                        background: "rgba(245, 158, 11, 0.15)",
                        color: "var(--status-warning)",
                        borderRadius: "4px",
                        fontWeight: 700,
                      }}
                    >
                      PRIMARY
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.3rem" }}>
                  <span>{selectedContact.jobTitle || "No Title"}</span>
                  {selectedContact.customer && <span>Account: {selectedContact.customer.companyName || selectedContact.customer.name}</span>}
                </div>
              </div>

              <button onClick={() => setSelectedContact(null)} style={{ color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                padding: "0.85rem",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>EMAIL</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{selectedContact.email}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>PHONE</div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{selectedContact.phone || "—"}</div>
              </div>
            </div>

            {/* Associated Activities */}
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <CRMActivityTimeline
                entityType="contact"
                entityId={selectedContact.id}
                activities={selectedContact.activities || []}
                onActivityChanged={() => openContactDetail(selectedContact.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
