import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { UserIdentity } from '@stokrova/contracts';
import { AuthService, type UserSessionResponse } from './auth.service.js';
import { CreateTenantRequestSchema } from '@stokrova/validation';
import type { CreateTenantRequest, ProvisionedTenantResult } from '@stokrova/contracts';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('session')
  @UseGuards(AuthGuard)
  async getSession(@CurrentUser() user: UserIdentity): Promise<UserSessionResponse> {
    return this.authService.getSession(user);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: UserIdentity): Promise<UserSessionResponse> {
    return this.authService.getSession(user);
  }

  @Post('onboard')
  @UseGuards(AuthGuard)
  async completeOnboarding(
    @CurrentUser() user: UserIdentity,
    @Body() body: unknown,
  ): Promise<ProvisionedTenantResult> {
    // The owner is always the signed-in account; the browser cannot choose who owns the company.
    const input = { ...(body && typeof body === 'object' ? body : {}) } as Record<string, unknown>;
    input['owner_email'] = user.email;
    if (!input['owner_full_name'] && user.full_name) input['owner_full_name'] = user.full_name;
    const parseResult = CreateTenantRequestSchema.safeParse(input);
    if (!parseResult.success) {
      throw new BadRequestException({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Invalid business onboarding payload.',
          details: parseResult.error.format(),
        },
      });
    }

    return this.authService.completeOnboarding(
      user,
      parseResult.data as CreateTenantRequest,
    );
  }
}
