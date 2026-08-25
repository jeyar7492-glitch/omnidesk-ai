import { AgentExecutionContext, ToolDefinition } from "@omnidesk/shared-types";
import { IAIProvider } from "./ai_provider.interface";
import { IAgent, AgentDecision } from "../agents/agent.interface";
import { AppError } from "../../lib/errors";

export class GeminiProvider implements IAIProvider {
  public readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model = "gemini-1.5-pro") {
    this.apiKey = apiKey || process.env.GEMINI_API_KEY || "";
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
        "Gemini API key is missing from environment",
        503,
        "AI_PROVIDER_NOT_CONFIGURED"
      );
    }

    const systemPrompt = `${agent.systemPrompt(context)}
Tools: ${JSON.stringify(tools)}
Format your response as a valid JSON object matching:
{
  "thought": "reasoning string",
  "toolCall": { "toolId": "string", "arguments": {}, "reason": "string", "riskLevel": "LOW", "requiresApproval": false },
  "finalResponse": "final string if completed",
  "isComplete": true/false
}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\nTask: ${prompt}\n\nHistory: ${JSON.stringify(stepHistory || [])}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(`Gemini API error (${res.status}): ${errText}`, 502, "AI_PROVIDER_ERROR");
    }

    const data: any = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new AppError("Empty response from Gemini API", 502, "AI_PROVIDER_ERROR");
    }

    return JSON.parse(text) as AgentDecision;
  }

  public async generateResponse(
    prompt: string,
    agent: IAgent,
    context: AgentExecutionContext,
    history: any[]
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new AppError(
        "Gemini API key is missing from environment",
        503,
        "AI_PROVIDER_NOT_CONFIGURED"
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${agent.systemPrompt(context)}\n\nPrompt: ${prompt}` }],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(`Gemini error: ${errText}`, 502, "AI_PROVIDER_ERROR");
    }

    const data: any = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}
