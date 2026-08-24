import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {
  AuthResponse,
  AuthTokens,
  AuthUser,
  JWTPayload,
  SystemRole,
} from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from "../../lib/errors";

export function getDefaultPermissionsForRole(role: string): string[] {
  switch (role) {
    case "OWNER":
    case "ADMIN":
      return [
        "workspace:read",
        "workspace:write",
        "workspace:admin",
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
        "deal:read",
        "deal:write",
        "lead:read",
        "lead:write",
        "customer:read",
        "customer:write",
        "ai:execute",
        "ai:approve",
        "ai:admin",
        "system:admin",
      ];
    case "MANAGER":
      return [
        "workspace:read",
        "project:read",
        "project:write",
        "project:assign",
        "task:read",
        "task:write",
        "task:assign",
        "task:move",
        "milestone:read",
        "milestone:write",
        "crm:read",
        "crm:write",
        "deal:read",
        "deal:write",
        "lead:read",
        "lead:write",
        "customer:read",
        "customer:write",
        "ai:execute",
      ];
    case "MEMBER":
      return [
        "workspace:read",
        "project:read",
        "milestone:read",
        "task:read",
        "task:write",
        "task:move",
        "crm:read",
        "deal:read",
        "lead:read",
        "customer:read",
        "ai:execute",
      ];
    case "VIEWER":
      return [
        "workspace:read",
        "project:read",
        "milestone:read",
        "task:read",
        "crm:read",
        "deal:read",
        "lead:read",
        "customer:read",
      ];
    default:
      return ["workspace:read", "task:read", "project:read"];
  }
}

