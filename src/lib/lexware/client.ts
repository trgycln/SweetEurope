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

export function getLexwareApiKey(isTest: boolean = false): string {
  if (isTest) {
    const testKey = process.env.LEXWARE_TEST_API_KEY?.trim();
    if (!testKey) {
      throw new Error('Test siparişleri için LEXWARE_TEST_API_KEY ortam değişkeni tanımlı değil! Lexware Sandbox API anahtarınızı .env dosyasına ekleyin.');
    }
    return testKey;
  }

  const key = process.env.LEXWARE_API_KEY?.trim();
  if (!key) {
    throw new Error('LEXWARE_API_KEY ortam değişkeni tanımlı değil.');
  }
  return key;
}

export async function lexwareFetch<T = any>(
  endpoint: string,
  options: RequestInit & { isTest?: boolean } = {}
): Promise<T> {
  // KRITIK GÜVENLIK KURALI: Bu mock kodu ASLA production ortaminda calismamalidir.
  // Canlıda sahte fatura üretmek ciddi bir finansal risktir.
  const isProduction = process.env.NODE_ENV === 'production';
  const isMockEnabled = !isProduction && (
    process.env.NODE_ENV === 'test' || 
    process.env.NODE_ENV === 'development' ||
    process.env.PLAYWRIGHT_TEST === 'true' || 
    process.env.MOCK_LEXWARE === 'true'
  );
                 
  if (isMockEnabled && !options.isTest) {
    if (endpoint.includes('/document')) return { documentFileId: 'mock-file-id' } as any;
    if (endpoint.includes('/files')) {
      const mockPdf = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n5 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(MOCK INVOICE) Tj\nET\nendstream\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`;
      return new Blob([mockPdf], { type: 'application/pdf' }) as any;
    }
    if (endpoint.includes('credit-notes')) return { id: 'mock-storno-id', voucherNumber: 'GS-MOCK-123', pdfUrl: 'mock.pdf' } as any;
    return { id: 'mock-invoice-id', voucherNumber: 'RE-MOCK-123', pdfUrl: 'mock.pdf' } as any;
  }

  const apiKey = getLexwareApiKey(options.isTest);
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
