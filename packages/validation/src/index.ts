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
  source: z.string().max(100).optional(),
  status: z.string().max(50).optional().default("new"),
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

export const ConvertLeadSchema = z.object({
  createCustomer: z.boolean().optional().default(true),
  customerCompanyName: z.string().max(200).optional(),
  customerName: z.string().max(200).optional(),
  existingCustomerId: z.string().optional(),
  createContact: z.boolean().optional().default(true),
  contactFirstName: z.string().max(100).optional(),
  contactLastName: z.string().max(100).optional(),
  contactEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  createDeal: z.boolean().optional().default(true),
  dealTitle: z.string().max(200).optional(),
  dealValue: z.number().nonnegative().optional(),
  dealStage: DealStageSchema.optional().default("QUALIFICATION"),
  notes: z.string().max(2000).optional(),
});

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
  status: z.string().max(50).optional().default("active"),
  notes: z.string().max(2000).optional(),
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
  currency: z.string().max(10).optional().default("USD"),
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

export const UpdateCRMActivitySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(4000).optional(),
  type: z.enum(["note", "call", "meeting", "email", "follow_up"]).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

export const CustomerQuerySchema = z.object({
  query: z.string().optional(),
  industry: z.string().optional(),
  status: z.string().optional(),
  isArchived: z.enum(["true", "false"]).optional(),
  assignedUserId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["companyName", "createdAt", "status", "industry"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const ContactQuerySchema = z.object({
  query: z.string().optional(),
  customerId: z.string().optional(),
  isPrimary: z.enum(["true", "false"]).optional(),
  isArchived: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["firstName", "lastName", "createdAt", "email"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const LeadQuerySchema = z.object({
  query: z.string().optional(),
  stage: DealStageSchema.optional(),
  status: z.string().optional(),
  source: z.string().optional(),
  priority: PriorityLevelSchema.optional(),
  assignedUserId: z.string().optional(),
  isConverted: z.enum(["true", "false"]).optional(),
  isArchived: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["title", "dealValue", "createdAt", "expectedClose", "priority"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const DealQuerySchema = z.object({
  query: z.string().optional(),
  stage: DealStageSchema.optional(),
  priority: PriorityLevelSchema.optional(),
  assignedUserId: z.string().optional(),
  customerId: z.string().optional(),
  contactId: z.string().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  isArchived: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["title", "dealValue", "createdAt", "expectedClose", "stage", "priority"]).optional().default("expectedClose"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
});

export const CRMActivityQuerySchema = z.object({
  entityType: z.enum(["lead", "deal", "customer", "contact"]).optional(),
  entityId: z.string().optional(),
  type: z.string().optional(),
  isCompleted: z.enum(["true", "false"]).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(["createdAt", "dueDate"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// ── Project & Milestone Validation Schemas ──────────────────────────────────
export const ProjectStatusSchema = z.string();
export const MilestoneStatusSchema = z.string();

export const CreateProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  key: z.string().max(20).optional(),
  description: z.string().max(2000).optional(),
  status: z.string().optional().default("PLANNING"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  targetDate: z.string().optional(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.number().nonnegative().optional(),
  spent: z.number().nonnegative().optional(),
  managerId: z.string().optional(),
  customerId: z.string().optional(),
  health: z.string().optional(),
  color: z.string().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export const ProjectQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  managerId: z.string().optional(),
  customerId: z.string().optional(),
  isArchived: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100).default(20)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const ProjectMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(["OWNER", "LEAD", "MANAGER", "MEMBER", "CONTRIBUTOR", "VIEWER"]).default("MEMBER"),
});

export const ArchiveProjectSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const CreateMilestoneSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  title: z.string().min(1, "Milestone title is required").max(200),
  description: z.string().max(1000).optional(),
  dueDate: z.string().optional(),
  status: z.string().optional().default("pending"),
  assignedUserId: z.string().optional(),
});

export const UpdateMilestoneSchema = CreateMilestoneSchema.partial();

export const CompleteMilestoneSchema = z.object({
  completedAt: z.string().optional(),
  notes: z.string().max(500).optional(),
});

// ── Task Validation Schemas ─────────────────────────────────────────────────
export const TaskStatusSchema = z.string();

export const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(4000).optional(),
  status: z.string().optional().default("todo"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional().default("MEDIUM"),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  parentTaskId: z.string().optional(),
  assigneeId: z.string().optional(),
  reporterId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().nonnegative().optional(),
  actualHours: z.number().nonnegative().optional(),
  position: z.number().int().optional(),
  tags: z.array(z.string()).optional().default([]),
  labels: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial();

export const TaskQuerySchema = z.object({
  q: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  assigneeId: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  isOverdue: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  isBlocked: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  isArchived: z.preprocess((val) => val === "true" || val === true, z.boolean()).optional(),
  page: z.preprocess((val) => (val ? Number(val) : 1), z.number().int().min(1).default(1)),
  limit: z.preprocess((val) => (val ? Number(val) : 20), z.number().int().min(1).max(100).default(20)),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const MoveTaskSchema = z.object({
  targetStatus: z.string().min(1, "Target status is required"),
  position: z.number().int().optional(),
  reason: z.string().max(500).optional(),
});

export const ReorderTaskSchema = z.object({
  targetStatus: z.string().optional(),
  position: z.number().int().min(0, "Position must be non-negative"),
});

export const AssignTaskSchema = z.object({
  assigneeId: z.string().optional().nullable(),
  assigneeNameOrEmail: z.string().optional(),
});

export const CreateTaskChecklistSchema = z.object({
  items: z.array(z.string()).optional(),
  title: z.string().optional(),
  isCompleted: z.boolean().optional().default(false),
  position: z.number().int().optional(),
});

export const UpdateTaskChecklistSchema = z.object({
  isCompleted: z.boolean().optional(),
  title: z.string().optional(),
  position: z.number().int().optional(),
});

export const CreateTaskDependencySchema = z.object({
  dependsOnTaskId: z.string().min(1, "Dependency task ID is required"),
  type: z.enum(["BLOCKS", "RELATION"]).optional().default("BLOCKS"),
});

export const CreateTaskCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(4000),
});

export const UpdateTaskCommentSchema = z.object({
  content: z.string().min(1, "Comment content is required").max(4000),
});

// ── Authentication Validation Schemas ───────────────────────────────────────
export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  organizationName: z.string().max(100).optional(),
  workspaceName: z.string().max(100).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const SwitchWorkspaceSchema = z.object({
  targetWorkspaceId: z.string().min(1, "Target workspace ID is required"),
});

// ── Global Search Validation Schemas ────────────────────────────────────────
export const GlobalSearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query is required")
    .max(100, "Search query must not exceed 100 characters"),
  limit: z.coerce.number().int().positive().max(50).default(20),
  types: z.string().optional(),
});

// ── Phase 6 Finance Validation Schemas ─────────────────────────────────────

export const CreateInvoiceLineItemSchema = z.object({
  description: z.string().min(1, "Item description is required"),
  quantity: z.number().positive("Quantity must be greater than zero").default(1),
  unitPrice: z.number().min(0, "Unit price cannot be negative").default(0),
  taxRate: z.number().min(0, "Tax rate cannot be negative").max(100).optional().default(0),
  discountAmount: z.number().min(0, "Discount amount cannot be negative").optional().default(0),
});

export const CreateInvoiceSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  projectId: z.string().optional().nullable(),
  invoiceNumber: z.string().optional(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional().default(() => new Date(Date.now() + 30 * 86400000).toISOString()),
  currency: z.string().min(1).default("USD"),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(1000).optional().nullable(),
  items: z.array(CreateInvoiceLineItemSchema).min(1, "At least one line item is required"),
});

export const UpdateInvoiceSchema = z.object({
  customerId: z.string().optional(),
  projectId: z.string().optional().nullable(),
  issueDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  currency: z.string().optional(),
  notes: z.string().max(2000).optional().nullable(),
  terms: z.string().max(1000).optional().nullable(),
  items: z.array(CreateInvoiceLineItemSchema).optional(),
  status: z.enum(["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"]).optional(),
});

export const InvoiceQuerySchema = z.object({
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.string().optional(),
  currency: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const CreatePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be greater than zero"),
  currency: z.string().min(1).optional(),
  paymentDate: z.string().or(z.date()).optional(),
  paymentMethod: z.string().min(1).default("bank_transfer"),
  reference: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const PaymentQuerySchema = z.object({
  invoiceId: z.string().optional(),
  customerId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const CreateExpenseCategorySchema = z.object({
  name: z.string().min(1, "Category name is required").max(100),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateExpenseCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const CreateExpenseSchema = z.object({
  vendor: z.string().min(1, "Vendor name is required").max(255),
  description: z.string().min(1, "Description is required").max(1000),
  amount: z.number().positive("Amount must be greater than zero"),
  currency: z.string().min(1).default("USD"),
  expenseDate: z.string().or(z.date()).optional(),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  paymentMethod: z.string().optional().default("credit_card"),
  receiptReference: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const UpdateExpenseSchema = z.object({
  vendor: z.string().min(1).max(255).optional(),
  description: z.string().min(1).max(1000).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  expenseDate: z.string().or(z.date()).optional(),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  paymentMethod: z.string().optional(),
  receiptReference: z.string().max(255).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const ExpenseQuerySchema = z.object({
  categoryId: z.string().optional(),
  projectId: z.string().optional(),
  vendor: z.string().optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).optional(),
  currency: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const FinanceReportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  currency: z.string().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
});

// CamelCase export aliases for flexible conventions
export const createInvoiceSchema = CreateInvoiceSchema;
export const updateInvoiceSchema = UpdateInvoiceSchema;
export const invoiceQuerySchema = InvoiceQuerySchema;
export const createPaymentSchema = CreatePaymentSchema;
export const paymentQuerySchema = PaymentQuerySchema;
export const createExpenseCategorySchema = CreateExpenseCategorySchema;
export const updateExpenseCategorySchema = UpdateExpenseCategorySchema;
export const createCategorySchema = CreateExpenseCategorySchema;
export const updateCategorySchema = UpdateExpenseCategorySchema;
export const createExpenseSchema = CreateExpenseSchema;
export const updateExpenseSchema = UpdateExpenseSchema;
export const expenseQuerySchema = ExpenseQuerySchema;
export const financeReportQuerySchema = FinanceReportQuerySchema;

// ── Enterprise Documents & Knowledge Base Validation (Phase 7) ─────────────────
export const DocumentStatusEnum = z.enum(["uploading", "processing", "ready", "failed", "archived"]);

export const CreateDocumentSchema = z.object({
  name: z.string().min(1, "Document name is required").max(255),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional().default("General"),
  folderPath: z.string().max(500).optional().default("/"),
});

export const UpdateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  category: z.string().max(100).optional(),
  folderPath: z.string().max(500).optional(),
  isArchived: z.boolean().optional(),
});

export const DocumentQuerySchema = z.object({
  status: DocumentStatusEnum.optional(),
  category: z.string().optional(),
  mimeType: z.string().optional(),
  extension: z.string().optional(),
  search: z.string().optional(),
  isArchived: z.preprocess((val) => {
    if (typeof val === "string") return val === "true";
    return val;
  }, z.boolean().optional()),
  knowledgeBaseId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const UploadDocumentMetadataSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  folderPath: z.string().max(500).optional(),
  knowledgeBaseId: z.string().optional(),
});

export const CreateKnowledgeBaseSchema = z.object({
  name: z.string().min(1, "Knowledge base name is required").max(255),
  description: z.string().max(1000).optional().nullable(),
});

export const UpdateKnowledgeBaseSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  isArchived: z.boolean().optional(),
});

export const KnowledgeBaseQuerySchema = z.object({
  search: z.string().optional(),
  isArchived: z.preprocess((val) => {
    if (typeof val === "string") return val === "true";
    return val;
  }, z.boolean().optional()),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.string().optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const AddDocumentToKBSchema = z.object({
  documentId: z.string().min(1, "Document ID is required"),
});

export const KnowledgeSearchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required").max(1000),
  knowledgeBaseId: z.string().optional(),
  documentId: z.string().optional(),
  mode: z.enum(["keyword", "semantic", "hybrid"]).optional().default("hybrid"),
  topK: z.coerce.number().int().positive().max(50).optional().default(10),
  threshold: z.number().min(0).max(1).optional(),
});

// CamelCase export aliases for Phase 7
export const createDocumentSchema = CreateDocumentSchema;
export const updateDocumentSchema = UpdateDocumentSchema;
export const documentQuerySchema = DocumentQuerySchema;
export const uploadDocumentMetadataSchema = UploadDocumentMetadataSchema;
export const createKnowledgeBaseSchema = CreateKnowledgeBaseSchema;
export const updateKnowledgeBaseSchema = UpdateKnowledgeBaseSchema;
export const knowledgeBaseQuerySchema = KnowledgeBaseQuerySchema;
export const addDocumentToKBSchema = AddDocumentToKBSchema;
export const knowledgeSearchQuerySchema = KnowledgeSearchQuerySchema;

// ── Phase 8: Notification & Communication Schemas ────────────────────────────
export const NotificationPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const NotificationTypeEnum = z.enum([
  "TASK_ASSIGNED",
  "TASK_MENTIONED",
  "TASK_DUE_SOON",
  "TASK_OVERDUE",
  "TASK_COMMENTED",
  "PROJECT_UPDATED",
  "PROJECT_MEMBER_ADDED",
  "MILESTONE_DUE",
  "LEAD_ASSIGNED",
  "LEAD_STATUS_CHANGED",
  "DEAL_STAGE_CHANGED",
  "DEAL_WON",
  "DEAL_LOST",
  "INVOICE_CREATED",
  "INVOICE_SENT",
  "INVOICE_OVERDUE",
  "PAYMENT_RECEIVED",
  "EXPENSE_SUBMITTED",
  "EXPENSE_APPROVED",
  "EXPENSE_REJECTED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_PROCESSED",
  "DOCUMENT_FAILED",
  "KNOWLEDGE_BASE_UPDATED",
  "SYSTEM_ALERT",
  "SECURITY_ALERT",
  "COMMUNICATION_MESSAGE",
  "COMMUNICATION_MENTION",
  "COMMUNICATION_REPLY",
]);

export const NotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  perPage: z.coerce.number().int().positive().max(100).optional().default(20),
  isRead: z.preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
  isArchived: z.preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
  type: NotificationTypeEnum.optional(),
  priority: NotificationPriorityEnum.optional(),
  search: z.string().optional(),
});

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  type: NotificationTypeEnum.default("SYSTEM_ALERT"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  priority: NotificationPriorityEnum.default("LOW"),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  actionUrl: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateNotificationPreferenceSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().email().nullable().optional(),
  tasksCategory: z.boolean().optional(),
  projectsCategory: z.boolean().optional(),
  crmCategory: z.boolean().optional(),
  financeCategory: z.boolean().optional(),
  documentsCategory: z.boolean().optional(),
  systemCategory: z.boolean().optional(),
  communicationCategory: z.boolean().optional(),
  minPriority: NotificationPriorityEnum.optional(),
});

export const notificationQuerySchema = NotificationQuerySchema;
export const createNotificationSchema = CreateNotificationSchema;
export const updateNotificationPreferenceSchema = UpdateNotificationPreferenceSchema;

// ── Enterprise Communication & Collaboration Validation (Phase 9) ─────────────
export const ConversationTypeEnum = z.enum(["DIRECT", "GROUP"]);
export const ConversationMemberRoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER"]);
export const MessageTypeEnum = z.enum(["TEXT", "SYSTEM", "ATTACHMENT"]);

export const CreateDirectConversationSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
});

export const CreateGroupConversationSchema = z.object({
  title: z.string().min(1, "Group title is required").max(100),
  description: z.string().max(500).optional(),
  memberIds: z.array(z.string().min(1)).min(1, "At least one member must be selected"),
});

export const CreateConversationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("DIRECT"),
    targetUserId: z.string().min(1, "Target user ID is required"),
  }),
  z.object({
    type: z.literal("GROUP"),
    title: z.string().min(1, "Group title is required").max(100),
    description: z.string().max(500).optional(),
    memberIds: z.array(z.string().min(1)).min(1, "At least one member must be selected"),
  }),
]);

export const UpdateConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isMuted: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

export const AddConversationMembersSchema = z.object({
  memberIds: z.array(z.string().min(1)).min(1, "At least one member ID is required"),
});

export const SendMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(10000),
  type: MessageTypeEnum.optional().default("TEXT"),
  parentMessageId: z.string().optional().nullable(),
  attachmentIds: z.array(z.string()).optional(),
  mentionedUserIds: z.array(z.string()).optional(),
});

export const EditMessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty").max(10000),
});

