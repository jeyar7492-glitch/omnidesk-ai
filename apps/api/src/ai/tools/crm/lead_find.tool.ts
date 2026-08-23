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

const LeadFindInputSchema = z.object({
  query: z.string().optional().describe("Text search across lead titles and notes"),
  stage: DealStageSchema.optional().describe("Filter by lead stage"),
  priority: PriorityLevelSchema.optional().describe("Filter by priority"),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

export class LeadFindTool implements IAITool<z.infer<typeof LeadFindInputSchema>, any> {
  public readonly id = "lead_find";
  public readonly name = "Find Leads";
  public readonly description =
    "Searches and filters sales leads in the workspace by keyword, stage, or priority.";
  public readonly parameters = {
    type: "object",
    properties: {
      query: { type: "string", description: "Search term" },
      stage: {
        type: "string",
        enum: ["QUALIFICATION", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"],
      },
      priority: { type: "string", enum: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      limit: { type: "number", description: "Max leads to return" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = ["lead:read", "crm:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = LeadFindInputSchema;

  public async execute(
    params: z.infer<typeof LeadFindInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const leads = await crmService.findLeads(context.workspaceId, {
      query: params.query,
      stage: params.stage,
      priority: params.priority,
      limit: params.limit,
    });

    return {
      count: leads.length,
      leads: leads.map((l) => ({
        id: l.id,
        title: l.title,
        dealValue: l.dealValue,
        stage: l.stage,
        priority: l.priority,
        customer: l.customer?.companyName || "Unassigned",
        createdAt: l.createdAt.toISOString(),
      })),
    };
  }
}
