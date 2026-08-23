import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

describe("CRM REST API Endpoints (/api/v1/crm/*)", () => {
  const app = createApp();
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const authHeaders = {
    "x-workspace-id": testWorkspaceId,
    "x-user-id": "67b844ec10ec6e3973b5cc33",
    "x-user-role": "ADMIN",
    "x-user-permissions": "workspace:read,workspace:write,crm:read,crm:write,lead:read,lead:write,customer:read,customer:write,contact:read,contact:write,deal:read,deal:write",
  };

  it("POST /api/v1/crm/customers creates a new customer account", async () => {
    const res = await request(app)
      .post("/api/v1/crm/customers")
      .set(authHeaders)
      .send({
        companyName: "Nexus AI Ventures",
        contactPerson: "David Miller",
        email: "david.miller@nexusai.io",
        industry: "Venture Capital & AI",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.companyName).toBe("Nexus AI Ventures");

    // Verify in MongoDB
    const record = await prisma.customer.findUnique({
      where: { id: res.body.data.id },
    });
    expect(record).not.toBeNull();
    expect(record?.companyName).toBe("Nexus AI Ventures");
  });

  it("GET /api/v1/crm/customers lists customers with count aggregations", async () => {
    const res = await request(app)
      .get("/api/v1/crm/customers?query=Nexus")
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("POST /api/v1/crm/leads creates a new sales lead", async () => {
    const res = await request(app)
      .post("/api/v1/crm/leads")
      .set(authHeaders)
      .send({
        title: "Seed Stage AI Lead",
        dealValue: 35000,
        stage: "QUALIFICATION",
        priority: "HIGH",
        notes: "Inquiry from website form",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Seed Stage AI Lead");
    expect(res.body.data.dealValue).toBe(35000);
  });

  it("GET /api/v1/crm/leads lists and filters leads", async () => {
    const res = await request(app)
      .get("/api/v1/crm/leads?stage=QUALIFICATION")
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/v1/crm/deals creates a deal and calculates pipeline", async () => {
    const createRes = await request(app)
      .post("/api/v1/crm/deals")
      .set(authHeaders)
      .send({
        title: "Annual Platform Subscription 2026",
        dealValue: 60000,
        stage: "PROPOSAL",
        probability: 70,
        priority: "HIGH",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const dealId = createRes.body.data.id;

    // Check pipeline summary
    const summaryRes = await request(app)
      .get("/api/v1/crm/pipeline/summary")
      .set(authHeaders);

    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.success).toBe(true);
    expect(summaryRes.body.data.totalActivePipelineValue).toBeGreaterThanOrEqual(60000);

    // Move deal to negotiation
    const moveRes = await request(app)
      .post(`/api/v1/crm/deals/${dealId}/move`)
      .set(authHeaders)
      .send({
        targetStage: "NEGOTIATION",
        reason: "Contract proposal approved by client board",
      });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.data.stage).toBe("NEGOTIATION");
  });

  it("POST /api/v1/crm/activities logs a CRM interaction activity", async () => {
    const customer = await prisma.customer.create({
      data: {
        workspaceId: testWorkspaceId,
        companyName: "HyperScale Networks",
      },
    });

    const res = await request(app)
      .post("/api/v1/crm/activities")
      .set(authHeaders)
      .send({
        entityType: "customer",
        entityId: customer.id,
        type: "meeting",
        title: "Initial Discovery Call with CTO",
        content: "Discussed integration timelines and security compliance requirements.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe("Initial Discovery Call with CTO");
  });
});
