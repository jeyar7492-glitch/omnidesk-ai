import React, { useState } from "react";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import { Sidebar, NavTab } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { AIAssistant } from "./components/ai/AIAssistant";
import { ProjectsView } from "./components/projects/ProjectsView";
import { TasksView } from "./components/tasks/TasksView";
import { CRMView } from "./components/crm/CRMView";
import { SystemView } from "./components/system/SystemView";

export function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<NavTab>("ai");

  const tabTitles: Record<NavTab, string> = {
    ai: "OmniDesk AI Supervisor Workspace",
    projects: "Projects & Milestone Roadmaps",
    tasks: "Task Execution & Team Capacity",
    crm: "CRM Deals & Sales Pipeline",
    system: "System Telemetry & Architecture",
  };

  return (
    <WorkspaceProvider>
      <div className="app-container">
        {/* Navigation Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content Area */}
        <div className="main-content">
          <Header activeTabTitle={tabTitles[activeTab]} />

          {activeTab === "ai" && <AIAssistant />}
          {activeTab === "projects" && <ProjectsView />}
          {activeTab === "tasks" && <TasksView />}
          {activeTab === "crm" && <CRMView />}
          {activeTab === "system" && <SystemView />}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
