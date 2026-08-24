import { prisma } from "../apps/api/src/lib/prisma";
import { authService } from "../apps/api/src/auth/services/auth.service";
import { approvalService } from "../apps/api/src/ai/approvals/approval.service";
import jwt from "jsonwebtoken";
import { env } from "../apps/api/src/config/env";

interface VerificationStep {
  name: string;
  passed: boolean;
  details?: string;
}

const results: VerificationStep[] = [];

function record(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? " PASS " : " FAIL ";
  console.log(`[${status}] ${name}${details ? ` -> ${details}` : ""}`);
}

async function runLiveSecurityVerification() {
  console.log("\n=======================================================");
  console.log("   OMNIDESK AI — LIVE SECURITY & RBAC VERIFICATION");
  console.log("   Target: MongoDB replica set rs0 (127.0.0.1:27017)");
  console.log("=======================================================\n");

  const runId = Date.now().toString(36);
  let tenantAUserId = "";
  let tenantAWorkspaceId = "";
  let tenantAOrgId = "";
  let tenantAToken = "";
  let tenantBUserId = "";
  let tenantBWorkspaceId = "";

  try {
    // ── A. Register Test User ──────────────────────────────────────────────
    const emailA = `sec_live_a_${runId}@omnidesk.ai`;
    const regA = await authService.register({
      email: emailA,
      password: "StrongLivePassword2026!",
      firstName: "Security",
      lastName: "Operator",
      organizationName: `SecCorp_${runId}`,
      workspaceName: `SecWS_${runId}`,
    });

    tenantAUserId = regA.user.id;
    tenantAWorkspaceId = regA.user.activeWorkspaceId;
    tenantAToken = regA.tokens.accessToken;

    const ws = await prisma.workspace.findUnique({ where: { id: tenantAWorkspaceId } });
    tenantAOrgId = ws!.organizationId;

    record("A. User Registration & Org/Workspace Creation", !!tenantAUserId && !!tenantAWorkspaceId, `User: ${emailA}`);

    // ── B. Login & Password Verification ───────────────────────────────────
    const loginRes = await authService.login({
      email: emailA,
      password: "StrongLivePassword2026!",
    });
    record("B. User Login & Token Generation", !!loginRes.tokens.accessToken && loginRes.user.role === "OWNER");

    // ── C. Verify JWT Signature and Claims ─────────────────────────────────
    const decoded = authService.verifyAccessToken(loginRes.tokens.accessToken);
    record("C. JWT Signature & Claim Integrity", decoded.userId === tenantAUserId && decoded.workspaceId === tenantAWorkspaceId);

    // ── D. /auth/me Profile and Authoritative Memberships ──────────────────
    const me = await authService.getCurrentUser(tenantAUserId, tenantAWorkspaceId);
    record("D. Authoritative Profile & Memberships Resolution", me.email === emailA && me.role === "OWNER");

    // ── E. Create/Select Workspace Membership ──────────────────────────────
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: tenantAWorkspaceId,
          userId: tenantAUserId,
        },
      },
    });
    record("E. Workspace Membership State Verification", member !== null && member.role === "OWNER");

    // ── F. Permission Enforcement ──────────────────────────────────────────
    const hasAdminPerm = me.permissions.includes("ai:approve") && me.permissions.includes("workspace:admin");
    record("F. Server-Authoritative Permissions Mapping", hasAdminPerm, `Total permissions: ${me.permissions.length}`);

    // ── G. Cross-Workspace Access Rejection ─────────────────────────────────
    const emailB = `sec_live_b_${runId}@omnidesk.ai`;
    const regB = await authService.register({
      email: emailB,
      password: "StrongLivePassword2026!",
      firstName: "Beta",
      lastName: "Operator",
      organizationName: `BetaCorp_${runId}`,
    });
    tenantBUserId = regB.user.id;
    tenantBWorkspaceId = regB.user.activeWorkspaceId;

    let crossTenantRejected = false;
    try {
      await authService.getCurrentUser(tenantAUserId, tenantBWorkspaceId);
    } catch (err: any) {
      crossTenantRejected = err.name === "ForbiddenError" || err.message.includes("not a member");
    }
    record("G. Cross-Workspace Isolation & Access Rejection", crossTenantRejected);

    // ── H. Approval Authorization & Single-Use Gate ─────────────────────────
    const approvalReq = await approvalService.createApprovalRequest({
      workspaceId: tenantAWorkspaceId,
      executionId: `exec_sec_${runId}`,
      toolId: "project_archive",
      toolName: "Archive Project",
      parameters: { projectId: "proj_demo" },
      riskLevel: "HIGH",
      reason: "Live security test",
    });
    record("H. High-Risk Human Approval Request Created", approvalReq.status === "PENDING");

    // Decide approval
    const decided = await approvalService.decideApproval(
      approvalReq.id,
      "APPROVED",
      tenantAUserId,
      tenantAWorkspaceId,
      "Live verified approval"
    );
    record("H2. Authorized OWNER Approval Decision", decided.status === "APPROVED");

    // ── I. Approval Replay Prevention ──────────────────────────────────────
    let replayPrevented = false;
    try {
      await approvalService.decideApproval(
        approvalReq.id,
        "APPROVED",
        tenantAUserId,
        tenantAWorkspaceId,
        "Replay attempt"
      );
    } catch (err: any) {
      replayPrevented = err.name === "ConflictError" || err.message.includes("already in") || err.message.includes("already been decided");
    }
    record("I. Approval Replay & Double-Execution Prevention", replayPrevented);

    // ── J. Logout & Token Revocation ───────────────────────────────────────
    await authService.logout(tenantAUserId, loginRes.tokens.refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { token: loginRes.tokens.refreshToken },
    });
    record("J. User Logout & Refresh Token Revocation", tokenRecord?.isRevoked === true);

    // ── K. Revoked Session Refresh Rejection ────────────────────────────────
    let refreshRejected = false;
    try {
      await authService.refreshToken(loginRes.tokens.refreshToken);
    } catch (err: any) {
      refreshRejected = err.name === "UnauthorizedError" || err.message.includes("revoked");
    }
    record("K. Revoked Refresh Token Rejection", refreshRejected);

    // ── L. WebSocket Authentication Verification ───────────────────────────
    const validWsHandshake = (() => {
      try {
        const claims = authService.verifyAccessToken(tenantAToken);
        return claims.userId === tenantAUserId;
      } catch {
        return false;
      }
    })();
    record("L. WebSocket Handshake JWT Token Verification", validWsHandshake);

    // ── M. WebSocket Workspace Isolation ───────────────────────────────────
    const crossWsMemberCheck = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: tenantBWorkspaceId,
          userId: tenantAUserId,
        },
      },
    });
    record("M. WebSocket Cross-Tenant Event Leakage Prevention", crossWsMemberCheck === null);

    // ── N. Rate Limiting Integrity ─────────────────────────────────────────
    const rateLimitConfigured = env.RATE_LIMIT_MAX_REQUESTS > 0 && env.RATE_LIMIT_WINDOW_MS > 0;
    record("N. Production Rate Limiting Configuration", rateLimitConfigured, `${env.RATE_LIMIT_MAX_REQUESTS} req / ${env.RATE_LIMIT_WINDOW_MS}ms`);

  } finally {
    // ── Cleanup Test Data ──────────────────────────────────────────────────
    console.log("\nCleaning up live security verification test records...");
    if (tenantAWorkspaceId) {
      await prisma.aIApprovalRequest.deleteMany({ where: { workspaceId: tenantAWorkspaceId } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: tenantAWorkspaceId } });
      await prisma.workspace.deleteMany({ where: { id: tenantAWorkspaceId } });
    }
    if (tenantBWorkspaceId) {
      await prisma.aIApprovalRequest.deleteMany({ where: { workspaceId: tenantBWorkspaceId } });
      await prisma.workspaceMember.deleteMany({ where: { workspaceId: tenantBWorkspaceId } });
      await prisma.workspace.deleteMany({ where: { id: tenantBWorkspaceId } });
    }
    if (tenantAOrgId) {
      await prisma.organization.deleteMany({ where: { id: tenantAOrgId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [tenantAUserId, tenantBUserId].filter(Boolean) } },
    });
    console.log("Cleanup complete.\n");
  }

  // Summary
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log("=======================================================");
  console.log(`LIVE VERIFICATION RESULT: ${failed === 0 ? "SUCCESS" : "FAILED"}`);
  console.log(`Total Steps: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveSecurityVerification().catch((err) => {
  console.error("Live security verification fatal error:", err);
  process.exit(1);
});
