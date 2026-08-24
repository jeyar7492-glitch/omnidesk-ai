
// Phase 3 contracts
export interface DashboardMetrics {
  kpis: { totalProjects: number; activeProjects: number; completedProjects: number; totalTasks: number; overdueTasks: number; blockedTasks: number; pipelineValue: number; weightedForecast: number; openDeals: number; leads: number; aiExecutions: number; pendingApprovals: number };
  projectOverview: Array<{ id: string; name: string; status: string; health: string; progress: number; deadline?: string; overdueMilestones: number; upcomingMilestones: number }>;
  taskOverview: { status: Record<string, number>; priority: Record<string, number> };
  crmOverview: { stages: Record<string, { count: number; value: number; weighted: number }>; wonRevenue: number; staleDeals: number; recentDeals: DealSummary[] };
  aiActivity: { recent: Array<{ id: string; prompt: string; status: string; createdAt: string; durationMs?: number }>; stats: Record<string, number>; pendingApprovals: Array<{ id: string; actionName: string; riskLevel: string; createdAt: string }> };
  teamWorkload: Array<{ userId: string; name: string; role: string; activeTasks: number; overdueTasks: number; estimatedHours: number; utilization: number }>;
  recentActivity: Array<{ id: string; action: string; entityType: string; entityId?: string; userName?: string; createdAt: string; details?: unknown }>;
  generatedAt: string;
}
export type SearchResultCategory = "projects" | "tasks" | "crm" | "milestones" | "ai";
export interface SearchResultItem { id: string; category: SearchResultCategory; title: string; subtitle?: string; status?: string; metadata?: Record<string, unknown>; navigation: { tab: "dashboard" | "ai" | "projects" | "tasks" | "crm"; id?: string } }
export interface GlobalSearchResponse { query: string; total: number; results: Record<SearchResultCategory, SearchResultItem[]> }
