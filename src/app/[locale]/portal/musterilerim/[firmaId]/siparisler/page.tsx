import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle, FiPlus } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { Tables, Enums } from '@/lib/supabase/database.types';

type SiparisStatusKey = Enums<'siparis_durumu'> | string;
type Siparis = Tables<'siparisler'>;

const STATUS_ICONS: Record<string, React.ElementType> = {
    'Beklemede': FiClock,
    'Hazırlanıyor': FiClock,
    'Yola Çıktı': FiTruck,
    'Teslim Edildi': FiCheckCircle,
    'İptal Edildi': FiXCircle,
};

const STATUS_COLORS: Record<string, string> = {
    'Beklemede': 'text-yellow-600 bg-yellow-100',
    'Hazırlanıyor': 'text-blue-600 bg-blue-100',
    'Yola Çıktı': 'text-purple-600 bg-purple-100',
    'Teslim Edildi': 'text-green-600 bg-green-100',
    'İptal Edildi': 'text-red-600 bg-red-100',
};

interface FirmaSiparisleriPageProps {
    params: {
        locale: Locale;
        firmaId: string;
    };
}

export default async function FirmaSiparisleriPage({ params }: FirmaSiparisleriPageProps) {
    const { firmaId, locale } = params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

    const dictionary = await getDictionary(locale);
    const orderStatusTranslations = dictionary.orderStatuses || {};

    // Siparişler ve Satışları paralel olarak getir
    const [siparislerRes, satislarRes] = await Promise.all([
        supabase
            .from('siparisler')
            .select('*')
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false }),
        supabase
            .from('alt_bayi_satislar')
            .select('*')
            .eq('firma_id', firmaId)
            .eq('sahip_id', user.id)
            .order('satis_tarihi', { ascending: false })
    ]);

    const { data: siparislerData, error: siparislerError } = siparislerRes;
    const { data: satislarData, error: satislarError } = satislarRes;

    if (siparislerError || satislarError) {
        console.error("Siparişler/Satışlar yüklenirken hata:", siparislerError || satislarError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Veriler yüklenemedi. Hata: {(siparislerError || satislarError)?.message}</div>;
    }

    const siparisler: Siparis[] = siparislerData || [];
    const satislar: any[] = satislarData || [];

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A';
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary">Sipariş ve Satış Geçmişi</h2>
                <Link
                    href={`/${locale}/portal/finanslarim/satislar/yeni?firmaId=${firmaId}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto transition"
                >
                    <FiPlus />
                    Yeni Satış Ekle
                </Link>
            </div>

            {/* Satışlar Tablosu (Alt Bayi Satışları) */}
            {satislar.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Satışlar (Ön Fatura)</h3>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-green-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Tip</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {satislar.map((satis: any) => (
                                    <tr key={satis.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                            <FiCalendar className="inline mr-1.5 -mt-0.5 text-gray-400" />
                                            {formatDate(satis.satis_tarihi)}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {satis.aciklama || '-'}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                                            {formatCurrency(satis.toplam_tutar)}
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                                                Satış
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Siparişler Tablosu */}
            {siparisler.length > 0 ? (
                <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Resmi Siparişler</h3>
                    <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sipariş No</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar (Brüt)</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {siparisler.map(siparis => {
                                    const statusKey = siparis.siparis_durumu as SiparisStatusKey;
                                    const translatedText = (orderStatusTranslations as Record<string, string>)[statusKey] || statusKey;
                                    const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                                    const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';

                                    return (
                                        <tr key={siparis.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/${locale}/portal/siparislerim/${siparis.id}`}
                                                    className="font-bold text-accent hover:underline"
                                                >
                                                    #{siparis.id.substring(0, 8).toUpperCase()}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                                                <FiCalendar className="inline mr-1.5 -mt-0.5 text-gray-400" />
                                                {formatDate(siparis.siparis_tarihi)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold text-right">
                                                {formatCurrency(siparis.toplam_tutar_brut)}
                                            </td>
                                            <td className="px-4 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                                    <StatusIcon size={14}/>
                                                    {translatedText}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {/* Boş Durum */}
            {siparisler.length === 0 && satislar.length === 0 && (
                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="text-gray-500 mb-4">Bu müşteri için henüz sipariş veya satış kaydı bulunmamaktadır.</p>
                    <Link
                        href={`/${locale}/portal/finanslarim/satislar/yeni?firmaId=${firmaId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow hover:bg-opacity-90 font-bold text-sm"
                    >
                        <FiPlus /> İlk Satışı Ekle
                    </Link>
                </div>
            )}
        </div>
    );
}
