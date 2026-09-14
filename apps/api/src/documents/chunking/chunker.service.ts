import crypto from 'crypto';

export interface ChunkOptions {
  targetChunkSize?: number; // Target characters (default 800)
  overlap?: number;         // Overlap characters (default 150)
}

export interface GeneratedChunk {
  chunkIndex: number;
  content: string;
  characterCount: number;
  tokenCount: number;
  contentHash: string;
  metadata?: Record<string, unknown>;
}

export class DocumentChunker {
  public static chunk(
    text: string,
    options: ChunkOptions = {},
    baseMetadata: Record<string, unknown> = {}
  ): GeneratedChunk[] {
    const targetSize = options.targetChunkSize || 800;
    const overlap = options.overlap !== undefined ? options.overlap : 150;

    const trimmed = text.trim();
    if (!trimmed) {
      return [];
    }

    // Split paragraphs
    const paragraphs = trimmed.split(/\r?\n\s*\r?\n/);
    const chunks: GeneratedChunk[] = [];
    let currentBuffer = '';
    let chunkIndex = 0;

    const finalizeChunk = (content: string) => {
      const cleanContent = content.trim();
      if (!cleanContent) return;

      const characterCount = cleanContent.length;
      const tokenCount = Math.ceil(characterCount / 4);
      const contentHash = crypto
        .createHash('sha256')
        .update(cleanContent)
        .digest('hex');

      chunks.push({
        chunkIndex: chunkIndex++,
        content: cleanContent,
        characterCount,
        tokenCount,
        contentHash,
        metadata: {
          ...baseMetadata,
          chunkIndex,
        },
      });
    };

    for (const para of paragraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;

      if (currentBuffer.length + cleanPara.length + 2 <= targetSize) {
        currentBuffer = currentBuffer ? `${currentBuffer}\n\n${cleanPara}` : cleanPara;
      } else {
        // If the single paragraph exceeds targetSize, split by sentences/lines
        if (cleanPara.length > targetSize) {
          // Flush existing buffer first
          if (currentBuffer) {
            finalizeChunk(currentBuffer);
            // Retain overlap from end of buffer
            currentBuffer = currentBuffer.slice(-overlap);
          }

          const sentences = cleanPara.split(/(?<=[.?!])\s+/);
          for (const sentence of sentences) {
            if (currentBuffer.length + sentence.length + 1 <= targetSize) {
              currentBuffer = currentBuffer ? `${currentBuffer} ${sentence}` : sentence;
            } else {
              if (currentBuffer) {
                finalizeChunk(currentBuffer);
                currentBuffer = currentBuffer.slice(-overlap);
              }
              // If a single sentence is still larger than targetSize, hard split
              if (sentence.length > targetSize) {
                let remaining = sentence;
                while (remaining.length > targetSize) {
                  finalizeChunk(remaining.slice(0, targetSize));
                  remaining = remaining.slice(targetSize - overlap);
                }
                currentBuffer = remaining;
              } else {
                currentBuffer = currentBuffer ? `${currentBuffer} ${sentence}` : sentence;
              }
            }
          }
        } else {
          // Normal paragraph flush
          finalizeChunk(currentBuffer);
          const overlapText = currentBuffer.slice(-overlap);
          currentBuffer = `${overlapText}\n\n${cleanPara}`.trim();
        }
      }
    }

    if (currentBuffer.trim()) {
      finalizeChunk(currentBuffer);
    }

    return chunks;
  }
}
