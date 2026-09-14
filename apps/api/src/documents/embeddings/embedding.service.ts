import { IEmbeddingProvider } from './embedding.interface';

export class DefaultEmbeddingProvider implements IEmbeddingProvider {
  public readonly name = 'openai-compatible';
  public readonly model: string;
  public readonly dimension: number;
  private readonly apiKey: string | null;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || null;
    this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
    this.dimension = 1536;
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0 && !this.apiKey.startsWith('mock_'));
  }

  public async embedText(text: string): Promise<number[]> {
    if (!this.isConfigured()) {
      return [];
    }

    const results = await this.embedTexts([text]);
    return results[0] || [];
  }

  public async embedTexts(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured()) {
      return texts.map(() => []);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      return (data.data || []).map((item: any) => item.embedding);
    } catch (err: any) {
      console.warn(`[DefaultEmbeddingProvider] Embedding generation failed: ${err.message}`);
      return texts.map(() => []);
    }
  }
}

let activeEmbeddingProvider: IEmbeddingProvider | null = null;

export function getEmbeddingProvider(): IEmbeddingProvider {
  if (!activeEmbeddingProvider) {
    activeEmbeddingProvider = new DefaultEmbeddingProvider();
  }
  return activeEmbeddingProvider;
}

export function setEmbeddingProvider(provider: IEmbeddingProvider): void {
  activeEmbeddingProvider = provider;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0 || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
