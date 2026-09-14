// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

export interface ExtractionResult {
  text: string;
  pageCount?: number;
  metadata?: Record<string, unknown>;
  extractedSections?: Array<{
    title?: string;
    content: string;
    page?: number;
  }>;
}

export class TextExtractor {
  public static async extract(
    buffer: Buffer,
    extension: string,
    mimeType: string
  ): Promise<ExtractionResult> {
    const ext = extension.toLowerCase().replace(/^\./, '');
    const mime = mimeType.toLowerCase();

    // 1. PDF
    if (ext === 'pdf' || mime === 'application/pdf') {
      return await this.extractPdf(buffer);
    }

    // 2. DOCX
    if (
      ext === 'docx' ||
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await this.extractDocx(buffer);
    }

    // 3. Plain text & Markdown
    if (
      ext === 'txt' ||
      ext === 'text' ||
      ext === 'md' ||
      ext === 'markdown' ||
      mime.startsWith('text/plain') ||
      mime.startsWith('text/markdown')
    ) {
      return this.extractPlainText(buffer);
    }

    // 4. CSV
    if (ext === 'csv' || mime === 'text/csv') {
      return this.extractCsv(buffer);
    }

    // 5. JSON
    if (ext === 'json' || mime === 'application/json') {
      return this.extractJson(buffer);
    }

    throw new Error(
      `Unsupported file type for text extraction: .${ext} (${mimeType}). Supported types: PDF, DOCX, TXT, MD, CSV, JSON`
    );
  }

  private static async extractPdf(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();
      
      // If PDF has no text extracted (e.g. scanned image only), note clearly
      if (!text) {
        return {
          text: '',
          pageCount: data.numpages || 0,
          metadata: {
            info: data.info || {},
            note: 'No extractable text found in PDF. Scanned images require OCR which is not currently enabled.',
          },
        };
      }

      return {
        text,
        pageCount: data.numpages || 1,
        metadata: {
          info: data.info || {},
        },
      };
    } catch (err: any) {
      throw new Error(`Failed to parse PDF document: ${err.message || 'Corrupt or unreadable PDF'}`);
    }
  }

  private static async extractDocx(buffer: Buffer): Promise<ExtractionResult> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      return {
        text,
        metadata: {
          messages: result.messages || [],
        },
      };
    } catch (err: any) {
      throw new Error(`Failed to parse DOCX document: ${err.message || 'Corrupt or unreadable DOCX'}`);
    }
  }

  private static extractPlainText(buffer: Buffer): ExtractionResult {
    const text = buffer.toString('utf-8').trim();
    return {
      text,
    };
  }

  private static extractCsv(buffer: Buffer): ExtractionResult {
    const raw = buffer.toString('utf-8').trim();
    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    
    if (lines.length === 0) {
      return { text: '' };
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1);
    
    const formattedRows = rows.map((row, idx) => {
      const cells = row.split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const rowDesc = headers
        .map((h, i) => `${h}: ${cells[i] || ''}`)
        .join(' | ');
      return `Row ${idx + 1}: ${rowDesc}`;
    });

    const text = [
      `Headers: ${headers.join(', ')}`,
      ...formattedRows,
    ].join('\n');

    return {
      text,
      metadata: {
        totalRows: lines.length - 1,
        columns: headers,
      },
    };
  }

  private static extractJson(buffer: Buffer): ExtractionResult {
    const raw = buffer.toString('utf-8').trim();
    try {
      const parsed = JSON.parse(raw);
      const text = JSON.stringify(parsed, null, 2);
      return {
        text,
        metadata: {
          isStructured: true,
          topLevelKeys: typeof parsed === 'object' && parsed !== null ? Object.keys(parsed) : [],
        },
      };
    } catch {
      // Fallback to raw text if json malformed
      return {
        text: raw,
      };
    }
  }
}
