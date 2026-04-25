// src/app/api/admin/create-personel-user/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { normalizeAllowedAdminPanels, normalizeInternalNotificationPreferences } from '@/lib/admin/panel-access';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getSiteUrl(request: Request): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
  }
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const { origin } = new URL(request.url);
  return origin;
}

const VALID_ROLES = ['Yönetici', 'Personel', 'Müşteri', 'Alt Bayi'] as const;
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

  const email = payload.email?.trim().toLowerCase();
  const password = payload.password;
  const tam_ad = payload.tam_ad;
  const hasPassword = typeof password === 'string' && password.length > 0;
  const rol = VALID_ROLES.includes((payload.rol || 'Personel') as ValidRole)
    ? (payload.rol as ValidRole)
    : 'Personel';
  const isPortalRole = rol === 'Müşteri' || rol === 'Alt Bayi';
  const firmaId = payload.firma_id?.trim() || null;
  const sendInviteEmail = payload.sendInviteEmail === true;
  const locale = payload.locale || 'tr';
  const redirectTo = `${getSiteUrl(request)}/${locale}/auth/reset-password`;
  const allowedPanels = isPortalRole ? [] : normalizeAllowedAdminPanels(payload.allowedPanels);
  const notificationPreferences = isPortalRole ? null : normalizeInternalNotificationPreferences(payload.notificationPreferences);

  if (!email || (!hasPassword && !sendInviteEmail)) {
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

  const shouldCreateLoginReadyUser = hasPassword || !sendInviteEmail;

  let authUser: { id: string } | null = null;
  let usedExistingUser = false;

  const { data: created, error: createError } = shouldCreateLoginReadyUser
    ? await supabaseAdmin.auth.admin.createUser({
        email,
        password: hasPassword ? password : crypto.randomUUID(),
        email_confirm: true,
        user_metadata: userMetadata,
      })
    : await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: userMetadata,
      });

  authUser = created?.user ? { id: created.user.id } : null;

  if (createError || !authUser) {
    const normalizedError = String(createError?.message || '').toLowerCase();
    const isExistingUserError = normalizedError.includes('already') || normalizedError.includes('registered') || normalizedError.includes('exists');

    if (!isExistingUserError) {
      console.error('Kullanıcı oluşturma hatası (auth):', createError);
      return new NextResponse(JSON.stringify({ error: createError?.message || 'Kullanıcı oluşturulamadı' }), { status: 500 });
    }

    const { data: authUsersData, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listUsersError) {
      console.error('Mevcut auth kullanıcısı alınamadı:', listUsersError);
      return new NextResponse(JSON.stringify({ error: listUsersError.message }), { status: 500 });
    }

    const existingUser = authUsersData.users.find((item) => (item.email ?? '').trim().toLowerCase() === email);
    if (!existingUser) {
      console.error('Mevcut kullanıcı bulunamadı:', createError);
      return new NextResponse(JSON.stringify({ error: createError?.message || 'Kullanıcı oluşturulamadı' }), { status: 500 });
    }

    usedExistingUser = true;
    authUser = { id: existingUser.id };

    if (hasPassword) {
      const { data: updatedAuthUser, error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          ...userMetadata,
        },
      });

      if (updateAuthError) {
        console.error('Mevcut kullanıcının şifresi güncellenemedi:', updateAuthError);
        return new NextResponse(JSON.stringify({ error: updateAuthError.message }), { status: 500 });
      }

      authUser = { id: updatedAuthUser.user.id };
    }
  }

  const { error: profileError } = await supabaseAdmin.from('profiller').upsert({
    id: authUser.id,
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
      .update({ sahip_id: authUser.id })
      .eq('id', firmaId);

    if (firmaUpdateError) {
      console.error('Alt bayi firma bağlantısı güncellenemedi:', firmaUpdateError);
      return new NextResponse(JSON.stringify({ error: firmaUpdateError.message }), { status: 500 });
    }
  }

  if (sendInviteEmail) {
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo });
    if (resetError) {
      console.error('Davet / şifre kurulum e-postası gönderilemedi:', resetError);
    }
  }

  const message = usedExistingUser
    ? hasPassword
      ? 'Bu e-posta zaten kayıtlıydı. Şifre güncellendi; artık belirlediğiniz şifre ile giriş yapabilir.'
      : 'Bu e-posta zaten kayıtlıydı. Şifre kurulum e-postası yeniden gönderildi.'
    : hasPassword
      ? sendInviteEmail
        ? 'Kullanıcı oluşturuldu. Geçici şifre ile giriş yapabilir; ayrıca şifre kurulum e-postası da gönderildi.'
        : 'Kullanıcı oluşturuldu ve verdiğiniz şifre ile hemen giriş yapabilir.'
      : 'Kullanıcı oluşturuldu ve şifre kurulum e-postası gönderildi.';

  return NextResponse.json({
    message,
    userId: authUser.id,
    rol,
    allowedPanels,
    notificationPreferences,
    firma_id: firmaId,
    inviteSent: sendInviteEmail,
    loginReady: hasPassword,
  });
}
