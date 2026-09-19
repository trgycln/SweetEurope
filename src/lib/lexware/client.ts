/**
 * Lexware Office API Client
 * Base URL: https://api.lexware.io (Mayıs 2025 sonrası resmi gateway)
 * Rate Limit: 2 istek / saniye
 */

const LEXWARE_BASE_URL = 'https://api.lexware.io';

export class LexwareApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public details: any
  ) {
    super(`Lexware API Error [${status} ${statusText}]: ${typeof details === 'string' ? details : JSON.stringify(details)}`);
    this.name = 'LexwareApiError';
  }
}

export function getLexwareApiKey(): string {
  const key = process.env.LEXWARE_API_KEY?.trim();
  if (!key) {
    throw new Error('LEXWARE_API_KEY ortam değişkeni tanımlı değil.');
  }
  return key;
}

export async function lexwareFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getLexwareApiKey();
  const url = endpoint.startsWith('http') ? endpoint : `${LEXWARE_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let details: any;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    throw new LexwareApiError(response.status, response.statusText, details);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }

  // Binary (örn: PDF dosyası)
  return (await response.blob()) as unknown as T;
}
