/**
 * @omnidesk/shared-types
 * Core TypeScript contracts and data transfer objects for OmniDesk AI.
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
