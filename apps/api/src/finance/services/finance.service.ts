import {
  InvoiceStatus,
  ExpenseApprovalStatus,
  FinanceDashboardStats,
  CustomerFinanceSummary,
  ProjectFinanceSummary,
  FinanceRevenueReport,
  FinanceExpenseReport,
  FinanceProfitLossReport,
  FinanceReceivablesReport,
  FinanceOverdueReport,
  CustomerRevenueReport,
  ProjectProfitabilityReport,
} from "@omnidesk/shared-types";
import { prisma } from "../../lib/prisma";
import { wsManager } from "../../lib/websocket";
import { NotFoundError, ValidationError, ForbiddenError } from "../../lib/errors";

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateLineItem(item: {
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discountAmount?: number;
}) {
  const qty = Math.max(0, item.quantity);
  const unitPrice = Math.max(0, item.unitPrice);
  const lineSubtotal = roundCurrency(qty * unitPrice);
  const discountAmount = Math.min(lineSubtotal, Math.max(0, item.discountAmount || 0));
  const taxableAmount = Math.max(0, lineSubtotal - discountAmount);
  const taxRate = Math.max(0, Math.min(100, item.taxRate || 0));
  const lineTax = roundCurrency(taxableAmount * (taxRate / 100));
  const lineTotal = roundCurrency(taxableAmount + lineTax);

  return {
    quantity: qty,
    unitPrice,
    taxRate,
    discountAmount,
    lineSubtotal,
    lineTax,
    lineTotal,
  };
}

export class FinanceService {
  // ── Auto-seed default expense categories ──────────────────────────────────
  public async ensureDefaultCategories(workspaceId: string) {
    const count = await prisma.expenseCategory.count({ where: { workspaceId } });
    if (count === 0) {
      const defaults = [
        { name: "General", description: "General operational expenses" },
        { name: "Software", description: "SaaS subscriptions and software licenses" },
        { name: "Office Supplies", description: "Equipment, consumables and office supplies" },
        { name: "Travel", description: "Business travel, flights, lodging and meals" },
        { name: "Marketing", description: "Advertising, campaigns, and events" },
        { name: "Consulting", description: "External professional and consulting services" },
        { name: "Utilities", description: "Hosting, internet and telecom utilities" },
      ];

      for (const cat of defaults) {
        await prisma.expenseCategory.upsert({
          where: {
            workspaceId_name: {
              workspaceId,
              name: cat.name,
            },
          },
          update: {},
          create: {
            workspaceId,
            name: cat.name,
            description: cat.description,
            isActive: true,
          },
        });
      }
    }
  }

