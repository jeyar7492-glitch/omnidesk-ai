import React, { useState, useEffect, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Receipt,
  FileText,
  AlertCircle,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Send,
  Ban,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { apiClient } from "../../api/client";
import { useWorkspace } from "../../context/WorkspaceContext";
import {
  FinanceDashboardStats,
  InvoiceSummary,
  PaymentSummary,
  ExpenseSummary,
  ExpenseCategorySummary,
} from "@omnidesk/shared-types";

type FinanceTab = "overview" | "invoices" | "payments" | "expenses" | "reports";

export const FinanceView: React.FC = () => {
  const { context } = useWorkspace();
  const [activeTab, setActiveTab] = useState<FinanceTab>("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [currency, setCurrency] = useState("USD");

  // Overview Data
  const [dashboardStats, setDashboardStats] = useState<FinanceDashboardStats | null>(null);

  // Invoices Data
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);

  // Payments Data
  const [payments, setPayments] = useState<PaymentSummary[]>([]);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [preselectedInvoiceId, setPreselectedInvoiceId] = useState<string>("");

  // Expenses Data
  const [expenses, setExpenses] = useState<ExpenseSummary[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategorySummary[]>([]);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseStatusFilter, setExpenseStatusFilter] = useState("all");
  const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false);

  // Reports Data
  const [selectedReportType, setSelectedReportType] = useState<string>("profit_loss");
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Customers & Projects list for dropdowns
  const [customers, setCustomers] = useState<Array<{ id: string; companyName: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);

  const isPrivileged =
    context.userRole === "OWNER" ||
    context.userRole === "ADMIN" ||
    context.userRole === "FINANCE";

  const canWrite =
    isPrivileged || context.userPermissions.includes("finance:write");
  const canApprove =
    isPrivileged || context.userPermissions.includes("finance:approve");

  // ── Fetch Dashboard & Supporting Lists ─────────────────────────────────────
  const loadInitialData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [stats, invs, pmts, exps, cats, custs, projs] = await Promise.all([
        apiClient.getFinanceDashboard({ currency }).catch(() => null),
        apiClient.getInvoices({ currency }).catch(() => []),
        apiClient.getPayments().catch(() => []),
        apiClient.getExpenses().catch(() => []),
        apiClient.getExpenseCategories().catch(() => []),
        apiClient.getCustomers().catch(() => []),
        apiClient.getProjects().catch(() => []),
      ]);

      setDashboardStats(stats);
      setInvoices(invs);
      setPayments(pmts);
      setExpenses(exps);
      setExpenseCategories(cats);
      setCustomers(custs.map((c: any) => ({ id: c.id, companyName: c.companyName })));
      setProjects(projs.map((p: any) => ({ id: p.id, name: p.name })));
    } catch (err: any) {
      setError(err.message || "Failed to load financial records");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [currency]);

  // ── Fetch Report on demand ────────────────────────────────────────────────
  const loadReport = async (type: string) => {
    setIsLoadingReport(true);
    try {
      let res = null;
      switch (type) {
        case "revenue":
          res = await apiClient.getRevenueReport({ currency });
          break;
        case "expenses":
          res = await apiClient.getExpenseReport({ currency });
          break;
        case "profit_loss":
          res = await apiClient.getProfitLossReport({ currency });
          break;
        case "receivables":
          res = await apiClient.getReceivablesReport({ currency });
          break;
        case "overdue":
          res = await apiClient.getOverdueReport({ currency });
          break;
        case "customer_revenue":
          res = await apiClient.getCustomerRevenueReport({ currency });
          break;
        case "project_profitability":
          res = await apiClient.getProjectProfitabilityReport({ currency });
          break;
      }
      setReportData(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      loadReport(selectedReportType);
    }
  }, [activeTab, selectedReportType, currency]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        !invoiceSearch ||
        inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
        (inv.customerName && inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()));
      const matchesStatus =
        invoiceStatusFilter === "all" || inv.status === invoiceStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch =
        !expenseSearch ||
        exp.vendor.toLowerCase().includes(expenseSearch.toLowerCase()) ||
        exp.description.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchesStatus =
        expenseStatusFilter === "all" || exp.approvalStatus === expenseStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [expenses, expenseSearch, expenseStatusFilter]);

  // ── Action Handlers ───────────────────────────────────────────────────────
  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await apiClient.sendInvoice(invoiceId);
      await loadInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to send invoice");
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to cancel this invoice? Cancelled invoices cannot receive payments.")) {
      return;
    }
    try {
      await apiClient.cancelInvoice(invoiceId);
      await loadInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to cancel invoice");
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      await apiClient.approveExpense(expenseId);
      await loadInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to approve expense");
    }
  };

  const handleRejectExpense = async (expenseId: string) => {
    try {
      await apiClient.rejectExpense(expenseId);
      await loadInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to reject expense");
    }
  };

  const handleOpenRecordPayment = (invoiceId: string) => {
    setPreselectedInvoiceId(invoiceId);
    setIsRecordPaymentOpen(true);
  };

  // ── Formatters ────────────────────────────────────────────────────────────
  const formatMoney = (amount: number, curr?: string) => {
    const c = curr || currency;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
      case "approved":
        return { label: status.toUpperCase(), bg: "rgba(16, 185, 129, 0.15)", text: "#10b981", border: "rgba(16, 185, 129, 0.3)" };
      case "partially_paid":
      case "sent":
        return { label: status.replace("_", " ").toUpperCase(), bg: "rgba(6, 182, 212, 0.15)", text: "#06b6d4", border: "rgba(6, 182, 212, 0.3)" };
      case "overdue":
      case "rejected":
        return { label: status.toUpperCase(), bg: "rgba(239, 68, 68, 0.15)", text: "#ef4444", border: "rgba(239, 68, 68, 0.3)" };
      case "cancelled":
        return { label: "CANCELLED", bg: "rgba(100, 116, 139, 0.15)", text: "#94a3b8", border: "rgba(100, 116, 139, 0.3)" };
      case "draft":
      case "pending":
      default:
        return { label: status.toUpperCase(), bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" };
    }
  };

  if (isLoading && !dashboardStats) {
    return (
      <div style={{ padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <RefreshCw size={32} className="spin-animation" color="var(--brand-cyan)" />
          <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading Finance Intelligence Engine...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1600px", margin: "0 auto" }}>
      {/* Header with Title and Currency Toggle */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
            Enterprise Finance & Invoicing
          </h1>
          <p style={{ color: "var(--text-secondary)", margin: "4px 0 0 0", fontSize: "0.875rem" }}>
            Realtime revenue telemetry, deterministic billing lifecycle, and expense governance
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", background: "var(--bg-secondary)", borderRadius: "8px", padding: "4px", border: "1px solid var(--border-subtle)" }}>
            {["USD", "EUR", "GBP", "INR"].map((curr) => (
              <button
                key={curr}
                onClick={() => setCurrency(curr)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "6px",
                  border: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  background: currency === curr ? "var(--brand-cyan)" : "transparent",
                  color: currency === curr ? "#000" : "var(--text-secondary)",
                  transition: "all 0.2s",
                }}
              >
                {curr}
              </button>
            ))}
          </div>

          {canWrite && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={() => setIsCreateInvoiceOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "var(--brand-cyan)",
                  color: "#000",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Plus size={16} /> New Invoice
              </button>
              <button
                onClick={() => {
                  setPreselectedInvoiceId("");
                  setIsRecordPaymentOpen(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10b981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <CreditCard size={16} /> Record Payment
              </button>
              <button
                onClick={() => setIsCreateExpenseOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                <Receipt size={16} /> Log Expense
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "8px", padding: "12px 16px", color: "#ef4444", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
        {[
          { id: "overview", label: "Executive Overview", icon: TrendingUp },
          { id: "invoices", label: `Invoices (${invoices.length})`, icon: FileText },
          { id: "payments", label: `Payments (${payments.length})`, icon: CreditCard },
          { id: "expenses", label: `Expenses (${expenses.length})`, icon: Receipt },
          { id: "reports", label: "Financial Reports", icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as FinanceTab)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                border: "none",
                borderBottom: isActive ? "2px solid var(--brand-cyan)" : "2px solid transparent",
                background: "transparent",
                color: isActive ? "var(--brand-cyan)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && dashboardStats && (
        <div>
          {/* Top KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <div className="card" style={{ padding: "1.25rem", borderRadius: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>
                TOTAL REVENUE <TrendingUp size={16} color="var(--brand-cyan)" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, margin: "8px 0 4px 0", color: "var(--text-primary)" }}>
                {formatMoney(dashboardStats.totalRevenue)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                From {dashboardStats.invoiceCount} invoices
              </div>
            </div>

            <div className="card" style={{ padding: "1.25rem", borderRadius: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>
                PAID REVENUE <CheckCircle size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, margin: "8px 0 4px 0", color: "#10b981" }}>
                {formatMoney(dashboardStats.paidRevenue)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {dashboardStats.paidInvoiceCount} fully settled
              </div>
            </div>

            <div className="card" style={{ padding: "1.25rem", borderRadius: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>
                OUTSTANDING RECEIVABLES <Clock size={16} color="#f59e0b" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, margin: "8px 0 4px 0", color: "#f59e0b" }}>
                {formatMoney(dashboardStats.outstandingReceivables)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>
                {formatMoney(dashboardStats.overdueReceivables)} overdue ({dashboardStats.overdueInvoiceCount})
              </div>
            </div>

            <div className="card" style={{ padding: "1.25rem", borderRadius: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>
                TOTAL EXPENSES <Receipt size={16} color="#f43f5e" />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, margin: "8px 0 4px 0", color: "#f43f5e" }}>
                {formatMoney(dashboardStats.totalExpenses)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                {dashboardStats.pendingExpenseCount} pending approval
              </div>
            </div>

            <div className="card" style={{ padding: "1.25rem", borderRadius: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>
                NET INCOME <DollarSign size={16} color={dashboardStats.netIncome >= 0 ? "#10b981" : "#ef4444"} />
              </div>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, margin: "8px 0 4px 0", color: dashboardStats.netIncome >= 0 ? "#10b981" : "#ef4444" }}>
                {formatMoney(dashboardStats.netIncome)}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Paid revenue minus approved expenses
              </div>
            </div>
          </div>

          {/* Revenue & Expenses Trend Overview */}
          <div style={{ background: "var(--bg-secondary)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>6-Month Performance Trend</h3>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${dashboardStats.trends.dates.length}, 1fr)`, gap: "1rem", alignItems: "flex-end", height: "180px", paddingTop: "20px" }}>
              {dashboardStats.trends.dates.map((date, idx) => {
                const rev = dashboardStats.trends.revenue[idx] || 0;
                const exp = dashboardStats.trends.expenses[idx] || 0;
                const maxVal = Math.max(1, ...dashboardStats.trends.revenue, ...dashboardStats.trends.expenses);
                const revHeight = Math.max(4, Math.round((rev / maxVal) * 120));
                const expHeight = Math.max(4, Math.round((exp / maxVal) * 120));

                return (
                  <div key={date} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "130px" }}>
                      {/* Revenue bar */}
                      <div
                        title={`Revenue: ${formatMoney(rev)}`}
                        style={{
                          width: "18px",
                          height: `${revHeight}px`,
                          background: "#10b981",
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                      {/* Expense bar */}
                      <div
                        title={`Expense: ${formatMoney(exp)}`}
                        style={{
                          width: "18px",
                          height: `${expHeight}px`,
                          background: "#f43f5e",
                          borderRadius: "4px 4px 0 0",
                        }}
                      />
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{date}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center", marginTop: "1rem", fontSize: "0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", background: "#10b981", borderRadius: "3px" }} /> Paid Revenue
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "12px", height: "12px", background: "#f43f5e", borderRadius: "3px" }} /> Expenses
              </div>
            </div>
          </div>

          {/* Activity Grid: Recent Payments & Overdue Invoices */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
            {/* Recent Payments */}
            <div style={{ background: "var(--bg-secondary)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Recent Recorded Payments</h4>
                <button onClick={() => setActiveTab("payments")} style={{ background: "transparent", border: "none", color: "var(--brand-cyan)", fontSize: "0.8rem", cursor: "pointer" }}>
                  View all
                </button>
              </div>
              {dashboardStats.recentPayments.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No payments recorded yet
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {dashboardStats.recentPayments.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{p.customerName || "Customer"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {p.invoiceNumber || p.invoiceId} • {new Date(p.paymentDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ color: "#10b981", fontWeight: 700, fontSize: "0.95rem" }}>
                        +{formatMoney(p.amount, p.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue Invoices */}
            <div style={{ background: "var(--bg-secondary)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#ef4444" }}>Action Required: Overdue Invoices</h4>
                <button onClick={() => setActiveTab("invoices")} style={{ background: "transparent", border: "none", color: "var(--brand-cyan)", fontSize: "0.8rem", cursor: "pointer" }}>
                  Manage
                </button>
              </div>
              {dashboardStats.overdueInvoices.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No overdue invoices 🎉
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {dashboardStats.overdueInvoices.map((inv) => (
                    <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{inv.invoiceNumber} — {inv.customerName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>
                          Due: {new Date(inv.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.95rem" }}>
                          {formatMoney(inv.amountDue, inv.currency)}
                        </div>
                        {canWrite && (
                          <button
                            onClick={() => handleOpenRecordPayment(inv.id)}
                            style={{ background: "transparent", border: "none", color: "var(--brand-cyan)", fontSize: "0.75rem", cursor: "pointer", padding: 0 }}
                          >
                            Pay now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICES */}
      {activeTab === "invoices" && (
        <div>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.75rem", flex: 1 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search invoice # or customer..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Invoices Table */}
          <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)", background: "rgba(255, 255, 255, 0.02)" }}>
                  <th style={{ padding: "12px 16px" }}>INVOICE #</th>
                  <th style={{ padding: "12px 16px" }}>CUSTOMER</th>
                  <th style={{ padding: "12px 16px" }}>PROJECT</th>
                  <th style={{ padding: "12px 16px" }}>ISSUE DATE</th>
                  <th style={{ padding: "12px 16px" }}>DUE DATE</th>
                  <th style={{ padding: "12px 16px" }}>STATUS</th>
                  <th style={{ padding: "12px 16px" }}>TOTAL</th>
                  <th style={{ padding: "12px 16px" }}>BALANCE DUE</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      No invoices found matching current filters.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const badge = getStatusBadge(inv.status);
                    const paidPct = inv.totalAmount > 0 ? Math.round((inv.amountPaid / inv.totalAmount) * 100) : 0;

                    return (
                      <tr key={inv.id} style={{ borderBottom: "1px solid var(--border-subtle)", transition: "background 0.2s" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "var(--brand-cyan)" }}>
                          {inv.invoiceNumber}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                          {inv.customerName || "Customer"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {inv.projectName || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {new Date(inv.issueDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 16px", color: inv.status === "overdue" ? "#ef4444" : "var(--text-secondary)" }}>
                          {new Date(inv.dueDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                          {formatMoney(inv.totalAmount, inv.currency)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600, color: inv.amountDue > 0 ? "#f59e0b" : "#10b981" }}>
                            {formatMoney(inv.amountDue, inv.currency)}
                          </div>
                          <div style={{ width: "80px", height: "4px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", marginTop: "4px" }}>
                            <div style={{ width: `${paidPct}%`, height: "100%", background: "#10b981", borderRadius: "2px" }} />
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            {canWrite && inv.status === "draft" && (
                              <button
                                onClick={() => handleSendInvoice(inv.id)}
                                title="Send Invoice"
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid var(--brand-cyan)",
                                  background: "rgba(6, 182, 212, 0.1)",
                                  color: "var(--brand-cyan)",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <Send size={12} /> Send
                              </button>
                            )}

                            {canWrite && (inv.status === "sent" || inv.status === "partially_paid" || inv.status === "overdue") && (
                              <button
                                onClick={() => handleOpenRecordPayment(inv.id)}
                                title="Record Payment"
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #10b981",
                                  background: "rgba(16, 185, 129, 0.1)",
                                  color: "#10b981",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <CreditCard size={12} /> Pay
                              </button>
                            )}

                            {canWrite && inv.amountPaid === 0 && inv.status !== "cancelled" && (
                              <button
                                onClick={() => handleCancelInvoice(inv.id)}
                                title="Cancel Invoice"
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  fontSize: "0.75rem",
                                }}
                              >
                                <Ban size={12} /> Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === "payments" && (
        <div>
          <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)", background: "rgba(255, 255, 255, 0.02)" }}>
                  <th style={{ padding: "12px 16px" }}>PAYMENT DATE</th>
                  <th style={{ padding: "12px 16px" }}>INVOICE</th>
                  <th style={{ padding: "12px 16px" }}>CUSTOMER</th>
                  <th style={{ padding: "12px 16px" }}>METHOD</th>
                  <th style={{ padding: "12px 16px" }}>REFERENCE</th>
                  <th style={{ padding: "12px 16px" }}>AMOUNT</th>
                  <th style={{ padding: "12px 16px" }}>NOTES</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      No payments recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--brand-cyan)" }}>
                        {p.invoiceNumber || p.invoiceId}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>
                        {p.customerName || "Customer"}
                      </td>
                      <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                        {p.paymentMethod.replace("_", " ")}
                      </td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                        {p.reference || "—"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#10b981" }}>
                        +{formatMoney(p.amount, p.currency)}
                      </td>
                      <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                        {p.notes || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSES */}
      {activeTab === "expenses" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "0.75rem", flex: 1 }}>
              <div style={{ position: "relative", flex: 1, maxWidth: "340px" }}>
                <Search size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search vendor or description..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                    fontSize: "0.85rem",
                  }}
                />
              </div>

              <select
                value={expenseStatusFilter}
                onChange={(e) => setExpenseStatusFilter(e.target.value)}
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                }}
              >
                <option value="all">All Approvals</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div style={{ background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border-subtle)", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)", background: "rgba(255, 255, 255, 0.02)" }}>
                  <th style={{ padding: "12px 16px" }}>DATE</th>
                  <th style={{ padding: "12px 16px" }}>VENDOR</th>
                  <th style={{ padding: "12px 16px" }}>DESCRIPTION</th>
                  <th style={{ padding: "12px 16px" }}>CATEGORY</th>
                  <th style={{ padding: "12px 16px" }}>PROJECT</th>
                  <th style={{ padding: "12px 16px" }}>AMOUNT</th>
                  <th style={{ padding: "12px 16px" }}>STATUS</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => {
                    const badge = getStatusBadge(exp.approvalStatus);

                    return (
                      <tr key={exp.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {new Date(exp.expenseDate).toLocaleDateString()}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                          {exp.vendor}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {exp.description}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {exp.categoryName || "General"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--text-secondary)" }}>
                          {exp.projectName || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#f43f5e" }}>
                          {formatMoney(exp.amount, exp.currency)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: "4px",
                              fontSize: "0.7rem",
                              fontWeight: 700,
                              background: badge.bg,
                              color: badge.text,
                              border: `1px solid ${badge.border}`,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          {canApprove && exp.approvalStatus === "pending" && (
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                onClick={() => handleApproveExpense(exp.id)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid #10b981",
                                  background: "rgba(16, 185, 129, 0.1)",
                                  color: "#10b981",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectExpense(exp.id)}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(239, 68, 68, 0.4)",
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: "#ef4444",
                                  cursor: "pointer",
                                  fontSize: "0.75rem",
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: REPORTS */}
      {activeTab === "reports" && (
        <div>
          {/* Report Type Selector */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {[
              { id: "profit_loss", label: "Profit & Loss" },
              { id: "revenue", label: "Revenue Breakdown" },
              { id: "expenses", label: "Expense Analysis" },
              { id: "receivables", label: "AR Aging" },
              { id: "overdue", label: "Overdue Receivables" },
              { id: "customer_revenue", label: "Customer Revenue" },
              { id: "project_profitability", label: "Project Profitability" },
            ].map((rep) => (
              <button
                key={rep.id}
                onClick={() => setSelectedReportType(rep.id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: selectedReportType === rep.id ? "1px solid var(--brand-cyan)" : "1px solid var(--border-subtle)",
                  background: selectedReportType === rep.id ? "rgba(6, 182, 212, 0.15)" : "var(--bg-secondary)",
                  color: selectedReportType === rep.id ? "var(--brand-cyan)" : "var(--text-secondary)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                {rep.label}
              </button>
            ))}
          </div>

          {isLoadingReport ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              <RefreshCw size={24} className="spin-animation" style={{ marginBottom: "8px" }} />
              <div>Generating financial intelligence report...</div>
            </div>
          ) : !reportData ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No report data available.
            </div>
          ) : (
            <div style={{ background: "var(--bg-secondary)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--border-subtle)" }}>
              {/* Report Renderers */}
              {selectedReportType === "profit_loss" && (
                <div>
                  <h3 style={{ margin: "0 0 1rem 0" }}>Profit & Loss Summary ({reportData.currency})</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>TOTAL REVENUE</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#10b981" }}>{formatMoney(reportData.revenue)}</div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>TOTAL EXPENSES</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f43f5e" }}>{formatMoney(reportData.expenses)}</div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>NET PROFIT</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: reportData.netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                        {formatMoney(reportData.netProfit)}
                      </div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>NET MARGIN</div>
                      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--brand-cyan)" }}>
                        {reportData.profitMarginPercent}%
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportType === "receivables" && (
                <div>
                  <h3 style={{ margin: "0 0 1rem 0" }}>Accounts Receivable Aging Summary ({reportData.currency})</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
                    <div style={{ padding: "1rem", background: "rgba(255, 255, 255, 0.02)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>TOTAL AR</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700 }}>{formatMoney(reportData.totalReceivables)}</div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(16, 185, 129, 0.05)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#10b981" }}>0 - 30 DAYS</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10b981" }}>{formatMoney(reportData.current0To30Days)}</div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(245, 158, 11, 0.05)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#f59e0b" }}>31 - 60 DAYS</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#f59e0b" }}>{formatMoney(reportData.overdue31To60Days)}</div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.05)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#ef4444" }}>61 - 90 DAYS</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ef4444" }}>{formatMoney(reportData.overdue61To90Days)}</div>
                    </div>
                    <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "0.8rem", color: "#ef4444" }}>90+ DAYS</div>
                      <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ef4444" }}>{formatMoney(reportData.overdue90PlusDays)}</div>
                    </div>
                  </div>
                </div>
              )}

              {selectedReportType === "customer_revenue" && (
                <div>
                  <h3 style={{ margin: "0 0 1rem 0" }}>Customer Revenue Rankings ({reportData.currency})</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>CUSTOMER</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>INVOICES</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>TOTAL REVENUE</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>OUTSTANDING</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.customers.map((c: any) => (
                        <tr key={c.customerId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.customerName}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.invoiceCount}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#10b981", fontWeight: 700 }}>
                            {formatMoney(c.totalRevenue)}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: c.outstandingBalance > 0 ? "#ef4444" : "var(--text-secondary)" }}>
                            {formatMoney(c.outstandingBalance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedReportType === "project_profitability" && (
                <div>
                  <h3 style={{ margin: "0 0 1rem 0" }}>Project Profitability Report ({reportData.currency})</h3>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>PROJECT</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>REVENUE</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>EXPENSES</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>PROFIT</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>MARGIN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.projects.map((p: any) => (
                        <tr key={p.projectId} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>
                            {p.projectName} {p.projectKey ? `(${p.projectKey})` : ""}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#10b981" }}>{formatMoney(p.revenue)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#f43f5e" }}>{formatMoney(p.expenses)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: p.profit >= 0 ? "#10b981" : "#ef4444" }}>
                            {formatMoney(p.profit)}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--brand-cyan)", fontWeight: 600 }}>
                            {p.marginPercent}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE INVOICE MODAL ────────────────────────────────────────────── */}
      {isCreateInvoiceOpen && (
        <CreateInvoiceModal
          customers={customers}
          projects={projects}
          defaultCurrency={currency}
          onClose={() => setIsCreateInvoiceOpen(false)}
          onSuccess={async () => {
            setIsCreateInvoiceOpen(false);
            await loadInitialData();
          }}
        />
      )}

      {/* ── RECORD PAYMENT MODAL ───────────────────────────────────────────── */}
      {isRecordPaymentOpen && (
        <RecordPaymentModal
          invoices={invoices.filter((i) => i.amountDue > 0 && i.status !== "cancelled")}
          preselectedInvoiceId={preselectedInvoiceId}
          onClose={() => setIsRecordPaymentOpen(false)}
          onSuccess={async () => {
            setIsRecordPaymentOpen(false);
            await loadInitialData();
          }}
        />
      )}

      {/* ── CREATE EXPENSE MODAL ───────────────────────────────────────────── */}
      {isCreateExpenseOpen && (
        <CreateExpenseModal
          categories={expenseCategories}
          projects={projects}
          defaultCurrency={currency}
          onClose={() => setIsCreateExpenseOpen(false)}
          onSuccess={async () => {
            setIsCreateExpenseOpen(false);
            await loadInitialData();
          }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE INVOICE MODAL WITH LIVE LINE-ITEM ARITHMETIC
// ─────────────────────────────────────────────────────────────────────────────
interface LineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountAmount: number;
}

const CreateInvoiceModal: React.FC<{
  customers: Array<{ id: string; companyName: string }>;
  projects: Array<{ id: string; name: string }>;
  defaultCurrency: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ customers, projects, defaultCurrency, onClose, onSuccess }) => {
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [projectId, setProjectId] = useState<string>("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Net 30 Days");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<LineItemInput[]>([
    { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountAmount: 0 },
  ]);

  const updateItem = (index: number, field: keyof LineItemInput, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRate: 0, discountAmount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Live totals calculation
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const q = Math.max(0, Number(item.quantity) || 0);
      const p = Math.max(0, Number(item.unitPrice) || 0);
      const itemSub = Math.round((q * p) * 100) / 100;
      const d = Math.min(itemSub, Math.max(0, Number(item.discountAmount) || 0));
      const taxable = Math.max(0, itemSub - d);
      const taxRate = Math.max(0, Math.min(100, Number(item.taxRate) || 0));
      const tax = Math.round((taxable * (taxRate / 100)) * 100) / 100;

      subtotal += itemSub;
      totalDiscount += d;
      totalTax += tax;
    });

    const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;
    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal,
    };
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      alert("Please select a customer");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      alert("All line items must have a description");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createInvoice({
        customerId,
        projectId: projectId || null,
        dueDate,
        currency,
        notes,
        terms,
        items: items.map((i) => ({
          description: i.description.trim(),
          quantity: Number(i.quantity) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          taxRate: Number(i.taxRate) || 0,
          discountAmount: Number(i.discountAmount) || 0,
        })),
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-subtle)", maxWidth: "800px", width: "100%", maxHeight: "90vh", overflowY: "auto", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Generate Client Invoice</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Customer *</label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                <option value="">No Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Payment Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Payment Terms</label>
              <input
                type="text"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g. Net 30 Days"
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Notes / Memo</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Thanks for your business"
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Line Items</label>
              <button
                type="button"
                onClick={addItem}
                style={{ background: "transparent", border: "1px solid var(--brand-cyan)", color: "var(--brand-cyan)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
              >
                + Add Item
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {items.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1.5fr 1fr 1fr auto", gap: "8px", alignItems: "center", background: "rgba(255, 255, 255, 0.02)", padding: "8px", borderRadius: "8px" }}>
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(idx, "description", e.target.value)}
                    required
                    style={{ padding: "6px 10px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.8rem" }}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    style={{ padding: "6px 10px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.8rem" }}
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, "unitPrice", e.target.value)}
                    style={{ padding: "6px 10px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.8rem" }}
                  />
                  <input
                    type="number"
                    placeholder="Tax %"
                    min="0"
                    max="100"
                    value={item.taxRate}
                    onChange={(e) => updateItem(idx, "taxRate", e.target.value)}
                    style={{ padding: "6px 10px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.8rem" }}
                  />
                  <input
                    type="number"
                    placeholder="Discount"
                    min="0"
                    step="0.01"
                    value={item.discountAmount}
                    onChange={(e) => updateItem(idx, "discountAmount", e.target.value)}
                    style={{ padding: "6px 10px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "6px", color: "var(--text-primary)", fontSize: "0.8rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length <= 1}
                    style={{ background: "transparent", border: "none", color: items.length > 1 ? "#ef4444" : "#475569", cursor: items.length > 1 ? "pointer" : "default" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Live Summary Box */}
          <div style={{ background: "rgba(0, 0, 0, 0.3)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-subtle)", marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
              <span>Subtotal:</span>
              <span>{currency} {totals.subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
              <span>Discounts:</span>
              <span>-{currency} {totals.totalDiscount.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "6px" }}>
              <span>Taxes:</span>
              <span>+{currency} {totals.totalTax.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1rem", fontWeight: 700, color: "var(--brand-cyan)", borderTop: "1px solid var(--border-subtle)", paddingTop: "6px" }}>
              <span>Total Amount:</span>
              <span>{currency} {totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 20px", borderRadius: "8px", background: "var(--brand-cyan)", color: "#000", fontWeight: 600, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              {isSubmitting ? "Generating..." : "Save Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RECORD PAYMENT MODAL
// ─────────────────────────────────────────────────────────────────────────────
const RecordPaymentModal: React.FC<{
  invoices: InvoiceSummary[];
  preselectedInvoiceId?: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ invoices, preselectedInvoiceId, onClose, onSuccess }) => {
  const [invoiceId, setInvoiceId] = useState(preselectedInvoiceId || invoices[0]?.id || "");
  const selectedInv = invoices.find((i) => i.id === invoiceId);

  const [amount, setAmount] = useState<number>(selectedInv?.amountDue || 0);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedInv) {
      setAmount(selectedInv.amountDue);
    }
  }, [invoiceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId) {
      alert("Please select an invoice");
      return;
    }
    if (Number(amount) <= 0) {
      alert("Amount must be greater than zero");
      return;
    }
    if (selectedInv && Number(amount) > selectedInv.amountDue) {
      alert(`Amount cannot exceed outstanding balance of ${selectedInv.amountDue}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createPayment({
        invoiceId,
        amount: Number(amount),
        currency: selectedInv?.currency,
        paymentMethod,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-subtle)", maxWidth: "520px", width: "100%", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Record Payment</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Target Invoice *</label>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
            >
              {invoices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.invoiceNumber} — {i.customerName} (Due: {i.currency} {i.amountDue.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
                Payment Amount * (Max: {selectedInv?.amountDue.toFixed(2)})
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedInv?.amountDue}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                <option value="bank_transfer">Bank Transfer / Wire</option>
                <option value="credit_card">Credit Card</option>
                <option value="stripe">Stripe</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Transaction / Reference ID</label>
            <input
              type="text"
              placeholder="e.g. TXN-9982481"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Notes</label>
            <input
              type="text"
              placeholder="Optional payment notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 20px", borderRadius: "8px", background: "#10b981", color: "#000", fontWeight: 600, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              {isSubmitting ? "Recording..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE EXPENSE MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CreateExpenseModal: React.FC<{
  categories: ExpenseCategorySummary[];
  projects: Array<{ id: string; name: string }>;
  defaultCurrency: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ categories, projects, defaultCurrency, onClose, onSuccess }) => {
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState(defaultCurrency);
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [projectId, setProjectId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("credit_card");
  const [receiptReference, setReceiptReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !description.trim() || Number(amount) <= 0) {
      alert("Please fill in vendor, description and valid positive amount");
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.createExpense({
        vendor: vendor.trim(),
        description: description.trim(),
        amount: Number(amount),
        currency,
        categoryId: categoryId || null,
        projectId: projectId || null,
        paymentMethod,
        receiptReference: receiptReference.trim() || undefined,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Failed to create expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "var(--bg-secondary)", borderRadius: "14px", border: "1px solid var(--border-subtle)", maxWidth: "560px", width: "100%", padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Log Expense</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: "1.25rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Vendor Name *</label>
              <input
                type="text"
                placeholder="e.g. AWS, Figma, Delta"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                required
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Description *</label>
            <input
              type="text"
              placeholder="e.g. Monthly cloud computing subscription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Associated Project (Optional)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Receipt Reference #</label>
              <input
                type="text"
                placeholder="e.g. REC-55829"
                value={receiptReference}
                onChange={(e) => setReceiptReference(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "4px" }}>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: "100%", padding: "8px 12px", background: "var(--bg-primary)", border: "1px solid var(--border-subtle)", borderRadius: "8px", color: "var(--text-primary)" }}
            >
              <option value="credit_card">Credit Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "8px 16px", borderRadius: "8px", background: "transparent", border: "1px solid var(--border-subtle)", color: "var(--text-primary)", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ padding: "8px 20px", borderRadius: "8px", background: "var(--brand-cyan)", color: "#000", fontWeight: 600, border: "none", cursor: isSubmitting ? "not-allowed" : "pointer" }}
            >
              {isSubmitting ? "Logging..." : "Submit Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
