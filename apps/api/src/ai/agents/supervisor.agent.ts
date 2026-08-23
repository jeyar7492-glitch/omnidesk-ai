import { AgentExecutionContext, RiskLevel, ToolCallProposal } from "@omnidesk/shared-types";
import { IAgent } from "./agent.interface";

export class SupervisorAgent implements IAgent {
  public readonly id = "supervisor";
  public readonly name = "OmniDesk Supervisor Agent";
  public readonly description =
    "Central reasoning and orchestrating agent that routes workflows, evaluates permissions, and coordinates tool execution.";
  public readonly capabilities = [
    "system_inspection",
    "workflow_routing",
    "security_validation",
    "approval_coordination",
  ];
  public readonly allowedTools = [
    "system_ping",
    "workspace_info",
    "system_maintenance",
  ];
  public readonly systemInstructions = `You are the OmniDesk AI Supervisor Agent.
Your role is to reason through user requests, determine appropriate actions, select authorized tools, and coordinate execution.
Always prioritize workspace security, data isolation, and human verification for high-risk operations.`;
  public readonly riskPolicy: RiskLevel = "HIGH";
  public readonly maxExecutionSteps = 6;
  public readonly timeoutMs = 30000;

  public systemPrompt(context: AgentExecutionContext): string {
    return `${this.systemInstructions}
CURRENT EXECUTION CONTEXT:
- Workspace ID: ${context.workspaceId}
- User ID: ${context.userId}
- User Role: ${context.userRole}
- User Permissions: ${context.userPermissions.join(", ") || "none"}

AVAILABLE TOOLS:
${this.allowedTools.join(", ")}

RULES:
1. Never invent tools or parameters.
2. All operations are strictly confined to workspace '${context.workspaceId}'.
3. Any destructive or configuration-changing actions are marked as HIGH risk and require human approval.`;
  }

  public evaluateRisk(proposal: ToolCallProposal): RiskLevel {
    if (proposal.toolId === "system_maintenance") {
      return "HIGH";
    }
    return proposal.riskLevel || "LOW";
  }
}
