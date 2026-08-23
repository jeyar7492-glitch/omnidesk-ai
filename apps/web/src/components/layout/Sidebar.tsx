import React from "react";
import { Bot, FolderKanban, CheckSquare, TrendingUp, Activity, Sparkles } from "lucide-react";

export type NavTab = "ai" | "projects" | "tasks" | "crm" | "system";

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: "ai" as NavTab, label: "AI Supervisor", icon: Bot, badge: "Live" },
    { id: "projects" as NavTab, label: "Projects & Health", icon: FolderKanban },
    { id: "tasks" as NavTab, label: "Tasks & Workload", icon: CheckSquare },
    { id: "crm" as NavTab, label: "CRM & Pipeline", icon: TrendingUp },
    { id: "system" as NavTab, label: "System Health", icon: Activity },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div
        style={{
          height: "60px",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0 1.25rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-indigo))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 12px rgba(6, 182, 212, 0.35)",
          }}
        >
          <Sparkles size={18} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.02em" }}>OmniDesk AI</div>
          <div style={{ fontSize: "0.7rem", color: "var(--brand-cyan)", fontWeight: 500 }}>
            Enterprise OS v2.0
          </div>
        </div>
      </div>

      {/* Navigation items */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            padding: "0.25rem 0.75rem",
            marginBottom: "0.25rem",
          }}
        >
          Workspace
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.65rem 0.85rem",
                borderRadius: "8px",
                background: isActive ? "var(--bg-elevated)" : "transparent",
                border: isActive ? "1px solid var(--border-glow)" : "1px solid transparent",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.875rem",
                boxShadow: isActive ? "var(--shadow-glow)" : "none",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <Icon size={18} color={isActive ? "var(--brand-cyan)" : "var(--text-muted)"} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "4px",
                    background: "rgba(6, 182, 212, 0.15)",
                    color: "var(--brand-cyan)",
                    fontWeight: 700,
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid var(--border-subtle)",
          background: "var(--bg-card)",
          fontSize: "0.75rem",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <span>Database</span>
          <span style={{ color: "var(--status-online)", fontWeight: 600 }}>MongoDB rs0</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>AI Foundation</span>
          <span style={{ color: "var(--brand-cyan)", fontWeight: 600 }}>Supervisor Agent</span>
        </div>
      </div>
    </aside>
  );
};
