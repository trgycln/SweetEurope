// src/components/portal/dashboard/RecentOrders.tsx (Vollständig, Karten-Layout)
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config'; // Pfad ggf. anpassen
import { FiArrowRight, FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Link from 'next/link';
import { Enums, Tables } from '@/lib/supabase/database.types'; // Typen importieren

// Typ für die Bestelldaten
type Order = Pick<Tables<'siparisler'>, 'id' | 'siparis_tarihi' | 'toplam_tutar_brut' | 'siparis_durumu'>;
type SiparisStatusKey = Enums<'siparis_durumu'>; // Verwende den ENUM-Typ

// Status-Definitionen (konsistent mit Admin-Panel)
// Wir verwenden die Datenbank-Schlüssel (EN)
const STATUS_ICONS: Record<string, React.ElementType> = {
    'processing': FiClock,
    'shipped': FiTruck,
    'delivered': FiCheckCircle,
    'cancelled': FiXCircle,
    // Türkische Fallbacks (falls DB gemischt ist)
    'Beklemede': FiClock,
    'Hazırlanıyor': FiClock, // 'processing' zuordnen
    'Yola Çıktı': FiTruck,
    'Teslim Edildi': FiCheckCircle,
    'İptal Edildi': FiXCircle,
};
const STATUS_COLORS: Record<string, string> = {
    'processing': 'text-yellow-600 bg-yellow-100',
    'shipped': 'text-blue-600 bg-blue-100',
    'delivered': 'text-green-600 bg-green-100',
    'cancelled': 'text-red-600 bg-red-100',
    // Türkische Fallbacks
    'Beklemede': 'text-yellow-600 bg-yellow-100',
    'Hazırlanıyor': 'text-yellow-600 bg-yellow-100',
    'Yola Çıktı': 'text-blue-600 bg-blue-100',
    'Teslim Edildi': 'text-green-600 bg-green-100',
    'İptal Edildi': 'text-red-600 bg-red-100',
};

export async function RecentOrders({ firmaId, locale }: { firmaId: string; locale: Locale }) {
    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf Dictionary-Inhalte
    const content = (dictionary as any).portal?.dashboard || {};
    const orderStatusTranslations = (dictionary as any).orderStatuses || {};
    
    const supabase = createSupabaseServerClient();

    // KORREKTUR: toplam_tutar_brut statt toplam_tutar_net (oder was du bevorzugst)
    const { data: orders, error } = await supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar_brut, siparis_durumu')
        .eq('firma_id', firmaId)
        .order('siparis_tarihi', { ascending: false })
        .limit(5); // Nur die letzten 5

    // Helferfunktionen
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-2xl font-bold text-primary">{content.recentOrdersTitle || "Letzte Bestellungen"}</h2>
                <Link 
                    href={`/${locale}/portal/siparisler`} 
                    className="text-sm font-semibold text-accent hover:underline flex items-center gap-1"
                >
                    {content.viewAll || "Alle ansehen"} <FiArrowRight />
                </Link>
            </div>
            
            {/* KORREKTUR: Tabelle durch eine responsive Liste/Karten ersetzt */}
            {orders && orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map(order => {
                        const statusKey = order.siparis_durumu as SiparisStatusKey;
                        // Übersetzten Status holen, Fallback auf den Schlüssel selbst
                        const translatedStatus = orderStatusTranslations[statusKey] || statusKey;
                        const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                        const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';

                        return (
                            <Link 
                                key={order.id} 
                                href={`/${locale}/portal/siparisler/${order.id}`} // Link zur Detailseite
                                className="block p-4 rounded-lg bg-secondary border border-transparent hover:border-accent hover:bg-white transition-all group"
                            >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    {/* Links: ID und Datum */}
                                    <div className="flex-1">
                                        <p className="font-bold text-primary group-hover:text-accent transition-colors">
                                            {content.orderId || "Bestell-ID"} #{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-sm text-text-main/70">
                                            {formatDate(order.siparis_tarihi)}
                                        </p>
                                    </div>
                                    {/* Rechts: Status und Preis */}
                                    <div className="flex flex-col sm:items-end gap-2">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                            <StatusIcon size={12} /> {translatedStatus}
                                        </span>
                                        <p className="text-lg font-bold text-primary">
                                            {formatCurrency(order.toplam_tutar_brut)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                 <p className="text-text-main/70 py-8 text-center">{content.noOrders}</p>
            )}
        </div>
    );
}