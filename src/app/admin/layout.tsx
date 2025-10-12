// src/app/admin/layout.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { Enums } from '@/lib/supabase/database.types';
import { Toaster } from 'sonner'; // Import ist bereits vorhanden, sehr gut.

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // DEĞİŞİKLİK: 'await' eklendi.
  // KORREKTUR: createSupabaseServerClient gibt keinen Promise zurück. 'await' ist hier nicht nötig.
  const supabase = createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  const { data: profileData } = await supabase
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!profileData) {
    console.error("Kullanıcı profili bulunamadı.");
    // Anmerkung: Den Benutzer auszuloggen könnte hier eine bessere UX sein als nur ein Redirect.
    return redirect('/login');
  }

  const userRole = profileData.rol as Enums<'user_role'> | null;

  return (
    <AdminLayoutClient user={user} userRole={userRole}>
       {/* HINZUGEFÜGT: Die Toaster-Komponente wird hier platziert, um auf allen Admin-Seiten verfügbar zu sein. */}
      <Toaster position="top-right" richColors closeButton />
      {children}
    </AdminLayoutClient>
  );
}