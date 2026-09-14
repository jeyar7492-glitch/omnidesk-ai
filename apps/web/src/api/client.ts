import {
  AIExecutionResponse,
  AIExecutionSummary,
  AIApprovalRequestSummary,
  ProjectSummary,
  ProjectDetail,
  ProjectDashboardStats,
  ProjectMemberSummary,
  TaskSummary,
  TaskDetail,
  MilestoneSummary,
  CRMLeadSummary,
  CRMDealSummary,
  CRMCustomerSummary,
  PipelineSummary,
  AuthUser,
  AuthResponse,
  AuthTokens,
  SystemRole,
  DashboardMetrics,
  GlobalSearchResponse,
  CRMDashboardMetrics,
  CustomerDetail,
  ContactSummary,
  ContactDetail,
  LeadDetail,
  DealDetail,
  CRMActivitySummary,
  PaginatedResponse,
  InvoiceSummary,
  InvoiceDetail,
  PaymentSummary,
  ExpenseCategorySummary,
  ExpenseSummary,
  FinanceDashboardStats,
  FinanceRevenueReport,
  FinanceExpenseReport,
  FinanceProfitLossReport,
  FinanceReceivablesReport,
  FinanceOverdueReport,
  CustomerRevenueReport,
  ProjectProfitabilityReport,
  CustomerFinanceSummary,
  ProjectFinanceSummary,
} from "@omnidesk/shared-types";


export interface WorkspaceContextData {
  workspaceId: string;
  userId: string;
  userRole: SystemRole;
  userPermissions: string[];
}

export class ApiClient {
  private baseUrl = (() => {
    const metaEnv = typeof import.meta !== "undefined" ? (import.meta as any).env : undefined;
    const rawUrl = (metaEnv?.VITE_API_URL || metaEnv?.VITE_API_BASE_URL || "").trim();
    if (!rawUrl) {
      return "/api/v1";
    }
    const cleanUrl = rawUrl.replace(/\/+$/, "");
    if (cleanUrl.endsWith("/api/v1")) {
      return cleanUrl;
    }
    if (cleanUrl.endsWith("/api")) {
      return `${cleanUrl}/v1`;
    }
    return `${cleanUrl}/api/v1`;
  })();
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
      "finance:read",
      "finance:write",
      "finance:approve",
      "finance:delete",
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

