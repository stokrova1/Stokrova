/**
 * Object Storage Abstraction Contract (Section 24)
 * Cloudflare R2 / S3-compatible storage provider interface.
 */

export interface StorageObjectMetadata {
  contentType?: string;
  contentLength?: number;
  lastModified?: Date;
  etag?: string;
  customMetadata?: Record<string, string>;
}

export interface PutObjectOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  isPublic?: boolean;
}

export interface SignedUrlOptions {
  operation: 'getObject' | 'putObject';
  expiresInSeconds?: number;
  contentType?: string;
}

export interface StorageProvider {
  put(
    key: string,
    data: Uint8Array | string,
    options?: PutObjectOptions,
  ): Promise<{ key: string; etag?: string; url?: string }>;

  get(key: string): Promise<{ data: Uint8Array; metadata: StorageObjectMetadata } | null>;

  delete(key: string): Promise<boolean>;

  exists(key: string): Promise<boolean>;

  createSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;
}
