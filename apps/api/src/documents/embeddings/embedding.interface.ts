export interface IEmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimension: number;

  isConfigured(): boolean;

  embedText(text: string): Promise<number[]>;

  embedTexts(texts: string[]): Promise<number[][]>;
}
