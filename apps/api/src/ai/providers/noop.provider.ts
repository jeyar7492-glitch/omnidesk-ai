import { AgentExecutionContext, ToolDefinition } from "@omnidesk/shared-types";
import { IAIProvider } from "./ai_provider.interface";
import { IAgent, AgentDecision } from "../agents/agent.interface";
import { AppError } from "../../lib/errors";

export class NoopProvider implements IAIProvider {
  public readonly name = "noop-unconfigured";

  public isConfigured(): boolean {
    return false;
  }

  public async generatePlan(
    _prompt: string,
    _agent: IAgent,
    _context: AgentExecutionContext,
    _tools: ToolDefinition[],
    _stepHistory?: any[]
  ): Promise<AgentDecision> {
    throw new AppError(
      "No valid AI Provider credentials configured in environment. Set OPENAI_API_KEY, GEMINI_API_KEY, or ANTHROPIC_API_KEY to enable LLM reasoning.",
      503,
      "AI_PROVIDER_NOT_CONFIGURED"
    );
  }

  public async generateResponse(
    _prompt: string,
    _agent: IAgent,
    _context: AgentExecutionContext,
    _history: any[]
  ): Promise<string> {
    throw new AppError(
      "No valid AI Provider credentials configured in environment.",
      503,
      "AI_PROVIDER_NOT_CONFIGURED"
    );
  }
}
