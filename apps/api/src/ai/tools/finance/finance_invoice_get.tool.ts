import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { financeService } from "../../../finance/services/finance.service";

const FinanceInvoiceGetInputSchema = z.object({
  invoiceId: z.string().describe("The unique ObjectId of the invoice to retrieve"),
});

export class FinanceInvoiceGetTool
  implements IAITool<z.infer<typeof FinanceInvoiceGetInputSchema>, any>
{
  public readonly id = "finance_get_invoice";
  public readonly name = "Get Invoice Details";
  public readonly description =
    "Retrieves full invoice details including client information, line items, taxes, discounts, and payment history.";
  public readonly parameters = {
    type: "object",
    properties: {
      invoiceId: { type: "string", description: "Invoice ObjectId" },
    },
    required: ["invoiceId"],
  };
  public readonly requiredPermissions: string[] = ["finance:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = FinanceInvoiceGetInputSchema;

  public async execute(
    params: z.infer<typeof FinanceInvoiceGetInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const invoice = await financeService.getInvoice(context.workspaceId, params.invoiceId);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customer: invoice.customer?.companyName,
      project: invoice.project?.name,
      status: invoice.status,
      currency: invoice.currency,
      issueDate: invoice.issueDate.toISOString().split("T")[0],
      dueDate: invoice.dueDate.toISOString().split("T")[0],
      subtotal: invoice.subtotal,
      discountAmount: invoice.discountAmount,
      taxRate: invoice.taxRate,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      amountPaid: invoice.amountPaid,
      amountDue: invoice.amountDue,
      notes: invoice.notes,
      terms: invoice.terms,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        discountAmount: item.discountAmount,
        lineTotal: item.lineTotal,
      })),
      payments: invoice.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        paymentDate: p.paymentDate.toISOString().split("T")[0],
        paymentMethod: p.paymentMethod,
        reference: p.reference,
      })),
    };
  }
}
