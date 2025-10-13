// src/app/admin/layout.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { Enums } from '@/lib/supabase/database.types';
import { getDictionary } from '@/dictionaries'; // Akıllı sözlük yükleyiciyi import et

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  // Kullanıcı profilinden hem 'rol' hem de 'tercih_edilen_dil' alanlarını çekiyoruz.
  const { data: profileData } = await supabase
    .from('profiller')
    .select('rol, tercih_edilen_dil')
    .eq('id', user.id)
    .single();

  if (!profileData) {
    console.error("Kullanıcı profili bulunamadı.");
    return redirect('/login');
  }

  const userRole = profileData.rol as Enums<'user_role'> | null;
  // Veritabanından gelen dil tercihini al, eğer yoksa varsayılan olarak 'tr' kullan.
  const userLocale = profileData.tercih_edilen_dil as any || 'tr'; 

  // Veritabanından gelen dil tercihine göre doğru sözlüğü (de.ts, tr.ts vb.) çekiyoruz.
  const dictionary = await getDictionary(userLocale);

  return (
    // dictionary prop'unu AdminLayoutClient'a gönderiyoruz.
    <AdminLayoutClient user={user} userRole={userRole} dictionary={dictionary}>
      {children}
    </AdminLayoutClient>
  );
}