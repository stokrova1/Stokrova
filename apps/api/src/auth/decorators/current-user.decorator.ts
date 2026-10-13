import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { UserIdentity } from '@stokrova/contracts';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserIdentity | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: UserIdentity }>();
    return request.user;
  },
);
