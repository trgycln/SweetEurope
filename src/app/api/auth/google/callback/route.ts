import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-business/client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new NextResponse(`<h1>Giriş Hatası: ${error}</h1>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  if (!code) {
    return new NextResponse('<h1>Yetkilendirme kodu bulunamadı.</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const oauth2Client = getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);

    const refreshToken = tokens.refresh_token;

    return new NextResponse(
      `
      <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb;">
        <h2 style="color: #059669;">🎉 Google Bağlantısı Başarılı!</h2>
        <p>Google Business Profile hesabınız başarıyla bağlandı.</p>
        <p>Aşağıdaki <b>Refresh Token</b>'ı kopyalayıp asistana iletin veya <code>.env.local</code> dosyanıza <code>GOOGLE_BUSINESS_REFRESH_TOKEN</code> olarak ekleyin:</p>
        <textarea readonly style="width: 100%; height: 100px; padding: 10px; font-family: monospace; border: 1px solid #cbd5e1; border-radius: 6px;">${refreshToken || 'Token yenilendi ancak doğrudan refresh token dönmedi. (Hesap daha önce yetkilendirildiyse normaldir).'}</textarea>
        <br/><br/>
        <a href="/admin/pazarlama/google-isletme" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Panele Dön</a>
      </div>
      `,
      {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  } catch (err: any) {
    console.error('Token Alma Hatası:', err);
    return new NextResponse(`<h1>Token alma sırasında hata oluştu: ${err.message}</h1>`, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}
