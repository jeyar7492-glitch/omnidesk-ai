import { Request, Response, NextFunction } from 'express';
import { KnowledgeBaseService } from '../services/knowledge_base.service';
import {
  CreateKnowledgeBaseSchema,
  UpdateKnowledgeBaseSchema,
  KnowledgeBaseQuerySchema,
  AddDocumentToKBSchema,
} from '@omnidesk/validation';
import { AuthenticatedRequest } from '../../middleware/auth_context';

export class KnowledgeBaseController {
  private kbService = KnowledgeBaseService.getInstance();

  public async create(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = CreateKnowledgeBaseSchema.parse(req.body);

      const kb = await this.kbService.createKnowledgeBase({
        workspaceId: authReq.context.workspaceId,
        name: validated.name,
        description: validated.description || undefined,
        userId: authReq.context.userId,
      });

      return res.status(201).json({ success: true, data: kb });
    } catch (err) {
      next(err);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = KnowledgeBaseQuerySchema.parse(req.query);

      const result = await this.kbService.listKnowledgeBases({
        workspaceId: authReq.context.workspaceId,
        search: query.search,
        isArchived: query.isArchived,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder as any,
      });

      return res.status(200).json({
        success: true,
        data: result.knowledgeBases,
        meta: {
          total: result.total,
          page: result.page,
          perPage: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  public async get(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const kb = await this.kbService.getKnowledgeBase(authReq.context.workspaceId, req.params.id);

      if (!kb) {
        return res.status(404).json({
          success: false,
          error: { code: 'KNOWLEDGE_BASE_NOT_FOUND', message: 'Knowledge base not found' },
        });
      }

      return res.status(200).json({ success: true, data: kb });
    } catch (err) {
      next(err);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateKnowledgeBaseSchema.parse(req.body);

      const kb = await this.kbService.updateKnowledgeBase({
        workspaceId: authReq.context.workspaceId,
        knowledgeBaseId: req.params.id,
        name: validated.name,
        description: validated.description,
        isArchived: validated.isArchived,
        userId: authReq.context.userId,
      });

      return res.status(200).json({ success: true, data: kb });
    } catch (err) {
      next(err);
    }
  }

  public async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const kb = await this.kbService.archiveKnowledgeBase(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: kb });
    } catch (err) {
      next(err);
    }
  }

  public async addDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = AddDocumentToKBSchema.parse(req.body);

      await this.kbService.addDocumentToKB(
        authReq.context.workspaceId,
        req.params.id,
        validated.documentId,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: { added: true } });
    } catch (err) {
      next(err);
    }
  }

  public async removeDocument(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const documentId = req.params.documentId;

      await this.kbService.removeDocumentFromKB(
        authReq.context.workspaceId,
        req.params.id,
        documentId,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: { removed: true } });
    } catch (err) {
      next(err);
    }
  }

  public async listDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const docs = await this.kbService.listDocumentsInKB(
        authReq.context.workspaceId,
        req.params.id
      );

      return res.status(200).json({ success: true, data: docs });
    } catch (err) {
      next(err);
    }
  }
}

export const knowledgeBaseController = new KnowledgeBaseController();
