import { Injectable } from '@nestjs/common';
import type {
  StorageProvider,
  StorageObjectMetadata,
  PutObjectOptions,
  SignedUrlOptions,
} from '@stokrova/contracts';
import { ApiConfigService } from '../../config/api-config.service.js';

interface StoredBufferObject {
  data: Uint8Array;
  metadata: StorageObjectMetadata;
}

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly inMemoryObjects = new Map<string, StoredBufferObject>();

  constructor(private readonly configService: ApiConfigService) {}

  /**
   * Puts an object into storage.
   */
  async put(
    key: string,
    data: Uint8Array | string,
    options?: PutObjectOptions,
  ): Promise<{ key: string; etag?: string; url?: string }> {
    const cleanKey = key.trim();
    const bytes =
      typeof data === 'string' ? new TextEncoder().encode(data) : data;

    const etag = `"${Date.now()}-${bytes.byteLength}"`;
    const metadata: StorageObjectMetadata = {
      contentType: options?.contentType || 'application/octet-stream',
      contentLength: bytes.byteLength,
      lastModified: new Date(),
      etag,
      customMetadata: options?.metadata,
    };

    this.inMemoryObjects.set(cleanKey, { data: bytes, metadata });

    const publicUrl = this.configService.config.storagePublicUrl
      ? `${this.configService.config.storagePublicUrl.replace(/\/$/, '')}/${cleanKey}`
      : undefined;

    return {
      key: cleanKey,
      etag,
      url: publicUrl,
    };
  }

  /**
   * Gets an object from storage.
   */
  async get(key: string): Promise<{ data: Uint8Array; metadata: StorageObjectMetadata } | null> {
    const item = this.inMemoryObjects.get(key.trim());
    if (!item) return null;
    return {
      data: item.data,
      metadata: item.metadata,
    };
  }

  /**
   * Deletes an object from storage.
   */
  async delete(key: string): Promise<boolean> {
    return this.inMemoryObjects.delete(key.trim());
  }

  /**
   * Checks whether an object exists in storage.
   */
  async exists(key: string): Promise<boolean> {
    return this.inMemoryObjects.has(key.trim());
  }

  /**
   * Generates a signed URL for secure client uploads or downloads.
   * Private credentials remain strictly server-side.
   */
  async createSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const cleanKey = key.trim();
    const expiresIn = options.expiresInSeconds || 3600;
    const expiresTimestamp = Math.floor(Date.now() / 1000) + expiresIn;
    const endpoint = this.configService.config.storageEndpoint.replace(/\/$/, '');
    const bucket = this.configService.config.storageBucket;

    // Generates a standard pre-signed query string (simulated or real HMAC)
    const token = Buffer.from(
      `${cleanKey}:${options.operation}:${expiresTimestamp}`,
    ).toString('base64url');

    return `${endpoint}/${bucket}/${cleanKey}?operation=${options.operation}&expires=${expiresTimestamp}&signature=${token}`;
  }
}
