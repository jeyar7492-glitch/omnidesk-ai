import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { financeService } from "../../../finance/services/finance.service";

const FinancePaymentListInputSchema = z.object({
  invoiceId: z.string().optional().describe("Filter payments by invoice ID"),
  customerId: z.string().optional().describe("Filter payments by customer ID"),
  limit: z.number().optional().default(10).describe("Maximum number of payments to return"),
});

export class FinancePaymentListTool
  implements IAITool<z.infer<typeof FinancePaymentListInputSchema>, any>
{
  public readonly id = "finance_list_payments";
  public readonly name = "List Payments";
  public readonly description =
    "Queries and lists recorded payments with invoice and customer context.";
  public readonly parameters = {
    type: "object",
    properties: {
      invoiceId: { type: "string", description: "Invoice ID" },
      customerId: { type: "string", description: "Customer ID" },
      limit: { type: "number", description: "Limit" },
    },
  };
  public readonly requiredPermissions: string[] = ["finance:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = FinancePaymentListInputSchema;

  public async execute(
    params: z.infer<typeof FinancePaymentListInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const result = await financeService.listPayments(context.workspaceId, {
      invoiceId: params.invoiceId,
      customerId: params.customerId,
      limit: params.limit,
    });

    return {
      total: result.total,
      payments: result.payments.map((p) => ({
        id: p.id,
        invoiceNumber: p.invoice?.invoiceNumber,
        customer: p.customer?.companyName,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate.toISOString().split("T")[0],
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
      })),
    };
  }
}
