import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../../app";
import { prisma } from "../../lib/prisma";
import { toolExecutor } from "../../ai/tools/tool.executor";
import { AgentExecutionContext, ToolCallProposal } from "@omnidesk/shared-types";
import { financeService } from "../services/finance.service";

describe("Phase 6 Enterprise Finance REST API & Services", () => {
  const app = createApp();

  // Synthetic workspaces for strict test isolation
  const testWorkspaceId = "67b844ec10ec6e3973b5cc88";
  const foreignWorkspaceId = "67b844ec10ec6e3973b5cc99";
  const testUserId = "67b844ec10ec6e3973b5cc77";
  const memberUserId = "67b844ec10ec6e3973b5cc66";

  // Dynamic test IDs for cleanup tracking
  const createdInvoiceIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdExpenseIds: string[] = [];
  const createdCategoryIds: string[] = [];
  let testCustomerId = "";
  let testProjectId = "";

  const adminHeaders = {
    "x-workspace-id": testWorkspaceId,
    "x-user-id": testUserId,
    "x-user-role": "ADMIN",
    "x-user-permissions": "finance:read,finance:write,finance:approve,finance:delete,crm:read,crm:write,project:read,project:write",
  };

  const memberHeaders = {
    "x-workspace-id": testWorkspaceId,
    "x-user-id": memberUserId,
    "x-user-role": "MEMBER",
    "x-user-permissions": "finance:read", // Read-only
  };

  const foreignHeaders = {
    "x-workspace-id": foreignWorkspaceId,
    "x-user-id": testUserId,
    "x-user-role": "ADMIN",
    "x-user-permissions": "finance:read,finance:write,finance:approve,finance:delete",
  };

  beforeAll(async () => {
    // 1. Setup synthetic customer in test workspace
    const customer = await prisma.customer.create({
      data: {
        workspaceId: testWorkspaceId,
        companyName: "Finance Test Corp",
        website: "https://financetest.corp",
        status: "ACTIVE",
      },
    });
    testCustomerId = customer.id;

    // 2. Setup synthetic project in test workspace
    const project = await prisma.project.create({
      data: {
        workspaceId: testWorkspaceId,
        name: "Enterprise Billing Platform",
        key: `PRJ-FIN-${Date.now().toString().slice(-4)}`,
        status: "ACTIVE",
        priority: "HIGH",
        budget: 50000,
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    // Deterministic cleanup of all synthetic finance data
    if (createdPaymentIds.length > 0) {
      await prisma.payment.deleteMany({ where: { id: { in: createdPaymentIds } } });
    }
    if (createdInvoiceIds.length > 0) {
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: { in: createdInvoiceIds } } });
      await prisma.invoice.deleteMany({ where: { id: { in: createdInvoiceIds } } });
    }
    if (createdExpenseIds.length > 0) {
      await prisma.expense.deleteMany({ where: { id: { in: createdExpenseIds } } });
    }
    if (createdCategoryIds.length > 0) {
      await prisma.expenseCategory.deleteMany({ where: { id: { in: createdCategoryIds } } });
    }
    if (testCustomerId) {
      await prisma.customer.delete({ where: { id: testCustomerId } }).catch(() => {});
    }
    if (testProjectId) {
      await prisma.project.delete({ where: { id: testProjectId } }).catch(() => {});
    }
    // Clean synthetic audit events generated during test
    await prisma.auditEvent.deleteMany({
      where: {
        workspaceId: { in: [testWorkspaceId, foreignWorkspaceId] },
      },
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORIES
  // ───────────────────────────────────────────────────────────────────────────
  describe("Expense Categories API", () => {
    it("POST /api/v1/finance/categories creates a new expense category", async () => {
      const res = await request(app)
        .post("/api/v1/finance/categories")
        .set(adminHeaders)
        .send({
          name: "Cloud Hosting & Compute",
          description: "Infrastructure and cloud server costs",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe("Cloud Hosting & Compute");
      expect(res.body.data.workspaceId).toBe(testWorkspaceId);
      createdCategoryIds.push(res.body.data.id);
    });

    it("GET /api/v1/finance/categories lists categories in workspace", async () => {
      const res = await request(app)
        .get("/api/v1/finance/categories")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((c: any) => c.name === "Cloud Hosting & Compute")).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INVOICES & ARITHMETIC
  // ───────────────────────────────────────────────────────────────────────────
  describe("Invoices CRUD & Money Engine", () => {
    let createdInvoiceId = "";
    let generatedInvoiceNumber = "";

    it("POST /api/v1/finance/invoices creates draft invoice with deterministic calculations", async () => {
      const res = await request(app)
        .post("/api/v1/finance/invoices")
        .set(adminHeaders)
        .send({
          customerId: testCustomerId,
          projectId: testProjectId,
          currency: "USD",
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          notes: "Net 15 terms",
          terms: "Standard enterprise terms",
          items: [
            {
              description: "Senior Architect Consulting",
              quantity: 40,
              unitPrice: 150, // 6000
              taxRate: 10,     // 10% tax on 6000 = 600
              discountAmount: 200, // discount 200 => taxable: 5800, tax: 580, total: 6380
            },
            {
              description: "Cloud Architecture Audit",
              quantity: 1,
              unitPrice: 2500, // 2500
              taxRate: 0,
              discountAmount: 0, // total: 2500
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const inv = res.body.data;
      expect(inv.status).toBe("draft");
      expect(inv.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(inv.subtotal).toBe(8500); // 6000 + 2500
      expect(inv.discountAmount).toBe(200);
      expect(inv.taxAmount).toBe(580); // 10% of (6000 - 200)
      expect(inv.totalAmount).toBe(8880); // 8500 - 200 + 580
      expect(inv.amountPaid).toBe(0);
      expect(inv.amountDue).toBe(8880);

      createdInvoiceId = inv.id;
      generatedInvoiceNumber = inv.invoiceNumber;
      createdInvoiceIds.push(inv.id);
    });

    it("GET /api/v1/finance/invoices/:id retrieves full invoice detail", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices/${createdInvoiceId}`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdInvoiceId);
      expect(res.body.data.customer?.companyName).toBe("Finance Test Corp");
      expect(res.body.data.items.length).toBe(2);
    });

    it("PUT /api/v1/finance/invoices/:id/send transitions invoice to 'sent'", async () => {
      const res = await request(app)
        .put(`/api/v1/finance/invoices/${createdInvoiceId}/send`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("sent");
    });

    it("PUT /api/v1/finance/invoices/:id updates draft/sent invoice properties", async () => {
      const res = await request(app)
        .put(`/api/v1/finance/invoices/${createdInvoiceId}`)
        .set(adminHeaders)
        .send({
          notes: "Updated delivery terms and notes",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notes).toBe("Updated delivery terms and notes");
    });

    it("Generates concurrent collision-safe invoice numbers", async () => {
      // Create 3 invoices in quick parallel succession
      const promises = [1, 2, 3].map((i) =>
        request(app)
          .post("/api/v1/finance/invoices")
          .set(adminHeaders)
          .send({
            customerId: testCustomerId,
            currency: "USD",
            items: [{ description: `Concurrent Item ${i}`, quantity: 1, unitPrice: 100 }],
          })
      );

      const results = await Promise.all(promises);
      const invoiceNumbers: string[] = [];

      for (const res of results) {
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        invoiceNumbers.push(res.body.data.invoiceNumber);
        createdInvoiceIds.push(res.body.data.id);
      }

      // Verify all invoice numbers are distinct
      const uniqueSet = new Set(invoiceNumbers);
      expect(uniqueSet.size).toBe(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PAYMENTS & STATUS TRANSITIONS
  // ───────────────────────────────────────────────────────────────────────────
  describe("Payments Workflow & Balance Recalculation", () => {
    let testInvId = "";

    beforeAll(async () => {
      // Create a dedicated invoice for payment lifecycle tests: $1,000 USD
      const res = await request(app)
        .post("/api/v1/finance/invoices")
        .set(adminHeaders)
        .send({
          customerId: testCustomerId,
          projectId: testProjectId,
          currency: "USD",
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          items: [{ description: "Retainer Work", quantity: 10, unitPrice: 100 }],
        });

      testInvId = res.body.data.id;
      createdInvoiceIds.push(testInvId);

      // Send the invoice
      await request(app).put(`/api/v1/finance/invoices/${testInvId}/send`).set(adminHeaders);
    });

    it("POST /api/v1/finance/payments rejects overpayment (amount > amountDue)", async () => {
      const res = await request(app)
        .post("/api/v1/finance/payments")
        .set(adminHeaders)
        .send({
          invoiceId: testInvId,
          amount: 1500, // greater than $1,000
          currency: "USD",
          paymentMethod: "bank_transfer",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toMatch(/exceeds outstanding balance/i);
    });

    it("POST /api/v1/finance/payments rejects mismatched currency", async () => {
      const res = await request(app)
        .post("/api/v1/finance/payments")
        .set(adminHeaders)
        .send({
          invoiceId: testInvId,
          amount: 400,
          currency: "EUR", // invoice is USD
          paymentMethod: "bank_transfer",
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toMatch(/match invoice currency/i);
    });

    it("POST /api/v1/finance/payments applies partial payment and transitions invoice to 'partially_paid'", async () => {
      const res = await request(app)
        .post("/api/v1/finance/payments")
        .set(adminHeaders)
        .send({
          invoiceId: testInvId,
          amount: 400,
          currency: "USD",
          paymentMethod: "credit_card",
          reference: "TX-PARTIAL-001",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(400);
      createdPaymentIds.push(res.body.data.payment.id);

      // Verify invoice state
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices/${testInvId}`)
        .set(adminHeaders);

      expect(invRes.body.data.status).toBe("partially_paid");
      expect(invRes.body.data.amountPaid).toBe(400);
      expect(invRes.body.data.amountDue).toBe(600);
    });

    it("POST /api/v1/finance/payments applies remaining balance and transitions invoice to 'paid'", async () => {
      const res = await request(app)
        .post("/api/v1/finance/payments")
        .set(adminHeaders)
        .send({
          invoiceId: testInvId,
          amount: 600,
          currency: "USD",
          paymentMethod: "bank_transfer",
          reference: "TX-FINAL-002",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(600);
      createdPaymentIds.push(res.body.data.payment.id);

      // Verify invoice state
      const invRes = await request(app)
        .get(`/api/v1/finance/invoices/${testInvId}`)
        .set(adminHeaders);

      expect(invRes.body.data.status).toBe("paid");
      expect(invRes.body.data.amountPaid).toBe(1000);
      expect(invRes.body.data.amountDue).toBe(0);
    });

    it("POST /api/v1/finance/payments rejects payment on cancelled invoice", async () => {
      // Create a draft invoice and cancel it
      const invRes = await request(app)
        .post("/api/v1/finance/invoices")
        .set(adminHeaders)
        .send({
          customerId: testCustomerId,
          currency: "USD",
          dueDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          items: [{ description: "Cancelled service", quantity: 1, unitPrice: 300 }],
        });
      const cancelInvId = invRes.body.data.id;
      createdInvoiceIds.push(cancelInvId);

      // Cancel it
      await request(app).put(`/api/v1/finance/invoices/${cancelInvId}/cancel`).set(adminHeaders);

      // Try paying it
      const payRes = await request(app)
        .post("/api/v1/finance/payments")
        .set(adminHeaders)
        .send({
          invoiceId: cancelInvId,
          amount: 300,
          currency: "USD",
        });

      expect(payRes.status).toBe(422);
      expect(payRes.body.success).toBe(false);
      expect(JSON.stringify(payRes.body)).toMatch(/cancelled invoice/i);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // EXPENSES & APPROVALS
  // ───────────────────────────────────────────────────────────────────────────
  describe("Expenses CRUD & Approval Workflow", () => {
    let testExpenseId = "";

    it("POST /api/v1/finance/expenses creates a pending expense", async () => {
      const res = await request(app)
        .post("/api/v1/finance/expenses")
        .set(adminHeaders)
        .send({
          vendor: "Amazon Web Services",
          description: "Production EKS Cluster Infrastructure",
          amount: 1250.50,
          currency: "USD",
          projectId: testProjectId,
          categoryId: createdCategoryIds[0],
          paymentMethod: "credit_card",
          receiptReference: "REC-AWS-9921",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalStatus).toBe("pending");
      expect(res.body.data.amount).toBe(1250.50);
      expect(res.body.data.vendor).toBe("Amazon Web Services");

      testExpenseId = res.body.data.id;
      createdExpenseIds.push(testExpenseId);
    });

    it("GET /api/v1/finance/expenses lists expenses with filters", async () => {
      const res = await request(app)
        .get("/api/v1/finance/expenses?approvalStatus=pending&vendor=Amazon")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it("PUT /api/v1/finance/expenses/:id/approve approves expense with approver metadata", async () => {
      const res = await request(app)
        .put(`/api/v1/finance/expenses/${testExpenseId}/approve`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalStatus).toBe("approved");
      expect(res.body.data.approvedBy).toBe(testUserId);
      expect(res.body.data.approvedAt).toBeDefined();
    });

    it("PUT /api/v1/finance/expenses/:id/reject rejects expense", async () => {
      // Create a second expense to reject
      const expRes = await request(app)
        .post("/api/v1/finance/expenses")
        .set(adminHeaders)
        .send({
          vendor: "Unapproved Travel",
          description: "Flight ticket",
          amount: 800,
          currency: "USD",
        });
      const rejectExpId = expRes.body.data.id;
      createdExpenseIds.push(rejectExpId);

      const res = await request(app)
        .put(`/api/v1/finance/expenses/${rejectExpId}/reject`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalStatus).toBe("rejected");
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // DASHBOARD & REPORTS
  // ───────────────────────────────────────────────────────────────────────────
  describe("Finance Dashboard & Financial Reports", () => {
    it("GET /api/v1/finance/dashboard returns real metrics without mock data", async () => {
      const res = await request(app)
        .get("/api/v1/finance/dashboard?currency=USD")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const stats = res.body.data;
      expect(stats.currency).toBe("USD");
      expect(stats.totalRevenue).toBeGreaterThan(0);
      expect(stats.paidRevenue).toBeGreaterThan(0);
      expect(stats.totalExpenses).toBeGreaterThan(0);
      expect(stats.recentPayments.length).toBeGreaterThanOrEqual(1);
      expect(stats.recentExpenses.length).toBeGreaterThanOrEqual(1);
    });

    it("GET /api/v1/finance/reports/profit-loss returns real P&L calculation", async () => {
      const res = await request(app)
        .get("/api/v1/finance/reports/profit-loss?currency=USD")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.currency).toBe("USD");
      expect(res.body.data.revenue).toBeDefined();
      expect(res.body.data.expenses).toBeDefined();
      expect(res.body.data.netProfit).toBe(
        Math.round((res.body.data.revenue - res.body.data.expenses) * 100) / 100
      );
    });

    it("GET /api/v1/finance/reports/receivables returns receivables breakdown", async () => {
      const res = await request(app)
        .get("/api/v1/finance/reports/receivables?currency=USD")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalReceivables).toBeGreaterThanOrEqual(0);
    });

    it("GET /api/v1/finance/reports/customer-revenue returns revenue by customer", async () => {
      const res = await request(app)
        .get("/api/v1/finance/reports/customer-revenue?currency=USD")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.customers)).toBe(true);
    });

    it("GET /api/v1/finance/reports/project-profitability returns project metrics", async () => {
      const res = await request(app)
        .get("/api/v1/finance/reports/project-profitability?currency=USD")
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.projects)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CRM & PROJECT INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────
  describe("CRM & Project Finance Summaries", () => {
    it("GET /api/v1/finance/customers/:id/finance-summary returns customer finance metrics", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/customers/${testCustomerId}/finance-summary`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.customerId).toBe(testCustomerId);
      expect(res.body.data.companyName).toBe("Finance Test Corp");
      expect(res.body.data.totalInvoiced).toBeGreaterThan(0);
      expect(res.body.data.totalPaid).toBeGreaterThan(0);
    });

    it("GET /api/v1/finance/projects/:id/finance-summary returns project finance metrics", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/projects/${testProjectId}/finance-summary`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.projectId).toBe(testProjectId);
      expect(res.body.data.projectRevenue).toBeGreaterThan(0);
      expect(res.body.data.projectExpenses).toBeGreaterThan(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // RBAC & MULTI-TENANT ISOLATION
  // ───────────────────────────────────────────────────────────────────────────
  describe("Security: RBAC & Tenant Isolation", () => {
    it("Enforces RBAC: Member without 'finance:write' cannot create invoices", async () => {
      const res = await request(app)
        .post("/api/v1/finance/invoices")
        .set(memberHeaders)
        .send({
          customerId: testCustomerId,
          currency: "USD",
          items: [{ description: "Unauthorized invoice", quantity: 1, unitPrice: 100 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toMatch(/finance:write/i);
    });

    it("Enforces RBAC: Member without 'finance:approve' cannot approve expenses", async () => {
      const res = await request(app)
        .put(`/api/v1/finance/expenses/${createdExpenseIds[0]}/approve`)
        .set(memberHeaders);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toMatch(/finance:approve/i);
    });

    it("Enforces Tenant Isolation: Foreign workspace cannot read invoices of another workspace", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/invoices/${createdInvoiceIds[0]}`)
        .set(foreignHeaders);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("Enforces Tenant Isolation: Foreign workspace cannot read expenses of another workspace", async () => {
      const res = await request(app)
        .get(`/api/v1/finance/expenses/${createdExpenseIds[0]}`)
        .set(foreignHeaders);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("Audit Logging: Verifies audit events are created in MongoDB for financial operations", async () => {
      const auditLogs = await prisma.auditEvent.findMany({
        where: {
          workspaceId: testWorkspaceId,
          action: { in: ["invoice.created", "payment.created", "expense.created"] },
        },
      });

      expect(auditLogs.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // AI TOOLS INTEGRATION
  // ───────────────────────────────────────────────────────────────────────────
  describe("AI Finance Tools Integration", () => {
    const aiContext: AgentExecutionContext = {
      workspaceId: testWorkspaceId,
      userId: testUserId,
      userRole: "ADMIN",
      userPermissions: ["finance:read", "finance:write", "finance:approve"],
      requestId: "req_ai_test_finance_01",
    };

    it("Executes finance_dashboard tool successfully", async () => {
      const proposal: ToolCallProposal = {
        toolId: "finance_dashboard",
        arguments: { currency: "USD" },
        reason: "Checking current quarterly financial KPIs",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const result = await toolExecutor.executeTool({
        proposal,
        context: aiContext,
        executionId: "exec_test_01",
        agentId: "agent_test_01",
      });
      expect(result.executed).toBe(true);
      expect(result.result?.success).toBe(true);
      const out = result.result?.result as any;
      expect(out.currency).toBe("USD");
      expect(out.totalRevenue).toBeDefined();
    });

    it("Executes finance_invoice_list tool successfully", async () => {
      const proposal: ToolCallProposal = {
        toolId: "finance_invoice_list",
        arguments: { limit: 5 },
        reason: "Checking recent invoices",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const result = await toolExecutor.executeTool({
        proposal,
        context: aiContext,
        executionId: "exec_test_02",
        agentId: "agent_test_02",
      });
      expect(result.executed).toBe(true);
      expect(result.result?.success).toBe(true);
      const out = result.result?.result as any;
      expect(Array.isArray(out.invoices)).toBe(true);
    });

    it("Executes finance_report tool successfully", async () => {
      const proposal: ToolCallProposal = {
        toolId: "finance_report",
        arguments: { reportType: "profit_loss", currency: "USD" },
        reason: "Pulling real-time P&L report for executive review",
        riskLevel: "LOW",
        requiresApproval: false,
      };

      const result = await toolExecutor.executeTool({
        proposal,
        context: aiContext,
        executionId: "exec_test_03",
        agentId: "agent_test_03",
      });
      expect(result.executed).toBe(true);
      expect(result.result?.success).toBe(true);
      const out = result.result?.result as any;
      expect(out.currency).toBe("USD");
      expect(out.netProfit).toBeDefined();
    });
  });
});
