import { IAIProvider } from "./ai_provider.interface";
import { OpenAIProvider } from "./openai.provider";
import { GeminiProvider } from "./gemini.provider";
import { NoopProvider } from "./noop.provider";

export class AIProviderFactory {
  private static customProvider: IAIProvider | null = null;

  public static setCustomProvider(provider: IAIProvider | null): void {
    AIProviderFactory.customProvider = provider;
  }

  public static getProvider(): IAIProvider {
    if (AIProviderFactory.customProvider) {
      return AIProviderFactory.customProvider;
    }

    const providerType = process.env.AI_PROVIDER?.toLowerCase();

    if (providerType === "openai" || process.env.OPENAI_API_KEY) {
      return new OpenAIProvider();
    }

    if (providerType === "gemini" || process.env.GEMINI_API_KEY) {
      return new GeminiProvider();
    }

    return new NoopProvider();
  }
}
