import { z } from 'zod';
import { AgentExecutionContext, RiskLevel } from '@omnidesk/shared-types';
import { IAITool } from '../tool.interface';
import { DocumentService } from '../../../documents/services/document.service';

const KnowledgeGetDocumentInputSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required').describe('The unique ID of the document to retrieve'),
});

export class KnowledgeGetDocumentTool implements IAITool<z.infer<typeof KnowledgeGetDocumentInputSchema>, any> {
  public readonly id = 'knowledge_get_document';
  public readonly name = 'Get Document Details';
  public readonly description =
    'Retrieves document metadata, version history, knowledge base memberships, and extracted text preview by document ID.';
  public readonly parameters = {
    type: 'object',
    properties: {
      documentId: { type: 'string', description: 'Unique document ID' },
    },
    required: ['documentId'],
  };
  public readonly requiredPermissions: string[] = ['documents:read'];
  public readonly riskLevel: RiskLevel = 'LOW';
  public readonly workspaceScoped = true;
  public readonly schema = KnowledgeGetDocumentInputSchema;

  public async execute(
    params: z.infer<typeof KnowledgeGetDocumentInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const documentService = DocumentService.getInstance();
    const doc = await documentService.getDocument(context.workspaceId, params.documentId);

    if (!doc) {
      throw new Error(`Document not found or access denied: ${params.documentId}`);
    }

    return {
      id: doc.id,
      name: doc.name,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      extension: doc.extension,
      sizeBytes: doc.sizeBytes,
      status: doc.status,
      category: doc.category,
      description: doc.description,
      versionCount: doc.versions.length,
      currentVersion: doc.versionNumber,
      knowledgeBases: doc.knowledgeBases.map((kb) => kb.name),
      extractedTextPreview: doc.extractedTextSnippet,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
