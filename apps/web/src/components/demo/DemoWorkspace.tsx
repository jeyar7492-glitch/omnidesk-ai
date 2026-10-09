import React, { useMemo, useState } from "react";
import {
  Activity, Bot, BriefcaseBusiness, CheckSquare, CircleDollarSign, FileText,
  LayoutDashboard, MessageSquare, Search, Settings2, Users, Plus, Bell,
  ArrowUpRight, Clock3, ShieldCheck, Sparkles, X
} from "lucide-react";

type Section = "Overview" | "AI Agents" | "Projects" | "Tasks" | "CRM" | "Finance" | "Knowledge" | "Communication" | "System";
type Task = { id: number; title: string; owner: string; status: "In progress" | "Review" | "Done" };

const initialTasks: Task[] = [
  { id: 1, title: "Launch customer onboarding flow", owner: "Maya Chen", status: "In progress" },
  { id: 2, title: "Review Q4 sales pipeline", owner: "Arun Kumar", status: "Review" },
  { id: 3, title: "Publish product knowledge base", owner: "Nina Patel", status: "Done" },
];

const nav: { name: Section; icon: React.ElementType }[] = [
  { name: "Overview", icon: LayoutDashboard }, { name: "AI Agents", icon: Bot },
  { name: "Projects", icon: BriefcaseBusiness }, { name: "Tasks", icon: CheckSquare },
  { name: "CRM", icon: Users }, { name: "Finance", icon: CircleDollarSign },
  { name: "Knowledge", icon: FileText }, { name: "Communication", icon: MessageSquare },
  { name: "System", icon: Settings2 },
];

const demoModules: Record<Exclude<Section, "Overview" | "Tasks">, { description: string; items: string[] }> = {
  "AI Agents": { description: "Monitor your AI workforce and review suggested actions.", items: ["Research Agent — Ready", "Workflow Agent — Ready", "Support Agent — Needs review"] },
  Projects: { description: "Track delivery, ownership, milestones, and project health.", items: ["Customer Experience Refresh — 72% complete", "AI Operations Portal — 48% complete", "Knowledge Migration — 91% complete"] },
  CRM: { description: "Keep customer relationships and sales opportunities in one place.", items: ["Northstar Labs — $24,000 opportunity", "BluePeak Systems — $18,500 opportunity", "Vertex Digital — $9,800 opportunity"] },
  Finance: { description: "A high-level view of example finance and billing workflows.", items: ["Invoices awaiting review — 4", "Receivables this month — $42,300", "Expenses to categorize — 7"] },
  Knowledge: { description: "Browse example internal documents and team knowledge.", items: ["Product launch playbook", "Customer support handbook", "Security and access policy"] },
  Communication: { description: "Keep cross-functional updates and conversations organized.", items: ["Product team — 3 unread updates", "Customer success — Weekly handoff", "Operations — Deployment checklist"] },
  System: { description: "Prototype status and integration overview.", items: ["Frontend interface — Available", "API connection — Not verified", "Database connection — Needs configuration"] },
};

