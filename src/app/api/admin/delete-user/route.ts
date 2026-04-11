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
  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (error) {
    console.error('Kullanıcı silinirken hata:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return NextResponse.json({ message: 'Kullanıcı başarıyla silindi', data });
}