export class AuthService {
  private static instance: AuthService;

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Register a new user with Organization, Workspace, and OWNER role.
   */
  public async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    workspaceName?: string;
  }): Promise<AuthResponse> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictError("An account with this email address already exists");
    }

    const passwordHash = await bcrypt.hash(input.password, 10);
    const orgName = input.organizationName || `${input.firstName}'s Enterprise`;
    const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
    const wsName = input.workspaceName || "Production Workspace";
    const wsSlug = `ws-${Date.now().toString(36)}`;

    // 1. Create Organization
    const organization = await prisma.organization.create({
      data: {
        name: orgName,
        slug: orgSlug,
        plan: "enterprise",
      },
    });

    // 2. Create Workspace
    const workspace = await prisma.workspace.create({
      data: {
        organizationId: organization.id,
        name: wsName,
        slug: wsSlug,
        description: `Primary workspace for ${orgName}`,
      },
    });

    // 3. Create User
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase().trim(),
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        isActive: true,
        isVerified: true,
      },
    });

    // 4. Create Workspace Member as OWNER
    const defaultPermissions = getDefaultPermissionsForRole("OWNER");
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: "OWNER",
        permissions: defaultPermissions,
      },
    });

    // 5. Generate Auth Tokens
    const tokens = await this.generateTokenPair({
      userId: user.id,
      email: user.email,
      workspaceId: workspace.id,
      role: "OWNER",
    });

    // 6. Audit Event
    await prisma.auditEvent.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        action: "auth:register",
        entityType: "User",
        entityId: user.id,
        details: { email: user.email, role: "OWNER" },
      },
    });

    logger.info({ userId: user.id, email: user.email }, "User registered successfully");

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isVerified: user.isVerified,
      role: "OWNER",
      permissions: defaultPermissions,
      activeWorkspaceId: workspace.id,
      workspaces: [
        {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: "OWNER",
        },
      ],
    };

    return { user: authUser, tokens };
  }

  /**
   * Authenticate user by email & password.
   */
  public async login(input: {
    email: string;
    password: string;
    targetWorkspaceId?: string;
  }): Promise<AuthResponse> {
    const email = input.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      logger.warn({ email }, "Failed login attempt: User not found or inactive");
      throw new UnauthorizedError("Invalid email or password");
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      if (user.memberships.length > 0) {
        await prisma.auditEvent.create({
          data: {
            workspaceId: user.memberships[0].workspaceId,
            userId: user.id,
            action: "auth:failed_login",
            entityType: "User",
            entityId: user.id,
            details: { email, reason: "invalid_password" },
          },
        });
      }
      logger.warn({ email, userId: user.id }, "Failed login attempt: Incorrect password");
      throw new UnauthorizedError("Invalid email or password");
    }

    let activeMembership = input.targetWorkspaceId
      ? user.memberships.find((m) => m.workspaceId === input.targetWorkspaceId)
      : user.memberships[0];

    if (!activeMembership) {
      if (user.memberships.length > 0) {
        activeMembership = user.memberships[0];
      } else {
        const org = await prisma.organization.create({
          data: {
            name: `${user.firstName}'s Org`,
            slug: `org-${Date.now().toString(36)}`,
          },
        });
        const ws = await prisma.workspace.create({
          data: {
            organizationId: org.id,
            name: "Default Workspace",
            slug: `ws-${Date.now().toString(36)}`,
          },
        });
        const member = await prisma.workspaceMember.create({
          data: {
            workspaceId: ws.id,
            userId: user.id,
            role: "ADMIN",
            permissions: getDefaultPermissionsForRole("ADMIN"),
          },
          include: { workspace: true },
        });
        activeMembership = member;
        user.memberships.push(member);
      }
    }

    const role = (activeMembership.role as SystemRole) || "MEMBER";
    const permissions =
      activeMembership.permissions && activeMembership.permissions.length > 0
        ? activeMembership.permissions
        : getDefaultPermissionsForRole(role);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.generateTokenPair({
      userId: user.id,
      email: user.email,
      workspaceId: activeMembership.workspaceId,
      role,
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId: activeMembership.workspaceId,
        userId: user.id,
        action: "auth:login",
        entityType: "User",
        entityId: user.id,
        details: { email: user.email, role, workspaceId: activeMembership.workspaceId },
      },
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isVerified: user.isVerified,
      role,
      permissions,
      activeWorkspaceId: activeMembership.workspaceId,
      workspaces: user.memberships.map((m) => ({
        id: m.workspaceId,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role as SystemRole,
      })),
    };

    return { user: authUser, tokens };
  }

  /**
   * Rotate refresh token and issue new access token.
   */
  public async refreshToken(refreshTokenStr: string): Promise<AuthTokens> {
    const record = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenStr },
      include: {
        user: {
          include: {
            memberships: {
              include: { workspace: true },
            },
          },
        },
      },
    });

    if (!record || record.isRevoked || record.expiresAt < new Date()) {
      throw new UnauthorizedError("Invalid, expired, or revoked refresh token");
    }

    await prisma.refreshToken.update({
      where: { id: record.id },
      data: { isRevoked: true },
    });

    const user = record.user;
    if (!user || !user.isActive || user.memberships.length === 0) {
      throw new UnauthorizedError("User account is inactive or has no active workspace");
    }

    const membership = user.memberships[0];
    const role = (membership.role as SystemRole) || "MEMBER";

    return this.generateTokenPair({
      userId: user.id,
      email: user.email,
      workspaceId: membership.workspaceId,
      role,
    });
  }

  /**
   * Logout user by revoking refresh token.
   */
  public async logout(userId: string, refreshTokenStr?: string): Promise<void> {
    if (refreshTokenStr) {
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenStr, userId },
        data: { isRevoked: true },
      });
    }

    logger.info({ userId }, "User logged out");
  }

  /**
   * Get current authenticated user profile and memberships.
   */
  public async getCurrentUser(userId: string, targetWorkspaceId?: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("User session is invalid or user is inactive");
    }

    const activeMembership = targetWorkspaceId
      ? user.memberships.find((m) => m.workspaceId === targetWorkspaceId)
      : user.memberships[0];

    if (!activeMembership) {
      throw new ForbiddenError("User is not a member of the requested workspace");
    }

    const role = (activeMembership.role as SystemRole) || "MEMBER";
    const permissions =
      activeMembership.permissions && activeMembership.permissions.length > 0
        ? activeMembership.permissions
        : getDefaultPermissionsForRole(role);

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isVerified: user.isVerified,
      role,
      permissions,
      activeWorkspaceId: activeMembership.workspaceId,
      workspaces: user.memberships.map((m) => ({
        id: m.workspaceId,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role as SystemRole,
      })),
    };
  }

  /**
   * Verify and decode a JWT access token.
   */
  public verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      return decoded;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        throw new UnauthorizedError("Access token has expired");
      }
      throw new UnauthorizedError("Invalid access token");
    }
  }

  /**
   * Generate an Access Token + Refresh Token pair.
   */
  private async generateTokenPair(payload: {
    userId: string;
    email: string;
    workspaceId: string;
    role: SystemRole;
  }): Promise<AuthTokens> {
    const expiresInSeconds = 15 * 60; // 15 minutes
    const accessToken = jwt.sign(
      {
        userId: payload.userId,
        email: payload.email,
        workspaceId: payload.workspaceId,
        role: payload.role,
      } satisfies JWTPayload,
      env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    const refreshTokenString = crypto.randomBytes(40).toString("hex");
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenString,
        userId: payload.userId,
        expiresAt: refreshExpiresAt,
        isRevoked: false,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenString,
      expiresIn: expiresInSeconds,
    };
  }
}

export const authService = AuthService.getInstance();
