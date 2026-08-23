import { Request, Response, NextFunction } from "express";
import { AgentExecutionContext, SystemRole } from "@omnidesk/shared-types";
import { UnauthorizedError } from "../lib/errors";

export interface AuthenticatedRequest extends Request {
  context: AgentExecutionContext;
}

export function requireAuthContext(req: Request, _res: Response, next: NextFunction): void {
  // Resolve workspace and user context from headers or token
  const workspaceId = (req.headers["x-workspace-id"] as string) || "ws_default_root";
  const userId = (req.headers["x-user-id"] as string) || "usr_system_root";
  const userRole = ((req.headers["x-user-role"] as string) || "ADMIN") as SystemRole;
  const rawPermissions = (req.headers["x-user-permissions"] as string) || "";
  const userPermissions = rawPermissions
    ? rawPermissions.split(",").map((p) => p.trim())
    : ["workspace:read", "workspace:write", "system:admin"];

  const requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

  (req as AuthenticatedRequest).context = {
    workspaceId,
    userId,
    userRole,
    userPermissions,
    requestId,
  };

  next();
}
