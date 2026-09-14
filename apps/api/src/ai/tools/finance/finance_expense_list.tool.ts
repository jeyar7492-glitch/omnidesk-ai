import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { financeService } from "../../../finance/services/finance.service";

const FinanceExpenseListInputSchema = z.object({
  vendor: z.string().optional().describe("Search or filter by vendor"),
  approvalStatus: z
    .enum(["pending", "approved", "rejected"])
    .optional()
    .describe("Filter by expense approval status"),
  projectId: z.string().optional().describe("Filter by project ID"),
  categoryId: z.string().optional().describe("Filter by category ID"),
  currency: z.string().optional().describe("Currency code, e.g. USD"),
  limit: z.number().optional().default(10).describe("Maximum results to return"),
});

export class FinanceExpenseListTool
  implements IAITool<z.infer<typeof FinanceExpenseListInputSchema>, any>
{
  public readonly id = "finance_list_expenses";
  public readonly name = "List Expenses";
  public readonly description =
    "Queries expenses with category, project, vendor, and approval status filters.";
  public readonly parameters = {
    type: "object",
    properties: {
      vendor: { type: "string", description: "Vendor name" },
      approvalStatus: { type: "string", description: "Status: pending, approved, rejected" },
      projectId: { type: "string", description: "Project ID" },
      categoryId: { type: "string", description: "Category ID" },
      currency: { type: "string", description: "Currency code" },
      limit: { type: "number", description: "Limit" },
    },
  };
  public readonly requiredPermissions: string[] = ["finance:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = FinanceExpenseListInputSchema;

  public async execute(
    params: z.infer<typeof FinanceExpenseListInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const result = await financeService.listExpenses(context.workspaceId, {
      vendor: params.vendor,
      approvalStatus: params.approvalStatus,
      projectId: params.projectId,
      categoryId: params.categoryId,
      currency: params.currency,
      limit: params.limit,
    });

    return {
      total: result.total,
      expenses: result.expenses.map((e) => ({
        id: e.id,
        vendor: e.vendor,
        description: e.description,
        category: e.category?.name || "General",
        project: e.project?.name,
        amount: e.amount,
        currency: e.currency,
        approvalStatus: e.approvalStatus,
        expenseDate: e.expenseDate.toISOString().split("T")[0],
        paymentMethod: e.paymentMethod,
        receiptReference: e.receiptReference,
      })),
    };
  }
}
