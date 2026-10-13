import { Module, Global } from '@nestjs/common';
import { R2StorageProvider } from './r2-storage.provider.js';
import { StorageService } from './storage.service.js';

@Global()
@Module({
  providers: [R2StorageProvider, StorageService],
  exports: [StorageService, R2StorageProvider],
})
export class StorageModule {}
