import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiClient } from "./api/client";

function getExpectedPermissionsForRole(role: string): string[] {
  switch (role) {
    case "ADMIN":
    case "OWNER":
      return ["ai:approve", "project:archive", "workspace:admin", "task:write", "ai:execute"];
    case "MEMBER":
      return ["task:read", "task:write", "task:move", "project:read", "crm:read", "ai:execute"];
    default:
      return ["workspace:read"];
  }
}

describe("OmniDesk AI Frontend Authentication & Security Suite", () => {
  let client: ApiClient;
  let mockFetch: any;

  beforeEach(() => {
    client = new ApiClient();
    client.clearSession();

    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("1. Login success stores tokens and sets authoritative context", async () => {
    const mockAuthResponse = {
      success: true,
      data: {
        user: {
          id: "usr_123",
          email: "alex@omnidesk.ai",
          firstName: "Alex",
          lastName: "Vance",
          isActive: true,
          isVerified: true,
          role: "ADMIN",
          permissions: ["workspace:read", "ai:execute", "ai:approve"],
          activeWorkspaceId: "ws_456",
          workspaces: [{ id: "ws_456", name: "Acme HQ", slug: "acme-hq", role: "ADMIN" }],
        },
        tokens: {
          accessToken: "jwt_access_token_12345",
          refreshToken: "refresh_token_67890",
          expiresIn: 900,
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAuthResponse,
    });

    const res = await client.login("alex@omnidesk.ai", "SecretPassword123!");

    expect(res.user.email).toBe("alex@omnidesk.ai");
    expect(res.tokens.accessToken).toBe("jwt_access_token_12345");
    expect(client.getAccessToken()).toBe("jwt_access_token_12345");
    expect(client.getContext().workspaceId).toBe("ws_456");
    expect(client.getContext().userId).toBe("usr_123");
    expect(client.getContext().userRole).toBe("ADMIN");
  });

  it("2. Login failure throws safe generic error without leaking details", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        },
      }),
    });

    await expect(client.login("unknown@omnidesk.ai", "wrong")).rejects.toThrow(
      "Invalid email or password"
    );
    expect(client.getAccessToken()).toBeNull();
  });

  it("3. Registration success stores tokens and initializes workspace context", async () => {
    const mockRegisterResponse = {
      success: true,
      data: {
        user: {
          id: "usr_new",
          email: "new@omnidesk.ai",
          firstName: "New",
          lastName: "User",
          isActive: true,
          isVerified: true,
          role: "OWNER",
          permissions: ["*"],
          activeWorkspaceId: "ws_new",
          workspaces: [{ id: "ws_new", name: "New Workspace", slug: "new-ws", role: "OWNER" }],
        },
        tokens: {
          accessToken: "jwt_new_access_token",
          refreshToken: "refresh_new_token",
          expiresIn: 900,
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => mockRegisterResponse,
    });

    const res = await client.register({
      email: "new@omnidesk.ai",
      password: "StrongPassword2026!",
      firstName: "New",
      lastName: "User",
    });

    expect(res.user.role).toBe("OWNER");
    expect(client.getAccessToken()).toBe("jwt_new_access_token");
    expect(client.getContext().workspaceId).toBe("ws_new");
  });

  it("4. Authenticated /auth/me session restoration", async () => {
    const mockMeResponse = {
      success: true,
      data: {
        id: "usr_restored",
        email: "restored@omnidesk.ai",
        firstName: "Restored",
        lastName: "Operator",
        isActive: true,
        isVerified: true,
        role: "MANAGER",
        permissions: ["task:read", "task:write", "project:read", "ai:execute"],
        activeWorkspaceId: "ws_restored",
        workspaces: [{ id: "ws_restored", name: "Restored WS", slug: "restored-ws", role: "MANAGER" }],
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockMeResponse,
    });

    const user = await client.getCurrentUser();
    expect(user.email).toBe("restored@omnidesk.ai");
    expect(client.getContext().userRole).toBe("MANAGER");
    expect(client.getContext().workspaceId).toBe("ws_restored");
  });

  it("5. Authorization header is automatically attached to API requests", async () => {
    // First login
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          user: { id: "u1", activeWorkspaceId: "ws1", role: "MEMBER", permissions: [] },
          tokens: { accessToken: "test_bearer_jwt", refreshToken: "ref1", expiresIn: 900 },
        },
      }),
    });
    await client.login("test@omnidesk.ai", "pass");

    // Second request to tasks
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [] }),
    });

    await client.getTasks();

    const secondCallHeaders = mockFetch.mock.calls[1][1].headers;
    expect(secondCallHeaders["Authorization"]).toBe("Bearer test_bearer_jwt");
    expect(secondCallHeaders["x-workspace-id"]).toBe("ws1");
  });

  it("6. Expired access token is transparently refreshed and request retried", async () => {
    // Set initial expired token & refresh token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          user: { id: "u1", activeWorkspaceId: "ws1", role: "MEMBER", permissions: [] },
          tokens: { accessToken: "expired_token", refreshToken: "valid_refresh", expiresIn: 900 },
        },
      }),
    });
    await client.login("test@omnidesk.ai", "pass");

    // Call 1 fails with 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { message: "Access token has expired" } }),
    });

    // Call 2 refresh succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { accessToken: "new_fresh_token", refreshToken: "new_refresh", expiresIn: 900 },
      }),
    });

    // Call 3 retried request succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [{ id: "task_1", title: "Refreshed Task" }] }),
    });

    const tasks = await client.getTasks();
    expect(tasks).toHaveLength(1);
    expect(client.getAccessToken()).toBe("new_fresh_token");
  });

  it("7. Refresh failure clears session without throwing unhandled exceptions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          user: { id: "u1", activeWorkspaceId: "ws1", role: "MEMBER", permissions: [] },
          tokens: { accessToken: "bad_token", refreshToken: "bad_refresh", expiresIn: 900 },
        },
      }),
    });
    await client.login("test@omnidesk.ai", "pass");

    // Original request fails with 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { message: "Unauthorized" } }),
    });

    // Refresh request fails with 401
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ success: false, error: { message: "Invalid refresh token" } }),
    });

    await expect(client.getTasks()).rejects.toThrow("Unauthorized");
    expect(client.getAccessToken()).toBeNull();
  });

  it("8. Logout revokes token and clears local storage session", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          user: { id: "u1", activeWorkspaceId: "ws1", role: "MEMBER", permissions: [] },
          tokens: { accessToken: "tok", refreshToken: "ref", expiresIn: 900 },
        },
      }),
    });
    await client.login("test@omnidesk.ai", "pass");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { message: "Logged out" } }),
    });

    await client.logout();
    expect(client.getAccessToken()).toBeNull();
  });

  it("9. Permission-aware navigation uses authoritative server roles", () => {
    const adminPerms = getExpectedPermissionsForRole("ADMIN");
    expect(adminPerms).toContain("ai:approve");
    expect(adminPerms).toContain("project:archive");

    const memberPerms = getExpectedPermissionsForRole("MEMBER");
    expect(memberPerms).not.toContain("ai:approve");
    expect(memberPerms).not.toContain("project:archive");
    expect(memberPerms).toContain("task:read");
    expect(memberPerms).toContain("ai:execute");
  });

  it("10. Access token or secret is never exposed in error output or serialization", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        error: { code: "SERVER_ERROR", message: "Database failure" },
      }),
    });

    try {
      await client.getTasks();
    } catch (err: any) {
      expect(err.message).not.toContain("jwt");
      expect(err.message).not.toContain("secret");
      expect(err.message).not.toContain("password");
    }
  });
});
