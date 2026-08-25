import { z } from "zod";
import { AgentExecutionContext, RiskLevel, ToolDefinition } from "@omnidesk/shared-types";

export interface IAITool<TParams = any, TResult = any> extends ToolDefinition {
  schema: z.ZodType<TParams, any, any>;
  execute(params: TParams, context: AgentExecutionContext): Promise<TResult>;
}
