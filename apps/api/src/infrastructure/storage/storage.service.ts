import { Injectable } from '@nestjs/common';
import type { StorageProvider, PutObjectOptions, SignedUrlOptions } from '@stokrova/contracts';
import { R2StorageProvider } from './r2-storage.provider.js';

@Injectable()
export class StorageService implements StorageProvider {
  constructor(private readonly provider: R2StorageProvider) {}

  put(key: string, data: Uint8Array | string, options?: PutObjectOptions) {
    return this.provider.put(key, data, options);
  }

  get(key: string) {
    return this.provider.get(key);
  }

  delete(key: string) {
    return this.provider.delete(key);
  }

  exists(key: string) {
    return this.provider.exists(key);
  }

  createSignedUrl(key: string, options: SignedUrlOptions) {
    return this.provider.createSignedUrl(key, options);
  }
}
