import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { sendPortalWelcomeEmail } from '@/lib/email';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getSiteUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost && !forwardedHost.includes('localhost') && !forwardedHost.includes('127.0.0.1')) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const { origin } = new URL(request.url);
  if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return origin;
  }
  return 'https://elysonsweets.de';
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

  let payload: { email?: string; locale?: string; userId?: string } = {};
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

  let actionLink: string | null = null;
  try {
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });
    actionLink = linkData?.properties?.action_link || null;
  } catch (err) {
    console.error('generateLink hatası:', err);
  }

  let recipientName: string | null = null;
  let firmName: string | null = null;
  if (payload.userId) {
    const { data: userProfile } = await supabaseAdmin
      .from('profiller')
      .select('tam_ad, firma:firmalar!profiller_firma_id_fkey(unvan)')
      .eq('id', payload.userId)
      .maybeSingle();
    recipientName = userProfile?.tam_ad || null;
    firmName = (userProfile?.firma as any)?.unvan || null;
  }

  try {
    await sendPortalWelcomeEmail({
      to: email,
      recipientName,
      firmName,
      actionLink,
      loginUrl: `${siteUrl}/${locale}/login`,
      locale,
    });
  } catch (err) {
    console.warn('ElysonSweets e-posta gönderim hatası:', err);
  }

  return NextResponse.json({
    message: 'ElysonSweets resmi şifre kurulum / giriş bağlantısı e-posta olarak gönderildi.',
    actionLink,
  });
}
