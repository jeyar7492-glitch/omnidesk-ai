import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { financeService } from "../../../finance/services/finance.service";

const FinanceDashboardInputSchema = z.object({
  currency: z.string().optional().describe("Currency filter, e.g. USD, EUR, INR"),
  startDate: z.string().optional().describe("Start date filter in ISO format"),
  endDate: z.string().optional().describe("End date filter in ISO format"),
});

export class FinanceDashboardTool
  implements IAITool<z.infer<typeof FinanceDashboardInputSchema>, any>
{
  public readonly id = "finance_get_dashboard";
  public readonly name = "Get Finance Dashboard Stats";
  public readonly description =
    "Retrieves high-level financial health KPIs including revenue, payments, outstanding receivables, overdue amounts, expenses, and net profit.";
  public readonly parameters = {
    type: "object",
    properties: {
      currency: { type: "string", description: "Currency filter" },
      startDate: { type: "string", description: "Start date (ISO)" },
      endDate: { type: "string", description: "End date (ISO)" },
    },
  };
  public readonly requiredPermissions: string[] = ["finance:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = FinanceDashboardInputSchema;

  public async execute(
    params: z.infer<typeof FinanceDashboardInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const stats = await financeService.getDashboardStats(context.workspaceId, params);
    return {
      currency: stats.currency,
      totalRevenue: stats.totalRevenue,
      paidRevenue: stats.paidRevenue,
      outstandingReceivables: stats.outstandingReceivables,
      overdueReceivables: stats.overdueReceivables,
      totalExpenses: stats.totalExpenses,
      netIncome: stats.netIncome,
      invoiceCount: stats.invoiceCount,
      paidInvoiceCount: stats.paidInvoiceCount,
      overdueInvoiceCount: stats.overdueInvoiceCount,
      pendingExpenseCount: stats.pendingExpenseCount,
      recentPaymentsCount: stats.recentPayments.length,
      recentExpensesCount: stats.recentExpenses.length,
      currencyBreakdown: stats.currencyBreakdown,
    };
  }
}
