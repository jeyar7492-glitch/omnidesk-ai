import { Request, Response, NextFunction } from 'express';
import { RetrievalService } from '../services/retrieval.service';
import { KnowledgeSearchQuerySchema } from '@omnidesk/validation';
import { AuthenticatedRequest } from '../../middleware/auth_context';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class KnowledgeSearchController {
  private retrievalService = RetrievalService.getInstance();

  public async search(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      // Accept query params or JSON body
      const input = req.method === 'POST' ? req.body : req.query;
      const validated = KnowledgeSearchQuerySchema.parse(input);

      const result = await this.retrievalService.search({
        workspaceId: authReq.context.workspaceId,
        query: validated.query,
        knowledgeBaseId: validated.knowledgeBaseId,
        documentId: validated.documentId,
        mode: validated.mode,
        topK: validated.topK,
        threshold: validated.threshold,
      });

      // Audit log the search query
      await prisma.auditEvent.create({
        data: {
          workspaceId: authReq.context.workspaceId,
          userId: authReq.context.userId || null,
          action: 'knowledge.search',
          entityType: 'knowledge_search',
          entityId: authReq.context.workspaceId,
          details: {
            query: validated.query.slice(0, 100),
            resultCount: result.totalResults,
            mode: result.searchMode,
          },
        },
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public async getContext(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const input = req.method === 'POST' ? req.body : req.query;
      const validated = KnowledgeSearchQuerySchema.parse(input);

      const context = await this.retrievalService.buildRAGContext({
        workspaceId: authReq.context.workspaceId,
        query: validated.query,
        knowledgeBaseId: validated.knowledgeBaseId,
        documentId: validated.documentId,
        mode: validated.mode,
        topK: validated.topK,
        threshold: validated.threshold,
      });

      return res.status(200).json({ success: true, data: context });
    } catch (err) {
      next(err);
    }
  }
}

export const knowledgeSearchController = new KnowledgeSearchController();
