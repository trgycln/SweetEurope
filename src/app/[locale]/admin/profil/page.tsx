import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { redirect } from 'next/navigation';
import ProfilClient from '@/app/[locale]/admin/profil/profil-client';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function ProfilPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  noStore(); // Cache'i devre dışı bırak
  
  const { locale } = await params;
  await getDictionary(locale); // preload dictionary (şimdilik kullanılmıyor)

  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error('Auth error:', authError);
    redirect(`/${locale}/admin/dashboard`);
  }

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from('profiller')
    .select('tam_ad, tercih_edilen_dil, rol')
    .eq('id', user.id)
    .single();

  if (profileError || !profileData) {
    console.error('Profile query error:', profileError);
    redirect(`/${locale}/admin/dashboard`);
  }

  const profile = {
    tam_ad: profileData.tam_ad || '',
    email: user.email || '',
    telefon: null,
    tercih_edilen_dil: profileData.tercih_edilen_dil,
    rol: profileData.rol,
  };

  console.log('🔍 PROFIL DEBUG:', { profile, error: null });

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">
        {locale === 'de' ? 'Profil Einstellungen' : 
         locale === 'tr' ? 'Profil Ayarları' :
         locale === 'en' ? 'Profile Settings' : 'إعدادات الملف الشخصي'}
      </h1>
      
      <ProfilClient profile={profile} locale={locale} />
    </div>
  );
}
