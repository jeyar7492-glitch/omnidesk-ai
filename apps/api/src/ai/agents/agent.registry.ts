import { IAgent } from "./agent.interface";
import { SupervisorAgent } from "./supervisor.agent";
import { SystemInspectorAgent } from "./system_inspector.agent";
import { NotFoundError } from "../../lib/errors";

export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, IAgent> = new Map();

  private constructor() {
    this.registerAgent(new SupervisorAgent());
    this.registerAgent(new SystemInspectorAgent());
  }

  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  public registerAgent(agent: IAgent): void {
    this.agents.set(agent.id, agent);
  }

  public getAgent(agentId: string): IAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new NotFoundError(`Agent '${agentId}' is not registered`);
    }
    return agent;
  }

  public listAgents(): IAgent[] {
    return Array.from(this.agents.values());
  }
}

export const agentRegistry = AgentRegistry.getInstance();
