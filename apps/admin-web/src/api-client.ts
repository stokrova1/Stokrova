/**
 * STOKROVA Admin Web — Internal API Service Client
 * Uses the internal service binding (API_URL) injected at runtime by Vercel Services.
 *
 * Configured in vercel.json:
 * "bindings": [
 *   { "type": "service", "service": "api", "format": "url", "env": "API_URL" }
 * ]
 */

export interface InternalApiClientOptions {
  customBaseUrl?: string;
}

declare const process: { env?: Record<string, string | undefined> } | undefined;

/**
 * Resolves the base URL of the internal API service.
 * In Vercel Services, the target service's URL is injected into process.env.API_URL at runtime.
 */
export function getInternalApiUrl(): string {
  const envUrl =
    typeof process !== 'undefined' && process.env?.['API_URL']
      ? process.env['API_URL']
      : undefined;

  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }

  // Fallback for local development or client-side execution
  return 'http://localhost:3000';
}

/**
 * Builds a fully qualified URL for an API endpoint.
 * Ensures the global NestJS /v1 prefix is preserved.
 */
export function buildApiUrl(path: string, options?: InternalApiClientOptions): string {
  const base = options?.customBaseUrl ?? getInternalApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Ensure the /v1 prefix from apps/api/src/main.ts is present
  const versionedPath = cleanPath.startsWith('/v1') ? cleanPath : `/v1${cleanPath}`;
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}${versionedPath}`;
}

/**
 * Executes a fetch request against the internal API service.
 * Resolves against process.env.API_URL at runtime.
 */
export async function fetchFromInternalApi(
  path: string,
  init?: RequestInit,
  options?: InternalApiClientOptions,
): Promise<Response> {
  const url = buildApiUrl(path, options);
  return fetch(url, init);
}
