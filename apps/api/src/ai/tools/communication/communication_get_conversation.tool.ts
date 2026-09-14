import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";
import { CommunicationService } from "../../../communication/services/communication.service";

const CommunicationGetConversationInputSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required").describe("The ID of the conversation to inspect"),
});

export class CommunicationGetConversationTool
  implements IAITool<z.infer<typeof CommunicationGetConversationInputSchema>, any>
{
  public readonly id = "communication_get_conversation";
  public readonly name = "Get Conversation Details";
  public readonly description =
    "Retrieves metadata, member list, and presence information for a conversation where the user is an authorized member.";
  public readonly parameters = {
    type: "object",
    properties: {
      conversationId: { type: "string", description: "The ID of the conversation" },
    },
    required: ["conversationId"],
  };
  public readonly requiredPermissions: string[] = ["communication:read"];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = true;
  public readonly schema = CommunicationGetConversationInputSchema;

  public async execute(
    params: z.infer<typeof CommunicationGetConversationInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const service = CommunicationService.getInstance();
    const conv = await service.getConversation(context.workspaceId, context.userId, params.conversationId);

    return {
      found: true,
      conversation: {
        id: conv.id,
        type: conv.type,
        title: conv.title || (conv.otherMember ? `${conv.otherMember.firstName} ${conv.otherMember.lastName}` : "Direct Message"),
        description: conv.description,
        createdById: conv.createdById,
        lastMessageAt: conv.lastMessageAt,
        membersCount: conv.members.length,
        members: conv.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user ? `${m.user.firstName} ${m.user.lastName}` : "Unknown",
          email: m.user?.email,
        })),
      },
    };
  }
}
