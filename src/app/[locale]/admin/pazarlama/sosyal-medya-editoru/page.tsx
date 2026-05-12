import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import SosyalMedyaEditoru from './SosyalMedyaEditoru';

export const dynamic = 'force-dynamic';

export default async function SosyalMedyaEditoruPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await supabase
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  const izinliRoller = ['Yönetici', 'Personel', 'Ekip Üyesi'];
  if (!profil || !izinliRoller.includes(profil.rol)) {
    return redirect(`/${locale}/admin`);
  }

  return <SosyalMedyaEditoru />;
}
