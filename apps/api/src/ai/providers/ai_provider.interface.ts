import { AgentExecutionContext, ToolDefinition } from "@omnidesk/shared-types";
import { IAgent, AgentDecision } from "../agents/agent.interface";

export interface IAIProvider {
  readonly name: string;
  isConfigured(): boolean;
  generatePlan(
    prompt: string,
    agent: IAgent,
    context: AgentExecutionContext,
    tools: ToolDefinition[],
    stepHistory?: Array<{ thought?: string; toolResult?: any }>
  ): Promise<AgentDecision>;
  generateResponse(
    prompt: string,
    agent: IAgent,
    context: AgentExecutionContext,
    history: any[]
  ): Promise<string>;
}
