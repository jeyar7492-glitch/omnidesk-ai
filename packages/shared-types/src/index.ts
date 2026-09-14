/**
 * @omnidesk/shared-types
 * Core TypeScript contracts, enums, and data transfer objects for OmniDesk AI.
 */

// ── Standard API Response Envelope ──────────────────────────────────────────
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
}

export interface ApiMeta {
  page?: number;
  perPage?: number;
  total?: number;
  totalPages?: number;
  timestamp?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: ApiMeta;
}

// ── System Health Contract ───────────────────────────────────────────────────
export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  service: string;
  version: string;
  timestamp: string;
  environment: string;
  database?: {
    status: "connected" | "disconnected" | "unavailable";
    latencyMs?: number;
  };
}

// ── Realtime WebSocket Event Envelope ─────────────────────────────────────────
export interface RealtimeEventEnvelope<T = unknown> {
  id: string;
  event: string;
  workspaceId?: string;
  channel?: string;
  payload: T;
  timestamp: string;
  sender?: {
    userId: string;
    role?: string;
  };
}

// ── System Roles & Tenancy (Foundational) ────────────────────────────────────
export type SystemRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER" | "FINANCE";

export type DealStage =
  | "QUALIFICATION"
  | "CONTACTED"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "WON"
  | "LOST";

export type PriorityLevel = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface UserSummary {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  role: SystemRole;
}