export const AddReactionSchema = z.object({
  emoji: z.string().min(1, "Emoji is required").max(16),
});

export const ConversationQuerySchema = z.object({
  type: ConversationTypeEnum.optional(),
  isArchived: z.preprocess((val) => (val === "true" ? true : val === "false" ? false : val), z.boolean().optional()),
  search: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  cursor: z.string().optional(),
});

export const MessageQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  cursor: z.string().optional(),
  direction: z.enum(["before", "after"]).optional().default("before"),
  parentMessageId: z.string().optional(),
});

export const CommunicationSearchSchema = z.object({
  query: z.string().min(1).max(200).optional(),
  q: z.string().min(1).max(200).optional(),
  conversationId: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(50).optional().default(20),
}).refine((d) => Boolean(d.query || d.q), {
  message: "Search query ('query' or 'q') is required",
});

export const TypingIndicatorSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  isTyping: z.boolean().default(true),
});

// CamelCase export aliases
export const createDirectConversationSchema = CreateDirectConversationSchema;
export const createGroupConversationSchema = CreateGroupConversationSchema;
export const createConversationSchema = CreateConversationSchema;
export const updateConversationSchema = UpdateConversationSchema;
export const addConversationMembersSchema = AddConversationMembersSchema;
export const sendMessageSchema = SendMessageSchema;
export const editMessageSchema = EditMessageSchema;
export const addReactionSchema = AddReactionSchema;
export const conversationQuerySchema = ConversationQuerySchema;
export const messageQuerySchema = MessageQuerySchema;
export const communicationSearchSchema = CommunicationSearchSchema;
export const typingIndicatorSchema = TypingIndicatorSchema;

