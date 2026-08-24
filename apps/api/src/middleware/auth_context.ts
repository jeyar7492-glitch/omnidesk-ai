import { Request, Response, NextFunction } from "express";
import { AgentExecutionContext, SystemRole } from "@omnidesk/shared-types";
import { UnauthorizedError, ForbiddenError } from "../lib/errors";
import { authService, getDefaultPermissionsForRole } from "../auth/services/auth.service";
import { prisma } from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  context: AgentExecutionContext;
}

/**
 * Middleware to authenticate requests via JWT Bearer Token,
 * resolving authoritative workspace, user identity, role and permissions from database.
 */
export async function requireAuthContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const requestId = (req.headers["x-request-id"] as string) || `req_${Date.now()}`;

  // 1. Check for Bearer Token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    try {
      const payload = authService.verifyAccessToken(token);
      const targetWorkspaceId = (req.headers["x-workspace-id"] as string) || payload.workspaceId;

      // Verify active membership in database
      const member = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: targetWorkspaceId,
            userId: payload.userId,
          },
        },
        include: { user: true },
      });

      if (!member || !member.user.isActive) {
        return next(
          new ForbiddenError("Access denied: You are not a member of the requested workspace")
        );
      }

      const role = (member.role as SystemRole) || "MEMBER";
      const permissions =
        member.permissions && member.permissions.length > 0
          ? member.permissions
          : getDefaultPermissionsForRole(role);

      (req as AuthenticatedRequest).context = {
        workspaceId: member.workspaceId,
        userId: member.userId,
        userRole: role,
        userPermissions: permissions,
        requestId,
      };

      return next();
    } catch (err: any) {
      return next(new UnauthorizedError(err.message || "Invalid or expired access token"));
    }
  }

  // 2. Controlled Test Environment fallback for synthetic testing
  if (process.env.NODE_ENV === "test" && req.headers["x-user-id"] && req.headers["x-workspace-id"]) {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const userId = req.headers["x-user-id"] as string;
    const userRole = ((req.headers["x-user-role"] as string) || "ADMIN") as SystemRole;
    const rawPermissions = (req.headers["x-user-permissions"] as string) || "";
    const userPermissions = rawPermissions
      ? rawPermissions.split(",").map((p) => p.trim())
      : getDefaultPermissionsForRole(userRole);

    (req as AuthenticatedRequest).context = {
      workspaceId,
      userId,
      userRole,
      userPermissions,
      requestId,
    };

    return next();
  }

  // 3. Unauthenticated request rejected
  return next(new UnauthorizedError("Authentication required: Missing or invalid Bearer token"));
}

/**
 * Middleware to enforce explicit granular permission on routes.
 */
export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.context) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const isPrivileged =
      authReq.context.userRole === "OWNER" || authReq.context.userRole === "ADMIN";

    if (!isPrivileged && !authReq.context.userPermissions.includes(permission)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Missing required permission '${permission}'`
        )
      );
    }

    next();
  };
}

/**
 * Middleware to enforce specific user roles on routes.
 */
export function requireRole(allowedRoles: SystemRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.context) {
      return next(new UnauthorizedError("Authentication required"));
    }

    if (!allowedRoles.includes(authReq.context.userRole)) {
      return next(
        new ForbiddenError(
          `Access forbidden: Role '${authReq.context.userRole}' not authorized. Allowed: [${allowedRoles.join(", ")}]`
        )
      );
    }

    next();
  };
}
