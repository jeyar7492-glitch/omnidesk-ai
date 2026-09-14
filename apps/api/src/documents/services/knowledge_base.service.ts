import { PrismaClient } from '@prisma/client';
import { wsManager } from '../../lib/websocket';
import {
  KnowledgeBaseSummary,
  KnowledgeBaseDetail,
  DocumentSummary,
  DocumentStatus,
} from '@omnidesk/shared-types';

const prisma = new PrismaClient();

export interface CreateKnowledgeBaseInput {
  workspaceId: string;
  name: string;
  description?: string;
  userId?: string;
}

export interface UpdateKnowledgeBaseInput {
  workspaceId: string;
  knowledgeBaseId: string;
  name?: string;
  description?: string | null;
  isArchived?: boolean;
  userId?: string;
}

export interface ListKnowledgeBasesFilter {
  workspaceId: string;
  search?: string;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class KnowledgeBaseService {
  private static instance: KnowledgeBaseService;

  public static getInstance(): KnowledgeBaseService {
    if (!KnowledgeBaseService.instance) {
      KnowledgeBaseService.instance = new KnowledgeBaseService();
    }
    return KnowledgeBaseService.instance;
  }

  public async createKnowledgeBase(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseSummary> {
    const { workspaceId, name, description, userId } = input;

    const kb = await prisma.knowledgeBase.create({
      data: {
        workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: userId || null,
        status: 'active',
        isArchived: false,
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: 'knowledge_base.created',
        entityType: 'knowledge_base',
        entityId: kb.id,
        details: { name: kb.name },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      'knowledge_base.updated',
      { knowledgeBaseId: kb.id, action: 'created' },
      userId ? { userId } : undefined
    );

    return {
      id: kb.id,
      workspaceId: kb.workspaceId,
      name: kb.name,
      description: kb.description,
      status: kb.status as 'active' | 'archived',
      isArchived: kb.isArchived,
      createdBy: kb.createdBy,
      documentCount: 0,
      createdAt: kb.createdAt.toISOString(),
      updatedAt: kb.updatedAt.toISOString(),
    };
  }

  public async getKnowledgeBase(workspaceId: string, knowledgeBaseId: string): Promise<KnowledgeBaseDetail | null> {
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, workspaceId },
      include: {
        documents: {
          include: {
            document: {
              include: {
                versions: { select: { versionNumber: true }, orderBy: { versionNumber: 'desc' }, take: 1 },
                _count: { select: { chunks: true } },
              },
            },
          },
        },
      },
    });

    if (!kb) return null;

    const documents: DocumentSummary[] = kb.documents
      .filter((kd) => !kd.document.isArchived)
      .map((kd) => {
        const doc = kd.document;
        return {
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
        };
      });

    return {
      id: kb.id,
      workspaceId: kb.workspaceId,
      name: kb.name,
      description: kb.description,
      status: kb.status as 'active' | 'archived',
      isArchived: kb.isArchived,
      createdBy: kb.createdBy,
      documentCount: documents.length,
      documents,
      createdAt: kb.createdAt.toISOString(),
      updatedAt: kb.updatedAt.toISOString(),
    };
  }

  public async listKnowledgeBases(filter: ListKnowledgeBasesFilter): Promise<{
    knowledgeBases: KnowledgeBaseSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      workspaceId,
      search,
      isArchived = false,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const where: any = {
      workspaceId,
      isArchived,
    };

    if (search && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.knowledgeBase.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { documents: true },
          },
        },
      }),
      prisma.knowledgeBase.count({ where }),
    ]);

    const summaries: KnowledgeBaseSummary[] = items.map((kb) => ({
      id: kb.id,
      workspaceId: kb.workspaceId,
      name: kb.name,
      description: kb.description,
      status: kb.status as 'active' | 'archived',
      isArchived: kb.isArchived,
      createdBy: kb.createdBy,
      documentCount: kb._count.documents,
      createdAt: kb.createdAt.toISOString(),
      updatedAt: kb.updatedAt.toISOString(),
    }));

    return {
      knowledgeBases: summaries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public async updateKnowledgeBase(input: UpdateKnowledgeBaseInput): Promise<KnowledgeBaseSummary> {
    const { workspaceId, knowledgeBaseId, name, description, isArchived, userId } = input;

    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, workspaceId },
    });

    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (isArchived !== undefined) {
      updateData.isArchived = isArchived;
      updateData.status = isArchived ? 'archived' : 'active';
    }

    const updated = await prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: updateData,
      include: {
        _count: { select: { documents: true } },
      },
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: isArchived ? 'knowledge_base.archived' : 'knowledge_base.updated',
        entityType: 'knowledge_base',
        entityId: updated.id,
        details: { changes: Object.keys(updateData) },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      'knowledge_base.updated',
      { knowledgeBaseId: updated.id, action: isArchived ? 'archived' : 'updated' },
      userId ? { userId } : undefined
    );

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      description: updated.description,
      status: updated.status as 'active' | 'archived',
      isArchived: updated.isArchived,
      createdBy: updated.createdBy,
      documentCount: updated._count.documents,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  public async archiveKnowledgeBase(workspaceId: string, knowledgeBaseId: string, userId?: string): Promise<KnowledgeBaseSummary> {
    return this.updateKnowledgeBase({
      workspaceId,
      knowledgeBaseId,
      isArchived: true,
      userId,
    });
  }

  public async addDocumentToKB(
    workspaceId: string,
    knowledgeBaseId: string,
    documentId: string,
    userId?: string
  ): Promise<boolean> {
    // Check KB exists in workspace
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, workspaceId },
    });
    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    // Check document exists in SAME workspace
    const doc = await prisma.document.findFirst({
      where: { id: documentId, workspaceId },
    });
    if (!doc) {
      throw new Error(`Document not found: ${documentId}`);
    }

    // Upsert membership
    await prisma.knowledgeBaseDocument.upsert({
      where: {
        knowledgeBaseId_documentId: {
          knowledgeBaseId,
          documentId,
        },
      },
      create: {
        knowledgeBaseId,
        documentId,
        addedBy: userId || null,
      },
      update: {},
    });

    await prisma.auditEvent.create({
      data: {
        workspaceId,
        userId: userId || null,
        action: 'knowledge_base.document_added',
        entityType: 'knowledge_base',
        entityId: knowledgeBaseId,
        details: { documentId, documentName: doc.name },
      },
    });

    wsManager.broadcastToWorkspace(
      workspaceId,
      'knowledge_base.updated',
      { knowledgeBaseId, action: 'document_added', documentId },
      userId ? { userId } : undefined
    );

    return true;
  }

  public async removeDocumentFromKB(
    workspaceId: string,
    knowledgeBaseId: string,
    documentId: string,
    userId?: string
  ): Promise<boolean> {
    const kb = await prisma.knowledgeBase.findFirst({
      where: { id: knowledgeBaseId, workspaceId },
    });
    if (!kb) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }

    const deleteResult = await prisma.knowledgeBaseDocument.deleteMany({
      where: {
        knowledgeBaseId,
        documentId,
      },
    });

    if (deleteResult.count > 0) {
      await prisma.auditEvent.create({
        data: {
          workspaceId,
          userId: userId || null,
          action: 'knowledge_base.document_removed',
          entityType: 'knowledge_base',
          entityId: knowledgeBaseId,
          details: { documentId },
        },
      });

      wsManager.broadcastToWorkspace(
        workspaceId,
        'knowledge_base.updated',
        { knowledgeBaseId, action: 'document_removed', documentId },
        userId ? { userId } : undefined
      );
    }

    return true;
  }

  public async listDocumentsInKB(workspaceId: string, knowledgeBaseId: string): Promise<DocumentSummary[]> {
    const detail = await this.getKnowledgeBase(workspaceId, knowledgeBaseId);
    if (!detail) {
      throw new Error(`Knowledge base not found: ${knowledgeBaseId}`);
    }
    return detail.documents;
  }
}
