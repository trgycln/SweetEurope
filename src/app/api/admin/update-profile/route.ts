// src/app/api/admin/update-profile/route.ts
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Yetkiniz yok' }), { status: 401 });
  }

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'Yönetici') {
    return new NextResponse(JSON.stringify({ error: 'Bu işlemi yapmaya sadece yöneticiler yetkilidir' }), { status: 403 });
  }

  const { userId, tam_ad, rol } = await request.json();
  if (!userId) {
    return new NextResponse(JSON.stringify({ error: 'Kullanıcı ID gerekli' }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const updatePayload: Record<string, any> = {};
  if (tam_ad !== undefined) updatePayload.tam_ad = tam_ad;
  if (rol !== undefined) updatePayload.rol = rol;

  const { error } = await supabaseAdmin
    .from('profiller')
    .update(updatePayload)
    .eq('id', userId);

  if (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return NextResponse.json({ message: 'Profil güncellendi' });
}
