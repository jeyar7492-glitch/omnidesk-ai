import React, { useState, useEffect } from "react";
import { WorkspaceProvider, useWorkspace } from "./context/WorkspaceContext";
import { Sidebar, NavTab } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { DashboardView } from "./components/dashboard/DashboardView";
import { AIAssistant } from "./components/ai/AIAssistant";
import { ProjectsView } from "./components/projects/ProjectsView";
import { TasksView } from "./components/tasks/TasksView";
import { CRMView } from "./components/crm/CRMView";
import { SystemView } from "./components/system/SystemView";
import { LoginView } from "./components/auth/LoginView";
import { GlobalSearchModal } from "./components/search/GlobalSearchModal";
import { Shield } from "lucide-react";

function WorkspaceApp(): React.ReactElement {
  const { isAuthenticated, isLoadingAuth } = useWorkspace();
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const tabTitles: Record<NavTab, string> = {
    dashboard: "OmniDesk Executive Command Center",
    ai: "OmniDesk AI Supervisor Workspace",
    projects: "Projects & Milestone Roadmaps",
    tasks: "Task Execution & Team Capacity",
    crm: "CRM Deals & Sales Pipeline",
    system: "System Telemetry & Architecture",
  };

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (isLoadingAuth) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          backgroundColor: "var(--bg-primary)",
          gap: "16px",
        }}
      >
        <div
          className="pulse-animation"
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, var(--brand-cyan), var(--brand-indigo))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 30px rgba(6, 182, 212, 0.4)",
          }}
        >
          <Shield size={30} color="#ffffff" />
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: "14px", fontWeight: 500 }}>
          Initializing OmniDesk AI Security Session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="app-container animate-fade-in">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content Area */}
      <div className="main-content">
        <Header
          activeTabTitle={tabTitles[activeTab]}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        {activeTab === "dashboard" && <DashboardView onNavigateTab={(tab) => setActiveTab(tab as NavTab)} />}
        {activeTab === "ai" && <AIAssistant />}
        {activeTab === "projects" && <ProjectsView />}
        {activeTab === "tasks" && <TasksView />}
        {activeTab === "crm" && <CRMView />}
        {activeTab === "system" && <SystemView />}
      </div>

      {/* Global Command Palette / Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={(tab) => {
          setActiveTab(tab as NavTab);
        }}
      />
    </div>
  );
}


export function App(): React.ReactElement {
  return (
    <WorkspaceProvider>
      <WorkspaceApp />
    </WorkspaceProvider>
  );
}
