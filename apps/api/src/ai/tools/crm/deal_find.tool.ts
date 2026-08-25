import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const DealStageSchema = z.enum([
  "QUALIFICATION",
  "CONTACTED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
]);

const PriorityLevelSchema = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);

const DealFindInputSchema = z.object({
  query: z.string().optional().describe("Search query in deal title"),
  stage: DealStageSchema.optional().describe("Filter by pipeline stage"),
  priority: PriorityLevelSchema.optional().describe("Filter by priority"),
  minAmount: z.number().optional().describe("Minimum deal value"),
  maxAmount: z.number().optional().describe("Maximum deal value"),
  customerId: z.string().optional().describe("Filter by customer ID"),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export class DealFindTool implements IAITool<z.infer<typeof DealFindInputSchema>, any> {
  public readonly id = "deal_find";
  public readonly name = "Find Deals";
  public readonly description =
    "Searches and filters deals in the pipeline by stage, monetary value range, customer, or title.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keyword" },
      stage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
      },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      minAmount: { type: "number", description: "Minimum deal amount" },
      maxAmount: { type: "number", description: "Maximum deal amount" },
      limit: { type: "number", description: "Max results" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["deal:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = DealFindInputSchema;

  public async execute(
    params: z.infer<typeof DealFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const deals = await crmService.findDeals(context.workspaceId, params);

    return {
      count: deals.length,
      deals: deals.map((d) => ({
        id: d.id,
        title: d.title,
        dealValue: d.dealValue,
        stage: d.stage,
        probability: d.probability,
        priority: d.priority,
        customer: d.customer?.companyName || "No Company Linked",
        expectedClose: d.expectedClose?.toISOString(),
      })),
    };
  }
}
