import { z } from 'zod';
import { AgentExecutionContext, RiskLevel } from '@omnidesk/shared-types';
import { IAITool } from '../tool.interface';
import { RetrievalService } from '../../../documents/services/retrieval.service';

const KnowledgeSearchInputSchema = z.object({
  query: z.string().min(1, 'Search query is required').describe('The search query to match against documents and knowledge bases'),
  knowledgeBaseId: z.string().optional().describe('Optional Knowledge Base ID to limit the search scope'),
  documentId: z.string().optional().describe('Optional Document ID to limit the search scope'),
  topK: z.number().int().positive().max(20).optional().default(5).describe('Maximum number of results to return'),
});

export class KnowledgeSearchTool implements IAITool<z.infer<typeof KnowledgeSearchInputSchema>, any> {
  public readonly id = 'knowledge_search';
  public readonly name = 'Search Knowledge Base';
  public readonly description =
    'Searches enterprise documents and knowledge bases for relevant information, returning snippets with source citations and relevance scores.';
  public readonly parameters = {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query or question' },
      knowledgeBaseId: { type: 'string', description: 'Optional knowledge base ID filter' },
      documentId: { type: 'string', description: 'Optional document ID filter' },
      topK: { type: 'number', description: 'Maximum number of results (default 5)' },
    },
    required: ['query'],
  };
  public readonly requiredPermissions: string[] = ['knowledgebase:read', 'documents:read'];
  public readonly riskLevel: RiskLevel = 'LOW';
  public readonly workspaceScoped = true;
  public readonly schema = KnowledgeSearchInputSchema;

  public async execute(
    params: z.infer<typeof KnowledgeSearchInputSchema>,
    context: AgentExecutionContext
  ): Promise<any> {
    const retrievalService = RetrievalService.getInstance();

    const response = await retrievalService.search({
      workspaceId: context.workspaceId,
      query: params.query,
      knowledgeBaseId: params.knowledgeBaseId,
      documentId: params.documentId,
      topK: params.topK || 5,
    });

    return {
      query: response.query,
      totalResults: response.totalResults,
      searchMode: response.searchMode,
      results: response.results.map((r) => ({
        documentId: r.documentId,
        documentName: r.documentName,
        version: r.versionNumber,
        chunkIndex: r.chunkIndex,
        snippet: r.snippet,
        score: r.score,
        page: r.page,
        section: r.section,
        citation: `[Source: "${r.documentName}" (v${r.versionNumber}), Chunk ${r.chunkIndex}]`,
      })),
    };
  }
}
