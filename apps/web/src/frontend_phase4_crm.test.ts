import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api/client";
import { CRMDashboardMetrics } from "@omnidesk/shared-types";

describe("Frontend Phase 4: Enterprise CRM & Sales Pipeline Client Integration", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  it("apiClient.getCRMDashboard fetches /crm/dashboard with workspace headers", async () => {
    const mockDashboard: CRMDashboardMetrics = {
      totalCustomers: 12,
      activeCustomers: 10,
      totalContacts: 25,
      openLeads: 8,
      convertedLeads: 4,
      openDeals: 6,
      wonDeals: 5,
      lostDeals: 2,
      totalPipelineValue: 180000,
      weightedPipelineValue: 95000,
      wonRevenue: 320000,
      conversionRate: 71.4,
      pipelineByStage: {
        QUALIFICATION: { count: 2, totalValue: 40000, weightedValue: 8000 },
        CONTACTED: { count: 1, totalValue: 20000, weightedValue: 6000 },
        PROPOSAL: { count: 2, totalValue: 60000, weightedValue: 36000 },
        NEGOTIATION: { count: 1, totalValue: 60000, weightedValue: 45000 },
        WON: { count: 5, totalValue: 320000, weightedValue: 320000 },
        LOST: { count: 2, totalValue: 50000, weightedValue: 0 },
      },
      leadDistribution: {
        byStage: { NEW: 4, QUALIFYING: 2, QUALIFIED: 2 },
        byPriority: { LOW: 1, MEDIUM: 4, HIGH: 2, URGENT: 1 },
      },
      recentActivities: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockDashboard }),
    });

    const res = await apiClient.getCRMDashboard();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/crm/dashboard"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-workspace-id": expect.any(String),
        }),
      })
    );
    expect(res.totalCustomers).toBe(12);
    expect(res.totalPipelineValue).toBe(180000);
    expect(res.conversionRate).toBe(71.4);
  });

  it("apiClient.getCustomersPaginated builds query parameters correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: [{ id: "c1", companyName: "Nexus AI" }],
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      }),
    });

    const res = await apiClient.getCustomersPaginated({
      search: "Nexus",
      status: "ACTIVE",
      page: 1,
      limit: 10,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/crm/customers?search=Nexus&status=ACTIVE&page=1&limit=10"),
      expect.any(Object)
    );
    expect(res.items.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it("apiClient.createCustomer sends POST request with JSON payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: { id: "c2", companyName: "Vertex Logistics", status: "ACTIVE" },
      }),
    });

    const res = await apiClient.createCustomer({
      name: "Vertex Logistics",
      industry: "Supply Chain",
      status: "ACTIVE",
      healthScore: 85,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/crm/customers"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "Vertex Logistics",
          industry: "Supply Chain",
          status: "ACTIVE",
          healthScore: 85,
        }),
      })
    );
    expect(res.id).toBe("c2");
  });

  it("apiClient.convertLead sends POST /crm/leads/:id/convert with full conversion spec", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          customer: { id: "cust_1", companyName: "Nova Robotics" },
          contact: { id: "cont_1", email: "elizabeth@novarobotics.com" },
          deal: { id: "deal_1", title: "Nova Enterprise Pilot", dealValue: 90000 },
        },
      }),
    });

    const convertPayload = {
      createCustomer: true,
      customerName: "Nova Robotics",
      createContact: true,
      contactFirstName: "Elizabeth",
      contactLastName: "Swann",
      contactEmail: "elizabeth@novarobotics.com",
      createDeal: true,
      dealTitle: "Nova Enterprise Pilot",
      dealValue: 90000,
    };

    const res = await apiClient.convertLead("lead_123", convertPayload);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/crm/leads/lead_123/convert"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(convertPayload),
      })
    );
    expect(res.customer.companyName).toBe("Nova Robotics");
    expect(res.deal.dealValue).toBe(90000);
  });

  it("apiClient.moveDeal sends POST to /crm/deals/:id/stage with targetStage", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { id: "deal_456", title: "Global SaaS Deal", stage: "NEGOTIATION" },
      }),
    });

    const res = await apiClient.moveDeal("deal_456", "NEGOTIATION", "Security review cleared");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/crm/deals/deal_456/stage"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ targetStage: "NEGOTIATION", reason: "Security review cleared" }),
      })
    );
    expect(res.stage).toBe("NEGOTIATION");
  });

  it("apiClient.createActivity logs new interaction activity", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          id: "act_1",
          entityType: "deal",
          entityId: "deal_456",
          type: "meeting",
          title: "Architecture Review Call",
          isCompleted: false,
        },
      }),
    });

    const res = await apiClient.createActivity({
      entityType: "deal",
      entityId: "deal_456",
      type: "meeting",
      title: "Architecture Review Call",
      content: "Deep dive on multi-tenant MongoDB replica set architecture",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/crm/activities"),
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(res.id).toBe("act_1");
    expect(res.isCompleted).toBe(false);
  });
});
