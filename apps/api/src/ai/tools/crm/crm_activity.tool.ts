import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { crmService } from "../../../crm/services/crm.service";

const CRMActivityInputSchema = z.object({
  entityType: z.enum(["lead", "deal", "customer", "contact"]),
  entityId: z.string().min(1, "Entity ID is required"),
  type: z.enum(["note", "call", "meeting", "email", "follow_up"]).default("note"),
  title: z.string().min(1, "Activity title is required"),
  content: z.string().optional(),
  dueDate: z.string().optional().describe("Due date for follow-up (ISO string)"),
});

export class CRMActivityTool implements IAITool<z.infer<typeof CRMActivityInputSchema>, any> {
  public readonly id = "crm_activity";
  public readonly name = "Record CRM Activity / Note";
  public readonly description =
    "Logs a note, call interaction, meeting summary, or follow-up reminder on a lead, deal, customer, or contact.";
  public readonly parameters = {
    type: "object",
    properties: {
      entityType: { type: "string", enum: ["lead", "deal", "customer", "contact"] },
      entityId: { type: "string", description: "Target entity unique ID" },
      type: { type: "string", enum: ["note", "call", "meeting", "email", "follow_up"] },
      title: { type: "string", description: "Activity subject or note title" },
      content: { type: "string", description: "Details, minutes, or transcript" },
      dueDate: { type: "string", description: "Follow-up due date ISO string" },
    },
    required: ["entityType", "entityId", "title"],
  };
  public readonly requiredPermissions: string[] = ["crm:write"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = CRMActivityInputSchema;

  public async execute(
    params: z.infer<typeof CRMActivityInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const activity = await crmService.logActivity(context.workspaceId, {
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      title: params.title,
      content: params.content,
      dueDate: params.dueDate ? new Date(params.dueDate) : undefined,
      userId: context.userId,
    });

    return {
      id: activity.id,
      entityType: activity.entityType,
      entityId: activity.entityId,
      type: activity.type,
      title: activity.title,
      dueDate: activity.dueDate?.toISOString(),
      createdAt: activity.createdAt.toISOString(),
    };
  }
}
