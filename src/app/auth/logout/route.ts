// src/app/auth/logout/route.ts

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// Next.js Route Handler'ları genellikle GET veya POST metotlarıyla çalışır.
// Çıkış işlemi bir durum değişikliği olduğu için POST metodu kullanmak daha güvenlidir.
export async function POST() {
  // 1. Supabase Server Client'ı oluştur
  const supabase = createSupabaseServerClient();

  // 2. Oturumu kapatma işlemini gerçekleştir
  const { error } = await supabase.auth.signOut();

  // Hata olsa da olmasa da (oturum kapalıysa bile)
  // kullanıcıyı login sayfasına yönlendir.
  if (error) {
    console.error("Çıkış yapılırken bir hata oluştu:", error);
    // Hata durumunda bile kullanıcı deneyimini bozmamak için yönlendirme yapılır.
  }

  // 3. Kullanıcıyı Giriş sayfasına yönlendir
  return redirect('/login');
}