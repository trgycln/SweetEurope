// src/app/api/admin/delete-user/route.ts
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();

  // 1. Bu isteği yapan kişinin YÖNETİCİ olduğunu doğrula
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Yetkiniz yok' }), { status: 401 });
  }
  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  if (profile?.rol !== 'Yönetici') {
    return new NextResponse(JSON.stringify({ error: 'Bu işlemi yapmaya sadece yöneticiler yetkilidir' }), { status: 403 });
  }

  // 2. İstekten silinecek kullanıcı ID'sini al
  const { userIdToDelete } = await request.json();
  if (!userIdToDelete) {
    return new NextResponse(JSON.stringify({ error: 'Silinecek kullanıcı IDsi belirtilmedi' }), { status: 400 });
  }

  // 3. ADMİN YETKİLERİYLE yeni bir Supabase client oluştur
  // DİKKAT: SERVICE_ROLE_KEY asla tarayıcıya ifşa edilmemelidir. Burası sunucu olduğu için güvenlidir.
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 4. Kullanıcıyı admin yetkisiyle sil
  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

  if (error) {
    console.error('Kullanıcı silinirken hata:', error);
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return NextResponse.json({ message: 'Kullanıcı başarıyla silindi', data });
}