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
      "EXECUTING_TOOL",
      "WAITING_APPROVAL",
      "COMPLETED",
      "FAILED",
      "TIMED_OUT",
    ])
    .optional(),
  agentId: z.string().optional(),
});

export const AIApprovalQuerySchema = PaginationQuerySchema.extend({
  status: ApprovalStatusSchema.optional(),
});
