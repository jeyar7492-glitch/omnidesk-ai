import { AgentExecutionContext, ToolDefinition } from "@omnidesk/shared-types";
import { IAIProvider } from "./ai_provider.interface";
import { IAgent, AgentDecision } from "../agents/agent.interface";

export class TestMockProvider implements IAIProvider {
  public readonly name = "test-mock-provider";
  private planQueue: AgentDecision[] = [];

  constructor(plans?: AgentDecision[]) {
    if (plans) {
      this.planQueue = [...plans];
    }
  }

  public setPlans(plans: AgentDecision[]): void {
    this.planQueue = [...plans];
  }

  public isConfigured(): boolean {
    return true;
  }

  public async generatePlan(
    _prompt: string,
    _agent: IAgent,
    _context: AgentExecutionContext,
    _tools: ToolDefinition[],
    _stepHistory?: any[]
  ): Promise<AgentDecision> {
    if (this.planQueue.length > 0) {
      return this.planQueue.shift()!;
    }
    return {
      thought: "No more planned steps, task complete.",
      isComplete: true,
      finalResponse: "Default test completion response.",
    };
  }

  public async generateResponse(
    _prompt: string,
    _agent: IAgent,
    _context: AgentExecutionContext,
    _history: any[]
  ): Promise<string> {
    return "Mock direct response";
  }
}
