import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getSiteUrl(request: Request): string {
  // 1. Üretimde hosting panelinden setlenen ortam değişkeni (en güvenilir)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  // 2. Proxy / CDN başlıkları (Vercel, Cloudflare, Nginx vb.)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  // 3. Fallback — lokal geliştirmede çalışır
  const { origin } = new URL(request.url);
  return origin;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Yetkiniz yok' }), { status: 401 });
  }

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'Yönetici') {
    return new NextResponse(JSON.stringify({ error: 'Bu işlemi yapmaya sadece yöneticiler yetkilidir' }), { status: 403 });
  }

  let payload: { email?: string; locale?: string } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Geçersiz istek gövdesi' }), { status: 400 });
  }

  const email = payload.email?.trim();
  const locale = payload.locale || 'tr';

  if (!email) {
    return new NextResponse(JSON.stringify({ error: 'E-posta adresi gerekli' }), { status: 400 });
  }

  const siteUrl = getSiteUrl(request);
  const redirectTo = `${siteUrl}/${locale}/auth/reset-password`;
  const supabaseAdmin = createSupabaseServiceClient();

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    console.error('Şifre sıfırlama e-postası gönderilemedi:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return NextResponse.json({ message: 'Şifre kurulum / sıfırlama bağlantısı e-posta olarak gönderildi.' });
}
