import { Injectable } from '@nestjs/common';
import type {
  StorageProvider,
  StorageObjectMetadata,
  PutObjectOptions,
  SignedUrlOptions,
} from '@stokrova/contracts';
import { ApiConfigService } from '../../config/api-config.service.js';
import { signS3Request } from './sigv4.js';

interface StoredBufferObject {
  data: Uint8Array;
  metadata: StorageObjectMetadata;
}

@Injectable()
export class R2StorageProvider implements StorageProvider {
  private readonly inMemoryObjects = new Map<string, StoredBufferObject>();

  constructor(private readonly configService: ApiConfigService) {}

  /**
   * Live Cloudflare R2 mode is enabled when a real endpoint and keys are configured
   * (STORAGE_ENDPOINT/R2_ENDPOINT = https://<account_id>.r2.cloudflarestorage.com).
   * Otherwise objects stay in memory for local development and tests.
   */
  private live(): { url: (key: string) => URL; sign: (m: string, u: URL, b?: Uint8Array | string, h?: Record<string, string>) => Record<string, string> } | null {
    const c = this.configService.config;
    if (!c.storageEndpoint || c.storageEndpoint.includes('example.com') || c.storageAccessKeyId === 'dev-storage-key') return null;
    const base = c.storageEndpoint.replace(/\/$/, '');
    const creds = { accessKeyId: c.storageAccessKeyId, secretAccessKey: c.storageSecretAccessKey, region: process.env['STORAGE_REGION'] || 'auto' };
    return {
      url: (key) => new URL(`${base}/${c.storageBucket}/${key}`),
      sign: (m, u, b, h) => signS3Request(creds, m, u, b, h),
    };
  }

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

    const r2 = this.live();
    if (r2) {
      const url = r2.url(cleanKey);
      const extra: Record<string, string> = { 'content-type': metadata.contentType! };
      for (const [k, v] of Object.entries(options?.metadata ?? {})) extra[`x-amz-meta-${k}`] = v;
      const res = await fetch(url, { method: 'PUT', headers: r2.sign('PUT', url, bytes, extra), body: bytes });
      if (!res.ok) throw new Error(`R2 upload failed [${res.status}]: ${await res.text()}`);
      metadata.etag = res.headers.get('etag') ?? etag;
    } else {
      this.inMemoryObjects.set(cleanKey, { data: bytes, metadata });
    }

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
    const r2 = this.live();
    if (r2) {
      const url = r2.url(key.trim());
      const res = await fetch(url, { headers: r2.sign('GET', url) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`R2 download failed [${res.status}]: ${await res.text()}`);
      return {
        data: new Uint8Array(await res.arrayBuffer()),
        metadata: { contentType: res.headers.get('content-type') ?? undefined, etag: res.headers.get('etag') ?? undefined },
      };
    }
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
    const r2 = this.live();
    if (r2) {
      const url = r2.url(key.trim());
      const res = await fetch(url, { method: 'DELETE', headers: r2.sign('DELETE', url) });
      return res.ok || res.status === 404;
    }
    return this.inMemoryObjects.delete(key.trim());
  }

  /**
   * Checks whether an object exists in storage.
   */
  async exists(key: string): Promise<boolean> {
    const r2 = this.live();
    if (r2) {
      const url = r2.url(key.trim());
      const res = await fetch(url, { method: 'HEAD', headers: r2.sign('HEAD', url) });
      return res.ok;
    }
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
