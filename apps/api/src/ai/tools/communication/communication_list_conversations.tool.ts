import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { CommunicationService } from "../../../communication/services/communication.service";

const CommunicationListConversationsInputSchema = z.object({
  type: z.enum(["DIRECT", "GROUP"]).optional().describe("Filter by conversation type"),
  isArchived: z.boolean().optional().describe("Filter by archived state"),
  limit: z.number().int().positive().max(50).optional().default(20).describe("Maximum conversations to retrieve"),
});

export class CommunicationListConversationsTool
  implements IAITool<z.infer<typeof CommunicationListConversationsInputSchema>, any>
{
  public readonly id = "communication_list_conversations";
  public readonly name = "List Conversations";
  public readonly description =
    "Retrieves the active direct and group conversations for the authenticated user in the workspace.";
  public readonly parameters = {
    type: "object",
    properties: {
      type: { type: "string", enum: ["DIRECT", "GROUP"], description: "Filter by conversation type" },
      isArchived: { type: "boolean", description: "Filter by archived state" },
      limit: { type: "number", description: "Maximum conversations to retrieve" },
    },
  };
  public readonly requiredPermissions: string[] = ["communication:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = CommunicationListConversationsInputSchema;

  public async execute(
    params: z.infer<typeof CommunicationListConversationsInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = CommunicationService.getInstance();
    const result = await service.listConversations(context.workspaceId, context.userId, {
      type: params.type as any,
      isArchived: params.isArchived,
      limit: params.limit,
    });

    return {
      total: result.total,
      conversations: result.conversations.map((c) => ({
        id: c.id,
        type: c.type,
        title: c.title || (c.otherMember ? `${c.otherMember.firstName} ${c.otherMember.lastName}` : "Direct Message"),
        membersCount: c.membersCount,
        unreadCount: c.unreadCount,
        lastMessageText: c.lastMessageText,
        lastMessageAt: c.lastMessageAt,
      })),
    };
  }
}
