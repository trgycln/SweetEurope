// src/app/api/admin/update-profile/route.ts
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
    userId?: string;
    tam_ad?: string | null;
    rol?: string;
    allowedPanels?: string[];
    notificationPreferences?: Record<string, boolean> | null;
    firma_id?: string | null;
  } = {};

  try {
    payload = await request.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Geçersiz istek gövdesi' }), { status: 400 });
  }

  const { userId, tam_ad } = payload;
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'Kullanıcı ID gerekli' }), { status: 400 });
  }

  const rol = payload.rol && VALID_ROLES.includes(payload.rol as ValidRole) ? (payload.rol as ValidRole) : undefined;
  const firmaId = payload.firma_id === undefined ? undefined : payload.firma_id?.trim() || null;
  const allowedPanels = payload.allowedPanels !== undefined ? normalizeAllowedAdminPanels(payload.allowedPanels) : undefined;
  const notificationPreferences = payload.notificationPreferences === undefined
    ? undefined
    : payload.notificationPreferences === null || rol === 'Müşteri' || rol === 'Alt Bayi'
      ? null
      : normalizeInternalNotificationPreferences(payload.notificationPreferences);

  const supabaseAdmin = createSupabaseServiceClient();

  const updatePayload: { tam_ad?: string | null; rol?: ValidRole; firma_id?: string | null } = {};
  if (tam_ad !== undefined) updatePayload.tam_ad = tam_ad;
  if (rol !== undefined) updatePayload.rol = rol;
  if (firmaId !== undefined) updatePayload.firma_id = firmaId;

  if (Object.keys(updatePayload).length > 0) {
    const { error } = await supabaseAdmin.from('profiller').upsert({ id: userId, ...updatePayload });

    if (error) {
      return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
    }
  }

  if (rol === 'Alt Bayi' && firmaId) {
    const { error: firmaUpdateError } = await supabaseAdmin
      .from('firmalar')
      .update({ sahip_id: userId })
      .eq('id', firmaId);

    if (firmaUpdateError) {
      return new NextResponse(JSON.stringify({ error: firmaUpdateError.message }), { status: 500 });
    }
  }

  if (tam_ad !== undefined || allowedPanels !== undefined || notificationPreferences !== undefined) {
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authUserError) {
      return new NextResponse(JSON.stringify({ error: authUserError.message }), { status: 500 });
    }

    const nextMetadata = {
      ...(authUserData.user?.user_metadata || {}),
      ...(tam_ad !== undefined ? { tam_ad } : {}),
      ...(allowedPanels !== undefined ? { allowed_admin_panels: allowedPanels } : {}),
    } as Record<string, unknown>;

    if (notificationPreferences !== undefined) {
      if (notificationPreferences === null) {
        delete nextMetadata.internal_notification_preferences;
      } else {
        nextMetadata.internal_notification_preferences = notificationPreferences;
      }
    }

    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: nextMetadata,
    });

    if (updateAuthError) {
      return new NextResponse(JSON.stringify({ error: updateAuthError.message }), { status: 500 });
    }
  }

  return NextResponse.json({ message: 'Profil güncellendi' });
}
