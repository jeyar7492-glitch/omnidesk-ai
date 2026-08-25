import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { AIProviderFactory } from "../providers/provider.factory";
import { TestMockProvider } from "../providers/test.provider";

describe("AI API Routes (/api/v1/ai)", () => {
  const app = createApp();

  beforeEach(() => {
    AIProviderFactory.setCustomProvider(null);
  });

  afterEach(() => {
    AIProviderFactory.setCustomProvider(null);
  });

  it("POST /api/v1/ai/executions returns 201 with completed execution", async () => {
    const testProvider = new TestMockProvider([
      {
        thought: "Diagnostic test",
        toolCall: {
          toolId: "system_ping",
          arguments: { echo: "api_route_test" },
          reason: "Testing API route",
          riskLevel: "LOW",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Completed diagnostic",
        isComplete: true,
        finalResponse: "API Route verified.",
      },
    ]);

    AIProviderFactory.setCustomProvider(testProvider);

    const res = await request(app)
      .post("/api/v1/ai/executions")
      .set("x-workspace-id", "67b844ec10ec6e3973b5cc11")
      .set("x-user-id", "67b844ec10ec6e3973b5cc22")
      .send({
        prompt: "Run health diagnostic",
        agentId: "supervisor",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("id");
    expect(res.body.data.status).toBe("COMPLETED");
    expect(res.body.data.finalResponse).toBe("API Route verified.");
  });

  it("POST /api/v1/ai/executions returns 503 if AI provider is not configured", async () => {
    // Default provider has no keys configured
    const res = await request(app)
      .post("/api/v1/ai/executions")
      .set("x-workspace-id", "67b844ec10ec6e3973b5cc11")
      .set("x-user-id", "67b844ec10ec6e3973b5cc22")
      .send({
        prompt: "Run reasoning with unconfigured provider",
        agentId: "supervisor",
      });

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe("AI_PROVIDER_NOT_CONFIGURED");
  });

  it("GET /api/v1/ai/executions lists workspace executions", async () => {
    const res = await request(app)
      .get("/api/v1/ai/executions")
      .set("x-workspace-id", "67b844ec10ec6e3973b5cc11")
      .set("x-user-id", "67b844ec10ec6e3973b5cc22");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty("total");
  });

  it("GET /api/v1/ai/approvals lists workspace approvals", async () => {
    const res = await request(app)
      .get("/api/v1/ai/approvals")
      .set("x-workspace-id", "67b844ec10ec6e3973b5cc11")
      .set("x-user-id", "67b844ec10ec6e3973b5cc22");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
