import { NextResponse } from 'next/server';
import { getGoogleOAuthClient } from '@/lib/google-business/client';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  const state = url.searchParams.get('state');

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

    if (state === 'drive_auth') {
      if (refreshToken) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const envPath = path.resolve(process.cwd(), '.env.local');
          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            if (envContent.includes('GOOGLE_DRIVE_REFRESH_TOKEN=')) {
              envContent = envContent.replace(
                /GOOGLE_DRIVE_REFRESH_TOKEN=.*(\r?\n|$)/,
                `GOOGLE_DRIVE_REFRESH_TOKEN="${refreshToken}"$1`
              );
            } else {
              envContent += `\nGOOGLE_DRIVE_REFRESH_TOKEN="${refreshToken}"\n`;
            }
            fs.writeFileSync(envPath, envContent, 'utf8');
          }
          process.env.GOOGLE_DRIVE_REFRESH_TOKEN = refreshToken;
        } catch (e) {
          console.error('Failed to auto-write .env.local:', e);
        }
      }

      return new NextResponse(
        `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 50px auto; padding: 32px; border: 1px solid #10b981; border-radius: 16px; background: #ecfdf5; box-shadow: 0 10px 25px rgba(0,0,0,0.05); text-align: center;">
          <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
          <h2 style="color: #065f46; margin: 0 0 12px; font-size: 24px;">Google Drive Başarıyla Bağlandı!</h2>
          <p style="color: #047857; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
            Google hesabınızın 5 TB Drive alanına yetkilendirme sağlandı ve kalıcı anahtar (Refresh Token) <code>.env.local</code> dosyanıza otomatik kaydedildi.
          </p>
          <div style="background: white; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px; margin-bottom: 24px; word-break: break-all; font-family: monospace; font-size: 13px; color: #374151;">
            ${refreshToken || 'Bağlantı güncellendi (Mevcut token aktif).'}
          </div>
          <a href="/admin/belgeleri-yonet" style="display: inline-block; background: #059669; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
            Belgeleri Yönet Sayfasına Dön →
          </a>
        </div>
        `,
        {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

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
