import path from "path";
import crypto from "crypto";
import { prisma } from "../../lib/prisma";
import { LocalStorageProvider } from "../../documents/storage/local_storage.provider";
import { AppError } from "../../lib/errors";
import { MessageAttachmentSummary } from "@omnidesk/shared-types";

const MAX_ATTACHMENT_SIZE = 15 * 1024 * 1024; // 15MB

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "application/x-zip-compressed",
]);

const DANGEROUS_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".sh",
  ".ps1",
  ".vbs",
  ".js",
  ".mjs",
  ".html",
  ".htm",
  ".php",
  ".py",
  ".jar",
  ".scr",
  ".com",
]);

export class AttachmentService {
  private static instance: AttachmentService;
  private storage: LocalStorageProvider;

  private constructor() {
    this.storage = new LocalStorageProvider(
      path.resolve(process.cwd(), "uploads", "attachments")
    );
  }

  public static getInstance(): AttachmentService {
    if (!AttachmentService.instance) {
      AttachmentService.instance = new AttachmentService();
    }
    return AttachmentService.instance;
  }

  public sanitizeFileName(fileName: string): string {
    const base = path.basename(fileName);
    return base.replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  public validateFile(fileName: string, mimeType: string, fileSize: number): void {
    if (fileSize > MAX_ATTACHMENT_SIZE) {
      throw new AppError(
        400,
        `File size exceeds maximum allowed size of ${MAX_ATTACHMENT_SIZE / (1024 * 1024)}MB`,
        "FILE_TOO_LARGE"
      );
    }

    const ext = path.extname(fileName).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      throw new AppError(
        400,
        `File extension ${ext} is not allowed for security reasons`,
        "UNSAFE_FILE_EXTENSION"
      );
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      throw new AppError(
        400,
        `File type ${mimeType} is not supported`,
        "UNSUPPORTED_MIME_TYPE"
      );
    }
  }

  public async uploadAttachment(params: {
    workspaceId: string;
    conversationId: string;
    userId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
  }): Promise<MessageAttachmentSummary> {
    const { workspaceId, conversationId, userId, fileName, mimeType, buffer } = params;

    // Verify conversation membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(403, "Access denied: Not a member of this conversation", "FORBIDDEN");
    }

    this.validateFile(fileName, mimeType, buffer.length);
    const safeName = this.sanitizeFileName(fileName);
    const storageKey = `attachments/${conversationId}/${Date.now()}_${crypto.randomBytes(4).toString("hex")}_${safeName}`;

    const putResult = await this.storage.put(workspaceId, storageKey, buffer, mimeType);

    const attachment = await prisma.messageAttachment.create({
      data: {
        workspaceId,
        conversationId,
        uploadedById: userId,
        fileName: safeName,
        fileSize: buffer.length,
        mimeType,
        storageKey,
        storageProvider: putResult.storageProvider,
        checksum: putResult.checksum,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return {
      id: attachment.id,
      workspaceId: attachment.workspaceId,
      conversationId: attachment.conversationId,
      messageId: attachment.messageId,
      uploadedById: attachment.uploadedById,
      fileName: attachment.fileName,
      fileSize: attachment.fileSize,
      mimeType: attachment.mimeType,
      storageKey: attachment.storageKey,
      storageProvider: attachment.storageProvider,
      checksum: attachment.checksum,
      createdAt: attachment.createdAt.toISOString(),
      downloadUrl: `/api/v1/communication/attachments/${attachment.id}/download`,
      uploadedBy: attachment.uploadedBy,
    };
  }

  public async getAttachmentForDownload(params: {
    workspaceId: string;
    userId: string;
    attachmentId: string;
  }): Promise<{ attachment: MessageAttachmentSummary; fileBuffer: Buffer }> {
    const { workspaceId, userId, attachmentId } = params;

    const attachment = await prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        uploadedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!attachment) {
      throw new AppError(404, "Attachment not found", "NOT_FOUND");
    }

    if (attachment.workspaceId !== workspaceId) {
      throw new AppError(403, "Access denied: Attachment belongs to another workspace", "FORBIDDEN");
    }

    // Verify conversation membership
    const membership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId: attachment.conversationId,
          userId,
        },
      },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new AppError(403, "Access denied: Not authorized to download this attachment", "FORBIDDEN");
    }

    const fileBuffer = await this.storage.get(workspaceId, attachment.storageKey);

    return {
      attachment: {
        id: attachment.id,
        workspaceId: attachment.workspaceId,
        conversationId: attachment.conversationId,
        messageId: attachment.messageId,
        uploadedById: attachment.uploadedById,
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        mimeType: attachment.mimeType,
        storageKey: attachment.storageKey,
        storageProvider: attachment.storageProvider,
        checksum: attachment.checksum,
        createdAt: attachment.createdAt.toISOString(),
        downloadUrl: `/api/v1/communication/attachments/${attachment.id}/download`,
        uploadedBy: attachment.uploadedBy,
      },
      fileBuffer,
    };
  }
}
