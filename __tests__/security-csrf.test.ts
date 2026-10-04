import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { verifyCsrfOrigin } from '@/lib/security-utils';

function createMockRequest(origin: string | null, referer: string | null): Request {
  const headers = new Headers();
  if (origin) headers.set('origin', origin);
  if (referer) headers.set('referer', referer);

  return {
    headers,
  } as unknown as Request;
}

describe('CSRF Security - verifyCsrfOrigin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, NEXT_PUBLIC_SITE_URL: 'https://elysonsweets.de' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should block requests with malicious origin', () => {
    const req = createMockRequest('https://evil.com', null);
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(false);
  });

  it('should block requests with malicious referer', () => {
    const req = createMockRequest(null, 'https://malicious-site.com/attack');
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(false);
  });

  it('should block requests with no origin and no referer (fail closed)', () => {
    const req = createMockRequest(null, null);
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(false);
  });

  it('should allow requests from the exact same origin', () => {
    const req = createMockRequest('https://elysonsweets.de', null);
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(true);
  });

  it('should allow requests from valid referer', () => {
    const req = createMockRequest(null, 'https://elysonsweets.de/admin/crm');
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(true);
  });

  it('should allow localhost in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const req = createMockRequest('http://localhost:3000', null);
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(true);
  });

  it('should block localhost in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const req = createMockRequest('http://localhost:3000', null);
    const result = verifyCsrfOrigin(req);
    expect(result).toBe(false);
  });
});
