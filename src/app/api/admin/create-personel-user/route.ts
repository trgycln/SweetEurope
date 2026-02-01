// src/app/api/admin/create-personel-user/route.ts
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Yetkiniz yok' }), { status: 401 });
  }

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'Yönetici') {
    return new NextResponse(JSON.stringify({ error: 'Bu işlemi yapmaya sadece yöneticiler yetkilidir' }), { status: 403 });
  }

  let payload: { email?: string; password?: string; tam_ad?: string | null } = {};
  try {
    payload = await request.json();
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Geçersiz istek gövdesi' }), { status: 400 });
  }

  const { email, password, tam_ad } = payload;
  if (!email || !password) {
    return new NextResponse(JSON.stringify({ error: 'Email ve şifre zorunludur' }), { status: 400 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { tam_ad: tam_ad || null }
  });

  if (createError || !created?.user) {
    console.error('Personel oluşturma hatası (auth):', createError);
    return new NextResponse(JSON.stringify({ error: createError?.message || 'Kullanıcı oluşturulamadı' }), { status: 500 });
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiller')
    .upsert({ id: created.user.id, rol: 'Personel', tam_ad: tam_ad || null })
    .eq('id', created.user.id);

  if (profileError) {
    console.error('Personel oluşturma hatası (profil):', profileError);
    return new NextResponse(JSON.stringify({ error: profileError.message }), { status: 500 });
  }

  return NextResponse.json({ message: 'Personel oluşturuldu', userId: created.user.id });
}
