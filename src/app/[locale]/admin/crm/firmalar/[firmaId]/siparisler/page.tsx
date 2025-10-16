import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle, FiPlus } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries'; // Sizin çok dilli yapınızı import ediyoruz.

// Bu tip artık veritabanındaki dil-bağımsız, evrensel anahtarları temsil ediyor.
type SiparisStatusKey = 'processing' | 'shipped' | 'delivered' | 'cancelled' | string;

// İkonları bu anahtarlarla eşleştiriyoruz. Arayüz metninden bağımsızdır.
const STATUS_ICONS: Record<SiparisStatusKey, React.ElementType> = {
    processing: FiClock,
    shipped: FiTruck,
    delivered: FiCheckCircle,
    cancelled: FiXCircle,
};

// Renkleri de anahtarlarla eşleştiriyoruz.
const STATUS_COLORS: Record<SiparisStatusKey, string> = {
    processing: 'text-yellow-600 bg-yellow-100',
    shipped: 'text-blue-600 bg-blue-100',
    delivered: 'text-green-600 bg-green-100',
    cancelled: 'text-red-600 bg-red-100',
};

// Sayfa bileşeni artık 'locale' parametresini de alıyor.
export default async function FirmaSiparisleriPage({ params }: { params: { firmaId: string; locale: string } }) {
    const supabase = createSupabaseServerClient();
    // getDictionary fonksiyonunuzu kullanarak o anki dilin sözlüğünü çekiyoruz.
    const dictionary = await getDictionary(params.locale as any); 
    const orderStatusTranslations = dictionary.orderStatuses; // Sözlükten sipariş durumu çevirilerini alıyoruz.

    const { data: siparisler, error } = await supabase
        .from('siparisler')
        .select('*')
        .eq('firma_id', params.firmaId)
        .order('siparis_tarihi', { ascending: false });

    if (error) {
        console.error("Siparişler çekilirken hata:", error);
        return <div>Sipariş bilgileri yüklenirken bir sorun oluştu.</div>;
    }
    
    // Para formatlama fonksiyonu
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A';
        // Almanca formatını varsayılan olarak kullanıyoruz, bu projenizin geneliyle uyumlu.
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    
    // Tarih formatlama fonksiyonu
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h2 className="font-serif text-2xl font-bold text-primary">Sipariş Geçmişi</h2>
                <Link 
                    href={`/admin/crm/firmalar/${params.firmaId}/siparisler/yeni`} 
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto"
                >
                    <FiPlus />
                    Yeni Sipariş Oluştur
                </Link>
            </div>
            
            {siparisler && siparisler.length > 0 ? (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-bg-subtle">
                        <thead className="bg-secondary/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Sipariş No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Sipariş Tarihi</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Brüt Tutar</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-text-main uppercase">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-bg-subtle">
                            {siparisler.map(siparis => {
                                // Veritabanından gelen dil-bağımsız anahtarı alıyoruz (örn: 'processing')
                                const statusKey = siparis.siparis_durumu as SiparisStatusKey;
                                
                                // Sözlükten bu anahtarın çevirisini buluyoruz (örn: 'In Vorbereitung')
                                // Eğer çeviri bulunamazsa, güvenlik için anahtarın kendisini gösterir.
                                const translatedText = (orderStatusTranslations as any)[statusKey] || statusKey; 
                                
                                // İkon ve renkleri de anahtara göre alıyoruz.
                                const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                                const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';
                                
                                return (
                                    <tr key={siparis.id} className="hover:bg-secondary/30 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <Link 
                                                href={`/admin/crm/firmalar/${params.firmaId}/siparisler/${siparis.id}`} 
                                                className="font-bold text-accent hover:underline"
                                            >
                                                #{siparis.id.substring(0, 8).toUpperCase()}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-main">
                                            <FiCalendar className="inline mr-2 -mt-1 text-gray-400" />
                                            {formatDate(siparis.siparis_tarihi)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-text-main font-semibold">
                                            <FiDollarSign className="inline mr-1 -mt-1 text-gray-400" />
                                            {formatCurrency(siparis.toplam_tutar_brut)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                <StatusIcon />
                                                {/* Ekrana artık çevrilmiş metni basıyoruz */}
                                                {translatedText}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center p-8 border-2 border-dashed rounded-lg">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="text-text-main/70">Bu firma için henüz bir sipariş kaydı bulunmuyor.</p>
                </div>
            )}
        </div>
    );
}
