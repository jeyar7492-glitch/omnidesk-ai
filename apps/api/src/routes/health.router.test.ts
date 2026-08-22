import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app";

describe("GET /api/v1/health", () => {
  const app = createApp();

  it("should return status 200 and health payload", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("service", "omnidesk-api");
    expect(res.body).toHaveProperty("version", "2.0.0");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/api/v1/non-existent-route");
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("success", false);
    expect(res.body.error).toHaveProperty("code", "NOT_FOUND");
  });
});