  public getBaseUrl(): string {
    return this.baseUrl;
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

  private async requestWithMeta<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<{ data: T; meta?: any }> {
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
        return this.requestWithMeta<T>(path, options, true);
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

    return {
      data: (data.data !== undefined ? data.data : data) as T,
      meta: data.meta,
    };
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
    const query = this.toQueryString(filter);
    const res = await this.request<any>(`/projects${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getProjectsPaginated(filter?: any): Promise<PaginatedResponse<ProjectSummary>> {
    const query = this.toQueryString(filter);
    const res = await this.requestWithMeta<ProjectSummary[]>(`/projects${query}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getProject(id: string): Promise<ProjectDetail> {
    return this.request<ProjectDetail>(`/projects/${id}`);
  }

  public async createProject(input: {
    name: string;
    description?: string;
    key?: string;
    priority?: string;
    customerId?: string;
    managerId?: string;
    startDate?: string;
    targetDate?: string;
    budget?: number;
    color?: string;
  }): Promise<ProjectDetail> {
    return this.request<ProjectDetail>("/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateProject(id: string, input: any): Promise<ProjectDetail> {
    return this.request<ProjectDetail>(`/projects/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async deleteProject(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/projects/${id}`, {
      method: "DELETE",
    });
  }

  public async archiveProject(id: string, reason?: string): Promise<any> {
    return this.request<any>(`/projects/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  public async restoreProject(id: string): Promise<any> {
    return this.request<any>(`/projects/${id}/restore`, {
      method: "POST",
    });
  }

  public async getProjectDashboard(id: string): Promise<ProjectDashboardStats> {
    return this.request<ProjectDashboardStats>(`/projects/${id}/dashboard`);
  }

  public async getProjectHealth(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/health`);
  }

  public async getProjectProgress(projectId: string): Promise<any> {
    return this.request<any>(`/projects/${projectId}/progress`);
  }

  public async getProjectMembers(id: string): Promise<ProjectMemberSummary[]> {
    const res = await this.request<any>(`/projects/${id}/members`);
    return Array.isArray(res) ? res : [];
  }

  public async addProjectMember(id: string, input: { userId?: string; userEmail?: string; role?: string }): Promise<any> {
    return this.request<any>(`/projects/${id}/members`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async removeProjectMember(id: string, userId: string): Promise<any> {
    return this.request<any>(`/projects/${id}/members/${userId}`, {
      method: "DELETE",
    });
  }

  public async getMilestones(projectIdOrFilter?: any): Promise<MilestoneSummary[]> {
    let query = "";
    if (typeof projectIdOrFilter === "string") {
      query = `?projectId=${encodeURIComponent(projectIdOrFilter)}`;
    } else if (projectIdOrFilter && typeof projectIdOrFilter === "object") {
      query = this.toQueryString(projectIdOrFilter);
    }
    const res = await this.request<any>(`/milestones${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getProjectMilestones(id: string): Promise<MilestoneSummary[]> {
    const res = await this.request<any>(`/projects/${id}/milestones`);
    return Array.isArray(res) ? res : [];
  }

  public async createProjectMilestone(id: string, input: {
    title: string;
    description?: string;
    dueDate?: string;
    status?: string;
  }): Promise<any> {
    return this.request<any>(`/projects/${id}/milestones`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  // ── Task Endpoints ──────────────────────────────────────────────────────
  public async getTasks(filter?: any): Promise<TaskSummary[]> {
    const query = this.toQueryString(filter);
    const res = await this.request<any>(`/tasks${query}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getTasksPaginated(filter?: any): Promise<PaginatedResponse<TaskSummary>> {
    const query = this.toQueryString(filter);
    const res = await this.requestWithMeta<TaskSummary[]>(`/tasks${query}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getTask(id: string): Promise<TaskDetail> {
    return this.request<TaskDetail>(`/tasks/${id}`);
  }

  public async createTask(input: {
    title: string;
    description?: string;
    projectId?: string;
    milestoneId?: string;
    parentTaskId?: string;
    priority?: string;
    status?: string;
    position?: number;
    assigneeId?: string;
    startDate?: string;
    dueDate?: string;
    estimatedHours?: number;
    labels?: string[];
    dependencies?: string[];
  }): Promise<TaskDetail> {
    return this.request<TaskDetail>("/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateTask(id: string, input: any): Promise<TaskDetail> {
    return this.request<TaskDetail>(`/tasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async deleteTask(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/tasks/${id}`, {
      method: "DELETE",
    });
  }

  public async moveTask(id: string, targetStatus: string, reason?: string): Promise<TaskDetail> {
    return this.request<TaskDetail>(`/tasks/${id}/move`, {
      method: "POST",
      body: JSON.stringify({ targetStatus, reason }),
    });
  }

  public async reorderTask(id: string, position: number, targetStatus?: string): Promise<TaskDetail> {
    return this.request<TaskDetail>(`/tasks/${id}/reorder`, {
      method: "POST",
      body: JSON.stringify({ position, targetStatus }),
    });
  }

  public async assignTask(id: string, assigneeIdOrName?: string): Promise<TaskDetail> {
    return this.request<TaskDetail>(`/tasks/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({
        assigneeId: assigneeIdOrName && /^[0-9a-fA-F]{24}$/.test(assigneeIdOrName) ? assigneeIdOrName : undefined,
        assigneeNameOrEmail: assigneeIdOrName && !/^[0-9a-fA-F]{24}$/.test(assigneeIdOrName) ? assigneeIdOrName : undefined,
      }),
    });
  }

  public async archiveTask(id: string): Promise<any> {
    return this.request<any>(`/tasks/${id}/archive`, {
      method: "POST",
    });
  }

  public async restoreTask(id: string): Promise<any> {
    return this.request<any>(`/tasks/${id}/restore`, {
      method: "POST",
    });
  }

  public async addChecklist(taskId: string, input: { items?: string[]; title?: string } | string[]): Promise<any> {
    const payload = Array.isArray(input) ? { items: input } : input;
    return this.request<any>(`/tasks/${taskId}/checklists`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  public async updateChecklistItem(
    taskId: string,
    checklistId: string,
    input: { isCompleted?: boolean; title?: string; position?: number }
  ): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/checklists/${checklistId}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async deleteChecklistItem(taskId: string, checklistId: string): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/checklists/${checklistId}`, {
      method: "DELETE",
    });
  }

  public async addDependency(taskId: string, dependsOnTaskId: string): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/dependencies`, {
      method: "POST",
      body: JSON.stringify({ dependsOnTaskId }),
    });
  }

  public async removeDependency(taskId: string, dependencyId: string): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/dependencies/${dependencyId}`, {
      method: "DELETE",
    });
  }

  public async getComments(taskId: string): Promise<any[]> {
    const res = await this.request<any>(`/tasks/${taskId}/comments`);
    return Array.isArray(res) ? res : [];
  }

  public async addComment(taskId: string, content: string): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  public async updateComment(taskId: string, commentId: string, content: string): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/comments/${commentId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  }

  public async deleteComment(taskId: string, commentId: string): Promise<any> {
    return this.request<any>(`/tasks/${taskId}/comments/${commentId}`, {
      method: "DELETE",
    });
  }

  public async getBlockedTasks(projectId?: string): Promise<any> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    const res = await this.request<any>(`/tasks/blocked${query}`);
    return Array.isArray(res) ? res : res.blockedTasks || [];
  }

  public async getWorkload(projectId?: string): Promise<any> {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
    return this.request<any>(`/tasks/workload${query}`);
  }

  public async getTeamWorkload(projectId?: string): Promise<any> {
    return this.getWorkload(projectId);
  }

  private toQueryString(filter?: Record<string, any>): string {
    if (!filter) return "";
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(filter)) {
      if (v !== undefined && v !== null && v !== "") {
        clean[k] = String(v);
      }
    }
    const qs = new URLSearchParams(clean).toString();
    return qs ? `?${qs}` : "";
  }

  // ── CRM Endpoints ───────────────────────────────────────────────────────
  public async getCRMDashboard(): Promise<CRMDashboardMetrics> {
    return this.request<CRMDashboardMetrics>("/crm/dashboard");
  }

  // Customers
  public async getCustomers(filter?: any): Promise<CRMCustomerSummary[]> {
    const res = await this.request<any>(`/crm/customers${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getCustomersPaginated(filter?: any): Promise<PaginatedResponse<CRMCustomerSummary>> {
    const res = await this.requestWithMeta<CRMCustomerSummary[]>(`/crm/customers${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getCustomer(id: string): Promise<CustomerDetail> {
    return this.request<CustomerDetail>(`/crm/customers/${id}`);
  }

  public async createCustomer(input: {
    name: string;
    domain?: string;
    industry?: string;
    status?: string;
    healthScore?: number;
    notes?: string;
  }): Promise<CRMCustomerSummary> {
    return this.request<CRMCustomerSummary>("/crm/customers", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateCustomer(id: string, input: Partial<{
    name: string;
    domain?: string;
    industry?: string;
    status?: string;
    healthScore?: number;
    notes?: string;
  }>): Promise<CRMCustomerSummary> {
    return this.request<CRMCustomerSummary>(`/crm/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async archiveCustomer(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/customers/${id}/archive`, {
      method: "POST",
    });
  }

  public async deleteCustomer(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/customers/${id}`, {
      method: "DELETE",
    });
  }

  // Contacts
  public async getContacts(filter?: any): Promise<ContactSummary[]> {
    const res = await this.request<any>(`/crm/contacts${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getContactsPaginated(filter?: any): Promise<PaginatedResponse<ContactSummary>> {
    const res = await this.requestWithMeta<ContactSummary[]>(`/crm/contacts${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getContact(id: string): Promise<ContactDetail> {
    return this.request<ContactDetail>(`/crm/contacts/${id}`);
  }

  public async createContact(input: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    customerId?: string;
    isPrimary?: boolean;
  }): Promise<ContactSummary> {
    return this.request<ContactSummary>("/crm/contacts", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateContact(id: string, input: Partial<{
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    customerId?: string | null;
    isPrimary?: boolean;
  }>): Promise<ContactSummary> {
    return this.request<ContactSummary>(`/crm/contacts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async archiveContact(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/contacts/${id}/archive`, {
      method: "POST",
    });
  }

  public async deleteContact(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/contacts/${id}`, {
      method: "DELETE",
    });
  }

  // Leads
  public async getLeads(filter?: any): Promise<CRMLeadSummary[]> {
    const res = await this.request<any>(`/crm/leads${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getLeadsPaginated(filter?: any): Promise<PaginatedResponse<CRMLeadSummary>> {
    const res = await this.requestWithMeta<CRMLeadSummary[]>(`/crm/leads${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getLead(id: string): Promise<LeadDetail> {
    return this.request<LeadDetail>(`/crm/leads/${id}`);
  }

  public async createLead(input: {
    title: string;
    customerId?: string;
    customerName?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    dealValue?: number;
    priority?: string;
    source?: string;
    stage?: string;
    status?: string;
    notes?: string;
  }): Promise<CRMLeadSummary> {
    return this.request<CRMLeadSummary>("/crm/leads", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateLead(id: string, input: Partial<{
    title: string;
    customerId?: string;
    customerName?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    dealValue?: number;
    priority?: string;
    source?: string;
    stage?: string;
    status?: string;
    notes?: string;
  }>): Promise<CRMLeadSummary> {
    return this.request<CRMLeadSummary>(`/crm/leads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async convertLead(id: string, input: {
    createCustomer?: boolean;
    customerName?: string;
    existingCustomerId?: string;
    createContact?: boolean;
    contactFirstName?: string;
    contactLastName?: string;
    contactEmail?: string;
    createDeal?: boolean;
    dealTitle?: string;
    dealValue?: number;
  }): Promise<{ customer: any; contact?: any; deal?: any }> {
    return this.request<{ customer: any; contact?: any; deal?: any }>(`/crm/leads/${id}/convert`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async archiveLead(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/leads/${id}/archive`, {
      method: "POST",
    });
  }

  public async deleteLead(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/leads/${id}`, {
      method: "DELETE",
    });
  }

  // Deals
  public async getDeals(filter?: any): Promise<CRMDealSummary[]> {
    const res = await this.request<any>(`/crm/deals${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getDealsPaginated(filter?: any): Promise<PaginatedResponse<CRMDealSummary>> {
    const res = await this.requestWithMeta<CRMDealSummary[]>(`/crm/deals${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getDeal(id: string): Promise<DealDetail> {
    return this.request<DealDetail>(`/crm/deals/${id}`);
  }

  public async createDeal(input: {
    title: string;
    stage?: string;
    dealValue: number;
    currency?: string;
    probability?: number;
    expectedClose?: string;
    priority?: string;
    customerId?: string;
    contactId?: string;
    leadId?: string;
    notes?: string;
  }): Promise<CRMDealSummary> {
    return this.request<CRMDealSummary>("/crm/deals", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateDeal(id: string, input: Partial<{
    title: string;
    stage?: string;
    dealValue?: number;
    currency?: string;
    probability?: number;
    expectedClose?: string;
    priority?: string;
    customerId?: string | null;
    contactId?: string | null;
    notes?: string | null;
  }>): Promise<CRMDealSummary> {
    return this.request<CRMDealSummary>(`/crm/deals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async moveDeal(id: string, targetStage: string, reason?: string): Promise<CRMDealSummary> {
    return this.request<CRMDealSummary>(`/crm/deals/${id}/stage`, {
      method: "POST",
      body: JSON.stringify({ targetStage, reason }),
    });
  }

  public async archiveDeal(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/deals/${id}/archive`, {
      method: "POST",
    });
  }

  public async deleteDeal(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/deals/${id}`, {
      method: "DELETE",
    });
  }

  public async getPipelineSummary(): Promise<PipelineSummary> {
    return this.request<PipelineSummary>("/crm/pipeline/summary");
  }

  public async getStaleDeals(): Promise<CRMDealSummary[]> {
    const res = await this.request<any>("/crm/pipeline/stale");
    return Array.isArray(res) ? res : res.items || res.staleDeals || [];
  }

  // Activities
  public async getActivities(filter?: any): Promise<CRMActivitySummary[]> {
    const res = await this.request<any>(`/crm/activities${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getActivitiesPaginated(filter?: any): Promise<PaginatedResponse<CRMActivitySummary>> {
    const res = await this.requestWithMeta<CRMActivitySummary[]>(`/crm/activities${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async createActivity(input: {
    entityType: "lead" | "deal" | "customer" | "contact";
    entityId: string;
    type?: string;
    title: string;
    content?: string;
    dueDate?: string;
    isCompleted?: boolean;
  }): Promise<CRMActivitySummary> {
    return this.request<CRMActivitySummary>("/crm/activities", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateActivity(id: string, input: Partial<{
    title?: string;
    content?: string;
    type?: string;
    dueDate?: string | null;
    isCompleted?: boolean;
  }>): Promise<CRMActivitySummary> {
    return this.request<CRMActivitySummary>(`/crm/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async deleteActivity(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/crm/activities/${id}`, {
      method: "DELETE",
    });
  }

  // ── Finance Module Endpoints ─────────────────────────────────────────────
  public async getFinanceDashboard(query?: {
    currency?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FinanceDashboardStats> {
    return this.request<FinanceDashboardStats>(`/finance/dashboard${this.toQueryString(query)}`);
  }

  // Invoices
  public async getInvoices(filter?: any): Promise<InvoiceSummary[]> {
    const res = await this.request<any>(`/finance/invoices${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getInvoicesPaginated(filter?: any): Promise<PaginatedResponse<InvoiceSummary>> {
    const res = await this.requestWithMeta<InvoiceSummary[]>(`/finance/invoices${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getInvoice(id: string): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>(`/finance/invoices/${id}`);
  }

  public async createInvoice(input: {
    customerId: string;
    projectId?: string | null;
    invoiceNumber?: string;
    issueDate?: string;
    dueDate: string;
    currency?: string;
    notes?: string | null;
    terms?: string | null;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate?: number;
      discountAmount?: number;
    }>;
  }): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>("/finance/invoices", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateInvoice(id: string, input: any): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>(`/finance/invoices/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async sendInvoice(id: string): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>(`/finance/invoices/${id}/send`, {
      method: "POST",
    });
  }

  public async cancelInvoice(id: string): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>(`/finance/invoices/${id}/cancel`, {
      method: "POST",
    });
  }

  public async archiveInvoice(id: string): Promise<InvoiceDetail> {
    return this.request<InvoiceDetail>(`/finance/invoices/${id}/archive`, {
      method: "POST",
    });
  }

  // Payments
  public async getPayments(filter?: any): Promise<PaymentSummary[]> {
    const res = await this.request<any>(`/finance/payments${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getPaymentsPaginated(filter?: any): Promise<PaginatedResponse<PaymentSummary>> {
    const res = await this.requestWithMeta<PaymentSummary[]>(`/finance/payments${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getPayment(id: string): Promise<PaymentSummary> {
    return this.request<PaymentSummary>(`/finance/payments/${id}`);
  }

  public async createPayment(input: {
    invoiceId: string;
    amount: number;
    currency?: string;
    paymentDate?: string;
    paymentMethod?: string;
    reference?: string | null;
    notes?: string | null;
  }): Promise<{ payment: PaymentSummary; invoice: InvoiceSummary }> {
    return this.request<{ payment: PaymentSummary; invoice: InvoiceSummary }>("/finance/payments", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async recordPayment(input: {
    invoiceId: string;
    amount: number;
    currency?: string;
    paymentDate?: string;
    paymentMethod?: string;
    reference?: string | null;
    notes?: string | null;
  }): Promise<{ payment: PaymentSummary; invoice: InvoiceSummary }> {
    return this.createPayment(input);
  }

  // Expense Categories
  public async getExpenseCategories(): Promise<ExpenseCategorySummary[]> {
    const res = await this.request<any>("/finance/categories");
    return Array.isArray(res) ? res : [];
  }

  public async createExpenseCategory(input: {
    name: string;
    description?: string | null;
    isActive?: boolean;
  }): Promise<ExpenseCategorySummary> {
    return this.request<ExpenseCategorySummary>("/finance/categories", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateExpenseCategory(id: string, input: any): Promise<ExpenseCategorySummary> {
    return this.request<ExpenseCategorySummary>(`/finance/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async deleteExpenseCategory(id: string): Promise<any> {
    return this.request<any>(`/finance/categories/${id}`, {
      method: "DELETE",
    });
  }

  // Expenses
  public async getExpenses(filter?: any): Promise<ExpenseSummary[]> {
    const res = await this.request<any>(`/finance/expenses${this.toQueryString(filter)}`);
    return Array.isArray(res) ? res : res.items || [];
  }

  public async getExpensesPaginated(filter?: any): Promise<PaginatedResponse<ExpenseSummary>> {
    const res = await this.requestWithMeta<ExpenseSummary[]>(`/finance/expenses${this.toQueryString(filter)}`);
    return {
      items: Array.isArray(res.data) ? res.data : [],
      total: res.meta?.total ?? (Array.isArray(res.data) ? res.data.length : 0),
      page: res.meta?.page ?? 1,
      limit: res.meta?.limit ?? 20,
      totalPages: res.meta?.totalPages ?? 1,
    };
  }

  public async getExpense(id: string): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>(`/finance/expenses/${id}`);
  }

  public async createExpense(input: {
    vendor: string;
    description: string;
    amount: number;
    currency?: string;
    expenseDate?: string;
    categoryId?: string | null;
    projectId?: string | null;
    paymentMethod?: string;
    receiptReference?: string | null;
    notes?: string | null;
  }): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>("/finance/expenses", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  public async updateExpense(id: string, input: any): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>(`/finance/expenses/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  public async approveExpense(id: string): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>(`/finance/expenses/${id}/approve`, {
      method: "POST",
    });
  }

  public async rejectExpense(id: string): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>(`/finance/expenses/${id}/reject`, {
      method: "POST",
    });
  }

  public async archiveExpense(id: string): Promise<ExpenseSummary> {
    return this.request<ExpenseSummary>(`/finance/expenses/${id}/archive`, {
      method: "POST",
    });
  }

  // CRM & Project Summaries
  public async getCustomerFinanceSummary(customerId: string): Promise<CustomerFinanceSummary> {
    return this.request<CustomerFinanceSummary>(`/finance/customers/${customerId}/summary`);
  }

  public async getProjectFinanceSummary(projectId: string): Promise<ProjectFinanceSummary> {
    return this.request<ProjectFinanceSummary>(`/finance/projects/${projectId}/summary`);
  }

  // Financial Reports
  public async getRevenueReport(query?: any): Promise<FinanceRevenueReport> {
    return this.request<FinanceRevenueReport>(`/finance/reports/revenue${this.toQueryString(query)}`);
  }

  public async getExpenseReport(query?: any): Promise<FinanceExpenseReport> {
    return this.request<FinanceExpenseReport>(`/finance/reports/expenses${this.toQueryString(query)}`);
  }

  public async getProfitLossReport(query?: any): Promise<FinanceProfitLossReport> {
    return this.request<FinanceProfitLossReport>(`/finance/reports/profit-loss${this.toQueryString(query)}`);
  }

  public async getReceivablesReport(query?: any): Promise<FinanceReceivablesReport> {
    return this.request<FinanceReceivablesReport>(`/finance/reports/receivables${this.toQueryString(query)}`);
  }

  public async getOverdueReport(query?: any): Promise<FinanceOverdueReport> {
    return this.request<FinanceOverdueReport>(`/finance/reports/overdue${this.toQueryString(query)}`);
  }

  public async getCustomerRevenueReport(query?: any): Promise<CustomerRevenueReport> {
    return this.request<CustomerRevenueReport>(`/finance/reports/customer-revenue${this.toQueryString(query)}`);
  }

  public async getProjectProfitabilityReport(query?: any): Promise<ProjectProfitabilityReport> {
    return this.request<ProjectProfitabilityReport>(`/finance/reports/project-profitability${this.toQueryString(query)}`);
  }

  public async getFinancialReport(type: string, query?: any): Promise<any> {
    const cleanType = type.replace(/_/g, "-");
    return this.request<any>(`/finance/reports/${cleanType}${this.toQueryString(query)}`);
  }

  // ── Dashboard Endpoints ──────────────────────────────────────────────────
  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request<DashboardMetrics>("/dashboard/metrics");
  }

  // ── Global Search Endpoints ───────────────────────────────────────────────
  public async globalSearch(query: string, limit: number = 20): Promise<GlobalSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return this.request<GlobalSearchResponse>(`/search?${params.toString()}`);
  }

  // ── Health Endpoint ─────────────────────────────────────────────────────
  public async getHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>("/health");
  }
}

export const apiClient = new ApiClient();


