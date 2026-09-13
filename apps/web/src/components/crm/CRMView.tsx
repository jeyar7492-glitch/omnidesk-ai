import React, { useState } from "react";
import {
  LayoutDashboard,
  Kanban,
  Briefcase,
  Flame,
  Building2,
  Users,
  Clock,
  RefreshCw,
} from "lucide-react";
import { useLiveEvents } from "../../hooks/useLiveEvents";
import { CRMDashboardTab } from "./CRMDashboardTab";
import { CRMPipelineTab } from "./CRMPipelineTab";
import { CRMDealsTab } from "./CRMDealsTab";
import { CRMLeadsTab } from "./CRMLeadsTab";
import { CRMCustomersTab } from "./CRMCustomersTab";
import { CRMContactsTab } from "./CRMContactsTab";
import { CRMActivitiesTab } from "./CRMActivitiesTab";

type CRMTab = "overview" | "pipeline" | "deals" | "leads" | "customers" | "contacts" | "activities";

export const CRMView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<CRMTab>("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  // Real-time live event subscriptions to trigger automatic reload
  useLiveEvents("crm:deal_created", triggerRefresh);
  useLiveEvents("crm:deal_stage_changed", triggerRefresh);
  useLiveEvents("crm:lead_created", triggerRefresh);
  useLiveEvents("crm:customer_created", triggerRefresh);
  useLiveEvents("crm:activity_created", triggerRefresh);

  const navItems: { id: CRMTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} /> },
    { id: "pipeline", label: "Pipeline", icon: <Kanban size={15} /> },
    { id: "deals", label: "Deals", icon: <Briefcase size={15} /> },
    { id: "leads", label: "Leads", icon: <Flame size={15} /> },
    { id: "customers", label: "Customers", icon: <Building2 size={15} /> },
    { id: "contacts", label: "Contacts", icon: <Users size={15} /> },
    { id: "activities", label: "Activities", icon: <Clock size={15} /> },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Enterprise CRM & Sales Pipeline
          </h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.15rem" }}>
            Real-time pipeline management, lead qualification, revenue tracking, and unified customer accounts.
          </p>
        </div>

        <button
          onClick={triggerRefresh}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "var(--bg-card)",
            padding: "0.5rem 0.85rem",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Sub-Tabs Bar */}
      <div
        style={{
          display: "flex",
          gap: "0.4rem",
          background: "var(--bg-secondary)",
          padding: "0.3rem",
          borderRadius: "8px",
          border: "1px solid var(--border-subtle)",
          width: "fit-content",
        }}
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: "0.45rem 0.85rem",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? "var(--bg-card)" : "transparent",
                border: isActive ? "1px solid var(--border-medium)" : "1px solid transparent",
                transition: "all 0.15s ease",
              }}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div key={refreshKey} style={{ flex: 1 }}>
        {activeTab === "overview" && <CRMDashboardTab onNavigateTab={(tab) => setActiveTab(tab as CRMTab)} />}
        {activeTab === "pipeline" && <CRMPipelineTab />}
        {activeTab === "deals" && <CRMDealsTab />}
        {activeTab === "leads" && <CRMLeadsTab />}
        {activeTab === "customers" && <CRMCustomersTab />}
        {activeTab === "contacts" && <CRMContactsTab />}
        {activeTab === "activities" && <CRMActivitiesTab />}
      </div>
    </div>
  );
};
