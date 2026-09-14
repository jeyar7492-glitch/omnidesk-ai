import { Router } from "express";
import { financeController } from "../controllers/finance.controller";
import { requireAuthContext, requirePermission } from "../../middleware/auth_context";

export const financeRouter = Router();

// Apply workspace & auth context middleware to all finance routes
financeRouter.use(requireAuthContext);

// ── Finance Dashboard ───────────────────────────────────────────────────────
financeRouter.get(
  "/dashboard",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getDashboard(req, res, next)
);

// ── Invoices ────────────────────────────────────────────────────────────────
financeRouter.post(
  "/invoices",
  requirePermission("finance:write"),
  (req, res, next) => financeController.createInvoice(req, res, next)
);

financeRouter.get(
  "/invoices",
  requirePermission("finance:read"),
  (req, res, next) => financeController.listInvoices(req, res, next)
);

financeRouter.get(
  "/invoices/:id",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getInvoice(req, res, next)
);

financeRouter.patch(
  "/invoices/:id",
  requirePermission("finance:write"),
  (req, res, next) => financeController.updateInvoice(req, res, next)
);
financeRouter.put(
  "/invoices/:id",
  requirePermission("finance:write"),
  (req, res, next) => financeController.updateInvoice(req, res, next)
);

financeRouter.delete(
  "/invoices/:id",
  requirePermission("finance:delete"),
  (req, res, next) => financeController.archiveInvoice(req, res, next)
);

financeRouter.post(
  "/invoices/:id/send",
  requirePermission("finance:write"),
  (req, res, next) => financeController.sendInvoice(req, res, next)
);
financeRouter.put(
  "/invoices/:id/send",
  requirePermission("finance:write"),
  (req, res, next) => financeController.sendInvoice(req, res, next)
);

financeRouter.post(
  "/invoices/:id/cancel",
  requirePermission("finance:write"),
  (req, res, next) => financeController.cancelInvoice(req, res, next)
);
financeRouter.put(
  "/invoices/:id/cancel",
  requirePermission("finance:write"),
  (req, res, next) => financeController.cancelInvoice(req, res, next)
);

financeRouter.post(
  "/invoices/:id/archive",
  requirePermission("finance:delete"),
  (req, res, next) => financeController.archiveInvoice(req, res, next)
);

// Nested payments under invoice
financeRouter.get(
  "/invoices/:id/payments",
  requirePermission("finance:read"),
  (req, res, next) => financeController.listPayments(req, res, next)
);

financeRouter.post(
  "/invoices/:id/payments",
  requirePermission("finance:write"),
  (req, res, next) => financeController.createPayment(req, res, next)
);

// ── Payments Top-Level ─────────────────────────────────────────────────────
financeRouter.get(
  "/payments",
  requirePermission("finance:read"),
  (req, res, next) => financeController.listPayments(req, res, next)
);

financeRouter.post(
  "/payments",
  requirePermission("finance:write"),
  (req, res, next) => financeController.createPayment(req, res, next)
);

financeRouter.get(
  "/payments/:id",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getPayment(req, res, next)
);

// ── Expense Categories ─────────────────────────────────────────────────────
financeRouter.get(
  "/categories",
  requirePermission("finance:read"),
  (req, res, next) => financeController.listCategories(req, res, next)
);

financeRouter.post(
  "/categories",
  requirePermission("finance:write"),
  (req, res, next) => financeController.createCategory(req, res, next)
);

financeRouter.patch(
  "/categories/:id",
  requirePermission("finance:write"),
  (req, res, next) => financeController.updateCategory(req, res, next)
);

financeRouter.delete(
  "/categories/:id",
  requirePermission("finance:delete"),
  (req, res, next) => financeController.deleteCategory(req, res, next)
);

// ── Expenses ───────────────────────────────────────────────────────────────
financeRouter.get(
  "/expenses",
  requirePermission("finance:read"),
  (req, res, next) => financeController.listExpenses(req, res, next)
);

financeRouter.post(
  "/expenses",
  requirePermission("finance:write"),
  (req, res, next) => financeController.createExpense(req, res, next)
);

financeRouter.get(
  "/expenses/:id",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getExpense(req, res, next)
);

financeRouter.patch(
  "/expenses/:id",
  requirePermission("finance:write"),
  (req, res, next) => financeController.updateExpense(req, res, next)
);

financeRouter.delete(
  "/expenses/:id",
  requirePermission("finance:delete"),
  (req, res, next) => financeController.archiveExpense(req, res, next)
);

financeRouter.post(
  "/expenses/:id/approve",
  requirePermission("finance:approve"),
  (req, res, next) => financeController.approveExpense(req, res, next)
);
financeRouter.put(
  "/expenses/:id/approve",
  requirePermission("finance:approve"),
  (req, res, next) => financeController.approveExpense(req, res, next)
);

financeRouter.post(
  "/expenses/:id/reject",
  requirePermission("finance:approve"),
  (req, res, next) => financeController.rejectExpense(req, res, next)
);
financeRouter.put(
  "/expenses/:id/reject",
  requirePermission("finance:approve"),
  (req, res, next) => financeController.rejectExpense(req, res, next)
);

financeRouter.post(
  "/expenses/:id/archive",
  requirePermission("finance:delete"),
  (req, res, next) => financeController.archiveExpense(req, res, next)
);

// ── CRM & Project Summaries ────────────────────────────────────────────────
financeRouter.get(
  "/customers/:customerId/summary",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getCustomerFinanceSummary(req, res, next)
);
financeRouter.get(
  "/customers/:customerId/finance-summary",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getCustomerFinanceSummary(req, res, next)
);

financeRouter.get(
  "/projects/:projectId/summary",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getProjectFinanceSummary(req, res, next)
);
financeRouter.get(
  "/projects/:projectId/finance-summary",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getProjectFinanceSummary(req, res, next)
);

// ── Financial Reports ──────────────────────────────────────────────────────
financeRouter.get(
  "/reports/revenue",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getRevenueReport(req, res, next)
);

financeRouter.get(
  "/reports/expenses",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getExpenseReport(req, res, next)
);

financeRouter.get(
  "/reports/profit-loss",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getProfitLossReport(req, res, next)
);

financeRouter.get(
  "/reports/receivables",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getReceivablesReport(req, res, next)
);

financeRouter.get(
  "/reports/overdue",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getOverdueReport(req, res, next)
);

financeRouter.get(
  "/reports/customer-revenue",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getCustomerRevenueReport(req, res, next)
);

financeRouter.get(
  "/reports/project-profitability",
  requirePermission("finance:read"),
  (req, res, next) => financeController.getProjectProfitabilityReport(req, res, next)
);
