// src/components/portal/dashboard/ActiveOrdersList.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { FiClock, FiTruck, FiCheckCircle, FiXCircle, FiPackage, FiArrowRight, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

type Order = Pick<Tables<'siparisler'>, 'id' | 'siparis_tarihi' | 'toplam_tutar_brut' | 'siparis_durumu'>;
type SiparisStatusKey = Enums<'siparis_durumu'>;

const STATUS_ICONS: Record<string, React.ElementType> = {
    'processing': FiClock,
    'shipped': FiTruck,
    'delivered': FiCheckCircle,
    'cancelled': FiXCircle,
    'Beklemede': FiClock,
    'Hazırlanıyor': FiClock,
    'Yola Çıktı': FiTruck,
    'Teslim Edildi': FiCheckCircle,
    'İptal Edildi': FiXCircle,
};

const STATUS_COLORS: Record<string, string> = {
    'processing': 'text-yellow-700 bg-yellow-100 border-yellow-300',
    'shipped': 'text-blue-700 bg-blue-100 border-blue-300',
    'delivered': 'text-green-700 bg-green-100 border-green-300',
    'cancelled': 'text-red-700 bg-red-100 border-red-300',
    'Beklemede': 'text-yellow-700 bg-yellow-100 border-yellow-300',
    'Hazırlanıyor': 'text-orange-700 bg-orange-100 border-orange-300',
    'Yola Çıktı': 'text-blue-700 bg-blue-100 border-blue-300',
    'Teslim Edildi': 'text-green-700 bg-green-100 border-green-300',
    'İptal Edildi': 'text-red-700 bg-red-100 border-red-300',
};

interface ActiveOrdersListProps {
    firmaId: string;
    locale: Locale;
    labels: {
        title: string;
        orderId: string;
        viewDetails: string;
        reorder: string;
        noActiveOrders: string;
        viewAll: string;
    };
    orderStatusTranslations: Record<string, string>;
}

export async function ActiveOrdersList({ firmaId, locale, labels, orderStatusTranslations }: ActiveOrdersListProps) {
    noStore();
    
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    // Fetch only active/open orders
    const { data: orders, error } = await supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar_brut, siparis_durumu')
        .eq('firma_id', firmaId)
        .in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'])
        .order('siparis_tarihi', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error loading active orders:", error);
        return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Fehler beim Laden der aktiven Bestellungen.</div>
    }

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', { 
            style: 'currency', 
            currency: 'EUR' 
        }).format(amount);
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        } catch {
            return new Date(dateStr).toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
            });
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
            <div className="flex justify-between items-center mb-5">
                <h2 className="font-serif text-2xl font-bold text-primary">{labels.title}</h2>
                <Link
                    href={`/${locale}/portal/siparisler`}
                    className="text-sm font-semibold text-accent hover:underline flex items-center gap-1"
                >
                    {labels.viewAll} <FiArrowRight />
                </Link>
            </div>
            
            {orders && orders.length > 0 ? (
                <div className="space-y-3">
                    {orders.map(order => {
                        const statusKey = order.siparis_durumu as SiparisStatusKey;
                        const translatedStatus = orderStatusTranslations[statusKey] || statusKey;
                        const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                        const statusColor = STATUS_COLORS[statusKey] || 'text-gray-700 bg-gray-100 border-gray-300';

                        return (
                            <div
                                key={order.id}
                                className="p-4 rounded-lg bg-gradient-to-r from-gray-50 to-white border border-gray-200 hover:border-accent hover:shadow-md transition-all"
                            >
                                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                                    {/* Left: Order ID and Date */}
                                    <div className="flex-1">
                                        <p className="font-bold text-primary text-lg">
                                            {labels.orderId} #{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            {formatDate(order.siparis_tarihi)}
                                        </p>
                                    </div>
                                    
                                    {/* Center: Status Badge */}
                                    <div className="flex items-center">
                                        <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full border ${statusColor}`}>
                                            <StatusIcon size={16} /> {translatedStatus}
                                        </span>
                                    </div>

                                    {/* Right: Amount and Actions */}
                                    <div className="flex flex-col lg:items-end gap-2">
                                        <p className="text-xl font-bold text-primary">
                                            {formatCurrency(order.toplam_tutar_brut)}
                                        </p>
                                        <div className="flex gap-2">
                                            <Link
                                                href={`/${locale}/portal/siparisler/${order.id}`}
                                                className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                                            >
                                                <FiArrowRight size={14} /> {labels.viewDetails}
                                            </Link>
                                            {/* Optional: Reorder button */}
                                            {/* <button className="text-xs font-semibold text-gray-600 hover:text-primary flex items-center gap-1">
                                                <FiRefreshCw size={14} /> {labels.reorder}
                                            </button> */}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="py-12 text-center">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-3" />
                    <p className="text-gray-500 text-lg">{labels.noActiveOrders}</p>
                </div>
            )}
        </div>
    );
}
