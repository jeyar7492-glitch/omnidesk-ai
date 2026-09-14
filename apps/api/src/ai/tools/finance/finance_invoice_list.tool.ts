import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { financeService } from "../../../finance/services/finance.service";

const FinanceInvoiceListInputSchema = z.object({
  customerId: z.string().optional().describe("Filter by customer ID"),
  projectId: z.string().optional().describe("Filter by project ID"),
  status: z
    .enum(["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"])
    .optional()
    .describe("Filter by invoice status"),
  currency: z.string().optional().describe("Currency code, e.g. USD"),
  search: z.string().optional().describe("Search term in invoice number or notes"),
  limit: z.number().optional().default(10).describe("Maximum number of invoices to return"),
});

export class FinanceInvoiceListTool
  implements IAITool<z.infer<typeof FinanceInvoiceListInputSchema>, any>
{
  public readonly id = "finance_list_invoices";
  public readonly name = "List Invoices";
  public readonly description =
    "Queries and lists invoices in the current workspace with status, customer, and date filtering.";
  public readonly parameters = {
    type: "object",
    properties: {
      customerId: { type: "string", description: "Customer ID" },
      projectId: { type: "string", description: "Project ID" },
      status: { type: "string", description: "Status filter" },
      currency: { type: "string", description: "Currency filter" },
      search: { type: "string", description: "Search query" },
      limit: { type: "number", description: "Result limit" },
    },
  };
  public readonly requiredPermissions: string[] = ["finance:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = FinanceInvoiceListInputSchema;

  public async execute(
    params: z.infer<typeof FinanceInvoiceListInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const result = await financeService.listInvoices(context.workspaceId, {
      customerId: params.customerId,
      projectId: params.projectId,
      status: params.status,
      currency: params.currency,
      search: params.search,
      limit: params.limit,
    });

    return {
      total: result.total,
      invoices: result.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customer?.companyName,
        project: inv.project?.name,
        status: inv.status,
        currency: inv.currency,
        totalAmount: inv.totalAmount,
        amountPaid: inv.amountPaid,
        amountDue: inv.amountDue,
        issueDate: inv.issueDate.toISOString().split("T")[0],
        dueDate: inv.dueDate.toISOString().split("T")[0],
      })),
    };
  }
}
