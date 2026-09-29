import { NextRequest } from 'next/server';

export function verifyCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';
  
  // Güvenli başarısızlık (fail closed): İkisi de yoksa reddet
  if (!origin && !referer) {
    return false;
  }

  const allowedOrigins = [siteUrl];
  
  // Localhost toleransı
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
    allowedOrigins.push('http://127.0.0.1:3000');
  }

  const checkSource = (sourceUrl: string | null) => {
    if (!sourceUrl) return false;
    try {
      const url = new URL(sourceUrl);
      return allowedOrigins.includes(url.origin);
    } catch {
      // Geçersiz URL formatı
      return false;
    }
  };

  // Hem origin hem referer kontrol edilebilir. Genellikle Origin tercih edilir, yoksa Referer'a bakılır.
  if (origin) {
    return checkSource(origin);
  }
  
  if (referer) {
    return checkSource(referer);
  }

  return false;
}