// ── CRM Domain Contracts ───────────────────────────────────────────────────
export interface LeadSummary {
  id: string;
  title: string;
  source?: string | null;
  status?: string;
  stage: DealStage;
  dealValue: number;
  probability: number;
  priority: PriorityLevel;
  customerName?: string | null;
  customerId?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  expectedClose?: string | null;
  notes?: string | null;
  isConverted?: boolean;
  convertedAt?: string | null;
  convertedCustomerId?: string | null;
  convertedContactId?: string | null;
  convertedDealId?: string | null;
  isArchived?: boolean;
  assignedUserId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CustomerSummary {
  id: string;
  companyName: string;
  name?: string;
  domain?: string | null;
  healthScore?: number;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  industry?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  status: string;
  notes?: string | null;
  isArchived?: boolean;
  dealCount?: number;
  leadCount?: number;
  contactCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ContactSummary {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  customerName?: string | null;
  customerId?: string | null;
  isPrimary: boolean;
  notes?: string | null;
  isArchived?: boolean;
  createdAt?: string;
}

export interface DealSummary {
  id: string;
  title: string;
  currency?: string;
  stage: DealStage;
  dealValue: number;
  probability: number;
  expectedClose?: string | null;
  closedAt?: string | null;
  priority: PriorityLevel;
  customerName?: string | null;
  customerId?: string | null;
  contactName?: string | null;
  contactId?: string | null;
  leadId?: string | null;
  notes?: string | null;
  isArchived?: boolean;
  assignedUserId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PipelineSummary {
  totalDeals: number;
  totalActivePipelineValue: number;
  totalWeightedPipelineValue: number;
  totalWonValue: number;
  totalLostValue: number;
  stageBreakdown: Record<DealStage, { count: number; totalValue: number; weightedValue: number }>;
}

export interface CRMActivitySummary {
  id: string;
  entityType: "lead" | "deal" | "customer" | "contact";
  entityId: string;
  type: "note" | "call" | "meeting" | "email" | "follow_up" | string;
  title: string;
  content?: string | null;
  dueDate?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  userId?: string | null;
  userName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  contacts: ContactSummary[];
  leads: LeadSummary[];
  deals: DealSummary[];
  activities: CRMActivitySummary[];
}

export interface ContactDetail extends ContactSummary {
  customer?: CustomerSummary | null;
  deals: DealSummary[];
  activities: CRMActivitySummary[];
}

export interface LeadDetail extends LeadSummary {
  customer?: CustomerSummary | null;
  deals: DealSummary[];
  activities: CRMActivitySummary[];
}

export interface DealDetail extends DealSummary {
  customer?: CustomerSummary | null;
  contact?: ContactSummary | null;
  lead?: LeadSummary | null;
  activities: CRMActivitySummary[];
}

export interface CRMDashboardMetrics {
  totalCustomers: number;
  activeCustomers: number;
  totalContacts: number;
  openLeads: number;
  convertedLeads: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalPipelineValue: number;
  weightedPipelineValue: number;
  wonRevenue: number;
  conversionRate: number;
  pipelineByStage: Record<DealStage, { count: number; totalValue: number; weightedValue: number }>;
  leadDistribution: {
    byStage: Record<string, number>;
    byPriority: Record<string, number>;
  };
  recentActivities: CRMActivitySummary[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
export type ProjectPriority = PriorityLevel;
export type ProjectMemberRole = "LEAD" | "MEMBER" | "VIEWER";

export type TaskWorkflowStage = "backlog" | "todo" | "in_progress" | "review" | "blocked" | "done";

export interface ProjectMemberSummary {
  id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  role: "LEAD" | "MEMBER" | "VIEWER" | string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  joinedAt: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  key?: string | null;
  description?: string;
  status: ProjectStatus;
  priority?: PriorityLevel;
  health: string;
  color?: string | null;
  budget: number;
  spent: number;
  startDate?: string;
  deadline?: string;
  targetDate?: string;
  completedAt?: string | null;
  managerName?: string;
  managerId?: string;
  manager?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  ownerId?: string | null;
  customerName?: string;
  customerId?: string;
  customer?: {
    id: string;
    companyName?: string;
    name?: string;
  } | null;
  isArchived: boolean;
  progressPercentage: number;
  progress?: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: string;
}

export interface TaskChecklistSummary {
  id: string;
  title: string;
  isCompleted: boolean;
  position: number;
}

export interface TaskCommentSummary {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskDependencySummary {
  id: string;
  workspaceId: string;
  taskId: string;
  dependsOnTaskId: string;
  type: "BLOCKS" | "RELATION" | string;
  taskTitle?: string;
  dependsOnTitle?: string;
  dependsOnStatus?: string;
  dependsOnAssignee?: string | null;
  createdAt?: string;
}

export interface TaskSummary {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: PriorityLevel;
  position: number;
  assigneeName?: string;
  assigneeId?: string;
  reporterName?: string;
  reporterId?: string;
  projectName?: string;
  projectId?: string;
  milestoneTitle?: string;
  milestoneId?: string;
  parentTaskId?: string | null;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  isBlocked: boolean;
  blockedReason?: string;
  dependencies: string[];
  isArchived: boolean;
  completedAt?: string;
  checklists: TaskChecklistSummary[];
  checklistCount: number;
  completedChecklistCount: number;
  commentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends TaskSummary {
  comments: TaskCommentSummary[];
  project?: {
    id: string;
    name: string;
    key?: string | null;
    status?: string;
  } | null;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  } | null;
  resolvedDependencies?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeName?: string;
    isCompleted: boolean;
  }>;
  dependencyDetails?: Array<{
    id: string;
    taskId: string;
    dependsOnTaskId: string;
    type: string;
    dependsOnTaskTitle: string;
    dependsOnTaskStatus: string;
    dependsOnTaskAssignee?: string | null;
  }>;
  activityHistory?: Array<{
    id: string;
    action: string;
    details?: any;
    createdAt: string;
    userName?: string | null;
  }>;
}

export interface MilestoneSummary {
  id: string;
  title: string;
  description?: string;
  projectId: string;
  projectName?: string;
  status: string;
  dueDate?: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  completedAt?: string;
  createdAt: string;
}

export interface ProjectDashboardStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  reviewTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    priority: PriorityLevel;
    status: string;
    assigneeName?: string | null;
  }>;
  milestoneProgress: Array<{
    id: string;
    title: string;
    dueDate?: string | null;
    progress: number;
    status: string;
    totalTasks: number;
    completedTasks: number;
  }>;
  memberWorkload: Array<{
    userId: string;
    name: string;
    email: string;
    taskCount: number;
    completedCount: number;
    overdueCount: number;
  }>;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
}

export interface ProjectDetail extends ProjectSummary {
  members: ProjectMemberSummary[];
  milestones: MilestoneSummary[];
  tasks: TaskSummary[];
  dashboardStats?: ProjectDashboardStats;
}

export interface ProjectHealthMetrics {
  projectId: string;
  projectName: string;
  status: ProjectStatus;
  overallHealth: "healthy" | "at_risk" | "critical" | "delayed";
  healthScore: number;
  completionRate: number;
  totalBudget: number;
  totalSpent: number;
  budgetBurnPercentage: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasksCount: number;
  blockedTasksCount: number;
  totalMilestones: number;
  completedMilestones: number;
  atRiskReasons: string[];
}

export interface TeamMemberWorkload {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  reviewTasks: number;
  completedTasks: number;
  overdueTasks: number;
  estimatedHoursTotal: number;
  tasks: Array<{ id: string; title: string; status: string; priority: PriorityLevel; dueDate?: string; isOverdue: boolean }>;
}

export interface TeamWorkloadSummary {
  workspaceId: string;
  totalActiveTasks: number;
  totalOverdueTasks: number;
  members: TeamMemberWorkload[];
}

export interface BlockedTaskSummary {
  id: string;
  title: string;
  status: string;
  projectName?: string;
  assigneeName?: string;
  blockedReason?: string;
  unresolvedDependencies: Array<{ id: string; title: string; status: string; assigneeName?: string }>;
}

// ── Agentic AI Foundation Contracts ─────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "EXECUTED";

export type AIExecutionStatus =
  | "PENDING"
  | "PLANNING"
  | "EXECUTING_TOOL"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "FAILED"
  | "TIMED_OUT";

export type AIEventType =
  | "ai:request_started"
  | "ai:planning"
  | "ai:tool_proposed"
  | "ai:approval_requested"
  | "ai:approval_decided"
  | "ai:tool_started"
  | "ai:tool_completed"
  | "ai:execution_completed"
  | "ai:execution_failed";

export interface AgentExecutionContext {
  workspaceId: string;
  userId: string;
  userRole: SystemRole;
  userPermissions: string[];
  requestId: string;
}

export interface AgentContract {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  allowedTools: string[];
  systemInstructions: string;
  riskPolicy: RiskLevel;
  maxExecutionSteps: number;
  timeoutMs: number;
}

export interface ToolParameterSchema {
  type: string;
  description?: string;
  properties?: Record<string, unknown>;
  required?: string[];
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  requiredPermissions: string[];
  riskLevel: RiskLevel;
  workspaceScoped: boolean;
}

export interface ToolCallProposal {
  toolId: string;
  arguments: Record<string, unknown>;
  reason: string;
  riskLevel: RiskLevel;
  requiresApproval: boolean;
}

export interface ToolExecutionResult {
  toolId: string;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
  executedAt: string;
}

export interface AIExecutionStep {
  stepNumber: number;
  thought?: string;
  toolCall?: ToolCallProposal;
  toolResult?: ToolExecutionResult;
  approvalId?: string;
  status: "PLANNING" | "EXECUTING" | "APPROVED" | "REJECTED" | "COMPLETED" | "FAILED";
  timestamp: string;
}

export interface AIExecutionRecord {
  id: string;
  workspaceId: string;
  userId: string;
  agentId: string;
  prompt: string;
  status: AIExecutionStatus;
  steps: AIExecutionStep[];
  finalResponse?: string;
  error?: string;
  totalDurationMs?: number;
  createdAt: string;
  updatedAt: string;
}

export interface AIApprovalRequest {
  id: string;
  workspaceId: string;
  executionId: string;
  agentId: string;
  toolId: string;
  proposedArguments: Record<string, unknown>;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  requestedById: string;
  createdAt: string;
  expiresAt: string;
  decidedById?: string;
  decidedAt?: string;
  decisionReason?: string;
}

export interface AIEventPayload<T = unknown> {
  eventId: string;
  workspaceId: string;
  executionId: string;
  type: AIEventType;
  timestamp: string;
  data: T;
}

// ── Aliases ────────────────────────────────────────────────────────────────
export type AIExecutionResponse = AIExecutionRecord & {
  approvalRequest?: AIApprovalRequest;
};
export type AIExecutionSummary = AIExecutionRecord;
export type AIApprovalRequestSummary = AIApprovalRequest;
export type CRMLeadSummary = LeadSummary;
export type CRMDealSummary = DealSummary;
export type CRMCustomerSummary = CustomerSummary;

// ── Authentication & Security Contracts ────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  isActive: boolean;
  isVerified: boolean;
  role: SystemRole;
  permissions: string[];
  activeWorkspaceId: string;
  workspaces: Array<{
    id: string;
    name: string;
    slug: string;
    role: SystemRole;
  }>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface JWTPayload {
  userId: string;
  email: string;
  workspaceId: string;
  role: SystemRole;
  iat?: number;
  exp?: number;
}

// ── Dashboard Metrics Contracts ───────────────────────────────────────────
export interface DashboardKPIs {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  completedTasks: number;
  activePipelineValue: number;
  weightedPipelineForecast: number;
  openDeals: number;
  newLeads: number;
  totalTeamMembers: number;
  aiExecutionsCount: number;
  aiPendingApprovals: number;
}

export interface DashboardProjectSummary {
  activeProjects: Array<{
    id: string;
    name: string;
    status: string;
    health: string;
    budget: number;
    spent: number;
    progressPercentage: number;
    deadline?: string | null;
  }>;
  upcomingMilestones: Array<{
    id: string;
    title: string;
    projectName: string;
    dueDate: string;
    status: string;
  }>;
  overdueMilestonesCount: number;
}

export interface DashboardTaskSummary {
  byStatus: {
    todo: number;
    in_progress: number;
    review: number;
    testing: number;
    done: number;
    backlog: number;
  };
  byPriority: {
    LOW: number;
    MEDIUM: number;
    HIGH: number;
    URGENT: number;
  };
  overdueCount: number;
  blockedCount: number;
}

export interface DashboardCRMSummary {
  pipelineValue: number;
  weightedForecast: number;
  openDealsCount: number;
  wonRevenue: number;
  staleDealsCount: number;
  newLeadsCount: number;
  recentDeals: Array<{
    id: string;
    title: string;
    dealValue: number;
    stage: string;
    probability: number;
    companyName?: string | null;
  }>;
}

export interface DashboardAISummary {
  recentExecutions: Array<{
    id: string;
    prompt: string;
    agentId: string;
    status: string;
    totalDurationMs?: number;
    createdAt: string;
  }>;
  pendingApprovals: Array<{
    id: string;
    actionName: string;
    riskLevel: string;
    createdAt: string;
  }>;
  executionCounts: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

export interface DashboardTeamWorkloadMember {
  userId: string;
  name: string;
  email: string;
  role: string;
  totalTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completedTasks: number;
  estimatedHoursTotal: number;
}

export interface DashboardActivityItem {
  id: string;
  type: "project" | "task" | "deal" | "lead" | "ai" | "auth" | "approval";
  title: string;
  description: string;
  timestamp: string;
  user?: string;
}

export interface DashboardMetrics {
  kpis: DashboardKPIs;
  projectsSummary: DashboardProjectSummary;
  tasksSummary: DashboardTaskSummary;
  crmSummary: DashboardCRMSummary;
  aiSummary: DashboardAISummary;
  teamWorkload: DashboardTeamWorkloadMember[];
  recentActivity: DashboardActivityItem[];
}

// ── Global Search Contracts ───────────────────────────────────────────────
export type SearchEntityType =
  | "project"
  | "task"
  | "customer"
  | "contact"
  | "lead"
  | "deal"
  | "milestone"
  | "ai_execution"
  | "invoice"
  | "payment"
  | "expense"
  | "document"
  | "knowledge_base";

export interface SearchResultItem {
  id: string;
  entityType: SearchEntityType;
  title: string;
  subtitle?: string;
  status?: string;
  badge?: string;
  metadata?: Record<string, unknown>;
  navigationTarget: {
    tab: "dashboard" | "ai" | "projects" | "tasks" | "crm" | "system" | "finance" | "documents" | "knowledge";
    entityId?: string;
  };
}

export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  resultsByGroup: {
    projects: SearchResultItem[];
    tasks: SearchResultItem[];
    crm: SearchResultItem[];
    milestones: SearchResultItem[];
    ai: SearchResultItem[];
    finance?: SearchResultItem[];
    documents?: SearchResultItem[];
    knowledgeBases?: SearchResultItem[];
  };
}

// ── Phase 6 Finance Domain Contracts ──────────────────────────────────────

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "cancelled";

export type ExpenseApprovalStatus = "pending" | "approved" | "rejected";

export interface InvoiceLineItemSummary {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
  lineTotal: number;
  position: number;
}

export interface InvoiceSummary {
  id: string;
  workspaceId: string;
  customerId: string;
  customerName?: string;
  projectId?: string | null;
  projectName?: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  currency: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  notes?: string | null;
  terms?: string | null;
  isArchived: boolean;
  createdBy?: string | null;
  itemCount?: number;
  paymentCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  items: InvoiceLineItemSummary[];
  payments: PaymentSummary[];
}

export interface PaymentSummary {
  id: string;
  workspaceId: string;
  invoiceId: string;
  invoiceNumber?: string;
  customerId?: string | null;
  customerName?: string | null;
  amount: number;
  currency: string;
  paymentDate: string;
  paymentMethod: string;
  reference?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategorySummary {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  expenseCount?: number;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseSummary {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  projectName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  vendor: string;
  description: string;
  amount: number;
  currency: string;
  expenseDate: string;
  paymentMethod: string;
  approvalStatus: ExpenseApprovalStatus;
  receiptReference?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceDashboardStats {
  currency: string;
  totalRevenue: number;
  paidRevenue: number;
  outstandingReceivables: number;
  overdueReceivables: number;
  totalExpenses: number;
  netIncome: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  overdueInvoiceCount: number;
  pendingExpenseCount: number;
  trends: {
    dates: string[];
    revenue: number[];
    expenses: number[];
    net: number[];
  };
  recentPayments: PaymentSummary[];
  overdueInvoices: InvoiceSummary[];
  upcomingDueInvoices: InvoiceSummary[];
  recentExpenses: ExpenseSummary[];
  currencyBreakdown?: Array<{
    currency: string;
    totalRevenue: number;
    paidRevenue: number;
    outstanding: number;
    expenses: number;
    netIncome: number;
  }>;
}

export interface CustomerFinanceSummary {
  customerId: string;
  companyName: string;
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  invoiceCount: number;
  lastPaymentDate?: string | null;
}

export interface ProjectFinanceSummary {
  projectId: string;
  projectName: string;
  projectKey?: string | null;
  budget: number;
  spent: number;
  projectRevenue: number;
  projectExpenses: number;
  projectNet: number;
  outstandingInvoices: number;
}

export interface FinanceRevenueReport {
  currency: string;
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  periodBreakdown: Array<{
    period: string; // e.g. "2026-09"
    invoiced: number;
    paid: number;
    invoiceCount: number;
  }>;
}

export interface FinanceExpenseReport {
  currency: string;
  totalExpenses: number;
  approvedExpenses: number;
  pendingExpenses: number;
  byCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  byVendor: Array<{
    vendor: string;
    amount: number;
    count: number;
  }>;
}

export interface FinanceProfitLossReport {
  currency: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMarginPercent: number;
  monthlyBreakdown: Array<{
    month: string;
    revenue: number;
    expenses: number;
    net: number;
  }>;
}

export interface FinanceReceivablesReport {
  currency: string;
  totalReceivables: number;
  current0To30Days: number;
  overdue31To60Days: number;
  overdue61To90Days: number;
  overdue90PlusDays: number;
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerName: string;
    dueDate: string;
    daysOverdue: number;
    totalAmount: number;
    amountDue: number;
    status: string;
  }>;
}

export interface FinanceOverdueReport {
  currency: string;
  totalOverdueAmount: number;
  overdueInvoiceCount: number;
  invoices: Array<{
    invoiceId: string;
    invoiceNumber: string;
    customerId: string;
    customerName: string;
    dueDate: string;
    daysOverdue: number;
    amountDue: number;
  }>;
}

export interface CustomerRevenueReport {
  currency: string;
  customers: Array<{
    customerId: string;
    customerName: string;
    totalRevenue: number;
    invoiceCount: number;
    outstandingBalance: number;
  }>;
}

export interface ProjectProfitabilityReport {
  currency: string;
  projects: Array<{
    projectId: string;
    projectName: string;
    projectKey?: string | null;
    revenue: number;
    expenses: number;
    profit: number;
    marginPercent: number;
  }>;
}

// ── Enterprise Documents & Knowledge Base Contracts (Phase 7) ─────────────────
export type DocumentStatus = "uploading" | "processing" | "ready" | "failed" | "archived";

export interface DocumentProcessingStatus {
  documentId: string;
  status: DocumentStatus;
  processingError?: string | null;
  chunkCount?: number;
  extractedLength?: number;
  updatedAt: string;
}

export interface DocumentVersionSummary {
  id: string;
  documentId: string;
  versionNumber: number;
  storageKey: string;
  checksum: string;
  sizeBytes: number;
  extractedTextLength?: number;
  createdBy?: string | null;
  createdAt: string;
}

export interface DocumentChunkSummary {
  id: string;
  workspaceId: string;
  documentId: string;
  documentVersionId?: string | null;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  characterCount: number;
  contentHash?: string | null;
  hasEmbedding: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DocumentSummary {
  id: string;
  workspaceId: string;
  name: string;
  originalFileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  storageProvider: string;
  status: DocumentStatus;
  description?: string | null;
  category?: string | null;
  folderPath?: string | null;
  ownerId?: string | null;
  uploadedBy?: string | null;
  currentVersionId?: string | null;
  isArchived: boolean;
  versionNumber?: number;
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentDetail extends DocumentSummary {
  storageKey: string;
  checksum: string;
  processingError?: string | null;
  extractedTextSnippet?: string | null;
  metadata?: Record<string, unknown> | null;
  versions: DocumentVersionSummary[];
  knowledgeBases: Array<{
    id: string;
    name: string;
  }>;
}

export interface KnowledgeBaseSummary {
  id: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  status: "active" | "archived";
  isArchived: boolean;
  createdBy?: string | null;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseDetail extends KnowledgeBaseSummary {
  documents: DocumentSummary[];
}

export interface KnowledgeSearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  versionNumber: number;
  chunkIndex: number;
  content: string;
  snippet: string;
  score: number;
  searchMode: "keyword" | "semantic" | "hybrid";
  page?: number;
  section?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResponse {
  query: string;
  totalResults: number;
  searchMode: "keyword" | "semantic" | "hybrid";
  embeddingAvailable: boolean;
  results: KnowledgeSearchResult[];
}

export interface RAGContextItem {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
  score: number;
  page?: number;
  section?: string;
  citation: string;
}

export interface RAGContext {
  query: string;
  workspaceId: string;
  items: RAGContextItem[];
  formattedContext: string;
  retrievedAt: string;
}

// ── Phase 8: Enterprise Notification & Communication Infrastructure ──────────
export type NotificationPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_MENTIONED"
  | "TASK_DUE_SOON"
  | "TASK_OVERDUE"
  | "TASK_COMMENTED"
  | "PROJECT_UPDATED"
  | "PROJECT_MEMBER_ADDED"
  | "MILESTONE_DUE"
  | "LEAD_ASSIGNED"
  | "LEAD_STATUS_CHANGED"
  | "DEAL_STAGE_CHANGED"
  | "DEAL_WON"
  | "DEAL_LOST"
  | "INVOICE_CREATED"
  | "INVOICE_SENT"
  | "INVOICE_OVERDUE"
  | "PAYMENT_RECEIVED"
  | "EXPENSE_SUBMITTED"
  | "EXPENSE_APPROVED"
  | "EXPENSE_REJECTED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_PROCESSED"
  | "DOCUMENT_FAILED"
  | "KNOWLEDGE_BASE_UPDATED"
  | "SYSTEM_ALERT"
  | "SECURITY_ALERT";

export type NotificationDeliveryChannel = "in_app" | "email";
export type NotificationDeliveryStatus = "delivered" | "pending" | "failed" | "skipped";

export interface NotificationDeliverySummary {
  id: string;
  notificationId: string;
  channel: NotificationDeliveryChannel;
  status: NotificationDeliveryStatus;
  error?: string | null;
  sentAt?: string | null;
  createdAt: string;
}

export interface NotificationSummary {
  id: string;
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  entityType?: string | null;
  entityId?: string | null;
  actionUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  isRead: boolean;
  readAt?: string | null;
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDetail extends NotificationSummary {
  deliveries?: NotificationDeliverySummary[];
}

export interface NotificationPreferenceSummary {
  id: string;
  workspaceId: string;
  userId: string;
  inAppEnabled: boolean;
  emailEnabled: boolean;
  emailAddress?: string | null;
  tasksCategory: boolean;
  projectsCategory: boolean;
  crmCategory: boolean;
  financeCategory: boolean;
  documentsCategory: boolean;
  systemCategory: boolean;
  minPriority: NotificationPriority;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceInput {
  inAppEnabled?: boolean;
  emailEnabled?: boolean;
  emailAddress?: string | null;
  tasksCategory?: boolean;
  projectsCategory?: boolean;
  crmCategory?: boolean;
  financeCategory?: boolean;
  documentsCategory?: boolean;
  systemCategory?: boolean;
  minPriority?: NotificationPriority;
}

export interface NotificationQuery {
  page?: number;
  perPage?: number;
  limit?: number;
  isRead?: boolean;
  unreadOnly?: boolean;
  isArchived?: boolean;
  includeArchived?: boolean;
  type?: NotificationType;
  priority?: NotificationPriority;
  search?: string;
}

export interface NotificationListResponse {
  notifications: NotificationSummary[];
  total: number;
  unreadCount: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface UnreadNotificationCountResponse {
  unreadCount: number;
  workspaceId: string;
  userId: string;
}
