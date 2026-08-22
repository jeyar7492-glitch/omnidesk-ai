import { z } from "zod";

/**
 * @omnidesk/validation
 * Foundational Zod schemas for Phase 1 runtime contracts.
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
