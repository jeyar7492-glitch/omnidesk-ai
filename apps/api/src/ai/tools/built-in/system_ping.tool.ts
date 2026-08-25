import { z } from "zod";
import { AgentExecutionContext, RiskLevel } from "@omnidesk/shared-types";
import { IAITool } from "../tool.interface";

const PingInputSchema = z.object({
  echo: z.string().optional().default("pong"),
});

export class SystemPingTool implements IAITool<z.infer<typeof PingInputSchema>, { echo: string; timestamp: string; status: string }> {
  public readonly id = "system_ping";
  public readonly name = "System Diagnostic Ping";
  public readonly description = "Sends a lightweight diagnostic health ping to verify subsystem responsiveness.";
  public readonly parameters = {
    type: "object",
    properties: {
      echo: { type: "string", description: "Optional echo message payload" },
    },
    required: [],
  };
  public readonly requiredPermissions: string[] = [];
  public readonly riskLevel: RiskLevel = "LOW";
  public readonly workspaceScoped = false;
  public readonly schema = PingInputSchema;

  public async execute(
    params: z.infer<typeof PingInputSchema>,
    _context: AgentExecutionContext
  ): Promise<{ echo: string; timestamp: string; status: string }> {
    return {
      echo: params.echo,
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
