import { AgentContract, AgentExecutionContext, RiskLevel, ToolCallProposal } from "@omnidesk/shared-types";

export interface AgentDecision {
  thought: string;
  toolCall?: ToolCallProposal;
  finalResponse?: string;
  isComplete: boolean;
}

export interface IAgent extends AgentContract {
  systemPrompt(context: AgentExecutionContext): string;
  evaluateRisk(proposal: ToolCallProposal): RiskLevel;
}
