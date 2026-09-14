import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "./api/client";
import {
  FinanceDashboardStats,
  InvoiceSummary,
  FinanceProfitLossReport,
  CustomerFinanceSummary,
  ProjectFinanceSummary,
} from "@omnidesk/shared-types";

describe("Frontend Phase 6: Enterprise Finance Client & UI Business Logic", () => {
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. DASHBOARD OVERVIEW
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getFinanceDashboard fetches /finance/dashboard with workspace headers and currency", async () => {
    const mockDashboard: FinanceDashboardStats = {
      currency: "USD",
      totalRevenue: 150000,
      paidRevenue: 120000,
      outstandingReceivables: 30000,
      overdueReceivables: 5000,
      totalExpenses: 45000,
      netIncome: 75000,
      invoiceCount: 15,
      paidInvoiceCount: 12,
      overdueInvoiceCount: 1,
      pendingExpenseCount: 2,
      trends: {
        dates: ["2026-08-01", "2026-09-01"],
        revenue: [60000, 90000],
        expenses: [20000, 25000],
        net: [40000, 65000],
      },
      recentPayments: [],
      overdueInvoices: [],
      upcomingDueInvoices: [],
      recentExpenses: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockDashboard }),
    });

    const res = await apiClient.getFinanceDashboard({ currency: "USD" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/dashboard?currency=USD"),
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-workspace-id": expect.any(String),
        }),
      })
    );
    expect(res.totalRevenue).toBe(150000);
    expect(res.paidRevenue).toBe(120000);
    expect(res.netIncome).toBe(75000);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. INVOICES TABLE & QUERYING
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getInvoicesPaginated sends query filters and pagination params", async () => {
    const mockInvoices: InvoiceSummary[] = [
      {
        id: "inv-001",
        workspaceId: "ws-finance-test-123",
        customerId: "cust-1",
        customerName: "Acme Corp",
        invoiceNumber: "INV-2026-0001",
        status: "sent",
        currency: "USD",
        issueDate: "2026-09-01T00:00:00.000Z",
        dueDate: "2026-09-30T00:00:00.000Z",
        subtotal: 5000,
        discountAmount: 0,
        taxRate: 10,
        taxAmount: 500,
        totalAmount: 5500,
        amountPaid: 0,
        amountDue: 5500,
        itemCount: 2,
        isArchived: false,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: mockInvoices,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      }),
    });

    const res = await apiClient.getInvoicesPaginated({
      page: 1,
      limit: 10,
      status: "sent",
      search: "INV-2026",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/invoices?page=1&limit=10&status=sent&search=INV-2026"),
      expect.any(Object)
    );
    expect(res.items.length).toBe(1);
    expect(res.items[0].invoiceNumber).toBe("INV-2026-0001");
    expect(res.items[0].totalAmount).toBe(5500);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. INVOICE CREATION & LIVE LINE CALCULATION LOGIC
  // ───────────────────────────────────────────────────────────────────────────
  it("Validates deterministic line item calculation arithmetic", () => {
    // Replicate live line calculation helper used in InvoiceForm
    const items = [
      { quantity: 5, unitPrice: 100, taxRate: 10, discountAmount: 50 }, // sub: 500, disc: 50, taxable: 450, tax: 45 => total: 495
      { quantity: 2, unitPrice: 200, taxRate: 0, discountAmount: 0 },   // sub: 400, disc: 0, taxable: 400, tax: 0 => total: 400
    ];

    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const q = Math.max(0, Number(item.quantity) || 0);
      const p = Math.max(0, Number(item.unitPrice) || 0);
      const itemSub = Math.round(q * p * 100) / 100;
      const d = Math.min(itemSub, Math.max(0, Number(item.discountAmount) || 0));
      const taxable = Math.max(0, itemSub - d);
      const taxRate = Math.max(0, Math.min(100, Number(item.taxRate) || 0));
      const tax = Math.round(taxable * (taxRate / 100) * 100) / 100;

      subtotal += itemSub;
      totalDiscount += d;
      totalTax += tax;
    });

    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

    expect(subtotal).toBe(900);
    expect(totalDiscount).toBe(50);
    expect(totalTax).toBe(45);
    expect(grandTotal).toBe(895);
  });

  it("apiClient.createInvoice sends structured line items payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          id: "inv-new",
          invoiceNumber: "INV-2026-0002",
          status: "draft",
          totalAmount: 1200,
        },
      }),
    });

    const res = await apiClient.createInvoice({
      customerId: "cust-1",
      currency: "USD",
      dueDate: "2026-10-15",
      notes: "Net 30 terms",
      terms: "Standard enterprise terms",
      items: [
        {
          description: "Technical Consulting",
          quantity: 8,
          unitPrice: 150,
          taxRate: 0,
          discountAmount: 0,
        },
      ],
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/invoices"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Technical Consulting"),
      })
    );
    expect(res.invoiceNumber).toBe("INV-2026-0002");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PAYMENTS WORKFLOW
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.recordPayment posts valid payment data", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          payment: {
            id: "pay-1",
            invoiceId: "inv-new",
            amount: 600,
            currency: "USD",
            paymentMethod: "bank_transfer",
          },
          invoice: {
            id: "inv-new",
            status: "partially_paid",
            amountPaid: 600,
            amountDue: 600,
          },
        },
      }),
    });

    const res = await apiClient.recordPayment({
      invoiceId: "inv-new",
      amount: 600,
      currency: "USD",
      paymentMethod: "bank_transfer",
      reference: "WIRE-9921",
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/payments"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("WIRE-9921"),
      })
    );
    expect(res.payment.amount).toBe(600);
    expect(res.invoice.status).toBe("partially_paid");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. EXPENSE WORKFLOW & APPROVALS
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.createExpense and approve/reject endpoints function correctly", async () => {
    // 1. Create Expense
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        success: true,
        data: {
          id: "exp-1",
          vendor: "GitHub",
          amount: 210,
          approvalStatus: "pending",
        },
      }),
    });

    const created = await apiClient.createExpense({
      vendor: "GitHub",
      description: "Team enterprise plan",
      amount: 210,
      currency: "USD",
      paymentMethod: "credit_card",
    });
    expect(created.approvalStatus).toBe("pending");

    // 2. Approve Expense
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "exp-1",
          approvalStatus: "approved",
          approvedBy: "Manager",
        },
      }),
    });

    const approved = await apiClient.approveExpense("exp-1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/expenses/exp-1/approve"),
      expect.objectContaining({ method: "POST" })
    );
    expect(approved.approvalStatus).toBe("approved");

    // 3. Reject Expense
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: "exp-1",
          approvalStatus: "rejected",
        },
      }),
    });

    const rejected = await apiClient.rejectExpense("exp-1");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/expenses/exp-1/reject"),
      expect.objectContaining({ method: "POST" })
    );
    expect(rejected.approvalStatus).toBe("rejected");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. FINANCIAL REPORTS
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getFinancialReport fetches Profit & Loss report correctly", async () => {
    const mockReport: FinanceProfitLossReport = {
      currency: "USD",
      revenue: 85000,
      expenses: 32000,
      netProfit: 53000,
      profitMarginPercent: 62.35,
      monthlyBreakdown: [
        { month: "2026-08", revenue: 40000, expenses: 15000, net: 25000 },
        { month: "2026-09", revenue: 45000, expenses: 17000, net: 28000 },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockReport }),
    });

    const res = await apiClient.getFinancialReport("profit-loss", { currency: "USD" });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/finance/reports/profit-loss?currency=USD"),
      expect.any(Object)
    );
    expect(res.revenue).toBe(85000);
    expect(res.netProfit).toBe(53000);
    expect(res.profitMarginPercent).toBe(62.35);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. CRM & PROJECT INTEGRATION CLIENT METHODS
  // ───────────────────────────────────────────────────────────────────────────
  it("apiClient.getCustomerFinanceSummary and getProjectFinanceSummary fetch summaries", async () => {
    const mockCustSummary: CustomerFinanceSummary = {
      customerId: "cust-1",
      companyName: "Acme Corp",
      totalInvoiced: 40000,
      totalPaid: 35000,
      outstandingBalance: 5000,
      invoiceCount: 4,
      lastPaymentDate: "2026-09-10T12:00:00.000Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockCustSummary }),
    });

    const custSummary = await apiClient.getCustomerFinanceSummary("cust-1");
    expect(custSummary.totalInvoiced).toBe(40000);
    expect(custSummary.outstandingBalance).toBe(5000);

    const mockProjSummary: ProjectFinanceSummary = {
      projectId: "proj-1",
      projectName: "Core Migration",
      budget: 50000,
      spent: 20000,
      projectRevenue: 60000,
      projectExpenses: 25000,
      projectNet: 35000,
      outstandingInvoices: 10000,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: mockProjSummary }),
    });

    const projSummary = await apiClient.getProjectFinanceSummary("proj-1");
    expect(projSummary.projectRevenue).toBe(60000);
    expect(projSummary.projectNet).toBe(35000);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. ERROR & EMPTY STATES
  // ───────────────────────────────────────────────────────────────────────────
  it("Handles API failure gracefully with clear error message", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: "Access forbidden: Missing required permission 'finance:approve'",
      }),
    });

    await expect(apiClient.approveExpense("exp-99")).rejects.toThrow();
  });
});