  // ── Concurrency-Safe Invoice Number Generation ─────────────────────────────
  public async generateInvoiceNumber(workspaceId: string, customNumber?: string): Promise<string> {
    if (customNumber && customNumber.trim()) {
      const existing = await prisma.invoice.findUnique({
        where: {
          workspaceId_invoiceNumber: {
            workspaceId,
            invoiceNumber: customNumber.trim().toUpperCase(),
          },
        },
      });
      if (existing) {
        throw new ValidationError(`Invoice number '${customNumber.trim()}' already exists in this workspace`);
      }
      return customNumber.trim().toUpperCase();
    }

    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    const latest = await prisma.invoice.findFirst({
      where: {
        workspaceId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: "desc" },
    });

    let nextNum = 1;
    if (latest) {
      const match = latest.invoiceNumber.match(/INV-\d{4}-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    } else {
      const count = await prisma.invoice.count({ where: { workspaceId } });
      nextNum = count + 1;
    }

    return `${prefix}${String(nextNum).padStart(4, "0")}`;
  }

  // ── Invoice CRUD & State Machine ─────────────────────────────────────────
  public async createInvoice(
    workspaceId: string,
    data: {
      customerId: string;
      projectId?: string | null;
      invoiceNumber?: string;
      issueDate?: string | Date;
      dueDate: string | Date;
      currency?: string;
      notes?: string | null;
      terms?: string | null;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discountAmount?: number;
      }>;
      createdBy?: string;
      userId?: string;
    }
  ) {
    // 1. Verify customer belongs to workspace
    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, workspaceId, isArchived: false },
    });
    if (!customer) {
      throw new ValidationError("Customer not found or does not belong to this workspace");
    }

    // 2. Verify project if specified
    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, workspaceId, isArchived: false },
      });
      if (!project) {
        throw new ValidationError("Project not found or does not belong to this workspace");
      }
    }

    // 3. Process line items with safe math
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    const processedItems = data.items.map((item, idx) => {
      const calc = calculateLineItem(item);
      subtotal = roundCurrency(subtotal + calc.lineSubtotal);
      totalDiscount = roundCurrency(totalDiscount + calc.discountAmount);
      totalTax = roundCurrency(totalTax + calc.lineTax);

      return {
        description: item.description.trim(),
        quantity: calc.quantity,
        unitPrice: calc.unitPrice,
        taxRate: calc.taxRate,
        discountAmount: calc.discountAmount,
        lineTotal: calc.lineTotal,
        position: idx,
      };
    });

    const totalAmount = roundCurrency(subtotal - totalDiscount + totalTax);
    const amountPaid = 0;
    const amountDue = totalAmount;
    const currency = (data.currency || "USD").toUpperCase();
    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = new Date(data.dueDate);

    if (isNaN(dueDate.getTime())) {
      throw new ValidationError("Invalid due date");
    }

    // 4. Concurrency-safe creation with retry loop
    let attempts = 0;
    let invoice = null;

    while (attempts < 5) {
      attempts++;
      const invoiceNumber = await this.generateInvoiceNumber(workspaceId, data.invoiceNumber);

      try {
        invoice = await prisma.invoice.create({
          data: {
            workspaceId,
            customerId: customer.id,
            projectId: data.projectId || null,
            invoiceNumber,
            status: "draft",
            currency,
            issueDate,
            dueDate,
            subtotal,
            discountAmount: totalDiscount,
            taxRate: processedItems[0]?.taxRate || 0,
            taxAmount: totalTax,
            totalAmount,
            amountPaid,
            amountDue,
            notes: data.notes?.trim() || null,
            terms: data.terms?.trim() || "Net 30 Days",
            createdBy: data.createdBy || data.userId || null,
            createdById: data.userId || null,
            items: {
              create: processedItems,
            },
          },
          include: {
            items: true,
            customer: true,
            project: true,
          },
        });
        break;
      } catch (err: any) {
        if (err.code === "P2002" || err.message?.includes("duplicate key")) {
          if (data.invoiceNumber) {
            throw new ValidationError(`Invoice number '${data.invoiceNumber}' is already in use`);
          }
          // Retry generating next number
          continue;
        }
        throw err;
      }
    }

    if (!invoice) {
      throw new Error("Failed to generate unique invoice number after multiple attempts");
    }

    // Audit & WebSocket
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: data.userId || null,
        action: "invoice.created",
        entityType: "invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          customerId: customer.id,
          totalAmount,
          currency,
        },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.invoice.created",
      { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber, totalAmount, currency },
      data.userId ? { userId: data.userId } : undefined
    );

    return invoice;
  }

  public async getInvoice(workspaceId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: {
        items: { orderBy: { position: "asc" } },
        payments: { orderBy: { paymentDate: "desc" } },
        customer: true,
        project: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice with ID ${invoiceId} not found in this workspace`);
    }

    // Check if status should be automatically evaluated to overdue
    if (
      invoice.status !== "paid" &&
      invoice.status !== "cancelled" &&
      invoice.status !== "draft" &&
      new Date(invoice.dueDate) < new Date() &&
      invoice.amountDue > 0 &&
      invoice.status !== "overdue"
    ) {
      const updated = await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: "overdue" },
        include: {
          items: { orderBy: { position: "asc" } },
          payments: { orderBy: { paymentDate: "desc" } },
          customer: true,
          project: true,
        },
      });
      return updated;
    }

    return invoice;
  }

  public async listInvoices(
    workspaceId: string,
    query: {
      customerId?: string;
      projectId?: string;
      status?: string;
      currency?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      workspaceId,
      isArchived: false,
    };

    if (query.customerId) where.customerId = query.customerId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.currency) where.currency = query.currency.toUpperCase();

    if (query.status) {
      where.status = query.status.toLowerCase();
    }

    if (query.startDate || query.endDate) {
      where.issueDate = {};
      if (query.startDate) where.issueDate.gte = new Date(query.startDate);
      if (query.endDate) where.issueDate.lte = new Date(query.endDate);
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
        { customer: { companyName: { contains: term, mode: "insensitive" } } },
      ];
    }

    const orderBy: any = {};
    const validSortFields = ["createdAt", "issueDate", "dueDate", "totalAmount", "amountDue", "invoiceNumber"];
    const sortField = validSortFields.includes(query.sortBy || "") ? query.sortBy! : "createdAt";
    orderBy[sortField] = query.sortOrder === "asc" ? "asc" : "desc";

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          customer: { select: { id: true, companyName: true, email: true } },
          project: { select: { id: true, name: true, key: true } },
          _count: { select: { items: true, payments: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    return {
      invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async updateInvoice(
    workspaceId: string,
    invoiceId: string,
    data: {
      customerId?: string;
      projectId?: string | null;
      issueDate?: string | Date;
      dueDate?: string | Date;
      currency?: string;
      notes?: string | null;
      terms?: string | null;
      items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        taxRate?: number;
        discountAmount?: number;
      }>;
      status?: InvoiceStatus;
      userId?: string;
    }
  ) {
    const existing = await this.getInvoice(workspaceId, invoiceId);

    if (existing.status === "cancelled") {
      throw new ValidationError("Cannot update a cancelled invoice");
    }

    if (existing.status === "paid") {
      throw new ValidationError("Cannot update a fully paid invoice");
    }

    const updateData: any = {};

    if (data.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, workspaceId, isArchived: false },
      });
      if (!customer) throw new ValidationError("Customer not found in this workspace");
      updateData.customerId = customer.id;
    }

    if (data.projectId !== undefined) {
      if (data.projectId) {
        const project = await prisma.project.findFirst({
          where: { id: data.projectId, workspaceId, isArchived: false },
        });
        if (!project) throw new ValidationError("Project not found in this workspace");
        updateData.projectId = project.id;
      } else {
        updateData.projectId = null;
      }
    }

    if (data.issueDate) updateData.issueDate = new Date(data.issueDate);
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.currency) updateData.currency = data.currency.toUpperCase();
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.terms !== undefined) updateData.terms = data.terms;

    // Line item updates
    if (data.items && data.items.length > 0) {
      if (existing.status !== "draft") {
        throw new ValidationError("Line items can only be modified while invoice is in 'draft' status");
      }

      let subtotal = 0;
      let totalDiscount = 0;
      let totalTax = 0;

      const processedItems = data.items.map((item, idx) => {
        const calc = calculateLineItem(item);
        subtotal = roundCurrency(subtotal + calc.lineSubtotal);
        totalDiscount = roundCurrency(totalDiscount + calc.discountAmount);
        totalTax = roundCurrency(totalTax + calc.lineTax);

        return {
          description: item.description.trim(),
          quantity: calc.quantity,
          unitPrice: calc.unitPrice,
          taxRate: calc.taxRate,
          discountAmount: calc.discountAmount,
          lineTotal: calc.lineTotal,
          position: idx,
        };
      });

      const totalAmount = roundCurrency(subtotal - totalDiscount + totalTax);
      const amountDue = roundCurrency(Math.max(0, totalAmount - existing.amountPaid));

      // Remove old line items and insert new ones
      await prisma.invoiceLineItem.deleteMany({ where: { invoiceId: existing.id } });

      updateData.subtotal = subtotal;
      updateData.discountAmount = totalDiscount;
      updateData.taxAmount = totalTax;
      updateData.totalAmount = totalAmount;
      updateData.amountDue = amountDue;
      updateData.items = {
        create: processedItems,
      };
    }

    if (data.status) {
      // Validate status transitions
      if (data.status === "cancelled" && existing.amountPaid > 0) {
        throw new ValidationError("Cannot cancel an invoice with recorded payments");
      }
      updateData.status = data.status;
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        items: true,
        payments: true,
        customer: true,
        project: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: data.userId || null,
        action: "invoice.updated",
        entityType: "invoice",
        entityId: updated.id,
        details: { invoiceNumber: updated.invoiceNumber, status: updated.status },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.invoice.updated",
      { invoiceId: updated.id, invoiceNumber: updated.invoiceNumber, status: updated.status },
      data.userId ? { userId: data.userId } : undefined
    );

    return updated;
  }

  public async sendInvoice(workspaceId: string, invoiceId: string, userId?: string) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);

    if (invoice.status === "cancelled") {
      throw new ValidationError("Cannot send a cancelled invoice");
    }

    const nextStatus = invoice.amountPaid > 0 ? "partially_paid" : "sent";

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: nextStatus },
      include: { customer: true, items: true },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: "invoice.sent",
        entityType: "invoice",
        entityId: invoice.id,
        details: { invoiceNumber: invoice.invoiceNumber, customerId: invoice.customerId },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.invoice.status_changed",
      { invoiceId: invoice.id, status: nextStatus, invoiceNumber: invoice.invoiceNumber },
      userId ? { userId } : undefined
    );

    return updated;
  }

  public async cancelInvoice(workspaceId: string, invoiceId: string, userId?: string) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);

    if (invoice.status === "cancelled") {
      return invoice;
    }

    if (invoice.amountPaid > 0) {
      throw new ValidationError("Cannot cancel an invoice that has payments recorded. Reverse payments first.");
    }

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: "cancelled", amountDue: 0 },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: "invoice.cancelled",
        entityType: "invoice",
        entityId: invoice.id,
        details: { invoiceNumber: invoice.invoiceNumber },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.invoice.status_changed",
      { invoiceId: invoice.id, status: "cancelled", invoiceNumber: invoice.invoiceNumber },
      userId ? { userId } : undefined
    );

    return updated;
  }

  public async archiveInvoice(workspaceId: string, invoiceId: string, userId?: string) {
    const invoice = await this.getInvoice(workspaceId, invoiceId);

    const updated = await prisma.invoice.update({
      where: { id: invoiceId },
      data: { isArchived: true },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: "invoice.archived",
        entityType: "invoice",
        entityId: invoice.id,
      },
    });

    return updated;
  }

  // ── Payment Processing ───────────────────────────────────────────────────
  public async createPayment(
    workspaceId: string,
    data: {
      invoiceId: string;
      amount: number;
      currency?: string;
      paymentDate?: string | Date;
      paymentMethod?: string;
      reference?: string | null;
      notes?: string | null;
      userId?: string;
      createdBy?: string;
    }
  ) {
    // 1. Locate and validate invoice
    const invoice = await this.getInvoice(workspaceId, data.invoiceId);

    if (invoice.status === "cancelled") {
      throw new ValidationError("Cannot record payment against a cancelled invoice");
    }

    if (invoice.status === "draft") {
      throw new ValidationError("Cannot record payment against a draft invoice. Send the invoice first.");
    }

    const paymentAmount = roundCurrency(data.amount);
    if (paymentAmount <= 0) {
      throw new ValidationError("Payment amount must be greater than zero");
    }

    // Currency check
    const paymentCurrency = (data.currency || invoice.currency).toUpperCase();
    if (paymentCurrency !== invoice.currency.toUpperCase()) {
      throw new ValidationError(
        `Payment currency (${paymentCurrency}) does not match invoice currency (${invoice.currency})`
      );
    }

    // Prevent overpayment
    if (paymentAmount > roundCurrency(invoice.amountDue + 0.001)) {
      throw new ValidationError(
        `Payment amount (${paymentAmount}) exceeds outstanding balance (${invoice.amountDue})`
      );
    }

    const paymentDate = data.paymentDate ? new Date(data.paymentDate) : new Date();

    // 2. Persist payment
    const payment = await prisma.payment.create({
      data: {
        workspaceId,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount: paymentAmount,
        currency: paymentCurrency,
        paymentDate,
        paymentMethod: data.paymentMethod || "bank_transfer",
        reference: data.reference?.trim() || null,
        notes: data.notes?.trim() || null,
        createdBy: data.createdBy || data.userId || null,
        createdById: data.userId || null,
      },
    });

    // 3. Recalculate invoice totals
    const newAmountPaid = roundCurrency(invoice.amountPaid + paymentAmount);
    const newAmountDue = roundCurrency(Math.max(0, invoice.totalAmount - newAmountPaid));
    const newStatus: InvoiceStatus = newAmountDue <= 0 ? "paid" : "partially_paid";

    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
      },
    });

    // 4. Audit & WebSocket
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: data.userId || null,
        action: "payment.created",
        entityType: "payment",
        entityId: payment.id,
        details: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          amount: paymentAmount,
          currency: paymentCurrency,
          newAmountDue,
          newStatus,
        },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.payment.created",
      {
        paymentId: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: paymentAmount,
        currency: paymentCurrency,
        invoiceStatus: newStatus,
      },
      data.userId ? { userId: data.userId } : undefined
    );

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.invoice.updated",
      {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus,
      }
    );

    return {
      payment,
      invoice: updatedInvoice,
    };
  }

  public async listPayments(
    workspaceId: string,
    query: {
      invoiceId?: string;
      customerId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.customerId) where.customerId = query.customerId;

    if (query.startDate || query.endDate) {
      where.paymentDate = {};
      if (query.startDate) where.paymentDate.gte = new Date(query.startDate);
      if (query.endDate) where.paymentDate.lte = new Date(query.endDate);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          invoice: { select: { id: true, invoiceNumber: true, totalAmount: true } },
          customer: { select: { id: true, companyName: true } },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async getPayment(workspaceId: string, paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, workspaceId },
      include: {
        invoice: true,
        customer: true,
      },
    });
    if (!payment) {
      throw new NotFoundError(`Payment with ID ${paymentId} not found`);
    }
    return payment;
  }

  // ── Expense Categories ───────────────────────────────────────────────────
  public async createCategory(
    workspaceId: string,
    data: { name: string; description?: string | null; isActive?: boolean }
  ) {
    const name = data.name.trim();
    const existing = await prisma.expenseCategory.findUnique({
      where: {
        workspaceId_name: { workspaceId, name },
      },
    });

    if (existing) {
      throw new ValidationError(`Expense category '${name}' already exists in this workspace`);
    }

    return prisma.expenseCategory.create({
      data: {
        workspaceId,
        name,
        description: data.description?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  public async listCategories(workspaceId: string) {
    await this.ensureDefaultCategories(workspaceId);
    return prisma.expenseCategory.findMany({
      where: { workspaceId },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { expenses: true } },
      },
    });
  }

  public async updateCategory(
    workspaceId: string,
    categoryId: string,
    data: { name?: string; description?: string | null; isActive?: boolean }
  ) {
    const cat = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, workspaceId },
    });
    if (!cat) throw new NotFoundError("Expense category not found");

    return prisma.expenseCategory.update({
      where: { id: categoryId },
      data: {
        name: data.name ? data.name.trim() : undefined,
        description: data.description !== undefined ? data.description : undefined,
        isActive: data.isActive !== undefined ? data.isActive : undefined,
      },
    });
  }

  public async deleteCategory(workspaceId: string, categoryId: string) {
    const cat = await prisma.expenseCategory.findFirst({
      where: { id: categoryId, workspaceId },
      include: { _count: { select: { expenses: true } } },
    });
    if (!cat) throw new NotFoundError("Expense category not found");

    if (cat._count.expenses > 0) {
      // Soft-deactivate if expenses exist
      return prisma.expenseCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
    }

    return prisma.expenseCategory.delete({ where: { id: categoryId } });
  }

  // ── Expenses ─────────────────────────────────────────────────────────────
  public async createExpense(
    workspaceId: string,
    data: {
      vendor: string;
      description: string;
      amount: number;
      currency?: string;
      expenseDate?: string | Date;
      categoryId?: string | null;
      categoryName?: string | null;
      projectId?: string | null;
      paymentMethod?: string;
      receiptReference?: string | null;
      notes?: string | null;
      userId?: string;
      createdBy?: string;
    }
  ) {
    const amount = roundCurrency(data.amount);
    if (amount <= 0) {
      throw new ValidationError("Expense amount must be greater than zero");
    }

    if (data.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: data.projectId, workspaceId, isArchived: false },
      });
      if (!project) throw new ValidationError("Project not found in this workspace");
    }

    let resolvedCategoryName = data.categoryName || "General";
    if (data.categoryId) {
      const category = await prisma.expenseCategory.findFirst({
        where: { id: data.categoryId, workspaceId },
      });
      if (category) {
        resolvedCategoryName = category.name;
      }
    }

    const expense = await prisma.expense.create({
      data: {
        workspaceId,
        projectId: data.projectId || null,
        categoryId: data.categoryId || null,
        categoryName: resolvedCategoryName,
        vendor: data.vendor.trim(),
        description: data.description.trim(),
        amount,
        currency: (data.currency || "USD").toUpperCase(),
        expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date(),
        paymentMethod: data.paymentMethod || "credit_card",
        approvalStatus: "pending",
        receiptReference: data.receiptReference?.trim() || null,
        notes: data.notes?.trim() || null,
        createdBy: data.createdBy || data.userId || null,
        createdById: data.userId || null,
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
        category: true,
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: data.userId || null,
        action: "expense.created",
        entityType: "expense",
        entityId: expense.id,
        details: { vendor: expense.vendor, amount: expense.amount, currency: expense.currency },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.expense.created",
      { expenseId: expense.id, vendor: expense.vendor, amount: expense.amount },
      data.userId ? { userId: data.userId } : undefined
    );

    return expense;
  }

  public async getExpense(workspaceId: string, expenseId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, workspaceId },
      include: {
        project: true,
        category: true,
      },
    });
    if (!expense) throw new NotFoundError(`Expense with ID ${expenseId} not found`);
    return expense;
  }

  public async listExpenses(
    workspaceId: string,
    query: {
      categoryId?: string;
      projectId?: string;
      vendor?: string;
      approvalStatus?: ExpenseApprovalStatus;
      currency?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    }
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = { workspaceId, isArchived: false };

    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.approvalStatus) where.approvalStatus = query.approvalStatus;
    if (query.currency) where.currency = query.currency.toUpperCase();

    if (query.vendor) {
      where.vendor = { contains: query.vendor.trim(), mode: "insensitive" };
    }

    if (query.startDate || query.endDate) {
      where.expenseDate = {};
      if (query.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query.endDate) where.expenseDate.lte = new Date(query.endDate);
    }

    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { vendor: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { notes: { contains: term, mode: "insensitive" } },
      ];
    }

    const orderBy: any = {};
    const validSortFields = ["createdAt", "expenseDate", "amount", "vendor"];
    const sortField = validSortFields.includes(query.sortBy || "") ? query.sortBy! : "expenseDate";
    orderBy[sortField] = query.sortOrder === "asc" ? "asc" : "desc";

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          project: { select: { id: true, name: true, key: true } },
          category: { select: { id: true, name: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  public async updateExpense(
    workspaceId: string,
    expenseId: string,
    data: {
      vendor?: string;
      description?: string;
      amount?: number;
      currency?: string;
      expenseDate?: string | Date;
      categoryId?: string | null;
      categoryName?: string | null;
      projectId?: string | null;
      paymentMethod?: string;
      receiptReference?: string | null;
      notes?: string | null;
      userId?: string;
    }
  ) {
    const expense = await this.getExpense(workspaceId, expenseId);

    if (expense.approvalStatus === "approved") {
      throw new ValidationError("Cannot modify an already approved expense");
    }

    const updateData: any = {};
    if (data.vendor) updateData.vendor = data.vendor.trim();
    if (data.description) updateData.description = data.description.trim();
    if (data.amount !== undefined) {
      const amt = roundCurrency(data.amount);
      if (amt <= 0) throw new ValidationError("Amount must be positive");
      updateData.amount = amt;
    }
    if (data.currency) updateData.currency = data.currency.toUpperCase();
    if (data.expenseDate) updateData.expenseDate = new Date(data.expenseDate);
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.categoryName !== undefined) updateData.categoryName = data.categoryName;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
    if (data.receiptReference !== undefined) updateData.receiptReference = data.receiptReference;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: { project: true, category: true },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: data.userId || null,
        action: "expense.updated",
        entityType: "expense",
        entityId: expense.id,
      },
    });

    return updated;
  }

  public async approveExpense(workspaceId: string, expenseId: string, approverId?: string) {
    const expense = await this.getExpense(workspaceId, expenseId);

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        approvalStatus: "approved",
        approvedBy: approverId || "Manager",
        approvedById: approverId || null,
        approvedAt: new Date(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: approverId || null,
        action: "expense.approved",
        entityType: "expense",
        entityId: expense.id,
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.expense.approval_changed",
      { expenseId: expense.id, status: "approved" },
      approverId ? { userId: approverId } : undefined
    );

    return updated;
  }

  public async rejectExpense(workspaceId: string, expenseId: string, approverId?: string) {
    const expense = await this.getExpense(workspaceId, expenseId);

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        approvalStatus: "rejected",
        approvedBy: approverId || "Manager",
        approvedById: approverId || null,
        approvedAt: new Date(),
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: approverId || null,
        action: "expense.rejected",
        entityType: "expense",
        entityId: expense.id,
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      "finance.expense.approval_changed",
      { expenseId: expense.id, status: "rejected" },
      approverId ? { userId: approverId } : undefined
    );

    return updated;
  }

  public async archiveExpense(workspaceId: string, expenseId: string, userId?: string) {
    const expense = await this.getExpense(workspaceId, expenseId);
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: { isArchived: true },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: "expense.archived",
        entityType: "expense",
        entityId: expense.id,
      },
    });

    return updated;
  }

  // ── CRM Integration ───────────────────────────────────────────────────────
  public async getCustomerFinanceSummary(
    workspaceId: string,
    customerId: string
  ): Promise<CustomerFinanceSummary> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, workspaceId },
      include: {
        invoices: {
          where: { isArchived: false, status: { not: "cancelled" } },
          select: { totalAmount: true, amountPaid: true, amountDue: true, status: true },
        },
        payments: {
          take: 1,
          orderBy: { paymentDate: "desc" },
          select: { paymentDate: true },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer with ID ${customerId} not found in this workspace`);
    }

    let totalInvoiced = 0;
    let totalPaid = 0;
    let outstandingBalance = 0;

    for (const inv of customer.invoices) {
      totalInvoiced = roundCurrency(totalInvoiced + inv.totalAmount);
      totalPaid = roundCurrency(totalPaid + inv.amountPaid);
      outstandingBalance = roundCurrency(outstandingBalance + inv.amountDue);
    }

    return {
      customerId: customer.id,
      companyName: customer.companyName,
      totalInvoiced,
      totalPaid,
      outstandingBalance,
      invoiceCount: customer.invoices.length,
      lastPaymentDate: customer.payments[0]?.paymentDate.toISOString() || null,
    };
  }

  // ── Project Integration ───────────────────────────────────────────────────
  public async getProjectFinanceSummary(
    workspaceId: string,
    projectId: string
  ): Promise<ProjectFinanceSummary> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      include: {
        invoices: {
          where: { isArchived: false, status: { not: "cancelled" } },
          select: { totalAmount: true, amountPaid: true, amountDue: true },
        },
        expenses: {
          where: { isArchived: false, approvalStatus: "approved" },
          select: { amount: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundError(`Project with ID ${projectId} not found in this workspace`);
    }

    let projectRevenue = 0;
    let outstandingInvoices = 0;
    for (const inv of project.invoices) {
      projectRevenue = roundCurrency(projectRevenue + inv.amountPaid);
      outstandingInvoices = roundCurrency(outstandingInvoices + inv.amountDue);
    }

    let projectExpenses = 0;
    for (const exp of project.expenses) {
      projectExpenses = roundCurrency(projectExpenses + exp.amount);
    }

    const projectNet = roundCurrency(projectRevenue - projectExpenses);

    return {
      projectId: project.id,
      projectName: project.name,
      projectKey: project.key,
      budget: project.budget,
      spent: project.spent,
      projectRevenue,
      projectExpenses,
      projectNet,
      outstandingInvoices,
    };
  }

  // ── Dashboard Analytics ───────────────────────────────────────────────────
  public async getDashboardStats(
    workspaceId: string,
    query?: { startDate?: string; endDate?: string; currency?: string }
  ): Promise<FinanceDashboardStats> {
    const targetCurrency = (query?.currency || "USD").toUpperCase();

    const invoiceWhere: any = {
      workspaceId,
      isArchived: false,
      status: { not: "cancelled" },
    };

    const expenseWhere: any = {
      workspaceId,
      isArchived: false,
    };

    if (query?.startDate || query?.endDate) {
      invoiceWhere.issueDate = {};
      expenseWhere.expenseDate = {};
      if (query?.startDate) {
        invoiceWhere.issueDate.gte = new Date(query.startDate);
        expenseWhere.expenseDate.gte = new Date(query.startDate);
      }
      if (query?.endDate) {
        invoiceWhere.issueDate.lte = new Date(query.endDate);
        expenseWhere.expenseDate.lte = new Date(query.endDate);
      }
    }

    // Pull currency breakdown
    const allInvoices = await prisma.invoice.findMany({
      where: invoiceWhere,
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        status: true,
        dueDate: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        createdAt: true,
      },
    });

    const allExpenses = await prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        currency: true,
        amount: true,
        approvalStatus: true,
        createdAt: true,
      },
    });

    // Currencies detected
    const currencySet = new Set<string>();
    allInvoices.forEach((i) => currencySet.add(i.currency.toUpperCase()));
    allExpenses.forEach((e) => currencySet.add(e.currency.toUpperCase()));
    if (currencySet.size === 0) currencySet.add(targetCurrency);

    // Build currency breakdown table
    const currencyBreakdown = Array.from(currencySet).map((curr) => {
      const invs = allInvoices.filter((i) => i.currency.toUpperCase() === curr);
      const exps = allExpenses.filter((e) => e.currency.toUpperCase() === curr && e.approvalStatus === "approved");

      let totalRevenue = 0;
      let paidRevenue = 0;
      let outstanding = 0;
      invs.forEach((i) => {
        totalRevenue = roundCurrency(totalRevenue + i.totalAmount);
        paidRevenue = roundCurrency(paidRevenue + i.amountPaid);
        outstanding = roundCurrency(outstanding + i.amountDue);
      });

      let expenses = 0;
      exps.forEach((e) => {
        expenses = roundCurrency(expenses + e.amount);
      });

      return {
        currency: curr,
        totalRevenue,
        paidRevenue,
        outstanding,
        expenses,
        netIncome: roundCurrency(paidRevenue - expenses),
      };
    });

    // Primary target stats (scoped to targetCurrency)
    const targetInvoices = allInvoices.filter((i) => i.currency.toUpperCase() === targetCurrency);
    const targetExpenses = allExpenses.filter((e) => e.currency.toUpperCase() === targetCurrency);

    let totalRevenue = 0;
    let paidRevenue = 0;
    let outstandingReceivables = 0;
    let overdueReceivables = 0;
    let paidInvoiceCount = 0;
    let overdueInvoiceCount = 0;

    const now = new Date();

    for (const inv of targetInvoices) {
      totalRevenue = roundCurrency(totalRevenue + inv.totalAmount);
      paidRevenue = roundCurrency(paidRevenue + inv.amountPaid);
      outstandingReceivables = roundCurrency(outstandingReceivables + inv.amountDue);

      if (inv.status === "paid" || inv.amountDue <= 0) {
        paidInvoiceCount++;
      }

      if ((inv.status === "overdue" || new Date(inv.dueDate) < now) && inv.amountDue > 0) {
        overdueReceivables = roundCurrency(overdueReceivables + inv.amountDue);
        overdueInvoiceCount++;
      }
    }

    let totalExpenses = 0;
    let pendingExpenseCount = 0;

    for (const exp of targetExpenses) {
      if (exp.approvalStatus === "approved") {
        totalExpenses = roundCurrency(totalExpenses + exp.amount);
      } else if (exp.approvalStatus === "pending") {
        pendingExpenseCount++;
      }
    }

    const netIncome = roundCurrency(paidRevenue - totalExpenses);

    // Recent items
    const [recentPaymentsRaw, overdueInvoicesRaw, upcomingDueInvoicesRaw, recentExpensesRaw] =
      await Promise.all([
        prisma.payment.findMany({
          where: { workspaceId, currency: targetCurrency },
          take: 5,
          orderBy: { paymentDate: "desc" },
          include: {
            invoice: { select: { invoiceNumber: true } },
            customer: { select: { companyName: true } },
          },
        }),
        prisma.invoice.findMany({
          where: {
            workspaceId,
            currency: targetCurrency,
            isArchived: false,
            amountDue: { gt: 0 },
            dueDate: { lt: now },
            status: { not: "cancelled" },
          },
          take: 5,
          orderBy: { dueDate: "asc" },
          include: { customer: { select: { companyName: true } } },
        }),
        prisma.invoice.findMany({
          where: {
            workspaceId,
            currency: targetCurrency,
            isArchived: false,
            amountDue: { gt: 0 },
            dueDate: { gte: now },
            status: { not: "cancelled" },
          },
          take: 5,
          orderBy: { dueDate: "asc" },
          include: { customer: { select: { companyName: true } } },
        }),
        prisma.expense.findMany({
          where: { workspaceId, currency: targetCurrency, isArchived: false },
          take: 5,
          orderBy: { expenseDate: "desc" },
          include: { category: { select: { name: true } }, project: { select: { name: true } } },
        }),
      ]);

    // Trends: 6 monthly buckets
    const dates: string[] = [];
    const revenue: number[] = [];
    const expenses: number[] = [];
    const net: number[] = [];

    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      const monthStr = d.toISOString().substring(0, 7); // "YYYY-MM"
      dates.push(monthStr);

      const mInvs = targetInvoices.filter((i) => i.createdAt.toISOString().startsWith(monthStr));
      const mPaid = mInvs.reduce((sum, i) => sum + i.amountPaid, 0);

      const mExps = targetExpenses.filter(
        (e) => e.approvalStatus === "approved" && e.createdAt.toISOString().startsWith(monthStr)
      );
      const mExpTotal = mExps.reduce((sum, e) => sum + e.amount, 0);

      const r = roundCurrency(mPaid);
      const exp = roundCurrency(mExpTotal);
      revenue.push(r);
      expenses.push(exp);
      net.push(roundCurrency(r - exp));
    }

    return {
      currency: targetCurrency,
      totalRevenue,
      paidRevenue,
      outstandingReceivables,
      overdueReceivables,
      totalExpenses,
      netIncome,
      invoiceCount: targetInvoices.length,
      paidInvoiceCount,
      overdueInvoiceCount,
      pendingExpenseCount,
      trends: { dates, revenue, expenses, net },
      recentPayments: recentPaymentsRaw.map((p) => ({
        id: p.id,
        workspaceId: p.workspaceId,
        invoiceId: p.invoiceId,
        invoiceNumber: p.invoice?.invoiceNumber,
        customerId: p.customerId,
        customerName: p.customer?.companyName,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate.toISOString(),
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      overdueInvoices: overdueInvoicesRaw.map((i) => ({
        id: i.id,
        workspaceId: i.workspaceId,
        customerId: i.customerId,
        customerName: i.customer?.companyName,
        invoiceNumber: i.invoiceNumber,
        status: i.status as InvoiceStatus,
        currency: i.currency,
        issueDate: i.issueDate.toISOString(),
        dueDate: i.dueDate.toISOString(),
        subtotal: i.subtotal,
        discountAmount: i.discountAmount,
        taxRate: i.taxRate,
        taxAmount: i.taxAmount,
        totalAmount: i.totalAmount,
        amountPaid: i.amountPaid,
        amountDue: i.amountDue,
        isArchived: i.isArchived,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      upcomingDueInvoices: upcomingDueInvoicesRaw.map((i) => ({
        id: i.id,
        workspaceId: i.workspaceId,
        customerId: i.customerId,
        customerName: i.customer?.companyName,
        invoiceNumber: i.invoiceNumber,
        status: i.status as InvoiceStatus,
        currency: i.currency,
        issueDate: i.issueDate.toISOString(),
        dueDate: i.dueDate.toISOString(),
        subtotal: i.subtotal,
        discountAmount: i.discountAmount,
        taxRate: i.taxRate,
        taxAmount: i.taxAmount,
        totalAmount: i.totalAmount,
        amountPaid: i.amountPaid,
        amountDue: i.amountDue,
        isArchived: i.isArchived,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      })),
      recentExpenses: recentExpensesRaw.map((e) => ({
        id: e.id,
        workspaceId: e.workspaceId,
        projectId: e.projectId,
        projectName: e.project?.name,
        categoryId: e.categoryId,
        categoryName: e.category?.name || e.categoryName,
        vendor: e.vendor,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        expenseDate: e.expenseDate.toISOString(),
        paymentMethod: e.paymentMethod,
        approvalStatus: e.approvalStatus as ExpenseApprovalStatus,
        receiptReference: e.receiptReference,
        notes: e.notes,
        isArchived: e.isArchived,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      })),
      currencyBreakdown,
    };
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  public async getRevenueReport(
    workspaceId: string,
    query?: { startDate?: string; endDate?: string; currency?: string }
  ): Promise<FinanceRevenueReport> {
    const currency = (query?.currency || "USD").toUpperCase();
    const where: any = {
      workspaceId,
      currency,
      isArchived: false,
      status: { not: "cancelled" },
    };

    if (query?.startDate || query?.endDate) {
      where.issueDate = {};
      if (query?.startDate) where.issueDate.gte = new Date(query.startDate);
      if (query?.endDate) where.issueDate.lte = new Date(query.endDate);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      select: {
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        issueDate: true,
      },
      orderBy: { issueDate: "asc" },
    });

    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;

    const periodMap = new Map<string, { invoiced: number; paid: number; count: number }>();

    for (const inv of invoices) {
      totalInvoiced = roundCurrency(totalInvoiced + inv.totalAmount);
      totalPaid = roundCurrency(totalPaid + inv.amountPaid);
      totalOutstanding = roundCurrency(totalOutstanding + inv.amountDue);

      const period = inv.issueDate.toISOString().substring(0, 7); // YYYY-MM
      const current = periodMap.get(period) || { invoiced: 0, paid: 0, count: 0 };
      current.invoiced = roundCurrency(current.invoiced + inv.totalAmount);
      current.paid = roundCurrency(current.paid + inv.amountPaid);
      current.count += 1;
      periodMap.set(period, current);
    }

    const periodBreakdown = Array.from(periodMap.entries()).map(([period, data]) => ({
      period,
      invoiced: data.invoiced,
      paid: data.paid,
      invoiceCount: data.count,
    }));

    return {
      currency,
      totalInvoiced,
      totalPaid,
      totalOutstanding,
      periodBreakdown,
    };
  }

  public async getExpenseReport(
    workspaceId: string,
    query?: { startDate?: string; endDate?: string; currency?: string }
  ): Promise<FinanceExpenseReport> {
    const currency = (query?.currency || "USD").toUpperCase();
    const where: any = {
      workspaceId,
      currency,
      isArchived: false,
    };

    if (query?.startDate || query?.endDate) {
      where.expenseDate = {};
      if (query?.startDate) where.expenseDate.gte = new Date(query.startDate);
      if (query?.endDate) where.expenseDate.lte = new Date(query.endDate);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { category: true },
    });

    let totalExpenses = 0;
    let approvedExpenses = 0;
    let pendingExpenses = 0;

    const catMap = new Map<string, { amount: number; count: number }>();
    const vendorMap = new Map<string, { amount: number; count: number }>();

    for (const exp of expenses) {
      totalExpenses = roundCurrency(totalExpenses + exp.amount);
      if (exp.approvalStatus === "approved") {
        approvedExpenses = roundCurrency(approvedExpenses + exp.amount);
      } else if (exp.approvalStatus === "pending") {
        pendingExpenses = roundCurrency(pendingExpenses + exp.amount);
      }

      // Group by category (approved only for metrics)
      if (exp.approvalStatus === "approved") {
        const catName = exp.category?.name || exp.categoryName || "General";
        const cData = catMap.get(catName) || { amount: 0, count: 0 };
        cData.amount = roundCurrency(cData.amount + exp.amount);
        cData.count += 1;
        catMap.set(catName, cData);

        const vName = exp.vendor || "Unknown";
        const vData = vendorMap.get(vName) || { amount: 0, count: 0 };
        vData.amount = roundCurrency(vData.amount + exp.amount);
        vData.count += 1;
        vendorMap.set(vName, vData);
      }
    }

    const byCategory = Array.from(catMap.entries()).map(([cat, val]) => ({
      category: cat,
      amount: val.amount,
      percentage: approvedExpenses > 0 ? Math.round((val.amount / approvedExpenses) * 100) : 0,
      count: val.count,
    }));

    const byVendor = Array.from(vendorMap.entries()).map(([vendor, val]) => ({
      vendor,
      amount: val.amount,
      count: val.count,
    }));

    return {
      currency,
      totalExpenses,
      approvedExpenses,
      pendingExpenses,
      byCategory,
      byVendor,
    };
  }

  public async getProfitLossReport(
    workspaceId: string,
    query?: { startDate?: string; endDate?: string; currency?: string }
  ): Promise<FinanceProfitLossReport> {
    const currency = (query?.currency || "USD").toUpperCase();

    const [revenueReport, expenseReport] = await Promise.all([
      this.getRevenueReport(workspaceId, query),
      this.getExpenseReport(workspaceId, query),
    ]);

    const revenue = revenueReport.totalPaid;
    const expenses = expenseReport.approvedExpenses;
    const netProfit = roundCurrency(revenue - expenses);
    const profitMarginPercent = revenue > 0 ? Math.round((netProfit / revenue) * 100) : 0;

    // Build monthly breakdown
    const months = new Set<string>();
    revenueReport.periodBreakdown.forEach((p) => months.add(p.period));

    const monthlyBreakdown = Array.from(months)
      .sort()
      .map((month) => {
        const rItem = revenueReport.periodBreakdown.find((p) => p.period === month);
        const rev = rItem?.paid || 0;
        // Approximate monthly expenses
        const exp = Math.round((expenses / (months.size || 1)) * 100) / 100;
        return {
          month,
          revenue: rev,
          expenses: exp,
          net: roundCurrency(rev - exp),
        };
      });

    return {
      currency,
      revenue,
      expenses,
      netProfit,
      profitMarginPercent,
      monthlyBreakdown,
    };
  }

  public async getReceivablesReport(
    workspaceId: string,
    query?: { currency?: string }
  ): Promise<FinanceReceivablesReport> {
    const currency = (query?.currency || "USD").toUpperCase();
    const invoices = await prisma.invoice.findMany({
      where: {
        workspaceId,
        currency,
        isArchived: false,
        amountDue: { gt: 0 },
        status: { not: "cancelled" },
      },
      include: { customer: { select: { companyName: true } } },
      orderBy: { dueDate: "asc" },
    });

    const now = new Date();
    let totalReceivables = 0;
    let current0To30Days = 0;
    let overdue31To60Days = 0;
    let overdue61To90Days = 0;
    let overdue90PlusDays = 0;

    const mappedInvoices = invoices.map((inv) => {
      totalReceivables = roundCurrency(totalReceivables + inv.amountDue);
      const diffTime = now.getTime() - new Date(inv.dueDate).getTime();
      const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      if (daysOverdue <= 30) {
        current0To30Days = roundCurrency(current0To30Days + inv.amountDue);
      } else if (daysOverdue <= 60) {
        overdue31To60Days = roundCurrency(overdue31To60Days + inv.amountDue);
      } else if (daysOverdue <= 90) {
        overdue61To90Days = roundCurrency(overdue61To90Days + inv.amountDue);
      } else {
        overdue90PlusDays = roundCurrency(overdue90PlusDays + inv.amountDue);
      }

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customer?.companyName || "Unknown Customer",
        dueDate: inv.dueDate.toISOString(),
        daysOverdue,
        totalAmount: inv.totalAmount,
        amountDue: inv.amountDue,
        status: inv.status,
      };
    });

    return {
      currency,
      totalReceivables,
      current0To30Days,
      overdue31To60Days,
      overdue61To90Days,
      overdue90PlusDays,
      invoices: mappedInvoices,
    };
  }

  public async getOverdueReport(
    workspaceId: string,
    query?: { currency?: string }
  ): Promise<FinanceOverdueReport> {
    const currency = (query?.currency || "USD").toUpperCase();
    const now = new Date();

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        workspaceId,
        currency,
        isArchived: false,
        amountDue: { gt: 0 },
        dueDate: { lt: now },
        status: { not: "cancelled" },
      },
      include: { customer: { select: { companyName: true } } },
      orderBy: { dueDate: "asc" },
    });

    let totalOverdueAmount = 0;
    const invoices = overdueInvoices.map((inv) => {
      totalOverdueAmount = roundCurrency(totalOverdueAmount + inv.amountDue);
      const diffTime = now.getTime() - new Date(inv.dueDate).getTime();
      const daysOverdue = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.companyName || "Unknown Customer",
        dueDate: inv.dueDate.toISOString(),
        daysOverdue,
        amountDue: inv.amountDue,
      };
    });

    return {
      currency,
      totalOverdueAmount,
      overdueInvoiceCount: invoices.length,
      invoices,
    };
  }

  public async getCustomerRevenueReport(
    workspaceId: string,
    query?: { currency?: string }
  ): Promise<CustomerRevenueReport> {
    const currency = (query?.currency || "USD").toUpperCase();
    const customers = await prisma.customer.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        invoices: {
          where: { currency, isArchived: false, status: { not: "cancelled" } },
          select: { totalAmount: true, amountPaid: true, amountDue: true },
        },
      },
    });

    const list = customers
      .map((cust) => {
        let totalRevenue = 0;
        let outstandingBalance = 0;
        for (const inv of cust.invoices) {
          totalRevenue = roundCurrency(totalRevenue + inv.amountPaid);
          outstandingBalance = roundCurrency(outstandingBalance + inv.amountDue);
        }
        return {
          customerId: cust.id,
          customerName: cust.companyName,
          totalRevenue,
          invoiceCount: cust.invoices.length,
          outstandingBalance,
        };
      })
      .filter((c) => c.invoiceCount > 0 || c.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      currency,
      customers: list,
    };
  }

  public async getProjectProfitabilityReport(
    workspaceId: string,
    query?: { currency?: string }
  ): Promise<ProjectProfitabilityReport> {
    const currency = (query?.currency || "USD").toUpperCase();
    const projects = await prisma.project.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        invoices: {
          where: { currency, isArchived: false, status: { not: "cancelled" } },
          select: { amountPaid: true },
        },
        expenses: {
          where: { currency, isArchived: false, approvalStatus: "approved" },
          select: { amount: true },
        },
      },
    });

    const list = projects
      .map((p) => {
        let revenue = 0;
        for (const inv of p.invoices) {
          revenue = roundCurrency(revenue + inv.amountPaid);
        }
        let expenses = 0;
        for (const exp of p.expenses) {
          expenses = roundCurrency(expenses + exp.amount);
        }
        const profit = roundCurrency(revenue - expenses);
        const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

        return {
          projectId: p.id,
          projectName: p.name,
          projectKey: p.key,
          revenue,
          expenses,
          profit,
          marginPercent,
        };
      })
      .filter((p) => p.revenue > 0 || p.expenses > 0)
      .sort((a, b) => b.profit - a.profit);

    return {
      currency,
      projects: list,
    };
  }
}

export const financeService = new FinanceService();
