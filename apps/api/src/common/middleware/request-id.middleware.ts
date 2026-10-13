import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { generateUuidV7 } from '@stokrova/domain';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string);

    const requestId = incomingId && incomingId.trim() !== '' ? incomingId.trim() : generateUuidV7();

    req.headers['x-request-id'] = requestId;
    (req as any).requestId = requestId;

    res.setHeader('x-request-id', requestId);

    next();
  }
}
