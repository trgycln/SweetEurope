// src/app/admin/operasyon/siparisler/page.tsx (NİHAİ DÜZELTME)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import StatusUpdateButton from './StatusUpdateButton';
import SiparisFiltreleri from './SiparisFiltreleri';
import { Enums } from '@/lib/supabase/database.types';

// ######################################################################
// ###                      NİHAİ ÇÖZÜM BURADA                        ###
// ### Bu satır, Next.js'e bu sayfayı her zaman dinamik olarak         ###
// ###    oluşturmasını söyleyerek 'searchParams' sorununu çözer.      ###
// ######################################################################
export const dynamic = 'force-dynamic';

type SiparisStatusKey = 'processing' | 'shipped' | 'delivered' | 'cancelled';

const STATUS_ICONS: Record<string, React.ElementType> = { 'processing': FiClock, 'shipped': FiTruck, 'delivered': FiCheckCircle, 'cancelled': FiXCircle };
const STATUS_COLORS: Record<string, string> = { 'processing': 'text-yellow-600 bg-yellow-100', 'shipped': 'text-blue-600 bg-blue-100', 'delivered': 'text-green-600 bg-green-100', 'cancelled': 'text-red-600 bg-red-100' };

export default async function AlleSiparislerPage({ searchParams }: { searchParams?: { status?: string; firmaId?: string; q?: string; } }) {
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary('de');
    const orderStatusTranslations = dictionary.orderStatuses;

    let query = supabase
        .from('siparisler')
        .select(`*, firma: firmalar!firma_id (unvan)`);

    if (searchParams?.status) {
        query = query.eq('siparis_durumu', searchParams.status);
    }
    if (searchParams?.firmaId) {
        query = query.eq('firma_id', searchParams.firmaId);
    }
    if (searchParams?.q) {
        const aramaTerimi = `%${searchParams.q}%`;
        const { data: eslesenFirmalar } = await supabase.from('firmalar').select('id').ilike('unvan', aramaTerimi);
        const firmaIdListesi = eslesenFirmalar?.map(f => f.id) || [];
        if (firmaIdListesi.length > 0) {
            query = query.in('firma_id', firmaIdListesi);
        } else {
            query = query.eq('id', '00000000-0000-0000-0000-000000000000');
        }
    }

    const [siparislerRes, firmalarRes] = await Promise.all([
        query.order('siparis_tarihi', { ascending: false }),
        supabase.from('firmalar').select('id, unvan').order('unvan')
    ]);

    const { data: siparisler, error } = siparislerRes;
    const { data: firmalar, error: firmalarError } = firmalarRes; // firmalarRes'den firmalar'ı al

    if (error || firmalarError) { // İki hatadan birini kontrol et
        console.error("Siparişler veya firmalar çekilirken hata oluştu:", error || firmalarError);
        return <div className="p-6 text-red-500">Veri yüklenirken bir hata oluştu.</div>;
    }

    const durumSecenekleri = Object.entries(orderStatusTranslations).map(([anahtar, deger]) => ({
        anahtar: anahtar as SiparisStatusKey,
        deger: deger as string
    }));

    const formatCurrency = (amount: number | null) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount || 0);
    const formatDate = (dateStr: string | null) => new Date(dateStr || 0).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    return (
        <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Sipariş Yönetimi</h1>
                <p className="text-text-main/80 mt-1">{siparisler?.length || 0} adet sipariş listeleniyor.</p>
            </header>
            
            <SiparisFiltreleri firmalar={firmalar || []} durumlar={durumSecenekleri} />

            {(!siparisler || siparisler.length === 0) ? (
                 <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <h2 className="font-serif text-2xl font-semibold text-primary">
                        {Object.keys(searchParams || {}).length > 0 ? 'Filtreye Uygun Sipariş Bulunamadı' : 'Henüz Sipariş Yok'}
                    </h2>
                 </div>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-bg-subtle">
                            <tr>
                                {['Sipariş No', 'Firma', 'Tarih', 'Brüt Tutar', 'Durum', 'Eylemler'].map(header => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {siparisler.map((siparis) => {
                                const firmaUnvan = (siparis as any).firma?.unvan || 'Bilinmiyor';
                                const statusKey = siparis.siparis_durumu as SiparisStatusKey;
                                const translatedText = (orderStatusTranslations as any)[statusKey] || statusKey;
                                const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                                const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';
                                
                                return (
                                    <tr key={siparis.id} className="hover:bg-bg-subtle/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <Link href={`/admin/operasyon/siparisler/${siparis.id}`} className="font-bold text-accent hover:underline">
                                                #{siparis.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-6 py-4 text-sm">{firmaUnvan}</td>
                                        <td className="px-6 py-4 text-sm">{formatDate(siparis.siparis_tarihi)}</td>
                                        <td className="px-6 py-4 text-sm font-semibold">{formatCurrency(siparis.toplam_tutar_brut)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon /> {translatedText}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm space-x-2">
                                            {statusKey === 'processing' && (
                                                <StatusUpdateButton 
                                                    siparisId={siparis.id} 
                                                    neuerStatus="shipped"
                                                    label="Gönder"
                                                    icon={<FiTruck size={12}/>}
                                                    className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                                                />
                                            )}
                                            {statusKey === 'shipped' && (
                                                <StatusUpdateButton 
                                                    siparisId={siparis.id} 
                                                    neuerStatus="delivered"
                                                    label="Teslim Et"
                                                    icon={<FiCheckCircle size={12}/>}
                                                    className="bg-green-100 text-green-700 hover:bg-green-200"
                                                />
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}