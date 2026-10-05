import { getKatalogData } from '@/app/actions/katalog-actions';
import KatalogAutoDownloader from '@/components/katalog/KatalogAutoDownloader';

export default async function KatalogQrPage({ params }: { params: { locale: string } }) {
  const localeParams = await params;
  const locale = localeParams.locale === 'en' ? 'en' : 'de';
  
  // Verileri çek (DB'den en güncel veriler)
  const data = await getKatalogData(locale as 'de' | 'en');
  
  return (
    <div className="min-h-screen bg-slate-50">
      <KatalogAutoDownloader data={data} locale={locale as 'de' | 'en'} />
    </div>
  );
}
