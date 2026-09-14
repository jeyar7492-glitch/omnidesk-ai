import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { IStorageProvider, StoragePutResult, StorageMetadata } from './storage.interface';

export class LocalStorageProvider implements IStorageProvider {
  public readonly providerName = 'local';
  private readonly baseUploadDir: string;

  constructor(baseUploadDir?: string) {
    this.baseUploadDir = baseUploadDir
      ? path.resolve(baseUploadDir)
      : path.resolve(process.cwd(), 'uploads', 'documents');
    
    // Ensure base directory exists
    if (!fs.existsSync(this.baseUploadDir)) {
      fs.mkdirSync(this.baseUploadDir, { recursive: true });
    }
  }

  private sanitizeKey(storageKey: string): string {
    // Prevent path traversal
    const normalized = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    if (normalized.includes('..') || path.isAbsolute(normalized)) {
      throw new Error('Invalid storage key: path traversal detected');
    }
    return normalized;
  }

  private getFilePath(workspaceId: string, storageKey: string): string {
    const safeKey = this.sanitizeKey(storageKey);
    const safeWorkspace = this.sanitizeKey(workspaceId);
    const resolved = path.resolve(this.baseUploadDir, safeWorkspace, safeKey);
    
    // Strict isolation check: resolved must start with baseUploadDir
    if (!resolved.startsWith(this.baseUploadDir)) {
      throw new Error('Access denied: target path outside storage root');
    }
    return resolved;
  }

  public async put(
    workspaceId: string,
    storageKey: string,
    buffer: Buffer,
    _mimeType: string
  ): Promise<StoragePutResult> {
    const filePath = this.getFilePath(workspaceId, storageKey);
    const dir = path.dirname(filePath);

    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(filePath, buffer);

    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      storageProvider: this.providerName,
      storageKey,
      checksum,
      sizeBytes: buffer.length,
    };
  }

  public async get(workspaceId: string, storageKey: string): Promise<Buffer> {
    const filePath = this.getFilePath(workspaceId, storageKey);
    try {
      return await fs.promises.readFile(filePath);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(`File not found: ${storageKey}`);
      }
      throw err;
    }
  }

  public async delete(workspaceId: string, storageKey: string): Promise<boolean> {
    const filePath = this.getFilePath(workspaceId, storageKey);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  public async exists(workspaceId: string, storageKey: string): Promise<boolean> {
    const filePath = this.getFilePath(workspaceId, storageKey);
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  public async getMetadata(workspaceId: string, storageKey: string): Promise<StorageMetadata | null> {
    const filePath = this.getFilePath(workspaceId, storageKey);
    try {
      const stats = await fs.promises.stat(filePath);
      const buffer = await fs.promises.readFile(filePath);
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      return {
        sizeBytes: stats.size,
        mimeType: 'application/octet-stream',
        checksum,
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }
}

let defaultStorageProvider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!defaultStorageProvider) {
    defaultStorageProvider = new LocalStorageProvider();
  }
  return defaultStorageProvider;
}
