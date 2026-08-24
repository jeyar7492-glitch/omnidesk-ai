import React from "react";
import { Bot, FolderKanban, CheckSquare, TrendingUp, Activity, Sparkles, LayoutDashboard } from "lucide-react";
import { useWorkspace } from "../../context/WorkspaceContext";
export type NavTab = "dashboard" | "ai" | "projects" | "tasks" | "crm" | "system";
interface SidebarProps { activeTab: NavTab; onTabChange: (tab: NavTab) => void; }
export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
 const { context } = useWorkspace(); const isPrivileged = context.userRole === "OWNER" || context.userRole === "ADMIN";
 const allNavItems = [
  { id: "dashboard" as NavTab, label: "Dashboard", icon: LayoutDashboard, requiredPermission: "workspace:read" },
  { id: "ai" as NavTab, label: "AI Supervisor", icon: Bot, badge: "Live", requiredPermission: "ai:execute" },
  { id: "projects" as NavTab, label: "Projects & Health", icon: FolderKanban, requiredPermission: "project:read" },
  { id: "tasks" as NavTab, label: "Tasks & Workload", icon: CheckSquare, requiredPermission: "task:read" },
  { id: "crm" as NavTab, label: "CRM & Pipeline", icon: TrendingUp, requiredPermission: "crm:read" },
  { id: "system" as NavTab, label: "System Health", icon: Activity, requiredPermission: "workspace:read" },
 ];
 const visibleItems = allNavItems.filter(item => isPrivileged || context.userPermissions.includes(item.requiredPermission));
 return <aside className="sidebar"><div style={{ height: "60px", display: "flex", alignItems: "center", gap: ".75rem", padding: "0 1.25rem", borderBottom: "1px solid var(--border-subtle)" }}><div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,var(--brand-cyan),var(--brand-indigo))", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={18} color="#fff"/></div><div><div style={{fontWeight:700}}>OmniDesk AI</div><div style={{fontSize:11,color:"var(--brand-cyan)"}}>Enterprise OS v2.0</div></div></div><nav style={{ flex: 1, padding: "1rem .75rem", display: "flex", flexDirection: "column", gap: ".35rem" }}><div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".08em",color:"var(--text-muted)",padding: ".25rem .75rem"}}>Workspace</div>{visibleItems.map(item => { const Icon=item.icon; const active=activeTab===item.id; return <button key={item.id} onClick={()=>onTabChange(item.id)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".65rem .85rem",borderRadius:8,background:active?"var(--bg-elevated)":"transparent",border:active?"1px solid var(--border-glow)":"1px solid transparent",color:active?"var(--text-primary)":"var(--text-secondary)",fontWeight:active?600:500,fontSize:14,textAlign:"left",cursor:"pointer"}}><div style={{display:"flex",alignItems:"center",gap:".75rem"}}><Icon size={18} color={active?"var(--brand-cyan)":"var(--text-muted)"}/><span>{item.label}</span></div>{item.badge&&<span style={{fontSize:10,padding:".1rem .4rem",borderRadius:4,background:"rgba(6,182,212,.15)",color:"var(--brand-cyan)",fontWeight:700}}>{item.badge}</span>}</button>;})}</nav><div style={{padding:16,borderTop:"1px solid var(--border-subtle)",background:"var(--bg-card)",fontSize:12,color:"var(--text-muted)"}}><div style={{display:"flex",justifyContent:"space-between"}}><span>Database</span><span style={{color:"var(--status-online)",fontWeight:600}}>MongoDB rs0</span></div><div style={{display:"flex",justifyContent:"space-between"}}><span>RBAC Mode</span><span style={{color:"var(--brand-cyan)",fontWeight:600}}>Authoritative</span></div></div></aside>;
};
