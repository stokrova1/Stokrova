import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { GlobalHttpExceptionFilter } from './common/errors/http-exception.filter.js';
import { StructuredLoggingInterceptor } from './common/interceptors/logging.interceptor.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enforce API versioning from API_CONVENTIONS.md
  app.setGlobalPrefix('v1');

  // Enforce global error sanitation and structured error responses
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Attach structured logging interceptor
  app.useGlobalInterceptors(new StructuredLoggingInterceptor());

  // Enable CORS
  app.enableCors();

  const port = process.env['PORT'] ? Number(process.env['PORT']) : 3000;
  await app.listen(port);
  console.log(`STOKROVA Business API running on http://localhost:${port}/v1`);
}

bootstrap();
