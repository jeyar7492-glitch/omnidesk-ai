import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";

describe("CRM REST API Endpoints (/api/v1/crm/*)", () => {
  const app = createApp();
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const otherWorkspaceId = "67b844ec10ec6e3973b5cc22";

  const authHeaders = {
    "x-workspace-id": testWorkspaceId,
    "x-user-id": "67b844ec10ec6e3973b5cc33",
    "x-user-role": "ADMIN",
    "x-user-permissions":
      "workspace:read,workspace:write,crm:read,crm:write,lead:read,lead:write,customer:read,customer:write,contact:read,contact:write,deal:read,deal:write",
  };

  const otherWorkspaceHeaders = {
    "x-workspace-id": otherWorkspaceId,
    "x-user-id": "67b844ec10ec6e3973b5cc44",
    "x-user-role": "ADMIN",
    "x-user-permissions":
      "workspace:read,workspace:write,crm:read,crm:write,lead:read,lead:write,customer:read,customer:write,contact:read,contact:write,deal:read,deal:write",
  };

  const restrictedHeaders = {
    "x-workspace-id": testWorkspaceId,
    "x-user-id": "67b844ec10ec6e3973b5cc55",
    "x-user-role": "MEMBER",
    "x-user-permissions": "workspace:read", // Missing crm permissions
  };

  // ── 1. Customer Endpoints ─────────────────────────────────────────────────
  describe("Customer Management", () => {
    it("POST /api/v1/crm/customers creates a new customer account", async () => {
      const res = await request(app)
        .post("/api/v1/crm/customers")
        .set(authHeaders)
        .send({
          companyName: "Nexus AI Ventures",
          contactPerson: "David Miller",
          email: "david.miller@nexusai.io",
          industry: "Venture Capital & AI",
          notes: "Tier 1 client prospect",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe("Nexus AI Ventures");
      expect(res.body.data.workspaceId).toBe(testWorkspaceId);

      // Verify in MongoDB
      const record = await prisma.customer.findUnique({
        where: { id: res.body.data.id },
      });
      expect(record).not.toBeNull();
      expect(record?.companyName).toBe("Nexus AI Ventures");
    });

    it("GET /api/v1/crm/customers lists customers with pagination and metadata", async () => {
      const res = await request(app)
        .get("/api/v1/crm/customers?query=Nexus")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/v1/crm/customers/:id retrieves customer detail with related collections", async () => {
      const customer = await prisma.customer.create({
        data: {
          workspaceId: testWorkspaceId,
          companyName: "Acme Cloud Corp",
          industry: "Cloud Infrastructure",
        },
      });

      const res = await request(app)
        .get(`/api/v1/crm/customers/${customer.id}`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(customer.id);
      expect(res.body.data.companyName).toBe("Acme Cloud Corp");
      expect(Array.isArray(res.body.data.contacts)).toBe(true);
      expect(Array.isArray(res.body.data.deals)).toBe(true);
      expect(Array.isArray(res.body.data.activities)).toBe(true);
    });

    it("PATCH /api/v1/crm/customers/:id updates customer properties", async () => {
      const customer = await prisma.customer.create({
        data: {
          workspaceId: testWorkspaceId,
          companyName: "Legacy Systems LLC",
          status: "active",
        },
      });

      const res = await request(app)
        .patch(`/api/v1/crm/customers/${customer.id}`)
        .set(authHeaders)
        .send({
          companyName: "Modernized Systems Inc",
          status: "inactive",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.companyName).toBe("Modernized Systems Inc");
      expect(res.body.data.status).toBe("inactive");
    });

    it("POST /api/v1/crm/customers/:id/archive archives customer", async () => {
      const customer = await prisma.customer.create({
        data: {
          workspaceId: testWorkspaceId,
          companyName: "Archived Customer Corp",
        },
      });

      const res = await request(app)
        .post(`/api/v1/crm/customers/${customer.id}/archive`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.isArchived).toBe(true);
    });

    it("Enforces tenant isolation on Customer retrieval across workspaces", async () => {
      const customer = await prisma.customer.create({
        data: {
          workspaceId: otherWorkspaceId,
          companyName: "Isolated Other Corp",
        },
      });

      const res = await request(app)
        .get(`/api/v1/crm/customers/${customer.id}`)
        .set(authHeaders); // testWorkspaceId requesting otherWorkspaceId customer

      expect(res.status).toBe(404);
    });
  });

  // ── 2. Contact Endpoints ──────────────────────────────────────────────────
  describe("Contact Management", () => {
    it("POST /api/v1/crm/contacts creates a contact and links to customer", async () => {
      const customer = await prisma.customer.create({
        data: {
          workspaceId: testWorkspaceId,
          companyName: "Starlight Media",
        },
      });

      const res = await request(app)
        .post("/api/v1/crm/contacts")
        .set(authHeaders)
        .send({
          firstName: "Sophia",
          lastName: "Turner",
          email: "sophia.turner@starlight.io",
          phone: "+1 555-0144",
          jobTitle: "VP of Product",
          customerId: customer.id,
          isPrimary: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe("Sophia");
      expect(res.body.data.lastName).toBe("Turner");
      expect(res.body.data.customerId).toBe(customer.id);
      expect(res.body.data.isPrimary).toBe(true);
    });

    it("GET /api/v1/crm/contacts lists contacts with search filter", async () => {
      const res = await request(app)
        .get("/api/v1/crm/contacts?search=Sophia")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: any) => c.firstName === "Sophia")).toBe(true);
    });

    it("GET /api/v1/crm/contacts/:id retrieves contact detail with customer relationship", async () => {
      const contact = await prisma.contact.create({
        data: {
          workspaceId: testWorkspaceId,
          firstName: "Elena",
          lastName: "Rostova",
          email: "elena@techcorp.com",
        },
      });

      const res = await request(app)
        .get(`/api/v1/crm/contacts/${contact.id}`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.data.firstName).toBe("Elena");
      expect(res.body.data.lastName).toBe("Rostova");
    });
  });

  // ── 3. Lead Endpoints & Conversion ────────────────────────────────────────
  describe("Lead Management & Lead Conversion", () => {
    it("POST /api/v1/crm/leads creates a new sales lead", async () => {
      const res = await request(app)
        .post("/api/v1/crm/leads")
        .set(authHeaders)
        .send({
          title: "Enterprise Data Platform Pilot",
          dealValue: 45000,
          stage: "QUALIFICATION",
          priority: "HIGH",
          source: "Inbound Webinar",
          notes: "Expressed interest in Q3 deployment",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Enterprise Data Platform Pilot");
      expect(res.body.data.dealValue).toBe(45000);
    });

    it("POST /api/v1/crm/leads/:id/convert atomically converts lead into customer, contact, and deal", async () => {
      const lead = await prisma.lead.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Quantum Tech Pilot",
          dealValue: 75000,
          stage: "QUALIFICATION",
          priority: "HIGH",
        },
      });

      const res = await request(app)
        .post(`/api/v1/crm/leads/${lead.id}/convert`)
        .set(authHeaders)
        .send({
          createCustomer: true,
          customerName: "Quantum Computing Technologies",
          createContact: true,
          contactFirstName: "Richard",
          contactLastName: "Feynman",
          contactEmail: "richard@quantumtech.org",
          createDeal: true,
          dealTitle: "Quantum Enterprise Contract",
          dealValue: 75000,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customer).toBeDefined();
      expect(res.body.data.customer.companyName).toBe("Quantum Computing Technologies");
      expect(res.body.data.contact).toBeDefined();
      expect(res.body.data.contact.email).toBe("richard@quantumtech.org");
      expect(res.body.data.deal).toBeDefined();
      expect(res.body.data.deal.title).toBe("Quantum Enterprise Contract");
      expect(res.body.data.deal.dealValue).toBe(75000);

      // Verify the lead is marked converted in database
      const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
      expect(updatedLead?.isConverted).toBe(true);
      expect(updatedLead?.convertedAt).not.toBeNull();
      expect(updatedLead?.convertedCustomerId).toBe(res.body.data.customer.id);
    });

    it("Rejects duplicate conversion attempt with 400 ValidationError", async () => {
      const lead = await prisma.lead.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Already Converted Lead",
          dealValue: 20000,
          isConverted: true,
          convertedAt: new Date(),
        },
      });

      const res = await request(app)
        .post(`/api/v1/crm/leads/${lead.id}/convert`)
        .set(authHeaders)
        .send({
          createCustomer: true,
          customerName: "Duplicate Convert Corp",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  // ── 4. Deal Endpoints & Transition Validation ─────────────────────────────
  describe("Deal Pipeline & State Machine Transitions", () => {
    it("POST /api/v1/crm/deals creates an opportunity and computes pipeline summary", async () => {
      const res = await request(app)
        .post("/api/v1/crm/deals")
        .set(authHeaders)
        .send({
          title: "Cyber Security Suite 2026",
          dealValue: 80000,
          stage: "PROPOSAL",
          probability: 60,
          priority: "HIGH",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe("Cyber Security Suite 2026");

      const summaryRes = await request(app)
        .get("/api/v1/crm/pipeline/summary")
        .set(authHeaders);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.totalActivePipelineValue).toBeGreaterThanOrEqual(80000);
    });

    it("Allows valid deal transition adhering to ALLOWED_DEAL_TRANSITIONS", async () => {
      const deal = await prisma.deal.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Cloud Migration Contract",
          dealValue: 50000,
          stage: "PROPOSAL",
          probability: 50,
          priority: "HIGH",
        },
      });

      // PROPOSAL -> NEGOTIATION is allowed
      const res = await request(app)
        .post(`/api/v1/crm/deals/${deal.id}/move`)
        .set(authHeaders)
        .send({
          targetStage: "NEGOTIATION",
          reason: "Negotiating final SLA terms",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.stage).toBe("NEGOTIATION");
    });

    it("Rejects invalid deal stage transition with 400 Bad Request", async () => {
      const deal = await prisma.deal.create({
        data: {
          workspaceId: testWorkspaceId,
          title: "Invalid Transition Deal",
          dealValue: 30000,
          stage: "QUALIFICATION", // Can only move to CONTACTED, PROPOSAL, or LOST
          probability: 20,
          priority: "LOW",
        },
      });

      // Attempting illegal jump directly to WON
      const res = await request(app)
        .post(`/api/v1/crm/deals/${deal.id}/move`)
        .set(authHeaders)
        .send({
          targetStage: "WON",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toContain("Invalid pipeline transition");
    });
  });

  // ── 5. CRM Dashboard Analytics ────────────────────────────────────────────
  describe("CRM Dashboard Analytics Aggregation", () => {
    it("GET /api/v1/crm/dashboard aggregates real metrics and respects tenant boundaries", async () => {
      const res = await request(app)
        .get("/api/v1/crm/dashboard")
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const metrics = res.body.data;

      expect(typeof metrics.totalCustomers).toBe("number");
      expect(typeof metrics.totalContacts).toBe("number");
      expect(typeof metrics.openLeads).toBe("number");
      expect(typeof metrics.openDeals).toBe("number");
      expect(typeof metrics.totalPipelineValue).toBe("number");
      expect(typeof metrics.weightedPipelineValue).toBe("number");
      expect(typeof metrics.conversionRate).toBe("number");
      expect(metrics.pipelineByStage).toBeDefined();
      expect(metrics.pipelineByStage.QUALIFICATION).toBeDefined();
      expect(metrics.leadDistribution).toBeDefined();
      expect(Array.isArray(metrics.recentActivities)).toBe(true);
    });
  });

  // ── 6. CRM Activities ─────────────────────────────────────────────────────
  describe("CRM Activities Management", () => {
    it("POST /api/v1/crm/activities logs activity and PATCH toggles isCompleted", async () => {
      const customer = await prisma.customer.create({
        data: {
          workspaceId: testWorkspaceId,
          companyName: "Apex Dynamics",
        },
      });

      const createRes = await request(app)
        .post("/api/v1/crm/activities")
        .set(authHeaders)
        .send({
          entityType: "customer",
          entityId: customer.id,
          type: "call",
          title: "Quarterly Review Call with CEO",
          content: "Reviewed quarterly metrics and roadmap items.",
        });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.title).toBe("Quarterly Review Call with CEO");
      expect(createRes.body.data.isCompleted).toBe(false);

      const activityId = createRes.body.data.id;

      // Toggle completed
      const updateRes = await request(app)
        .patch(`/api/v1/crm/activities/${activityId}`)
        .set(authHeaders)
        .send({
          isCompleted: true,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.isCompleted).toBe(true);
      expect(updateRes.body.data.completedAt).not.toBeNull();
    });
  });

  // ── 7. RBAC & Security Boundaries ─────────────────────────────────────────
  describe("RBAC & Security Permission Enforcement", () => {
    it("Rejects request when user lacks required permission with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/v1/crm/dashboard")
        .set(restrictedHeaders);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
