import {
  AIExecutionResponse,
  AIExecutionSummary,
  AIApprovalRequestSummary,
  ProjectSummary,
  TaskSummary,
  MilestoneSummary,
  CRMLeadSummary,
  CRMDealSummary,
  CRMCustomerSummary,
  PipelineSummary,
} from "@omnidesk/shared-types";

export interface WorkspaceContextData {
  workspaceId: string;
  userId: string;
  userRole: string;
  userPermissions: string[];
}

export class ApiClient {
  private baseUrl = "/api/v1";
  private context: WorkspaceContextData = {
    workspaceId: "67b844ec10ec6e3973b5cc11",
    userId: "67b844ec10ec6e3973b5cc33",
    userRole: "ADMIN",
    userPermissions: [
      "workspace:read",
      "workspace:write",
      "project:read",
      "project:write",
      "project:assign",
      "project:archive",
      "task:read",
      "task:write",
      "task:assign",
      "task:move",
      "milestone:read",
      "milestone:write",
      "crm:read",
      "crm:write",
      "lead:read",
      "lead:write",
      "customer:read",
      "customer:write",
      "contact:read",
      "contact:write",
      "deal:read",
      "deal:write",
      "system:admin",
    ],
  };

  public setContext(context: Partial<WorkspaceContextData>): void {
    this.context = { ...this.context, ...context };
  }

  public getContext(): WorkspaceContextData {
    return this.context;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-workspace-id": this.context.workspaceId,
      "x-user-id": this.context.userId,
      "x-user-role": this.context.userRole,
      "x-user-permissions": this.context.userPermissions.join(","),
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {}),
      },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error?.message || data.message || `Request failed with HTTP ${res.status}`;
      const err = new Error(errorMsg) as Error & { status: number; code?: string; details?: unknown };
      err.status = res.status;
      err.code = data.error?.code;
      err.details = data.error?.details;
      throw err;
    }

    return (data.data !== undefined ? data.data : data) as T;
  }

  // ── AI Endpoints ────────────────────────────────────────────────────────
  public async executeAI(params: {
    prompt: string;
    conversationId?: string;
    agentId?: string;
  }): Promise<AIExecutionResponse> {
    return this.request<AIExecutionResponse>("/ai/executions", {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  public async getAIExecutions(): Promise<{ count: number; executions: AIExecutionSummary[] }> {
    return this.request<{ count: number; executions: AIExecutionSummary[] }>("/ai/executions");
  }

  public async getAIExecutionById(id: string): Promise<AIExecutionResponse> {
    return this.request<AIExecutionResponse>(`/ai/executions/${id}`);
  }

  public async getAIApprovals(): Promise<{ count: number; approvals: AIApprovalRequestSummary[] }> {
    return this.request<{ count: number; approvals: AIApprovalRequestSummary[] }>("/ai/approvals");
  }

  public async approveAction(approvalId: string, reason?: string): Promise<{ success: boolean; status: string }> {
    return this.request<{ success: boolean; status: string }>(`/ai/approvals/${approvalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  public async rejectAction(approvalId: string, reason?: string): Promise<{ success: boolean; status: string }> {
    return this.request<{ success: boolean; status: string }>(`/ai/approvals/${approvalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // ── Projects Endpoints ──────────────────────────────────────────────────
  public async getProjects(): Promise<ProjectSummary[]> {
    return this.request<ProjectSummary[]>("/projects");
  }

  public async getProjectHealth(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/health`);
  }

  public async getProjectProgress(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/progress`);
  }

  public async getMilestones(projectId?: string): Promise<MilestoneSummary[]> {
    const query = projectId ? `?projectId=${projectId}` : "";
    return this.request<MilestoneSummary[]>(`/milestones${query}`);
  }

  // ── Tasks Endpoints ─────────────────────────────────────────────────────
  public async getTasks(filters: { projectId?: string; status?: string; isOverdue?: boolean; isBlocked?: boolean } = {}): Promise<TaskSummary[]> {
    const params = new URLSearchParams();
    if (filters.projectId) params.append("projectId", filters.projectId);
    if (filters.status) params.append("status", filters.status);
    if (filters.isOverdue) params.append("isOverdue", "true");
    if (filters.isBlocked) params.append("isBlocked", "true");

    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<TaskSummary[]>(`/tasks${query}`);
  }

  public async getBlockedTasks(projectId?: string): Promise<{ count: number; blockedTasks: any[] }> {
    const query = projectId ? `?projectId=${projectId}` : "";
    return this.request<{ count: number; blockedTasks: any[] }>(`/tasks/blocked${query}`);
  }

  public async getTeamWorkload(): Promise<{ workspaceId: string; totalActiveTasks: number; totalOverdueTasks: number; members: any[] }> {
    return this.request<{ workspaceId: string; totalActiveTasks: number; totalOverdueTasks: number; members: any[] }>("/tasks/workload");
  }

  // ── CRM Endpoints ───────────────────────────────────────────────────────
  public async getPipelineSummary(): Promise<PipelineSummary> {
    return this.request<PipelineSummary>("/crm/pipeline/summary");
  }

  public async getDeals(): Promise<CRMDealSummary[]> {
    return this.request<CRMDealSummary[]>("/crm/deals");
  }

  public async getLeads(): Promise<CRMLeadSummary[]> {
    return this.request<CRMLeadSummary[]>("/crm/leads");
  }

  public async getCustomers(): Promise<CRMCustomerSummary[]> {
    return this.request<CRMCustomerSummary[]>("/crm/customers");
  }

  public async getStaleDeals(): Promise<{ count: number; staleDeals: any[] }> {
    return this.request<{ count: number; staleDeals: any[] }>("/crm/deals/stale");
  }

  public async getOverdueFollowups(): Promise<{ count: number; overdueFollowups: any[] }> {
    return this.request<{ count: number; overdueFollowups: any[] }>("/crm/activities/overdue");
  }

  // ── Health ──────────────────────────────────────────────────────────────
  public async getHealth(): Promise<{ status: string; uptime: number; timestamp: string }> {
    return this.request<{ status: string; uptime: number; timestamp: string }>("/health");
  }
}

export const apiClient = new ApiClient();
