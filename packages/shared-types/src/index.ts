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
  stage: DealStage;
  dealValue: number;
  probability: number;
  priority: PriorityLevel;
  customerName?: string;
  expectedClose?: string;
  createdAt: string;
}

export interface CustomerSummary {
  id: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  industry?: string;
  status: string;
  createdAt: string;
}

export interface ContactSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  customerName?: string;
  isPrimary: boolean;
}

export interface DealSummary {
  id: string;
  title: string;
  stage: DealStage;
  dealValue: number;
  probability: number;
  expectedClose?: string;
  closedAt?: string;
  priority: PriorityLevel;
  customerName?: string;
}

export interface PipelineSummary {
  totalDeals: number;
  totalActivePipelineValue: number;
  totalWeightedPipelineValue: number;
  totalWonValue: number;
  totalLostValue: number;
  stageBreakdown: Record<DealStage, { count: number; totalValue: number; weightedValue: number }>;
}

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export type TaskWorkflowStage = "backlog" | "todo" | "in_progress" | "review" | "testing" | "done";

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  health: string;
  budget: number;
  spent: number;
  startDate?: string;
  deadline?: string;
  managerName?: string;
  managerId?: string;
  customerName?: string;
  customerId?: string;
  isArchived: boolean;
  progressPercentage: number;
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
  createdAt: string;
  updatedAt: string;
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

