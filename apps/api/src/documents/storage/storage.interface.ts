export interface StoragePutResult {
  storageProvider: string;
  storageKey: string;
  checksum: string;
  sizeBytes: number;
}

export interface StorageMetadata {
  sizeBytes: number;
  mimeType: string;
  checksum: string;
  lastModified: Date;
}

export interface IStorageProvider {
  readonly providerName: string;

  put(
    workspaceId: string,
    storageKey: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<StoragePutResult>;

  get(workspaceId: string, storageKey: string): Promise<Buffer>;

  delete(workspaceId: string, storageKey: string): Promise<boolean>;

  exists(workspaceId: string, storageKey: string): Promise<boolean>;

  getMetadata(workspaceId: string, storageKey: string): Promise<StorageMetadata | null>;
}
