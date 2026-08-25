import { AgentExecutionContext, ToolDefinition } from "@omnidesk/shared-types";
import { IAIProvider } from "./ai_provider.interface";
import { IAgent, AgentDecision } from "../agents/agent.interface";
import { AppError } from "../../lib/errors";

export class OpenAIProvider implements IAIProvider {
  public readonly name = "openai";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = "gpt-4o") {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || "";
    this.model = model;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  public async generatePlan(
    prompt: string,
    agent: IAgent,
    context: AgentExecutionContext,
    tools: ToolDefinition[],
    stepHistory?: Array<{ thought?: string; toolResult?: any }>
  ): Promise<AgentDecision> {
    if (!this.isConfigured()) {
      throw new AppError(
        "OpenAI API key is missing from environment",
        503,
        "AI_PROVIDER_NOT_CONFIGURED"
      );
    }

    // Call OpenAI Chat Completions API via native fetch
    const systemPrompt = `${agent.systemPrompt(context)}
Output your reasoning and proposed tool call as JSON conforming to:
{
  "thought": "your step-by-step reasoning",
  "toolCall": {
    "toolId": "name_of_tool",
    "arguments": { ... },
    "reason": "why this tool is chosen",
    "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    "requiresApproval": boolean
  },
  "finalResponse": "response text if task is complete without more tools",
  "isComplete": boolean
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(stepHistory || []).map((h) => ({
        role: "assistant",
        content: JSON.stringify(h),
      })),
      { role: "user", content: prompt },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(
        `OpenAI request failed (${res.status}): ${errText}`,
        502,
        "AI_PROVIDER_ERROR"
      );
    }

    const data: any = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AppError("Empty response from OpenAI", 502, "AI_PROVIDER_ERROR");
    }

    return JSON.parse(content) as AgentDecision;
  }

  public async generateResponse(
    prompt: string,
    agent: IAgent,
    context: AgentExecutionContext,
    history: any[]
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new AppError(
        "OpenAI API key is missing from environment",
        503,
        "AI_PROVIDER_NOT_CONFIGURED"
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: agent.systemPrompt(context) },
          ...history,
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(`OpenAI error: ${errText}`, 502, "AI_PROVIDER_ERROR");
    }

    const data: any = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }
}
