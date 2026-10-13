import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/api-error.js';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const formattedIssues = result.error.issues.map((i: any) => ({
        path: i.path.join('.'),
        message: i.message,
        code: i.code,
      }));

      throw new ValidationError('Validation failed for request payload.', {
        issues: formattedIssues as any,
      });
    }
    return result.data;
  }
}
