import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import { Plus, ArrowRight, Truck, Package, Calculator, CheckCircle } from 'lucide-react';
import DeleteBatchButton from './DeleteBatchButton';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

export default async function SupplyChainListPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user }, error: userError } = await getGlobalCachedUser();
  if (!user || userError) {
    redirect(`/${locale}/login?next=/admin/urun-yonetimi/tedarikci-siparis-plani`);
  }

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole = profile?.rol;
  if (userRole !== 'Yönetici' && userRole !== 'Personel' && userRole !== 'Ekip Üyesi') {
    redirect(`/${locale}/login`);
  }

  const { data: batches } = await supabase
    .from('ithalat_partileri')
    .select(`
      id, referans_kodu, durum, created_at, varis_tarihi,
      tedarikciler ( unvan )
    `)
    .order('created_at', { ascending: false });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Taslak': return <Package className="w-5 h-5 text-gray-400" />;
      case 'Yolda': return <Truck className="w-5 h-5 text-blue-500" />;
      case 'Hesaplandı': return <Calculator className="w-5 h-5 text-purple-500" />;
      case 'Tamamlandı': return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default: return <Package className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Taslak': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'Yolda': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Hesaplandı': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Tamamlandı': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-1">🔗 Tedarik Zinciri (Supply Chain)</h1>
          <p className="text-gray-500">Tedarikçi siparişlerini planlayın, maliyetlendirin ve mal kabulünü yönetin.</p>
        </div>
        <Link 
          href={`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani/yeni`}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 active:scale-95"
        >
          <Plus size={20} /> Yeni Sipariş Planı
        </Link>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-gray-50/80 text-gray-600 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 font-semibold">Referans</th>
              <th className="px-6 py-4 font-semibold">Tedarikçi</th>
              <th className="px-6 py-4 font-semibold">Oluşturulma</th>
              <th className="px-6 py-4 font-semibold">Durum</th>
              <th className="px-6 py-4 font-semibold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {batches && batches.length > 0 ? batches.map((batch: any) => (
              <tr key={batch.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 font-medium text-gray-900">{batch.referans_kodu}</td>
                <td className="px-6 py-4 text-gray-600">{batch.tedarikciler?.unvan || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{new Date(batch.created_at).toLocaleDateString('tr-TR')}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(batch.durum)}`}>
                    {getStatusIcon(batch.durum)} {batch.durum}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                  {batch.durum === 'Taslak' && (
                    <DeleteBatchButton id={batch.id} />
                  )}
                  <Link 
                    href={`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani/${batch.id}`}
                    className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium p-2 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    Yönet <ArrowRight size={16} />
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  Henüz kayıtlı bir tedarik zinciri süreci bulunmuyor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
