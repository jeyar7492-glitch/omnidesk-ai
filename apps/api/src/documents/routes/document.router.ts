import { Router } from 'express';
import multer from 'multer';
import { documentController } from '../controllers/document.controller';
import { knowledgeBaseController } from '../controllers/knowledge_base.controller';
import { knowledgeSearchController } from '../controllers/knowledge_search.controller';
import { requireAuthContext, requirePermission } from '../../middleware/auth_context';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// ── Document Router ──────────────────────────────────────────────────────────
export const documentRouter = Router();

documentRouter.use(requireAuthContext);

documentRouter.post(
  '/',
  requirePermission('documents:write'),
  upload.single('file'),
  (req, res, next) => documentController.upload(req, res, next)
);

documentRouter.get(
  '/',
  requirePermission('documents:read'),
  (req, res, next) => documentController.list(req, res, next)
);

documentRouter.get(
  '/:id',
  requirePermission('documents:read'),
  (req, res, next) => documentController.get(req, res, next)
);

documentRouter.patch(
  '/:id',
  requirePermission('documents:write'),
  (req, res, next) => documentController.update(req, res, next)
);

documentRouter.put(
  '/:id',
  requirePermission('documents:write'),
  (req, res, next) => documentController.update(req, res, next)
);

documentRouter.delete(
  '/:id',
  requirePermission('documents:delete'),
  (req, res, next) => documentController.archive(req, res, next)
);

documentRouter.post(
  '/:id/archive',
  requirePermission('documents:delete'),
  (req, res, next) => documentController.archive(req, res, next)
);

documentRouter.post(
  '/:id/reprocess',
  requirePermission('documents:write'),
  (req, res, next) => documentController.reprocess(req, res, next)
);

documentRouter.get(
  '/:id/versions',
  requirePermission('documents:read'),
  (req, res, next) => documentController.getVersions(req, res, next)
);

documentRouter.post(
  '/:id/versions',
  requirePermission('documents:write'),
  upload.single('file'),
  (req, res, next) => documentController.createVersion(req, res, next)
);

documentRouter.get(
  '/:id/download',
  requirePermission('documents:read'),
  (req, res, next) => documentController.download(req, res, next)
);

documentRouter.get(
  '/:id/chunks',
  requirePermission('documents:read'),
  (req, res, next) => documentController.getChunks(req, res, next)
);

// ── Knowledge Base Router ───────────────────────────────────────────────────
export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use(requireAuthContext);

knowledgeBaseRouter.get(
  '/',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeBaseController.list(req, res, next)
);

knowledgeBaseRouter.post(
  '/',
  requirePermission('knowledgebase:write'),
  (req, res, next) => knowledgeBaseController.create(req, res, next)
);

knowledgeBaseRouter.get(
  '/:id',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeBaseController.get(req, res, next)
);

knowledgeBaseRouter.patch(
  '/:id',
  requirePermission('knowledgebase:write'),
  (req, res, next) => knowledgeBaseController.update(req, res, next)
);

knowledgeBaseRouter.put(
  '/:id',
  requirePermission('knowledgebase:write'),
  (req, res, next) => knowledgeBaseController.update(req, res, next)
);

knowledgeBaseRouter.delete(
  '/:id',
  requirePermission('knowledgebase:write'),
  (req, res, next) => knowledgeBaseController.archive(req, res, next)
);

knowledgeBaseRouter.post(
  '/:id/documents',
  requirePermission('knowledgebase:write'),
  (req, res, next) => knowledgeBaseController.addDocument(req, res, next)
);

knowledgeBaseRouter.delete(
  '/:id/documents/:documentId',
  requirePermission('knowledgebase:write'),
  (req, res, next) => knowledgeBaseController.removeDocument(req, res, next)
);

knowledgeBaseRouter.get(
  '/:id/documents',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeBaseController.listDocuments(req, res, next)
);

// ── Knowledge Search Router ─────────────────────────────────────────────────
export const knowledgeSearchRouter = Router();

knowledgeSearchRouter.use(requireAuthContext);

knowledgeSearchRouter.get(
  '/search',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeSearchController.search(req, res, next)
);

knowledgeSearchRouter.post(
  '/search',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeSearchController.search(req, res, next)
);

knowledgeSearchRouter.get(
  '/context',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeSearchController.getContext(req, res, next)
);

knowledgeSearchRouter.post(
  '/context',
  requirePermission('knowledgebase:read'),
  (req, res, next) => knowledgeSearchController.getContext(req, res, next)
);