export const DemoWorkspace: React.FC = () => {
  const [active, setActive] = useState<Section>("Overview");
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const visibleTasks = useMemo(() => tasks.filter(t => (t.title + " " + t.owner + " " + t.status).toLowerCase().includes(query.toLowerCase())), [tasks, query]);

  const addTask = (event: React.FormEvent) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;
    setTasks(prev => [{ id: Date.now(), title, owner: "You", status: "In progress" }, ...prev]);
    setTaskTitle("");
    setShowTaskForm(false);
    setNotice("Demo task added locally.");
    window.setTimeout(() => setNotice(""), 2500);
  };

  const cardStyle: React.CSSProperties = { background: "#111c2d", border: "1px solid #26364c", borderRadius: 14, padding: 20 };
  const muted: React.CSSProperties = { color: "#93a4bb", fontSize: 13 };
  const pageTitle = active === "Overview" ? "Executive command center" : active;

  return <div style={{ minHeight: "100vh", background: "#0a1220", color: "#e8eef7", display: "flex", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}>
    <aside style={{ width: 236, flexShrink: 0, background: "#0d1727", borderRight: "1px solid #233247", padding: "24px 14px", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "0 8px 28px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#06b6d4,#6366f1)" }}><Sparkles size={20}/></div>
        <div><div style={{ fontWeight: 750, letterSpacing: "-.4px" }}>OmniDesk AI</div><div style={{ ...muted, fontSize: 11 }}>WORKSPACE</div></div>
      </div>
      <div style={{ ...muted, padding: "0 10px 10px", fontSize: 10, letterSpacing: 1.4 }}>WORKSPACE</div>
      <nav style={{ display: "grid", gap: 5 }}>
        {nav.map(({name, icon: Icon}) => <button key={name} onClick={() => setActive(name)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", padding: "11px 12px", borderRadius: 9, border: "1px solid " + (active === name ? "#155e75" : "transparent"), background: active === name ? "#123244" : "transparent", color: active === name ? "#67e8f9" : "#b7c4d6", cursor: "pointer", fontSize: 13 }}><Icon size={17}/>{name}</button>)}
      </nav>
      <div style={{ marginTop: "auto", ...cardStyle, padding: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, color: "#86efac", fontSize: 12, fontWeight: 650 }}><ShieldCheck size={16}/> Interactive prototype</div>
        <p style={{ ...muted, fontSize: 11, lineHeight: 1.5, marginBottom: 0 }}>Sample data only. No production records are changed.</p>
      </div>
    </aside>
    <main style={{ minWidth: 0, flex: 1 }}>
      <header style={{ height: 76, padding: "0 30px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #233247", background: "#0d1727" }}>
        <div><div style={{ ...muted, fontSize: 11 }}>OMNIDESK / {active.toUpperCase()}</div><div style={{ fontWeight: 650, marginTop: 4 }}>{pageTitle}</div></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ position: "relative" }}><Search size={15} color="#93a4bb" style={{ position: "absolute", left: 11, top: 11 }}/><input aria-label="Search demo data" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search tasks..." style={{ width: 180, background: "#111c2d", border: "1px solid #293a50", borderRadius: 9, padding: "9px 12px 9px 34px", color: "#e8eef7", outline: "none" }}/></div>
          <button onClick={() => setNotice("You are viewing sample demo notifications.")} title="Notifications" style={{ border: "1px solid #293a50", borderRadius: 9, background: "#111c2d", color: "#cbd5e1", padding: 9, cursor: "pointer" }}><Bell size={17}/></button>
          <div style={{ width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center", background: "#164e63", color: "#a5f3fc", fontWeight: 700 }}>JD</div>
        </div>
      </header>
      <div style={{ padding: 30, maxWidth: 1500, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
          <div><h1 style={{ fontSize: 25, letterSpacing: "-.7px", margin: "0 0 7px" }}>{active === "Overview" ? "Good morning, Jeyaram" : active}</h1><p style={{ ...muted, margin: 0 }}>{active === "Overview" ? "Your teams, projects, and AI workflows at a glance." : (demoModules[active as keyof typeof demoModules]?.description || "Manage example tasks in this interactive prototype.")}</p></div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid #854d0e", background: "#2a2114", color: "#fcd34d", borderRadius: 999, padding: "7px 12px", fontSize: 11, fontWeight: 700 }}><Activity size={14}/> DEMO MODE · SAMPLE DATA</div>
        </div>
        {notice && <div role="status" style={{ marginBottom: 16, padding: 12, borderRadius: 9, background: "#123244", border: "1px solid #155e75", color: "#a5f3fc", fontSize: 13 }}>{notice}</div>}
        {active === "Overview" && <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))", gap: 14, marginBottom: 20 }}>
            {[["Active projects","12","+2 this month",BriefcaseBusiness],["Tasks in progress","38","6 due this week",CheckSquare],["Pipeline value","$184.5K","14 open deals",CircleDollarSign],["AI executions","246","+18% this week",Bot]].map(([label,value,sub,Icon]: any) => <div key={label} style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", ...muted }}>{label}<Icon size={18} color="#67e8f9"/></div><div style={{ fontSize: 29, fontWeight: 750, margin: "14px 0 5px", letterSpacing: "-1px" }}>{value}</div><div style={{ color: "#86efac", fontSize: 12 }}>{sub}</div></div>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ fontSize: 15, margin: 0 }}>Team activity</h2><span style={{ ...muted, fontSize: 11 }}>SAMPLE</span></div>
              {[["Customer Experience Refresh",72,"#22d3ee"],["AI Operations Portal",48,"#818cf8"],["Knowledge Migration",91,"#34d399"]].map(([name,pct,color]: any)=><div key={name} style={{ marginBottom: 20 }}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 9 }}><span>{name}</span><span style={muted}>{pct}%</span></div><div style={{ height: 6, borderRadius: 8, background: "#26364c" }}><div style={{ height: "100%", width: pct+"%", background: color, borderRadius: 8 }}/></div></div>)}
            </section>
            <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}><h2 style={{ fontSize: 15, margin: 0 }}>Priority tasks</h2><button onClick={() => setActive("Tasks")} style={{ color: "#67e8f9", background: "transparent", border: 0, cursor: "pointer", fontSize: 12 }}>View all <ArrowUpRight size={12} style={{ verticalAlign: "middle" }}/></button></div>
              {tasks.slice(0,3).map(t=><div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderTop: "1px solid #26364c" }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: t.status==="Done" ? "#34d399" : t.status==="Review" ? "#fbbf24" : "#22d3ee" }}/><div style={{ flex: 1, fontSize: 12 }}>{t.title}<div style={{ ...muted, fontSize: 11, marginTop: 4 }}>{t.owner}</div></div><span style={{ ...muted, fontSize: 10 }}>{t.status}</span></div>)}
            </section>
            <section style={cardStyle}><h2 style={{ fontSize: 15, margin: "0 0 15px" }}>System connections</h2>{[["Web workspace","Available","#86efac"],["Live API","Not verified","#fcd34d"],["Database","Needs configuration","#fcd34d"]].map(([name,status,color])=><div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "11px 0", borderTop: "1px solid #26364c", fontSize: 12 }}><span>{name}</span><span style={{ color, display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, background: color, borderRadius: "50%" }}/>{status}</span></div>)}</section>
          </div>
        </>}
        {active === "Tasks" && <section style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}><div><h2 style={{ fontSize: 16, margin: "0 0 5px" }}>Task board</h2><p style={{ ...muted, margin: 0 }}>Changes stay in this browser session.</p></div><button onClick={() => setShowTaskForm(v=>!v)} style={{ display: "flex", alignItems: "center", gap: 7, background: "#06b6d4", color: "#05202a", border: 0, borderRadius: 8, padding: "10px 13px", fontWeight: 750, cursor: "pointer" }}>{showTaskForm?<X size={16}/>:<Plus size={16}/>} Add task</button></div>
          {showTaskForm && <form onSubmit={addTask} style={{ display: "flex", gap: 8, marginBottom: 16 }}><input autoFocus value={taskTitle} onChange={e=>setTaskTitle(e.target.value)} placeholder="Enter a task title" style={{ flex: 1, minWidth: 0, background: "#0a1220", border: "1px solid #293a50", borderRadius: 8, padding: 11, color: "#e8eef7" }}/><button type="submit" style={{ background: "#164e63", color: "#a5f3fc", border: "1px solid #155e75", borderRadius: 8, padding: "0 14px", cursor: "pointer" }}>Save</button></form>}
          {visibleTasks.map(t=><div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid #26364c", padding: "15px 0" }}><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div><div style={{ ...muted, marginTop: 5 }}>{t.owner}</div></div><select aria-label={"Status for "+t.title} value={t.status} onChange={e=>setTasks(prev=>prev.map(x=>x.id===t.id?{...x,status:e.target.value as Task["status"]}:x))} style={{ background: "#0a1220", color: "#dbeafe", border: "1px solid #293a50", borderRadius: 7, padding: 8 }}><option>In progress</option><option>Review</option><option>Done</option></select></div>)}
          {visibleTasks.length===0 && <p style={muted}>No matching tasks. Try another search or add a task.</p>}
        </section>}
        {active !== "Overview" && active !== "Tasks" && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>{demoModules[active as keyof typeof demoModules].items.map((item,i)=><section key={item} style={cardStyle}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}><div style={{ width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center", background: "#123244", color: "#67e8f9" }}>{active==="AI Agents"?<Bot size={17}/>:active==="CRM"?<Users size={17}/>:active==="Finance"?<CircleDollarSign size={17}/>:active==="Communication"?<MessageSquare size={17}/>:active==="Knowledge"?<FileText size={17}/>:active==="System"?<Settings2 size={17}/>:<BriefcaseBusiness size={17}/>}</div><span style={{ ...muted, fontSize: 10 }}>DEMO {String(i+1).padStart(2,"0")}</span></div><div style={{ fontSize: 13, lineHeight: 1.6 }}>{item}</div><button onClick={()=>setNotice("Prototype interaction only — connect the API/database to save real records.")} style={{ marginTop: 18, background: "transparent", border: "1px solid #33465f", color: "#cbd5e1", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 11 }}>View details <ArrowUpRight size={12} style={{ verticalAlign: "middle" }}/></button></section>)}</div>}
        <footer style={{ ...muted, borderTop: "1px solid #233247", marginTop: 26, paddingTop: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 11 }}><span>OmniDesk AI · Prototype build</span><span><Clock3 size={12} style={{ verticalAlign: "middle", marginRight: 5 }}/>Demo interactions are local; live services are not connected.</span></footer>
      </div>
    </main>
  </div>;
};
