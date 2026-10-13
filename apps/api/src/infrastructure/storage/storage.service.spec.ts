import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storage.service.js';
import { R2StorageProvider } from './r2-storage.provider.js';
import { ApiConfigService } from '../../config/api-config.service.js';

describe('StorageService & R2StorageProvider (Phase 1 Specification Section 30)', () => {
  let storageService: StorageService;
  let provider: R2StorageProvider;
  let configService: ApiConfigService;

  beforeEach(() => {
    configService = new ApiConfigService();
    provider = new R2StorageProvider(configService);
    storageService = new StorageService(provider);
  });

  it('puts, checks exists, gets, and deletes objects', async () => {
    const key = 'tenants/ten_1/invoices/inv-001.pdf';
    const content = new TextEncoder().encode('PDF Content Simulation');

    const putResult = await storageService.put(key, content, {
      contentType: 'application/pdf',
      metadata: { invoiceNumber: 'INV-001' },
    });

    expect(putResult.key).toBe(key);
    expect(putResult.etag).toBeDefined();

    const exists = await storageService.exists(key);
    expect(exists).toBe(true);

    const retrieved = await storageService.get(key);
    expect(retrieved).not.toBeNull();
    expect(new TextDecoder().decode(retrieved!.data)).toBe('PDF Content Simulation');
    expect(retrieved!.metadata.contentType).toBe('application/pdf');

    const deleted = await storageService.delete(key);
    expect(deleted).toBe(true);

    const existsAfterDelete = await storageService.exists(key);
    expect(existsAfterDelete).toBe(false);
  });

  it('generates secure pre-signed URLs for client uploads and downloads', async () => {
    const key = 'receipts/rec-777.png';
    const signedUploadUrl = await storageService.createSignedUrl(key, {
      operation: 'putObject',
      expiresInSeconds: 1800,
    });

    expect(signedUploadUrl).toContain('operation=putObject');
    expect(signedUploadUrl).toContain('expires=');
    expect(signedUploadUrl).toContain('signature=');
    expect(signedUploadUrl).toContain(key);

    const signedDownloadUrl = await storageService.createSignedUrl(key, {
      operation: 'getObject',
    });

    expect(signedDownloadUrl).toContain('operation=getObject');
  });
});
