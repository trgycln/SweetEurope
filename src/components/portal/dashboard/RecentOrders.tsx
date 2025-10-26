// src/components/portal/dashboard/RecentOrders.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiArrowRight, FiPackage, FiClock, FiTruck, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import Link from 'next/link';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// Typ für die Bestelldaten
type Order = Pick<Tables<'siparisler'>, 'id' | 'siparis_tarihi' | 'toplam_tutar_brut' | 'siparis_durumu'>;
type SiparisStatusKey = Enums<'siparis_durumu'>;

// Status-Definitionen (unverändert)
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
    'processing': 'text-yellow-600 bg-yellow-100',
    'shipped': 'text-blue-600 bg-blue-100',
    'delivered': 'text-green-600 bg-green-100',
    'cancelled': 'text-red-600 bg-red-100',
    'Beklemede': 'text-yellow-600 bg-yellow-100',
    'Hazırlanıyor': 'text-yellow-600 bg-yellow-100',
    'Yola Çıktı': 'text-blue-600 bg-blue-100',
    'Teslim Edildi': 'text-green-600 bg-green-100',
    'İptal Edildi': 'text-red-600 bg-red-100',
};

export async function RecentOrders({ firmaId, locale }: { firmaId: string; locale: Locale }) {
    noStore(); // Caching deaktivieren
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---
    
    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf Dictionary-Inhalte
    const content = (dictionary as any).portal?.dashboard || {};
    const orderStatusTranslations = (dictionary as any).orderStatuses || {};
    
    // Daten abrufen
    const { data: orders, error } = await supabase
        .from('siparisler')
        .select('id, siparis_tarihi, toplam_tutar_brut, siparis_durumu')
        .eq('firma_id', firmaId)
        .order('siparis_tarihi', { ascending: false })
        .limit(5); // Nur die letzten 5

    if (error) {
        console.error("Fehler beim Laden der letzten Bestellungen:", error);
        return <div className="p-4 bg-red-100 text-red-700 rounded-lg">Fehler beim Laden der Bestellungen.</div>
    }

    // Helferfunktionen
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '-';
        return new Intl.NumberFormat(locale === 'tr' ? 'tr-TR' : 'de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
             return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"> {/* Border hinzugefügt */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-serif text-2xl font-bold text-primary">{content.recentOrdersTitle || "Letzte Bestellungen"}</h2>
                <Link
                    href={`/${locale}/portal/siparisler`}
                    className="text-sm font-semibold text-accent hover:underline flex items-center gap-1"
                >
                    {content.viewAll || "Alle ansehen"} <FiArrowRight />
                </Link>
            </div>
            
            {/* Responsive Liste/Karten */}
            {orders && orders.length > 0 ? (
                <div className="space-y-4">
                    {orders.map(order => {
                        const statusKey = order.siparis_durumu as SiparisStatusKey;
                        const translatedStatus = (orderStatusTranslations as Record<string, string>)[statusKey] || statusKey;
                        const StatusIcon = STATUS_ICONS[statusKey] || FiPackage;
                        const statusColor = STATUS_COLORS[statusKey] || 'text-gray-600 bg-gray-100';

                        return (
                            <Link
                                key={order.id}
                                href={`/${locale}/portal/siparisler/${order.id}`} // Link zur Detailseite
                                className="block p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-accent hover:bg-white transition-all group" // Styling angepasst
                            >
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                    {/* Links: ID und Datum */}
                                    <div className="flex-1">
                                        <p className="font-bold text-primary group-hover:text-accent transition-colors">
                                            {content.orderId || "Bestell-ID"} #{order.id.substring(0, 8).toUpperCase()}
                                        </p>
                                        <p className="text-sm text-gray-600"> {/* Styling angepasst */}
                                            {formatDate(order.siparis_tarihi)}
                                        </p>
                                    </div>
                                    {/* Rechts: Status und Preis */}
                                    <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                            <StatusIcon size={12} /> {translatedStatus}
                                        </span>
                                        <p className="text-lg font-bold text-primary text-left sm:text-right"> {/* Textausrichtung angepasst */}
                                            {formatCurrency(order.toplam_tutar_brut)}
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                 <p className="text-gray-500 py-8 text-center">{content.noOrders || "Keine Bestellungen gefunden."}</p> // Angepasst
            )}
        </div>
    );
}