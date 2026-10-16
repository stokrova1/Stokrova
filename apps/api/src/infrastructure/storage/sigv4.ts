import { createHash, createHmac } from 'node:crypto';

/** Minimal AWS Signature V4 signer for S3-compatible APIs (Cloudflare R2 uses region "auto"). */
export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: Buffer | string, data: string) => createHmac('sha256', key).update(data).digest();

function encodePath(path: string): string {
  return path.split('/').map((p) => encodeURIComponent(p)).join('/');
}

export function signS3Request(
  creds: SigV4Credentials,
  method: string,
  url: URL,
  body: Uint8Array | string = '',
  extraHeaders: Record<string, string> = {},
  now = new Date(),
): Record<string, string> {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(body);
  const headers: Record<string, string> = {
    host: url.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    ...Object.fromEntries(Object.entries(extraHeaders).map(([k, v]) => [k.toLowerCase(), v])),
  };
  const signedHeaders = Object.keys(headers).sort();
  const canonicalQuery = [...url.searchParams.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  const canonical = [
    method,
    encodePath(url.pathname),
    canonicalQuery,
    signedHeaders.map((h) => `${h}:${headers[h]!.trim()}\n`).join(''),
    signedHeaders.join(';'),
    payloadHash,
  ].join('\n');
  const scope = `${date}/${creds.region}/s3/aws4_request`;
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
  const kDate = hmac(`AWS4${creds.secretAccessKey}`, date);
  const kSigning = hmac(hmac(hmac(kDate, creds.region), 's3'), 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(toSign).digest('hex');
  return {
    ...headers,
    authorization: `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`,
  };
}
