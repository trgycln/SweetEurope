// src/app/[locale]/admin/crm/firmalar/[firmaId]/siparisler/page.tsx
// KORRIGIERTE VERSION (Objektschlüssel in Anführungszeichen)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { FiPackage, FiCalendar, FiDollarSign, FiCheckCircle, FiClock, FiTruck, FiXCircle, FiPlus } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries'; // Ihre Dictionary-Funktion
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { Tables, Enums } from '@/lib/supabase/database.types'; // Enums importieren

// Typ für den Status-Schlüssel
type SiparisStatusKey = Enums<'siparis_durumu'> | string; // Sicherer Typ
// Typ für eine Bestellung
type Siparis = Tables<'siparisler'>;

// Icons für Status (mit korrekten Schlüsseln in Anführungszeichen)
const STATUS_ICONS: Record<string, React.ElementType> = {
    'Beklemede': FiClock, // In Anführungszeichen
    'Hazırlanıyor': FiClock, // In Anführungszeichen
    'Yola Çıktı': FiTruck, // War schon korrekt
    'Teslim Edildi': FiCheckCircle, // In Anführungszeichen
    'İptal Edildi': FiXCircle, // War schon korrekt
    processing: FiClock,
    shipped: FiTruck,
    delivered: FiCheckCircle,
    cancelled: FiXCircle,
};

// Farben für Status (mit korrekten Schlüsseln in Anführungszeichen)
const STATUS_COLORS: Record<string, string> = {
    'Beklemede': 'text-yellow-600 bg-yellow-100', // In Anführungszeichen
    'Hazırlanıyor': 'text-blue-600 bg-blue-100', // In Anführungszeichen
    'Yola Çıktı': 'text-purple-600 bg-purple-100', // War schon korrekt
    'Teslim Edildi': 'text-green-600 bg-green-100', // In Anführungszeichen
    'İptal Edildi': 'text-red-600 bg-red-100', // War schon korrekt
    processing: 'text-yellow-600 bg-yellow-100',
    shipped: 'text-purple-600 bg-purple-100',
    delivered: 'text-green-600 bg-green-100',
    cancelled: 'text-red-600 bg-red-100',
};

// Props-Typ für die Seite
interface FirmaSiparisleriPageProps {
    params: {
        locale: Locale;
        firmaId: string;
    };
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function FirmaSiparisleriPage({ params }: FirmaSiparisleriPageProps) {
    const { firmaId, locale } = params;

    // --- Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    // --- ENDE ---

    // Optional: Benutzerprüfung
    // ...

    // Dictionary für Übersetzungen laden
    const dictionary = await getDictionary(locale);
    const orderStatusTranslations = dictionary.orderStatuses || {};

    // Bestellungen für die Firma abrufen
    const { data: siparislerData, error } = await supabase
        .from('siparisler')
        .select('*')
        .eq('firma_id', firmaId)
        .order('siparis_tarihi', { ascending: false });

    // Fehlerbehandlung
    if (error) {
        console.error("Fehler beim Laden der Bestellungen:", error);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Bestellungen. Details: {error.message}</div>;
    }

    // Typ-Zuweisung
    const siparisler: Siparis[] = siparislerData || [];

    // Währungsformatierung
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'N/A';
        return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    // Datumsformatierung
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return 'N/A';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
             return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
    };

    return (
        <div>
            {/* Header mit "Neue Bestellung" Button */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary">Bestellhistorie</h2>
                <Link
                    href={`/${locale}/admin/operasyon/siparisler/yeni?firmaId=${firmaId}`}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto transition"
                >
                    <FiPlus />
                    Neue Bestellung erstellen
                </Link>
            </div>

            {/* Bestellliste oder "Keine Bestellungen"-Nachricht */}
            {siparisler.length > 0 ? (
                <div className="overflow-x-auto bg-white rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bestell-Nr.</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Datum</th>
                                <th className="px-4 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Betrag (Brutto)</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
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
                                                href={`/${locale}/admin/operasyon/siparisler/${siparis.id}`}
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
            ) : (
                <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                    <FiPackage className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="text-gray-500">Für diese Firma existieren noch keine Bestellungen.</p>
                </div>
            )}
        </div>
    );
}