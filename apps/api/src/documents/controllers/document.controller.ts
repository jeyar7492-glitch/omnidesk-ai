import { Request, Response, NextFunction } from 'express';
import { DocumentService } from '../services/document.service';
import {
  DocumentQuerySchema,
  UpdateDocumentSchema,
  UploadDocumentMetadataSchema,
} from '@omnidesk/validation';
import { AuthenticatedRequest } from '../../middleware/auth_context';

export class DocumentController {
  private documentService = DocumentService.getInstance();

  public async upload(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_REQUIRED', message: 'No file uploaded. Please provide a file in the form data.' },
        });
      }

      const metadata = UploadDocumentMetadataSchema.parse(req.body);

      const doc = await this.documentService.uploadDocument({
        workspaceId: authReq.context.workspaceId,
        userId: authReq.context.userId,
        fileBuffer: file.buffer,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        folderPath: metadata.folderPath,
        knowledgeBaseId: metadata.knowledgeBaseId,
      });

      return res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  public async createVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: { code: 'FILE_REQUIRED', message: 'No file uploaded for new version.' },
        });
      }

      const documentId = req.params.id;

      const doc = await this.documentService.createVersion({
        workspaceId: authReq.context.workspaceId,
        documentId,
        userId: authReq.context.userId,
        fileBuffer: file.buffer,
        originalFileName: file.originalname,
        mimeType: file.mimetype,
      });

      return res.status(201).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const query = DocumentQuerySchema.parse(req.query);

      const result = await this.documentService.listDocuments({
        workspaceId: authReq.context.workspaceId,
        status: query.status as any,
        category: query.category,
        mimeType: query.mimeType,
        extension: query.extension,
        search: query.search,
        isArchived: query.isArchived,
        knowledgeBaseId: query.knowledgeBaseId,
        page: query.page,
        limit: query.limit,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder as any,
      });

      return res.status(200).json({
        success: true,
        data: result.documents,
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
      const doc = await this.documentService.getDocument(authReq.context.workspaceId, req.params.id);

      if (!doc) {
        return res.status(404).json({
          success: false,
          error: { code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' },
        });
      }

      return res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  public async update(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const validated = UpdateDocumentSchema.parse(req.body);

      const doc = await this.documentService.updateDocument(
        authReq.context.workspaceId,
        req.params.id,
        validated,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  public async archive(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const doc = await this.documentService.archiveDocument(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      await this.documentService.deleteDocument(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: { deleted: true } });
    } catch (err) {
      next(err);
    }
  }

  public async reprocess(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const doc = await this.documentService.reprocessDocument(
        authReq.context.workspaceId,
        req.params.id,
        authReq.context.userId
      );

      return res.status(200).json({ success: true, data: doc });
    } catch (err) {
      next(err);
    }
  }

  public async download(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const versionNumber = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      const result = await this.documentService.downloadDocument(
        authReq.context.workspaceId,
        req.params.id,
        versionNumber
      );

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(result.filename)}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.buffer.length);
      return res.status(200).send(result.buffer);
    } catch (err) {
      next(err);
    }
  }

  public async getVersions(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const versions = await this.documentService.getDocumentVersions(
        authReq.context.workspaceId,
        req.params.id
      );

      return res.status(200).json({ success: true, data: versions });
    } catch (err) {
      next(err);
    }
  }

  public async getChunks(req: Request, res: Response, next: NextFunction) {
    try {
      const authReq = req as AuthenticatedRequest;
      const chunks = await this.documentService.getDocumentChunks(
        authReq.context.workspaceId,
        req.params.id
      );

      return res.status(200).json({ success: true, data: chunks });
    } catch (err) {
      next(err);
    }
  }
}

export const documentController = new DocumentController();
