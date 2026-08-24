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
  AuthUser,
  AuthResponse,
  AuthTokens,
  SystemRole,
} from "@omnidesk/shared-types";

export interface WorkspaceContextData {
  workspaceId: string;
  userId: string;
  userRole: SystemRole;
  userPermissions: string[];
}

export class ApiClient {
  private baseUrl = "/api/v1";
  private accessToken: string | null = null;
  private refreshTokenString: string | null = null;
  private isRefreshing = false;

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
      "ai:execute",
      "ai:approve",
      "ai:admin",
      "system:admin",
    ],
  };

  constructor() {
    this.restoreTokens();
  }

  private restoreTokens(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        this.accessToken = localStorage.getItem("omnidesk_access_token");
        this.refreshTokenString = localStorage.getItem("omnidesk_refresh_token");
      } catch {
        // Ignore storage access issues
      }
    }
  }

  private saveTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshTokenString = tokens.refreshToken;

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem("omnidesk_access_token", tokens.accessToken);
        localStorage.setItem("omnidesk_refresh_token", tokens.refreshToken);
      } catch {
        // Ignore storage access issues
      }
    }
  }

  public clearSession(): void {
    this.accessToken = null;
    this.refreshTokenString = null;

    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem("omnidesk_access_token");
        localStorage.removeItem("omnidesk_refresh_token");
      } catch {
        // Ignore storage access issues
      }
    }
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public setContext(context: Partial<WorkspaceContextData>): void {
    this.context = { ...this.context, ...context } as WorkspaceContextData;
  }

  public getContext(): WorkspaceContextData {
    return this.context;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-workspace-id": this.context.workspaceId,
    };

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`;
    }

    // Development / Test headers
    headers["x-user-id"] = this.context.userId;
    headers["x-user-role"] = this.context.userRole;
    headers["x-user-permissions"] = this.context.userPermissions.join(",");

    return headers;
  }

  private async request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    // Handle 401 Token Expiration with single retry
    if (res.status === 401 && !isRetry && this.refreshTokenString && !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh")) {
      try {
        await this.refreshToken();
        return this.request<T>(path, options, true);
      } catch {
        this.clearSession();
      }
    }

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

  // ── Authentication Endpoints ──────────────────────────────────────────────

  public async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    this.saveTokens(response.tokens);
    this.setContext({
      workspaceId: response.user.activeWorkspaceId,
      userId: response.user.id,
      userRole: response.user.role,
      userPermissions: response.user.permissions,
    });

    return response;
  }

  public async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    workspaceName?: string;
  }): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });

    this.saveTokens(response.tokens);
    this.setContext({
      workspaceId: response.user.activeWorkspaceId,
      userId: response.user.id,
      userRole: response.user.role,
      userPermissions: response.user.permissions,
    });

    return response;
  }

  public async logout(): Promise<void> {
    try {
      if (this.refreshTokenString) {
        await this.request<{ message: string }>("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: this.refreshTokenString }),
        });
      }
    } finally {
      this.clearSession();
    }
  }

  public async getCurrentUser(): Promise<AuthUser> {
    const user = await this.request<AuthUser>("/auth/me");
    this.setContext({
      workspaceId: user.activeWorkspaceId,
      userId: user.id,
      userRole: user.role,
      userPermissions: user.permissions,
    });
    return user;
  }

  public async refreshToken(): Promise<AuthTokens> {
    if (!this.refreshTokenString) {
      throw new Error("No refresh token available");
    }

    if (this.isRefreshing) {
      // Prevent concurrent refreshes
      await new Promise((resolve) => setTimeout(resolve, 300));
      return {
        accessToken: this.accessToken || "",
        refreshToken: this.refreshTokenString || "",
        expiresIn: 900,
      };
    }

    this.isRefreshing = true;
    try {
      const tokens = await this.request<AuthTokens>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: this.refreshTokenString }),
      });
      this.saveTokens(tokens);
      return tokens;
    } finally {
      this.isRefreshing = false;
    }
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

  public async getAIExecutions(filter?: any): Promise<AIExecutionSummary[]> {
    const query = filter ? `?${new URLSearchParams(filter).toString()}` : "";
    const res = await this.request<any>(`/ai/executions${query}`);
    return Array.isArray(res) ? res : res.items || res.executions || [];
  }

  public async getAIExecution(id: string): Promise<AIExecutionResponse> {
    return this.request<AIExecutionResponse>(`/ai/executions/${id}`);
  }

  public async getApprovals(filter?: any): Promise<AIApprovalRequestSummary[]> {
    const query = filter ? `?${new URLSearchParams(filter).toString()}` : "";
    const res = await this.request<any>(`/ai/approvals${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async approveAction(approvalId: string, reason?: string): Promise<any> {
    return this.request<any>(`/ai/approvals/${approvalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ decision: "APPROVED", reason }),
    });
  }

  public async rejectAction(approvalId: string, reason?: string): Promise<any> {
    return this.request<any>(`/ai/approvals/${approvalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ decision: "REJECTED", reason }),
    });
  }

  // ── Project Endpoints ───────────────────────────────────────────────────
  public async getProjects(filter?: any): Promise<ProjectSummary[]> {
    const query = filter ? `?${new URLSearchParams(filter).toString()}` : "";
    const res = await this.request<any>(`/projects${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getProjectHealth(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/health`);
  }

  public async getProjectProgress(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/progress`);
  }

  public async getMilestones(projectIdOrFilter?: any): Promise<MilestoneSummary[]> {
    let query = "";
    if (typeof projectIdOrFilter === "string") {
      query = `?projectId=${encodeURIComponent(projectIdOrFilter)}`;
    } else if (projectIdOrFilter && typeof projectIdOrFilter === "object") {
      query = `?${new URLSearchParams(projectIdOrFilter).toString()}`;
    }
    const res = await this.request<any>(`/milestones${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  // ── Task Endpoints ──────────────────────────────────────────────────────
  public async getTasks(filter?: any): Promise<TaskSummary[]> {
    const cleanFilter: Record<string, string> = {};
    if (filter) {
      for (const [k, v] of Object.entries(filter)) {
        if (v !== undefined && v !== null) {
          cleanFilter[k] = String(v);
        }
      }
    }
    const query = Object.keys(cleanFilter).length > 0 ? `?${new URLSearchParams(cleanFilter).toString()}` : "";
    const res = await this.request<any>(`/tasks${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getBlockedTasks(): Promise<TaskSummary[]> {
    const res = await this.request<any>("/tasks/blocked");
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getWorkload(): Promise<any> {
    return this.request<any>("/tasks/workload");
  }

  public async getTeamWorkload(): Promise<any> {
    return this.getWorkload();
  }

  // ── CRM Endpoints ───────────────────────────────────────────────────────
  public async getDeals(filter?: any): Promise<CRMDealSummary[]> {
    const query = filter ? `?${new URLSearchParams(filter).toString()}` : "";
    const res = await this.request<any>(`/crm/deals${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getLeads(filter?: any): Promise<CRMLeadSummary[]> {
    const query = filter ? `?${new URLSearchParams(filter).toString()}` : "";
    const res = await this.request<any>(`/crm/leads${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getCustomers(filter?: any): Promise<CRMCustomerSummary[]> {
    const query = filter ? `?${new URLSearchParams(filter).toString()}` : "";
    const res = await this.request<any>(`/crm/customers${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getPipelineSummary(): Promise<PipelineSummary> {
    return this.request<PipelineSummary>("/crm/pipeline/summary");
  }

  public async getStaleDeals(): Promise<CRMDealSummary[]> {
    const res = await this.request<any>("/crm/pipeline/stale");
    return Array.isArray(res) ? res : res.items || res.staleDeals || [];
  }

  // ── Health Endpoint ─────────────────────────────────────────────────────
  public async getHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
  }
}

export const apiClient = new ApiClient();

