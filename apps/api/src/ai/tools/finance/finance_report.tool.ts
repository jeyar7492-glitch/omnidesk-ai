import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { financeService } from "../../../finance/services/finance.service";

const FinanceReportInputSchema = z.object({
  reportType: z
    .enum([
      "revenue",
      "expenses",
      "profit_loss",
      "receivables",
      "overdue",
      "customer_revenue",
      "project_profitability",
    ])
    .describe("Type of financial report to generate"),
  currency: z.string().optional().describe("Currency code, e.g. USD"),
  startDate: z.string().optional().describe("Start date filter in ISO format"),
  endDate: z.string().optional().describe("End date filter in ISO format"),
});

export class FinanceReportTool implements IAITool<z.infer<typeof FinanceReportInputSchema>, any> {
  public readonly id = "finance_get_report";
  public readonly name = "Generate Financial Report";
  public readonly description =
    "Generates structured financial intelligence reports (revenue, expenses, P&L, AR aging, overdue receivables, customer revenue, project profitability).";
  public readonly parameters = {
    type: "object",
    properties: {
      reportType: {
        type: "string",
        enum: [
          "revenue",
          "expenses",
          "profit_loss",
          "receivables",
          "overdue",
          "customer_revenue",
          "project_profitability",
        ],
        description: "Report type",
      },
      currency: { type: "string", description: "Currency code" },
      startDate: { type: "string", description: "Start date (ISO)" },
      endDate: { type: "string", description: "End date (ISO)" },
    },
    required: ["reportType"],
  };
  public readonly requiredPermissions: string[] = ["finance:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = FinanceReportInputSchema;

  public async execute(
    params: z.infer<typeof FinanceReportInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const wsId = context.workspaceId;

    switch (params.reportType) {
      case "revenue":
        return financeService.getRevenueReport(wsId, params);
      case "expenses":
        return financeService.getExpenseReport(wsId, params);
      case "profit_loss":
        return financeService.getProfitLossReport(wsId, params);
      case "receivables":
        return financeService.getReceivablesReport(wsId, params);
      case "overdue":
        return financeService.getOverdueReport(wsId, params);
      case "customer_revenue":
        return financeService.getCustomerRevenueReport(wsId, params);
      case "project_profitability":
        return financeService.getProjectProfitabilityReport(wsId, params);
      default:
        throw new Error(`Unsupported report type: ${params.reportType}`);
    }
  }
}
