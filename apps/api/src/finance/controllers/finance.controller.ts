import { Request, Response, NextFunction } from "express";
import { financeService } from "../services/finance.service";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  InvoiceQuerySchema,
  CreatePaymentSchema,
  PaymentQuerySchema,
  CreateExpenseCategorySchema,
  UpdateExpenseCategorySchema,
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseQuerySchema,
  FinanceReportQuerySchema,
} from "@omnidesk/validation";
import { AuthenticatedRequest } from "../../middleware/auth_context";

export class FinanceController {
  // ── Dashboard ─────────────────────────────────────────────────────────────
  public async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const stats = await financeService.getDashboardStats(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  // ── Invoices ──────────────────────────────────────────────────────────────
  public async createInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateInvoiceSchema.parse(req.body);

      const invoice = await financeService.createInvoice(authReq.context.workspaceId, {
        customerId: validated.customerId,
        projectId: validated.projectId,
        invoiceNumber: validated.invoiceNumber,
        issueDate: validated.issueDate,
        dueDate: validated.dueDate,
        currency: validated.currency,
        notes: validated.notes,
        terms: validated.terms,
        items: validated.items,
        userId: authReq.context.userId,
      });

      return res.status(201).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  public async listInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = InvoiceQuerySchema.parse(req.query);
      const result = await financeService.listInvoices(authReq.context.workspaceId, query);

      return res.status(200).json({
        success: true,
        data: result.invoices,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const invoice = await financeService.getInvoice(authReq.context.workspaceId, req.params.id);
      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  public async updateInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateInvoiceSchema.parse(req.body);

      const invoice = await financeService.updateInvoice(
        authReq.context.workspaceId,
        req.params.id,
        {
          ...validated,
          userId: authReq.context.userId,
        }
      );

      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  public async sendInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const invoice = await financeService.sendInvoice(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );
      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  public async cancelInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const invoice = await financeService.cancelInvoice(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );
      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  public async archiveInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const invoice = await financeService.archiveInvoice(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );
      return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
      next(err);
    }
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  public async createPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreatePaymentSchema.parse({
        ...req.body,
        invoiceId: req.params.id || req.body.invoiceId,
      });

      const result = await financeService.createPayment(authReq.context.workspaceId, {
        invoiceId: validated.invoiceId,
        amount: validated.amount,
        currency: validated.currency,
        paymentDate: validated.paymentDate,
        paymentMethod: validated.paymentMethod,
        reference: validated.reference,
        notes: validated.notes,
        userId: authReq.context.userId,
      });

      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async listPayments(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = PaymentQuerySchema.parse({
        ...req.query,
        invoiceId: req.params.id || req.query.invoiceId,
      });

      const result = await financeService.listPayments(authReq.context.workspaceId, query);
      return res.status(200).json({
        success: true,
        data: result.payments,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const payment = await financeService.getPayment(authReq.context.workspaceId, req.params.id);
      return res.status(200).json({ success: true, data: payment });
    } catch (err) {
      next(err);
    }
  }

  // ── Expense Categories ───────────────────────────────────────────────────
  public async createCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateExpenseCategorySchema.parse(req.body);
      const cat = await financeService.createCategory(authReq.context.workspaceId, validated);
      return res.status(201).json({ success: true, data: cat });
    } catch (err) {
      next(err);
    }
  }

  public async listCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const categories = await financeService.listCategories(authReq.context.workspaceId);
      return res.status(200).json({ success: true, data: categories });
    } catch (err) {
      next(err);
    }
  }

  public async updateCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateExpenseCategorySchema.parse(req.body);
      const updated = await financeService.updateCategory(
        authReq.context.workspaceId,
        req.params.id,
        validated
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public async deleteCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const deleted = await financeService.deleteCategory(
        authReq.context.workspaceId,
        req.params.id
      );
      return res.status(200).json({ success: true, data: deleted });
    } catch (err) {
      next(err);
    }
  }

  // ── Expenses ─────────────────────────────────────────────────────────────
  public async createExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateExpenseSchema.parse(req.body);

      const expense = await financeService.createExpense(authReq.context.workspaceId, {
        ...validated,
        userId: authReq.context.userId,
      });

      return res.status(201).json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  }

  public async listExpenses(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = ExpenseQuerySchema.parse(req.query);
      const result = await financeService.listExpenses(authReq.context.workspaceId, query);

      return res.status(200).json({
        success: true,
        data: result.expenses,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async getExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const expense = await financeService.getExpense(authReq.context.workspaceId, req.params.id);
      return res.status(200).json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  }

  public async updateExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateExpenseSchema.parse(req.body);
      const updated = await financeService.updateExpense(
        authReq.context.workspaceId,
        req.params.id,
        {
          ...validated,
          userId: authReq.context.userId,
        }
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public async approveExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const updated = await financeService.approveExpense(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public async rejectExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const updated = await financeService.rejectExpense(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  public async archiveExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const updated = await financeService.archiveExpense(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  // ── CRM & Project Summaries ───────────────────────────────────────────────
  public async getCustomerFinanceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const summary = await financeService.getCustomerFinanceSummary(
        authReq.context.workspaceId,
        req.params.customerId
      );
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  public async getProjectFinanceSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const summary = await financeService.getProjectFinanceSummary(
        authReq.context.workspaceId,
        req.params.projectId
      );
      return res.status(200).json({ success: true, data: summary });
    } catch (err) {
      next(err);
    }
  }

  // ── Reports ───────────────────────────────────────────────────────────────
  public async getRevenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getRevenueReport(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public async getExpenseReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getExpenseReport(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public async getProfitLossReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getProfitLossReport(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public async getReceivablesReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getReceivablesReport(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public async getOverdueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getOverdueReport(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public async getCustomerRevenueReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getCustomerRevenueReport(authReq.context.workspaceId, query);
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  public async getProjectProfitabilityReport(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = FinanceReportQuerySchema.parse(req.query);
      const report = await financeService.getProjectProfitabilityReport(
        authReq.context.workspaceId,
        query
      );
      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }
}

export const financeController = new FinanceController();
