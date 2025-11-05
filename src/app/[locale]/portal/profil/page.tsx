import { getDictionary } from '@/dictionaries';
import { Locale } from '@/lib/utils';
import { redirect } from 'next/navigation';
import { getUserProfile } from '@/app/actions/profil-actions';
import ProfilClient from '@/app/[locale]/portal/profil/profil-client';

export default async function PortalProfilPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const { data: profile, error } = await getUserProfile();

  if (error || !profile) {
    redirect(`/${locale}/login`);
  }

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
