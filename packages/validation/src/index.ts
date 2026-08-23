import { z } from "zod";

/**
 * @omnidesk/validation
 * Foundational Zod schemas for Phase 1 & Phase 2 runtime contracts.
 */

export const EnvironmentSchema = z.enum(["development", "test", "staging", "production"]);

export const IdParamSchema = z.object({
  id: z.string().min(1, "ID parameter is required"),
});

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});

export const HealthCheckResponseSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  service: z.string(),
  version: z.string(),
  timestamp: z.string(),
  environment: z.string(),
  database: z
    .object({
      status: z.enum(["connected", "disconnected", "unavailable"]),
      latencyMs: z.number().optional(),
    })
    .optional(),
});

// ── Agentic AI Validation Schemas ───────────────────────────────────────────

export const RiskLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const ApprovalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "EXECUTED",
]);

export const CreateAIExecutionSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(4000, "Prompt exceeds 4000 characters"),
  agentId: z.string().optional().default("supervisor"),
  conversationId: z.string().optional(),
  maxSteps: z.number().int().min(1).max(10).optional().default(5),
});

export const ApprovalDecisionSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reason: z.string().max(500).optional(),
});

export const AIExecutionQuerySchema = PaginationQuerySchema.extend({
  status: z
    .enum([
      "PENDING",
      "PLANNING",
      "WAITING_APPROVAL",
      "EXECUTING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
    ])
    .optional(),
  agentId: z.string().optional(),
});

export const AIApprovalQuerySchema = PaginationQuerySchema.extend({
  status: ApprovalStatusSchema.optional(),
  riskLevel: RiskLevelSchema.optional(),
});

// ── CRM Validation Schemas ──────────────────────────────────────────────────

export const DealStageSchema = z.enum([
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

export const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const CreateLeadSchema = z.object({
  title: z.string().min(1, "Lead title is required").max(200),
  customerId: z.string().optional(),
  stage: DealStageSchema.optional().default("QUALIFICATION"),
  dealValue: z.number().nonnegative().optional().default(0),
  probability: z.number().min(0).max(100).optional().default(20),
  expectedClose: z.string().datetime().optional(),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  assignedUserId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateLeadSchema = CreateLeadSchema.partial();

export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  contactPerson: z.string().max(100).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
  industry: z.string().max(100).optional(),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  assignedUserId: z.string().optional(),
});

export const UpdateCustomerSchema = CreateCustomerSchema.partial();

export const CreateContactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  customerId: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
  notes: z.string().max(1000).optional(),
});

export const UpdateContactSchema = CreateContactSchema.partial();

export const CreateDealSchema = z.object({
  title: z.string().min(1, "Deal title is required").max(200),
  dealValue: z.number().nonnegative("Deal value must be non-negative"),
  stage: DealStageSchema.optional().default("QUALIFICATION"),
  probability: z.number().min(0).max(100).optional().default(20),
  expectedClose: z.string().datetime().optional(),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  customerId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  assignedUserId: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

export const UpdateDealSchema = CreateDealSchema.partial();

export const MoveDealSchema = z.object({
  targetStage: DealStageSchema,
  reason: z.string().max(500).optional(),
});

export const CloseDealSchema = z.object({
  outcome: z.enum(["WON", "LOST"]),
  lostReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export const CreateCRMActivitySchema = z.object({
  entityType: z.enum(["lead", "deal", "customer", "contact"]),
  entityId: z.string().min(1, "Entity ID is required"),
  type: z.enum(["note", "call", "meeting", "email", "follow_up"]).default("note"),
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().max(4000).optional(),
  dueDate: z.string().datetime().optional(),
});

// ── Project Management Validation Schemas ────────────────────────────────────

export const ProjectStatusSchema = z.enum(["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]);

export const TaskWorkflowStageSchema = z.enum(["backlog", "todo", "in_progress", "review", "testing", "done"]);

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(4000).optional(),
  status: ProjectStatusSchema.optional().default("PLANNING"),
  budget: z.number().nonnegative("Budget must be non-negative").optional().default(0),
  spent: z.number().nonnegative().optional().default(0),
  startDate: z.string().datetime().optional(),
  deadline: z.string().datetime().optional(),
  managerId: z.string().optional(),
  customerId: z.string().optional(),
  health: z.string().optional().default("healthy"),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const ArchiveProjectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const CreateMilestoneSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z.string().min(1, "Milestone title is required").max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.string().optional().default("pending"),
  assignedUserId: z.string().optional(),
});

export const UpdateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().optional(),
  status: z.string().optional(),
  assignedUserId: z.string().optional(),
});

export const CompleteMilestoneSchema = z.object({
  notes: z.string().max(1000).optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(4000).optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  boardId: z.string().optional(),
  columnId: z.string().optional(),
  status: TaskWorkflowStageSchema.optional().default("todo"),
  priority: PriorityLevelSchema.optional().default("MEDIUM"),
  assigneeId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().nonnegative().optional(),
  actualHours: z.number().nonnegative().optional(),
  labels: z.array(z.string()).optional().default([]),
  dependencies: z.array(z.string()).optional().default([]),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const MoveTaskSchema = z.object({
  targetStatus: TaskWorkflowStageSchema,
  reason: z.string().max(500).optional(),
});

export const AssignTaskSchema = z.object({
  assigneeId: z.string().optional(),
  assigneeNameOrEmail: z.string().optional(),
});

export const CreateTaskChecklistSchema = z.object({
  items: z.array(z.string().min(1, "Checklist item title required").max(300)).min(1, "At least one checklist item is required"),
});

export const UpdateTaskChecklistSchema = z.object({
  isCompleted: z.boolean(),
  title: z.string().min(1).max(300).optional(),
});

export const CreateTaskDependencySchema = z.object({
  dependsOnTaskId: z.string().min(1, "Dependency task ID is required"),
});

export const CreateTaskCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(4000),
});

