import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { Enums } from '@/lib/supabase/database.types';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
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
    return redirect('/login');
  }

  const userRole = profileData.rol as Enums<'user_role'> | null;

  return (
    <AdminLayoutClient user={user} userRole={userRole}>
      {children}
    </AdminLayoutClient>
  );
}