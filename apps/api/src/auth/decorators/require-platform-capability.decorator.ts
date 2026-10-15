import { SetMetadata } from '@nestjs/common';

export const PLATFORM_CAPABILITY_KEY = 'PLATFORM_CAPABILITY';

/**
 * Decorator to require a specific Platform Founder / Super Admin capability.
 * Example: @RequirePlatformCapability('platform.businesses.suspend')
 */
export const RequirePlatformCapability = (capability: string) =>
  SetMetadata(PLATFORM_CAPABILITY_KEY, capability);
