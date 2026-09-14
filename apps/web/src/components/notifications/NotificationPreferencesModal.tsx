import React, { useState, useEffect } from "react";
import { apiClient } from "../../api/client";
import {
  NotificationPreferenceSummary,
  UpdateNotificationPreferenceInput,
  NotificationPriority,
} from "@omnidesk/shared-types";
import { X, Bell, Mail, Check, AlertCircle, Save } from "lucide-react";

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (prefs: NotificationPreferenceSummary) => void;
}

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [minPriority, setMinPriority] = useState<NotificationPriority>("LOW");

  const [tasksCategory, setTasksCategory] = useState(true);
  const [crmCategory, setCrmCategory] = useState(true);
  const [financeCategory, setFinanceCategory] = useState(true);
  const [documentsCategory, setDocumentsCategory] = useState(true);
  const [systemCategory, setSystemCategory] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchPreferences();
    }
  }, [isOpen]);

  const fetchPreferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const prefs = await apiClient.getNotificationPreferences();
      setInAppEnabled(prefs.inAppEnabled);
      setEmailEnabled(prefs.emailEnabled);
      setEmailAddress(prefs.emailAddress || "");
      setMinPriority(prefs.minPriority);
      setTasksCategory(prefs.tasksCategory);
      setCrmCategory(prefs.crmCategory);
      setFinanceCategory(prefs.financeCategory);
      setDocumentsCategory(prefs.documentsCategory);
      setSystemCategory(prefs.systemCategory);
    } catch (err: any) {
      setError(err.message || "Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const input: UpdateNotificationPreferenceInput = {
        inAppEnabled,
        emailEnabled,
        emailAddress: emailAddress.trim() || undefined,
        minPriority,
        tasksCategory,
        crmCategory,
        financeCategory,
        documentsCategory,
        systemCategory,
      };

      const updated = await apiClient.updateNotificationPreferences(input);
      setSuccess(true);
      if (onSaved) onSaved(updated);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--bg-card, #131722)",
          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
          borderRadius: "12px",
          width: "100%",
          maxWidth: "540px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(6, 182, 212, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bell size={18} color="var(--brand-cyan, #06b6d4)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                Notification Preferences
              </h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted, #94a3b8)" }}>
                Control delivery channels and notification categories
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted, #94a3b8)",
              cursor: "pointer",
              padding: "0.25rem",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.5rem", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted, #94a3b8)" }}>
              Loading preferences...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {error && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1px solid rgba(16, 185, 129, 0.3)",
                    color: "#6ee7b7",
                    fontSize: "0.85rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Check size={16} />
                  <span>Preferences saved successfully!</span>
                </div>
              )}

              {/* Channels Section */}
              <div>
                <h4
                  style={{
                    margin: "0 0 0.75rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted, #94a3b8)",
                  }}
                >
                  Delivery Channels
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    background: "var(--bg-elevated, #1a202c)",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Bell size={16} color="var(--brand-cyan, #06b6d4)" />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>In-App Notifications</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>
                          Receive live bell alerts and inbox items in OmniDesk
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={inAppEnabled}
                      onChange={(e) => setInAppEnabled(e.target.checked)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </label>

                  <div style={{ height: "1px", background: "var(--border-subtle, rgba(255, 255, 255, 0.08))" }} />

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <Mail size={16} color="var(--brand-indigo, #6366f1)" />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>Email Notifications</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>
                          Receive email digests and notifications (if SMTP provider is configured)
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      style={{ cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </label>

                  {emailEnabled && (
                    <div style={{ marginTop: "0.5rem" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.8rem",
                          marginBottom: "0.35rem",
                          color: "var(--text-muted, #94a3b8)",
                        }}
                      >
                        Override Delivery Email (optional, defaults to account email)
                      </label>
                      <input
                        type="email"
                        placeholder="you@company.com"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.5rem 0.75rem",
                          borderRadius: "6px",
                          background: "var(--bg-card, #131722)",
                          border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))",
                          color: "var(--text-primary, #fff)",
                          fontSize: "0.85rem",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <h4
                  style={{
                    margin: "0 0 0.75rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted, #94a3b8)",
                  }}
                >
                  Minimum Priority Threshold
                </h4>
                <div
                  style={{
                    background: "var(--bg-elevated, #1a202c)",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  <select
                    value={minPriority}
                    onChange={(e) => setMinPriority(e.target.value as NotificationPriority)}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "6px",
                      background: "var(--bg-card, #131722)",
                      border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))",
                      color: "var(--text-primary, #fff)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="LOW">All Notifications (Low, Medium, High, Urgent)</option>
                    <option value="MEDIUM">Medium and above</option>
                    <option value="HIGH">High and Urgent only</option>
                    <option value="URGENT">Urgent only</option>
                  </select>
                </div>
              </div>

              {/* Categories Section */}
              <div>
                <h4
                  style={{
                    margin: "0 0 0.75rem 0",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted, #94a3b8)",
                  }}
                >
                  Notification Categories
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    background: "var(--bg-elevated, #1a202c)",
                    padding: "1rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
                  }}
                >
                  {[
                    {
                      label: "Tasks & Projects",
                      desc: "Task assignments, mentions, comments, milestone alerts",
                      state: tasksCategory,
                      setter: setTasksCategory,
                    },
                    {
                      label: "CRM & Sales",
                      desc: "Lead assignments, deal stage changes, won/lost deals",
                      state: crmCategory,
                      setter: setCrmCategory,
                    },
                    {
                      label: "Finance & Accounting",
                      desc: "Invoice events, payments, expense approvals and rejections",
                      state: financeCategory,
                      setter: setFinanceCategory,
                    },
                    {
                      label: "Documents & Knowledge Base",
                      desc: "Document processing completions and indexing errors",
                      state: documentsCategory,
                      setter: setDocumentsCategory,
                    },
                    {
                      label: "System & Security",
                      desc: "Workspace updates, security notices, system alerts",
                      state: systemCategory,
                      setter: setSystemCategory,
                    },
                  ].map((cat, idx) => (
                    <React.Fragment key={cat.label}>
                      {idx > 0 && (
                        <div style={{ height: "1px", background: "var(--border-subtle, rgba(255, 255, 255, 0.08))" }} />
                      )}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{cat.label}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted, #94a3b8)" }}>{cat.desc}</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={cat.state}
                          onChange={(e) => cat.setter(e.target.checked)}
                          style={{ cursor: "pointer", width: "16px", height: "16px" }}
                        />
                      </label>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: "1rem 1.5rem",
            borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "0.75rem",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "6px",
              background: "transparent",
              border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.2))",
              color: "var(--text-secondary, #cbd5e1)",
              fontSize: "0.85rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "6px",
              background: "var(--brand-cyan, #06b6d4)",
              border: "none",
              color: "#0f172a",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: saving || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              opacity: saving || loading ? 0.7 : 1,
            }}
          >
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save Preferences"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
