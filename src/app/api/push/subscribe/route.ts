import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Web Push Abonelik Kaydetme / Güncelleme Endpoint'i
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(await cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Geçersiz abonelik verisi. Endpoint ve keys zorunludur.' },
        { status: 400 }
      );
    }

    // Aboneliği kaydet veya güncelle (user_id ve endpoint unique)
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,endpoint' }
      )
      .select('id')
      .single();

    if (error) {
      console.error('[/api/push/subscribe] Abonelik veritabanına kaydedilemedi:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('[/api/push/subscribe] Sunucu hatası:', err);
    return NextResponse.json({ error: err?.message || 'Bilinmeyen hata' }, { status: 500 });
  }
}

/**
 * Web Push Abonelik Silme Endpoint'i
 */
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient(await cookies());

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint parametresi zorunludur.' }, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Bilinmeyen hata' }, { status: 500 });
  }
}
