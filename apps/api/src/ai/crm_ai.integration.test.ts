import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { toolExecutor } from "./tools/tool.executor";
import { approvalService } from "./approvals/approval.service";
import { orchestrator } from "./orchestrator/orchestrator";
import { AIProviderFactory } from "./providers/provider.factory";
import { TestMockProvider } from "./providers/test.provider";
import { NoopProvider } from "./providers/noop.provider";
import { wsManager } from "../lib/websocket";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";
import { prisma } from "../lib/prisma";

describe("Phase 2 Step 3: Real CRM / Sales Agent Production Pipeline", () => {
  const testWorkspaceId = "67b844ec10ec6e3973b5cc11";
  const victimWorkspaceId = "67b844ec10ec6e3973b5cc22";
  const testUserId = "67b844ec10ec6e3973b5cc33";

  const adminContext: AgentExecutionContext = {
    workspaceId: testWorkspaceId,
    userId: testUserId,
    userRole: "ADMIN",
    userPermissions: [
      "workspace:read",
      "workspace:write",
      "crm:read",
      "crm:write",
      "lead:read",
      "lead:write",
      "customer:read",
      "customer:write",
      "contact:read",
      "contact:write",
      "deal:read",
      "deal:write",
      "system:admin",
    ],
    requestId: "req_crm_test_001",
  };

  const restrictedContext: AgentExecutionContext = {
    workspaceId: testWorkspaceId,
    userId: "67b844ec10ec6e3973b5cc44",
    userRole: "VIEWER",
    userPermissions: ["workspace:read", "crm:read", "lead:read", "customer:read", "contact:read", "deal:read"], // No write
    requestId: "req_crm_test_002",
  };

  beforeEach(() => {
    AIProviderFactory.setCustomProvider(null);
  });

  afterEach(() => {
    AIProviderFactory.setCustomProvider(null);
    vi.restoreAllMocks();
  });

  it("1. Lead creation writes to MongoDB and emits crm:lead_created event", async () => {
    const wsSpy = vi.spyOn(wsManager, "broadcastToWorkspace");

    const proposal: ToolCallProposal = {
      toolId: "lead_create",
      arguments: {
        title: "Enterprise Cloud Security Expansion",
        companyName: "CyberGuard Tech",
        dealValue: 75000,
        stage: "QUALIFICATION",
        probability: 30,
        priority: "HIGH",
        notes: "Inbound inquiry from Q3 keynote demo",
      },
      reason: "Creating high priority enterprise lead",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc91",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const created: any = response.result?.result;
    expect(created.title).toBe("Enterprise Cloud Security Expansion");
    expect(created.dealValue).toBe(75000);
    expect(created.stage).toBe("QUALIFICATION");

    // Verify in real MongoDB
    const dbRecord = await prisma.lead.findUnique({
      where: { id: created.id },
      include: { customer: true },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.workspaceId).toBe(testWorkspaceId);
    expect(dbRecord?.customer?.companyName).toBe("CyberGuard Tech");

    // Verify WebSocket event
    expect(wsSpy).toHaveBeenCalledWith(
      testWorkspaceId,
      "crm:lead_created",
      expect.objectContaining({ leadId: created.id, title: "Enterprise Cloud Security Expansion" })
    );
  });

  it("2. Lead search filters records in MongoDB by keyword and priority", async () => {
    await prisma.lead.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "CyberGuard Tech Security Suite Expansion",
        dealValue: 75000,
        stage: "QUALIFICATION",
        priority: "HIGH",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "lead_find",
      arguments: {
        query: "CyberGuard",
        priority: "HIGH",
      },
      reason: "Find high priority CyberGuard leads",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc92",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.count).toBeGreaterThan(0);
    expect(result.leads.some((l: any) => l.title.includes("CyberGuard"))).toBe(true);
  });

  it("3. Lead update modifies lead values in MongoDB and emits crm:lead_updated", async () => {
    const lead = await prisma.lead.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Seed Lead for Valuation Update",
        dealValue: 20000,
        stage: "QUALIFICATION",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "lead_update",
      arguments: {
        leadId: lead.id,
        dealValue: 45000,
        stage: "PROPOSAL",
        priority: "URGENT",
      },
      reason: "Upgrading lead scope and priority",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc93",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.dealValue).toBe(45000);
    expect(result.stage).toBe("PROPOSAL");

    // Verify in MongoDB
    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updated?.dealValue).toBe(45000);
    expect(updated?.stage).toBe("PROPOSAL");
  });

  it("4. Customer account creation persists organization details in MongoDB", async () => {
    const proposal: ToolCallProposal = {
      toolId: "customer_create",
      arguments: {
        companyName: "Acme Logistics Global",
        contactPerson: "Sarah Jenkins",
        email: "sarah.j@acmelogistics.com",
        industry: "Logistics & Supply Chain",
        city: "Chicago",
        country: "USA",
      },
      reason: "Create client account",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc94",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const customer: any = response.result?.result;
    expect(customer.companyName).toBe("Acme Logistics Global");
    expect(customer.industry).toBe("Logistics & Supply Chain");

    const dbCustomer = await prisma.customer.findUnique({ where: { id: customer.id } });
    expect(dbCustomer?.workspaceId).toBe(testWorkspaceId);
    expect(dbCustomer?.email).toBe("sarah.j@acmelogistics.com");
  });

  it("5. Contact creation links individual contact person to customer in MongoDB", async () => {
    const customer = await prisma.customer.create({
      data: {
        workspaceId: testWorkspaceId,
        companyName: "Apex Retail Systems",
      },
    });

    const proposal: ToolCallProposal = {
      toolId: "contact_create",
      arguments: {
        firstName: "Marcus",
        lastName: "Vance",
        email: "marcus.vance@apexretail.io",
        phone: "+1-555-0199",
        jobTitle: "VP of Engineering",
        customerId: customer.id,
        isPrimary: true,
      },
      reason: "Register primary technical contact",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc95",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const contact: any = response.result?.result;
    expect(contact.name).toBe("Marcus Vance");
    expect(contact.email).toBe("marcus.vance@apexretail.io");

    const dbContact = await prisma.contact.findUnique({ where: { id: contact.id } });
    expect(dbContact?.workspaceId).toBe(testWorkspaceId);
    expect(dbContact?.customerId).toBe(customer.id);
  });

  it("6. Deal creation registers new revenue opportunity with stage and valuation in MongoDB", async () => {
    const proposal: ToolCallProposal = {
      toolId: "deal_create",
      arguments: {
        title: "OmniDesk Enterprise AI License 2026",
        dealValue: 120000,
        stage: "PROPOSAL",
        probability: 60,
        priority: "HIGH",
        companyName: "Apex Retail Systems",
      },
      reason: "Creating annual enterprise deal",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc96",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const deal: any = response.result?.result;
    expect(deal.title).toBe("OmniDesk Enterprise AI License 2026");
    expect(deal.dealValue).toBe(120000);
    expect(deal.stage).toBe("PROPOSAL");

    const dbDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(dbDeal?.workspaceId).toBe(testWorkspaceId);
    expect(dbDeal?.dealValue).toBe(120000);
  });

  it("7. Valid deal stage transition moves deal according to pipeline governance", async () => {
    const deal = await prisma.deal.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Seed Deal for Pipeline Transition",
        dealValue: 50000,
        stage: "PROPOSAL",
      },
    });

    const moveProposal: ToolCallProposal = {
      toolId: "deal_move",
      arguments: {
        dealId: deal.id,
        targetStage: "NEGOTIATION",
        reason: "Contract redlines agreed in client procurement call",
      },
      reason: "Move deal to negotiation stage",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: moveProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc97",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.newStage).toBe("NEGOTIATION");

    const updated = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(updated?.stage).toBe("NEGOTIATION");
  });

  it("8. Invalid deal stage transition is rejected with ValidationError", async () => {
    const deal = await prisma.deal.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Early Stage Deal attempting illegal jump",
        dealValue: 30000,
        stage: "QUALIFICATION",
      },
    });

    const illegalProposal: ToolCallProposal = {
      toolId: "deal_move",
      arguments: {
        dealId: deal.id,
        targetStage: "WON", // Illegal direct transition from QUALIFICATION to WON
      },
      reason: "Attempting stage jump",
      riskLevel: "MEDIUM",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: illegalProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc98",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/Invalid pipeline transition/);
  });

  it("9. Pipeline calculation aggregates active pipeline, weighted value, and stage metrics", async () => {
    // Seed deals in various stages
    await prisma.deal.createMany({
      data: [
        {
          workspaceId: testWorkspaceId,
          title: "Deal A",
          dealValue: 100000,
          probability: 50,
          stage: "PROPOSAL",
        },
        {
          workspaceId: testWorkspaceId,
          title: "Deal B",
          dealValue: 200000,
          probability: 80,
          stage: "NEGOTIATION",
        },
        {
          workspaceId: testWorkspaceId,
          title: "Deal C Won",
          dealValue: 50000,
          probability: 100,
          stage: "WON",
        },
      ],
    });

    const summaryProposal: ToolCallProposal = {
      toolId: "pipeline_summary",
      arguments: {},
      reason: "Compute sales pipeline",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: summaryProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc99",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const summary: any = response.result?.result;
    expect(summary.totalActivePipelineValue).toBeGreaterThanOrEqual(300000);
    expect(summary.totalWonValue).toBeGreaterThanOrEqual(50000);
    expect(summary.stageBreakdown.NEGOTIATION.count).toBeGreaterThanOrEqual(1);
  });

  it("10. Stale deal detection finds deals inactive for more than threshold days", async () => {
    const oldDate = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000); // 20 days ago

    const staleDeal = await prisma.deal.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Stale Inactive Proposal Deal",
        dealValue: 40000,
        stage: "PROPOSAL",
        createdAt: oldDate,
        updatedAt: oldDate,
      },
    });

    const staleProposal: ToolCallProposal = {
      toolId: "stale_deals",
      arguments: { daysInactive: 14 },
      reason: "Find stale deals",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: staleProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9a",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(true);
    const result: any = response.result?.result;
    expect(result.count).toBeGreaterThan(0);
    const found = result.deals.some((d: any) => d.id === staleDeal.id);
    expect(found).toBe(true);
  });

  it("11. Cross-workspace CRM access is rejected with NotFoundError", async () => {
    // Deal in victim workspace
    const victimDeal = await prisma.deal.create({
      data: {
        workspaceId: victimWorkspaceId,
        title: "Confidential Competitor Deal",
        dealValue: 500000,
        stage: "NEGOTIATION",
      },
    });

    const getProposal: ToolCallProposal = {
      toolId: "deal_get",
      arguments: { dealId: victimDeal.id },
      reason: "Attempting cross-workspace data access",
      riskLevel: "LOW",
      requiresApproval: false,
    };

    const response = await toolExecutor.executeTool({
      proposal: getProposal,
      context: adminContext, // context.workspaceId = testWorkspaceId
      executionId: "67b844ec10ec6e3973b5cc9b",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.error).toMatch(/not found in workspace/);
  });

  it("12. High-risk deal closing pauses for human operator approval", async () => {
    const deal = await prisma.deal.create({
      data: {
        workspaceId: testWorkspaceId,
        title: "Large Enterprise Closing Deal",
        dealValue: 250000,
        stage: "NEGOTIATION",
      },
    });

    const closeProposal: ToolCallProposal = {
      toolId: "deal_close",
      arguments: {
        dealId: deal.id,
        outcome: "WON",
        notes: "Executive contract signed",
      },
      reason: "Closing multi-year enterprise contract",
      riskLevel: "HIGH",
      requiresApproval: true,
    };

    const response = await toolExecutor.executeTool({
      proposal: closeProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9c",
      agentId: "supervisor",
    });

    expect(response.executed).toBe(false);
    expect(response.approvalRequired).toBe(true);
    expect(response.approvalId).toBeDefined();

    // Approve the request
    const approved = await approvalService.decideApproval({
      approvalId: response.approvalId!,
      workspaceId: testWorkspaceId,
      decidedById: testUserId,
      decision: "APPROVED",
      reason: "Authorized by VP Sales",
    });
    expect(approved.status).toBe("APPROVED");

    // Execute with approved ID
    const executeApproved = await toolExecutor.executeTool({
      proposal: closeProposal,
      context: adminContext,
      executionId: "67b844ec10ec6e3973b5cc9c",
      agentId: "supervisor",
      approvalId: response.approvalId,
    });
    expect(executeApproved.executed).toBe(true);

    // Verify MongoDB state is now WON
    const closedDeal = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(closedDeal?.stage).toBe("WON");
    expect(closedDeal?.closedAt).not.toBeNull();
  });

  it("13. Supervisor Agent coordinates full end-to-end CRM sales reasoning flow", async () => {
    const testMock = new TestMockProvider([
      {
        thought: "User wants to create a new customer and log a sales deal",
        toolCall: {
          toolId: "customer_create",
          arguments: {
            companyName: "Quantum Cloud Dynamics",
            industry: "High Performance Cloud Computing",
          },
          reason: "Create client company",
          riskLevel: "MEDIUM",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Customer created. Now creating enterprise deal.",
        toolCall: {
          toolId: "deal_create",
          arguments: {
            title: "Quantum Cloud Cluster AI Migration",
            dealValue: 180000,
            stage: "PROPOSAL",
            companyName: "Quantum Cloud Dynamics",
          },
          reason: "Create opportunity",
          riskLevel: "MEDIUM",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Opportunity created. Summarizing pipeline impact.",
        toolCall: {
          toolId: "pipeline_summary",
          arguments: {},
          reason: "Get updated pipeline metrics",
          riskLevel: "LOW",
          requiresApproval: false,
        },
        isComplete: false,
      },
      {
        thought: "Workflow executed successfully.",
        isComplete: true,
        finalResponse: "Successfully registered Quantum Cloud Dynamics and created the $180,000 AI Migration deal.",
      },
    ]);

    AIProviderFactory.setCustomProvider(testMock);

    const execResult = await orchestrator.execute({
      prompt: "Create customer Quantum Cloud Dynamics and log a $180k migration deal",
      context: adminContext,
      agentId: "supervisor",
    });

    expect(execResult.status).toBe("COMPLETED");
    expect(execResult.steps.length).toBe(4);
    expect(execResult.finalResponse).toBe("Successfully registered Quantum Cloud Dynamics and created the $180,000 AI Migration deal.");

    // Verify records exist in real MongoDB
    const customerInDb = await prisma.customer.findFirst({
      where: { workspaceId: testWorkspaceId, companyName: "Quantum Cloud Dynamics" },
    });
    expect(customerInDb).not.toBeNull();

    const dealInDb = await prisma.deal.findFirst({
      where: { workspaceId: testWorkspaceId, title: "Quantum Cloud Cluster AI Migration" },
    });
    expect(dealInDb).not.toBeNull();
    expect(dealInDb?.dealValue).toBe(180000);
  });
});
