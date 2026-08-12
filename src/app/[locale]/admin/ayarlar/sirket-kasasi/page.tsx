import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGlobalCachedUser, getCachedProfile } from '@/lib/admin/cache-utils';
import { redirect } from 'next/navigation';
import CompanySettingsForm from './components/CompanySettingsForm';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SirketKasasiPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await getGlobalCachedUser();
  if (!user) redirect(`/${locale}/login`);

  const { profile } = await getCachedProfile(supabase, user.id);
  
  if (profile?.rol !== 'Yönetici') {
    // If not admin, redirect them out
    redirect(`/${locale}/admin/dashboard`);
  }

  // Fetch initial data
  const { data: sirketBilgileri, error } = await supabase
    .from('sirket_resmi_bilgiler')
    .select('*')
    .order('sira', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Şirket bilgileri çekilirken hata:", error);
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <span className="p-2 bg-primary/10 text-primary rounded-lg text-2xl">🔒</span> 
            Şirket Kasası
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Şirkete ait resmi kayıtlar, vergi numaraları ve hassas bilgiler burada güvenle saklanır. Sadece yöneticiler erişebilir.
          </p>
        </div>
      </div>
      
      <CompanySettingsForm initialData={sirketBilgileri || []} />
    </div>
  );
}
