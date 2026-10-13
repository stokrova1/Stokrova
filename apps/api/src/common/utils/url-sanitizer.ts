const SENSITIVE_QUERY_KEYS = [
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'key',
  'api_key',
  'apikey',
  'password',
  'pwd',
  'auth',
  'authorization',
  'code',
  'client_secret',
  'sig',
  'signature',
];

/**
 * Sanitizes URLs for logging and error reporting by redacting sensitive query parameter values.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || !rawUrl.includes('?')) {
    return rawUrl;
  }

  try {
    const [path, queryString] = rawUrl.split('?');
    if (!queryString) return rawUrl;

    const params = new URLSearchParams(queryString);
    for (const key of Array.from(params.keys())) {
      const lower = key.toLowerCase();
      if (SENSITIVE_QUERY_KEYS.some((s) => lower.includes(s))) {
        params.set(key, '[REDACTED]');
      }
    }

    return `${path}?${params.toString()}`;
  } catch {
    return rawUrl;
  }
}
