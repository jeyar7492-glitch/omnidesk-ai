import { z } from 'zod';
import { AgentExecutionContext, RiskLevel } from '@omnidesk/shared-types';
import { IAITool } from '../tool.interface';
import { RetrievalService } from '../../../documents/services/retrieval.service';

const KnowledgeGetContextInputSchema = z.object({
  query: z.string().min(1, 'Question or search query is required').describe('The question or query for which to assemble knowledge context'),
  knowledgeBaseId: z.string().optional().describe('Optional Knowledge Base ID to focus on'),
  topK: z.number().int().positive().max(10).optional().default(5).describe('Number of context passages to retrieve'),
});

export class KnowledgeGetDocumentContextTool implements IAITool<z.infer<typeof KnowledgeGetContextInputSchema>, any> {
  public readonly id = 'knowledge_get_document_context';
  public readonly name = 'Get Document Context (RAG)';
  public readonly description =
    'Builds source-cited, verified document context passages from enterprise knowledge base for grounded answering.';
  public readonly parameters = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The question or prompt needing factual knowledge context' },
      knowledgeBaseId: { type: 'string', description: 'Optional knowledge base filter' },
      topK: { type: 'number', description: 'Max context passages to retrieve (default 5)' },
    },
    required: ['query'],
  };
  public readonly requiredPermissions: string[] = ['knowledgebase:read', 'documents:read'];
  public readonly riskLevel: RiskLevel = 'LOW';
  public readonly workspaceScoped = true;
  public readonly schema = KnowledgeGetContextInputSchema;

  public async execute(
    params: z.infer<typeof KnowledgeGetContextInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const retrievalService = RetrievalService.getInstance();

    const ragContext = await retrievalService.buildRAGContext({
      workspaceId: context.workspaceId,
      query: params.query,
      knowledgeBaseId: params.knowledgeBaseId,
      topK: params.topK || 5,
    });

    return {
      query: ragContext.query,
      itemCount: ragContext.items.length,
      items: ragContext.items.map((it) => ({
        citation: it.citation,
        content: it.content,
        documentName: it.documentName,
        score: it.score,
      })),
      formattedContext: ragContext.formattedContext,
      retrievedAt: ragContext.retrievedAt,
    };
  }
}
