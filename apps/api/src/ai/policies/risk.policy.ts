import { RiskLevel, ToolCallProposal } from "@omnidesk/shared-types";
import { toolRegistry } from "../tools/tool.registry";

export class RiskPolicyEngine {
  public static evaluateRisk(proposal: ToolCallProposal): RiskLevel {
    const tool = toolRegistry.getTool(proposal.toolId);
    if (!tool) {
      return "CRITICAL";
    }

    // Default to the tool's defined risk level
    let evaluatedRisk: RiskLevel = tool.riskLevel;

    // Check for high-risk action keywords in parameters
    const paramStr = JSON.stringify(proposal.arguments || {}).toLowerCase();
    if (
      paramStr.includes("drop") ||
      paramStr.includes("delete_all") ||
      paramStr.includes("truncate") ||
      paramStr.includes("rotate_keys")
    ) {
      evaluatedRisk = "HIGH";
    }

    return evaluatedRisk;
  }

  public static requiresHumanApproval(riskLevel: RiskLevel): boolean {
    return riskLevel === "HIGH" || riskLevel === "CRITICAL";
  }
}
