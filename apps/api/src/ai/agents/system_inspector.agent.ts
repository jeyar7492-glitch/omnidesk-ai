import { AgentExecutionContext, RiskLevel, ToolCallProposal } from "@omnidesk/shared-types";
import { IAgent } from "./agent.interface";

export class SystemInspectorAgent implements IAgent {
  public readonly id = "system_inspector";
  public readonly name = "System Inspector Agent";
  public readonly description =
    "Specialized diagnostic agent that inspects workspace configuration, health metrics, and active service statuses.";
  public readonly capabilities = ["read_diagnostics", "check_health", "workspace_lookup"];
  public readonly allowedTools = ["system_ping", "workspace_info"];
  public readonly systemInstructions =
    "You are a diagnostic inspection agent. Perform safe, read-only system and workspace inspections.";
  public readonly riskPolicy: RiskLevel = "LOW";
  public readonly maxExecutionSteps = 3;
  public readonly timeoutMs = 15000;

  public systemPrompt(context: AgentExecutionContext): string {
    return `${this.systemInstructions}
Context: Workspace=${context.workspaceId}, Role=${context.userRole}`;
  }

  public evaluateRisk(_proposal: ToolCallProposal): RiskLevel {
    return "LOW";
  }
}
