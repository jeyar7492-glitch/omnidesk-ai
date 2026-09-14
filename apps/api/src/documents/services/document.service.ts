import { PrismaClient } from '@prisma/client';
import path from 'path';
import crypto from 'crypto';
import { getStorageProvider } from '../storage/local_storage.provider';
import { TextExtractor } from '../extraction/text_extractor';
import { DocumentChunker } from '../chunking/chunker.service';
import { getEmbeddingProvider } from '../embeddings/embedding.service';
import { wsManager } from '../../lib/websocket';
import { NotFoundError } from '../../lib/errors';
import { NotificationService } from '../../notifications/services/notification.service';
import {
  DocumentDetail,
  DocumentSummary,
  DocumentVersionSummary,
  DocumentChunkSummary,
  DocumentStatus,
} from '@omnidesk/shared-types';

const prisma = new PrismaClient();

export interface UploadDocumentInput {
  workspaceId: string;
  userId?: string;
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
  name?: string;
  description?: string;
  category?: string;
  folderPath?: string;
  knowledgeBaseId?: string;
}

export interface CreateVersionInput {
  workspaceId: string;
  documentId: string;
  userId?: string;
  fileBuffer: Buffer;
  originalFileName: string;
  mimeType: string;
}

export interface ListDocumentsFilter {
  workspaceId: string;
  status?: DocumentStatus;
  category?: string;
  mimeType?: string;
  extension?: string;
  search?: string;
  isArchived?: boolean;
  knowledgeBaseId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class DocumentService {
  private static instance: DocumentService;

  public static getInstance(): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService();
    }
    return DocumentService.instance;
  }

  private sanitizeFileName(filename: string): { safeName: string; extension: string } {
    const parsed = path.parse(filename);
    const safeBase = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
    const extension = parsed.ext.toLowerCase().replace(/^\./, '');
    return {
      safeName: `${safeBase}.${extension}`,
      extension,
    };
  }

  public async uploadDocument(input: UploadDocumentInput): Promise<DocumentDetail> {
    const {
      workspaceId,
      userId,
      fileBuffer,
      originalFileName,
      mimeType,
      name,
      description,
      category = 'General',
      folderPath = '/',
      knowledgeBaseId,
    } = input;

    // Validate size (max 50 MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (fileBuffer.length > MAX_FILE_SIZE) {
      throw new Error(`File exceeds maximum allowed size of 50MB (${fileBuffer.length} bytes)`);
    }

    const { safeName, extension } = this.sanitizeFileName(originalFileName);
    const docName = (name && name.trim().length > 0 ? name : parsedDocName(originalFileName)).slice(0, 255);

    // Generate unique storage key
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `v1_${uniqueId}_${safeName}`;

    // Store binary
    const storage = getStorageProvider();
    const storageResult = await storage.put(workspaceId, storageKey, fileBuffer, mimeType);

    // Create Document record
    const document = await prisma.document.create({
      data: {
        workspaceId,
        name: docName,
        title: docName,
        originalFileName: safeName,
        mimeType,
        extension,
        sizeBytes: storageResult.sizeBytes,
        storageProvider: storageResult.storageProvider,
        storageKey: storageResult.storageKey,
        checksum: storageResult.checksum,
        status: 'processing',
        description: description || null,
        category,
        folderPath,
        ownerId: userId || null,
        uploadedBy: userId || null,
        isArchived: false,
      },
    });

    // Create Version 1
    const version = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        storageKey: storageResult.storageKey,
        checksum: storageResult.checksum,
        sizeBytes: storageResult.sizeBytes,
        createdBy: userId || null,
      },
    });

    // Link current version
    await prisma.document.update({
      where: { id: document.id },
      data: { currentVersionId: version.id },
    });

    // Optionally attach to Knowledge Base
    if (knowledgeBaseId) {
      const kb = await prisma.knowledgeBase.findFirst({
        where: { id: knowledgeBaseId, workspaceId },
      });
      if (kb) {
        await prisma.knowledgeBaseDocument.create({
          data: {
            knowledgeBaseId: kb.id,
            documentId: document.id,
            addedBy: userId || null,
          },
        });
      }
    }

    // Audit log
    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: 'document.created',
        entityType: 'document',
        entityId: document.id,
        details: {
          name: document.name,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          storageKey: document.storageKey,
          checksum: document.checksum,
        },
      },
    });

    // WebSocket event
    wsManager.broadcastToWorkspace(
      workspaceId,
      'document.uploaded',
      {
        documentId: document.id,
        name: document.name,
        sizeBytes: document.sizeBytes,
        status: document.status,
      },
      userId ? { userId } : undefined
    );

    // Asynchronous processing (awaited or background)
    await this.processDocumentVersion(document.id, version.id, workspaceId, fileBuffer);

    return (await this.getDocument(workspaceId, document.id))!;
  }

  public async createVersion(input: CreateVersionInput): Promise<DocumentDetail> {
    const { workspaceId, documentId, userId, fileBuffer, originalFileName, mimeType } = input;

    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    if (document.isArchived) {
      throw new Error('Cannot add a new version to an archived document');
    }

    const nextVersionNumber = (document.versions[0]?.versionNumber || 1) + 1;
    const { safeName } = this.sanitizeFileName(originalFileName);

    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storageKey = `v${nextVersionNumber}_${uniqueId}_${safeName}`;

    const storage = getStorageProvider();
    const storageResult = await storage.put(workspaceId, storageKey, fileBuffer, mimeType);

    const newVersion = await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: nextVersionNumber,
        storageKey: storageResult.storageKey,
        checksum: storageResult.checksum,
        sizeBytes: storageResult.sizeBytes,
        createdBy: userId || null,
      },
    });

    await prisma.document.update({
      where: { id: document.id },
      data: {
        currentVersionId: newVersion.id,
        storageKey: storageResult.storageKey,
        checksum: storageResult.checksum,
        sizeBytes: storageResult.sizeBytes,
        status: 'processing',
        processingError: null,
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: 'document.version_created',
        entityType: 'document',
        entityId: document.id,
        details: {
          versionNumber: nextVersionNumber,
          sizeBytes: storageResult.sizeBytes,
          storageKey: storageResult.storageKey,
        },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      'document.version_created',
      {
        documentId: document.id,
        versionNumber: nextVersionNumber,
        sizeBytes: storageResult.sizeBytes,
      },
      userId ? { userId } : undefined
    );

    await this.processDocumentVersion(document.id, newVersion.id, workspaceId, fileBuffer);

    return (await this.getDocument(workspaceId, document.id))!;
  }

  public async processDocumentVersion(
    documentId: string,
    versionId: string,
    workspaceId: string,
    providedBuffer?: Buffer
  ): Promise<void> {
    try {
      const document = await prisma.document.findFirst({
        where: { id: documentId, workspaceId },
      });
      const version = await prisma.documentVersion.findFirst({
        where: { id: versionId, documentId },
      });

      if (!document || !version) return;

      // Update status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'processing', processingError: null },
      });

      wsManager.broadcastToWorkspace(workspaceId, 'document.processing', {
        documentId,
        versionNumber: version.versionNumber,
      });

      let buffer = providedBuffer;
      if (!buffer) {
        const storage = getStorageProvider();
        buffer = await storage.get(workspaceId, version.storageKey);
      }

      // Extract text
      const extracted = await TextExtractor.extract(buffer, document.extension, document.mimeType);

      // Chunk text
      const rawChunks = DocumentChunker.chunk(extracted.text, {
        targetChunkSize: 800,
        overlap: 150,
      }, {
        documentId,
        documentVersionId: versionId,
        pageCount: extracted.pageCount,
      });

      // Embeddings (if configured)
      const embeddingProvider = getEmbeddingProvider();
      let embeddings: number[][] = [];
      if (embeddingProvider.isConfigured() && rawChunks.length > 0) {
        const texts = rawChunks.map((c) => c.content);
        embeddings = await embeddingProvider.embedTexts(texts);
      }

      // Deterministic cleanup: delete existing chunks for this version
      await prisma.documentChunk.deleteMany({
        where: { documentVersionId: versionId },
      });

      // Batch insert chunks
      if (rawChunks.length > 0) {
        const chunkData = rawChunks.map((chunk, idx) => ({
          workspaceId,
          documentId,
          documentVersionId: versionId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          characterCount: chunk.characterCount,
          tokenCount: chunk.tokenCount,
          contentHash: chunk.contentHash,
          embedding: embeddings[idx] || [],
          metadata: (chunk.metadata || null) as any,
        }));

        await prisma.documentChunk.createMany({
          data: chunkData,
        });
      }

      // Update version & document with extracted text snippet and ready status
      await prisma.documentVersion.update({
        where: { id: versionId },
        data: {
          extractedText: extracted.text,
          metadata: {
            pageCount: extracted.pageCount,
            extractionMetadata: extracted.metadata || {},
          } as any,
        },
      });

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'ready',
          extractedText: extracted.text.slice(0, 10000), // Snippet preview
          processingError: null,
        },
      });

      wsManager.broadcastToWorkspace(workspaceId, 'document.ready', {
        documentId,
        chunkCount: rawChunks.length,
        extractedLength: extracted.text.length,
      });

      const recipientUserId = document.uploadedBy || document.ownerId;
      if (recipientUserId) {
        NotificationService.getInstance()
          .createNotification({
            workspaceId,
            recipientId: recipientUserId,
            type: "DOCUMENT_PROCESSED",
            title: `Document processed: ${document.name}`,
            message: `Document "${document.name}" was successfully processed and indexed (${rawChunks.length} chunks).`,
            priority: "LOW",
            entityType: "document",
            entityId: document.id,
            actionUrl: `/knowledge?docId=${document.id}`,
            metadata: { documentId: document.id, chunkCount: rawChunks.length },
          })
          .catch(() => {});
      }
    } catch (err: any) {
      console.error(`[DocumentService] Error processing document ${documentId}:`, err);
      const errorMessage = err.message || 'Processing failed';

      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          processingError: errorMessage.slice(0, 500),
        },
      });

      wsManager.broadcastToWorkspace(workspaceId, 'document.failed', {
        documentId,
        error: errorMessage,
      });

      const failedDoc = await prisma.document.findUnique({
        where: { id: documentId },
        select: { id: true, name: true, uploadedBy: true, ownerId: true },
      });
      const failedRecipientId = failedDoc?.uploadedBy || failedDoc?.ownerId;

      if (failedRecipientId) {
        NotificationService.getInstance()
          .createNotification({
            workspaceId,
            recipientId: failedRecipientId,
            type: "DOCUMENT_FAILED",
            title: `Document processing failed: ${failedDoc?.name || "Document"}`,
            message: `Processing failed for "${failedDoc?.name || "Document"}": ${errorMessage.slice(0, 100)}`,
            priority: "HIGH",
            entityType: "document",
            entityId: failedDoc?.id || documentId,
            actionUrl: `/knowledge?docId=${failedDoc?.id || documentId}`,
            metadata: { documentId: failedDoc?.id || documentId, error: errorMessage.slice(0, 200) },
          })
          .catch(() => {});
      }
    }
  }

  public async reprocessDocument(workspaceId: string, documentId: string, userId?: string): Promise<DocumentDetail> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    const currentVersion = document.versions[0];
    if (!currentVersion) {
      throw new Error(`No version found for document: ${documentId}`);
    }

    await this.processDocumentVersion(document.id, currentVersion.id, workspaceId);

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: 'document.reprocessed',
        entityType: 'document',
        entityId: document.id,
        details: { versionNumber: currentVersion.versionNumber },
      },
    });

    return (await this.getDocument(workspaceId, documentId))!;
  }

  public async getDocument(workspaceId: string, documentId: string): Promise<DocumentDetail | null> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: {
        versions: { orderBy: { versionNumber: 'desc' } },
        knowledgeBases: {
          include: {
            knowledgeBase: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { chunks: true },
        },
      },
    });

    if (!document) {
      return null;
    }

    return this.mapToDetail(document);
  }

  public async listDocuments(filter: ListDocumentsFilter): Promise<{
    documents: DocumentSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      workspaceId,
      status,
      category,
      mimeType,
      extension,
      search,
      isArchived = false,
      knowledgeBaseId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: any = {
      workspaceId,
      isArchived,
    };

    if (status) where.status = status;
    if (category) where.category = category;
    if (mimeType) where.mimeType = mimeType;
    if (extension) where.extension = extension;

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { originalFileName: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (knowledgeBaseId) {
      where.knowledgeBases = {
        some: { knowledgeBaseId },
      };
    }

    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          versions: { select: { versionNumber: true }, orderBy: { versionNumber: 'desc' }, take: 1 },
          _count: { select: { chunks: true } },
        },
      }),
      prisma.document.count({ where }),
    ]);

    const summaries: DocumentSummary[] = documents.map((doc) => ({
      id: doc.id,
      workspaceId: doc.workspaceId,
      name: doc.name,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      extension: doc.extension,
      sizeBytes: doc.sizeBytes,
      storageProvider: doc.storageProvider,
      status: doc.status as DocumentStatus,
      description: doc.description,
      category: doc.category,
      folderPath: doc.folderPath,
      ownerId: doc.ownerId,
      uploadedBy: doc.uploadedBy,
      currentVersionId: doc.currentVersionId,
      isArchived: doc.isArchived,
      versionNumber: doc.versions[0]?.versionNumber || 1,
      chunkCount: doc._count.chunks,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    }));

    return {
      documents: summaries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async updateDocument(
    workspaceId: string,
    documentId: string,
    data: { name?: string; description?: string | null; category?: string; folderPath?: string; isArchived?: boolean },
    userId?: string
  ): Promise<DocumentDetail> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    const updateData: any = {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
      updateData.title = data.name.trim();
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.folderPath !== undefined) updateData.folderPath = data.folderPath;
    if (data.isArchived !== undefined) {
      updateData.isArchived = data.isArchived;
      if (data.isArchived) updateData.status = 'archived';
    }

    const updated = await prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: data.isArchived ? 'document.archived' : 'document.updated',
        entityType: 'document',
        entityId: updated.id,
        details: { changes: Object.keys(updateData) },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      data.isArchived ? 'document.archived' : 'document.updated',
      { documentId: updated.id, changes: updateData },
      userId ? { userId } : undefined
    );

    return (await this.getDocument(workspaceId, documentId))!;
  }

  public async archiveDocument(workspaceId: string, documentId: string, userId?: string): Promise<DocumentDetail> {
    return this.updateDocument(workspaceId, documentId, { isArchived: true }, userId);
  }

  public async deleteDocument(workspaceId: string, documentId: string, userId?: string): Promise<boolean> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { versions: true },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    // Storage cleanup
    const storage = getStorageProvider();
    for (const ver of document.versions) {
      try {
        await storage.delete(workspaceId, ver.storageKey);
      } catch (err) {
        console.warn(`[DocumentService] Could not remove storage file ${ver.storageKey}:`, err);
      }
    }

    // Delete DB relations
    await prisma.knowledgeBaseDocument.deleteMany({ where: { documentId } });
    await prisma.documentChunk.deleteMany({ where: { documentId } });
    await prisma.documentVersion.deleteMany({ where: { documentId } });
    await prisma.document.delete({ where: { id: documentId } });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: 'document.deleted',
        entityType: 'document',
        entityId: documentId,
        details: { name: document.name },
      },
    });

    return true;
  }

  public async downloadDocument(
    workspaceId: string,
    documentId: string,
    versionNumber?: number
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    let targetVersion = document.versions[0];
    if (versionNumber) {
      const found = document.versions.find((v) => v.versionNumber === versionNumber);
      if (found) targetVersion = found;
    }

    if (!targetVersion) {
      throw new Error(`Version not found for document ${documentId}`);
    }

    const storage = getStorageProvider();
    const buffer = await storage.get(workspaceId, targetVersion.storageKey);

    return {
      buffer,
      filename: document.originalFileName,
      mimeType: document.mimeType,
    };
  }

  public async getDocumentChunks(
    workspaceId: string,
    documentId: string
  ): Promise<DocumentChunkSummary[]> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId, workspaceId },
      orderBy: { chunkIndex: 'asc' },
    });

    return chunks.map((c) => ({
      id: c.id,
      workspaceId: c.workspaceId,
      documentId: c.documentId,
      documentVersionId: c.documentVersionId,
      chunkIndex: c.chunkIndex,
      content: c.content,
      tokenCount: c.tokenCount,
      characterCount: c.characterCount,
      contentHash: c.contentHash,
      hasEmbedding: Boolean(c.embedding && c.embedding.length > 0),
      metadata: (c.metadata as Record<string, unknown>) || null,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  public async getDocumentVersions(
    workspaceId: string,
    documentId: string
  ): Promise<DocumentVersionSummary[]> {
    const document = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
      include: { versions: { orderBy: { versionNumber: 'desc' } } },
    });

    if (!document) {
      throw new NotFoundError(`Document ${documentId}`);
    }

    return document.versions.map((v) => ({
      id: v.id,
      documentId: v.documentId,
      versionNumber: v.versionNumber,
      storageKey: v.storageKey,
      checksum: v.checksum,
      sizeBytes: v.sizeBytes,
      extractedTextLength: v.extractedText ? v.extractedText.length : 0,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  private mapToDetail(document: any): DocumentDetail {
    const versions: DocumentVersionSummary[] = (document.versions || []).map((v: any) => ({
      id: v.id,
      documentId: v.documentId,
      versionNumber: v.versionNumber,
      storageKey: v.storageKey,
      checksum: v.checksum,
      sizeBytes: v.sizeBytes,
      extractedTextLength: v.extractedText ? v.extractedText.length : 0,
      createdBy: v.createdBy,
      createdAt: v.createdAt.toISOString(),
    }));

    const knowledgeBases = (document.knowledgeBases || []).map((kbDoc: any) => ({
      id: kbDoc.knowledgeBase.id,
      name: kbDoc.knowledgeBase.name,
    }));

    return {
      id: document.id,
      workspaceId: document.workspaceId,
      name: document.name,
      originalFileName: document.originalFileName,
      mimeType: document.mimeType,
      extension: document.extension,
      sizeBytes: document.sizeBytes,
      storageProvider: document.storageProvider,
      storageKey: document.storageKey,
      checksum: document.checksum,
      status: document.status as DocumentStatus,
      description: document.description,
      category: document.category,
      folderPath: document.folderPath,
      ownerId: document.ownerId,
      uploadedBy: document.uploadedBy,
      currentVersionId: document.currentVersionId,
      isArchived: document.isArchived,
      processingError: document.processingError,
      extractedTextSnippet: document.extractedText ? document.extractedText.slice(0, 500) : null,
      metadata: (document.metadata as Record<string, unknown>) || null,
      versionNumber: versions[0]?.versionNumber || 1,
      chunkCount: document._count?.chunks || 0,
      versions,
      knowledgeBases,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };
  }
}

function parsedDocName(filename: string): string {
  const parsed = path.parse(filename);
  return parsed.name.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim() || 'Untitled Document';
}
