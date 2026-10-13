import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class StructuredLoggerService implements LoggerService {
  private formatLog(level: string, message: any, context?: string): string {
    const payload = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      context: context || 'Application',
      message: typeof message === 'object' ? JSON.stringify(message) : message,
    };
    return JSON.stringify(payload);
  }

  log(message: any, context?: string) {
    console.log(this.formatLog('info', message, context));
  }

  error(message: any, trace?: string, context?: string) {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context: context || 'Application',
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      trace: trace || undefined,
    };
    console.error(JSON.stringify(payload));
  }

  warn(message: any, context?: string) {
    console.warn(this.formatLog('warn', message, context));
  }

  debug(message: any, context?: string) {
    console.debug(this.formatLog('debug', message, context));
  }

  verbose(message: any, context?: string) {
    console.log(this.formatLog('verbose', message, context));
  }
}
