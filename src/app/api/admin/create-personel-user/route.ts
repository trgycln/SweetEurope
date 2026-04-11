// src/app/api/admin/create-personel-user/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { normalizeAllowedAdminPanels, normalizeInternalNotificationPreferences } from '@/lib/admin/panel-access';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const VALID_ROLES = ['Yönetici', 'Ekip Üyesi', 'Personel', 'Müşteri', 'Alt Bayi'] as const;
type ValidRole = (typeof VALID_ROLES)[number];

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

  let payload: {
    email?: string;
    password?: string;
    tam_ad?: string | null;
    rol?: string;
    allowedPanels?: string[];
    notificationPreferences?: Record<string, boolean> | null;
    firma_id?: string | null;
    sendInviteEmail?: boolean;
    locale?: string;
  } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Geçersiz istek gövdesi' }), { status: 400 });
  }

  const { email, password, tam_ad } = payload;
  const rol = VALID_ROLES.includes((payload.rol || 'Personel') as ValidRole)
    ? (payload.rol as ValidRole)
    : 'Personel';
  const isPortalRole = rol === 'Müşteri' || rol === 'Alt Bayi';
  const firmaId = payload.firma_id?.trim() || null;
  const sendInviteEmail = payload.sendInviteEmail === true;
  const locale = payload.locale || 'tr';
  const redirectTo = new URL(`/${locale}/auth/reset-password`, request.url).toString();
  const allowedPanels = isPortalRole ? [] : normalizeAllowedAdminPanels(payload.allowedPanels);
  const notificationPreferences = isPortalRole ? null : normalizeInternalNotificationPreferences(payload.notificationPreferences);

  if (!email || (!password && !sendInviteEmail)) {
    return new NextResponse(JSON.stringify({ error: 'Email zorunludur. Davet maili göndermiyorsanız geçici şifre de girilmelidir.' }), { status: 400 });
  }

  if (isPortalRole && !firmaId) {
    return new NextResponse(JSON.stringify({ error: 'Müşteri veya alt bayi kullanıcıları mevcut bir firmaya bağlanmalıdır.' }), { status: 400 });
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const userMetadata = {
    tam_ad: tam_ad || null,
    allowed_admin_panels: allowedPanels,
    ...(notificationPreferences ? { internal_notification_preferences: notificationPreferences } : {}),
  };

  const { data: created, error: createError } = sendInviteEmail
    ? await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: userMetadata,
      })
    : await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: userMetadata,
      });

  if (createError || !created?.user) {
    console.error('Kullanıcı oluşturma hatası (auth):', createError);
    return new NextResponse(JSON.stringify({ error: createError?.message || 'Kullanıcı oluşturulamadı' }), { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin.from('profiller').upsert({
    id: created.user.id,
    rol: rol as never,
    tam_ad: tam_ad || null,
    firma_id: firmaId,
  });

  if (profileError) {
    console.error('Kullanıcı oluşturma hatası (profil):', profileError);
    return new NextResponse(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  if (rol === 'Alt Bayi' && firmaId) {
    const { error: firmaUpdateError } = await supabaseAdmin
      .from('firmalar')
      .update({ sahip_id: created.user.id })
      .eq('id', firmaId);

    if (firmaUpdateError) {
      console.error('Alt bayi firma bağlantısı güncellenemedi:', firmaUpdateError);
      return new NextResponse(JSON.stringify({ error: firmaUpdateError.message }), { status: 500 });
    }
  }

  return NextResponse.json({
    message: sendInviteEmail ? 'Kullanıcı oluşturuldu ve davet e-postası gönderildi' : 'Kullanıcı oluşturuldu',
    userId: created.user.id,
    rol,
    allowedPanels,
    notificationPreferences,
    firma_id: firmaId,
    inviteSent: sendInviteEmail,
  });
}
