// src/app/api/admin/delete-user/route.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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

  const { userIdToDelete } = await request.json();
  if (!userIdToDelete) {
    return new NextResponse(JSON.stringify({ error: 'Silinecek kullanıcı IDsi belirtilmedi' }), { status: 400 });
  }

  if (userIdToDelete === user.id) {
    return new NextResponse(JSON.stringify({ error: 'Kendi yöneticilik hesabınızı buradan silemezsiniz.' }), { status: 400 });
  }

  const supabaseAdmin = createSupabaseServiceClient();

  const { data: targetProfile } = await supabaseAdmin
    .from('profiller')
    .select('tam_ad, rol, firma_id')
    .eq('id', userIdToDelete)
    .maybeSingle();

  const archivedName = `[Silindi] ${targetProfile?.tam_ad?.trim() || 'Kullanıcı'}`;

  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete, true);

  if (error) {
    console.error('Kullanıcı silinirken hata:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const cleanupOperations = [
    {
      label: 'profil arşivleme',
      run: () => supabaseAdmin.from('profiller').update({ tam_ad: archivedName, firma_id: null }).eq('id', userIdToDelete),
    },
    {
      label: 'firma sahipliği',
      run: () => supabaseAdmin.from('firmalar').update({ sahip_id: null }).eq('sahip_id', userIdToDelete),
    },
    {
      label: 'firma sorumlu personel atamaları',
      run: () => supabaseAdmin.from('firmalar').update({ sorumlu_personel_id: null }).eq('sorumlu_personel_id', userIdToDelete),
    },
    {
      label: 'görev atamaları',
      run: () => supabaseAdmin.from('gorevler').update({ atanan_kisi_id: null }).eq('atanan_kisi_id', userIdToDelete),
    },
    {
      label: 'görev sahipliği',
      run: () => supabaseAdmin.from('gorevler').update({ sahip_id: null }).eq('sahip_id', userIdToDelete),
    },
    {
      label: 'sipariş atamaları',
      run: () => supabaseAdmin.from('siparisler').update({ atanan_kisi_id: null }).eq('atanan_kisi_id', userIdToDelete),
    },
  ];

  const cleanupResults = await Promise.all(
    cleanupOperations.map(async (operation) => {
      try {
        const result = await operation.run();
        return { label: operation.label, error: result.error ?? null };
      } catch (cleanupError) {
        return {
          label: operation.label,
          error: cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
        };
      }
    })
  );

  cleanupResults.forEach(({ label, error: cleanupError }) => {
    if (cleanupError) {
      console.warn(`${label} temizlenemedi:`, cleanupError);
    }
  });

  return NextResponse.json({
    message: 'Kullanıcı başarıyla silindi',
    data,
    cleanupWarnings: cleanupResults.filter((result) => result.error).length,
    cleanupWarningLabels: cleanupResults.filter((result) => result.error).map((result) => result.label),
  });
}