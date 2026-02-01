// src/app/[locale]/admin/operasyon/siparisler/[siparisId]/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { FiArrowLeft, FiUser, FiTruck, FiHome } from 'react-icons/fi';
import DurumGuncellePaneli from './DurumGuncellePaneli'; // Client Komponente für Status
import { assignSiparisPersonelAction } from '../actions';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { Tables, Database, Enums } from '@/lib/supabase/database.types'; // Database und Enums importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für die gesamte Struktur
type SiparisDetayData = Tables<'siparisler'> & {
    firma: Pick<Tables<'firmalar'>, 'unvan' | 'adres'> | null; // Expliziter Name 'firma'
    siparis_detay: (Tables<'siparis_detay'> & {
        urun: Pick<Tables<'urunler'>, 'ad'> | null; // Expliziter Name 'urun'
    })[];
};

// Typ für einen einzelnen Artikel
type SiparisDetayItem = SiparisDetayData['siparis_detay'][0];

// Hilfsfunktionen für Formatierung
const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return 'N/A';
    // Locale für Währung verwenden (Beispiel: de-DE)
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
};

const formatDate = (dateStr: string | null, locale: Locale): string => {
    if (!dateStr) return 'N/A';
    try {
        // Locale für Datum verwenden
        return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        // Fallback
        return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
};

// Funktion zum Extrahieren des Produktnamens
const getProductName = (urunAdJson: Database['public']['Tables']['urunler']['Row']['ad'] | null | undefined, currentLocale: Locale): string => {
    if (!urunAdJson || typeof urunAdJson !== 'object') return 'Produkt nicht gefunden';
    // Versucht, den Namen in der aktuellen Sprache zu finden, sonst Fallback
    return (urunAdJson as any)[currentLocale]
        || (urunAdJson as any)['de'] // Fallback 1: Deutsch
        || (urunAdJson as any)['tr'] // Fallback 2: Türkisch
        || Object.values(urunAdJson)[0] // Fallback 3: Erster verfügbarer Name
        || 'Name fehlt';
};


// Props-Typ für die Seite
interface OperasyonSiparisDetayPageProps {
    params: {
        locale: Locale; // Locale wird vom Layout bereitgestellt
        siparisId: string;
    };
    searchParams?: {
         from?: string; // Für dynamischen Zurück-Link
    };
}

export default async function OperasyonSiparisDetayPage({
    params,
    searchParams // searchParams hier empfangen
}: OperasyonSiparisDetayPageProps) {
    noStore(); // Caching deaktivieren
    const { siparisId, locale } = params;
    const fromSource = searchParams?.from; // 'crm' oder undefined

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login?next=/${locale}/admin/operasyon/siparisler/${siparisId}`);
    }

    const { data: myProfile } = await supabase
        .from('profiller')
        .select('id, rol')
        .eq('id', user.id)
        .maybeSingle();

    const isManager = myProfile?.rol === 'Yönetici' || myProfile?.rol === 'Ekip Üyesi';

    let personelProfiles: Array<{ id: string; tam_ad: string | null }> = [];
    if (isManager) {
        try {
            const supabaseAdmin = createSupabaseServiceClient();
            const { data } = await supabaseAdmin
                .from('profiller')
                .select('id, tam_ad')
                .eq('rol', 'Personel')
                .order('tam_ad');
            personelProfiles = (data || []) as Array<{ id: string; tam_ad: string | null }>;
        } catch {
            const { data } = await supabase
                .from('profiller')
                .select('id, tam_ad')
                .eq('rol', 'Personel')
                .order('tam_ad');
            personelProfiles = (data || []) as Array<{ id: string; tam_ad: string | null }>;
        }
    }

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ...

    // Kombinierte Abfrage für Bestellung, Firma und Details
    // Verwende die expliziten Beziehungsnamen ('firma', 'urun')
    // !inner Joins verwenden, um sicherzustellen, dass verknüpfte Daten existieren
    const { data: siparisData, error } = await supabase
        .from('siparisler')
        .select(`
            *,
            firma: firmalar!inner ( id, unvan, adres ), 
            siparis_detay (
                *,
                urun: urunler ( ad ) 
            )
        `)
        .eq('id', siparisId)
        .maybeSingle(); // Verwende maybeSingle, falls siparis_detay leer sein könnte

    // Typ-Zuweisung nach der Abfrage
    const siparis = siparisData as SiparisDetayData | null;

    // Fehlerbehandlung / Not Found
    if (error || !siparis) {
        console.error(`Fehler beim Laden der Bestelldetails für ID ${siparisId}:`, error);
        notFound(); // Zeigt die 404-Seite an
    }

    // Sicherer Zugriff auf verknüpfte Daten
    // Da !inner verwendet wurde, sollte firma nicht null sein, wenn siparis existiert
    const firmaUnvan = siparis.firma?.unvan || 'Unbekannte Firma';
    const firmaAdres = siparis.firma?.adres;
    // siparis_detay kann leer sein, daher Fallback auf leeres Array
    const urunSatirlari: SiparisDetayItem[] = siparis.siparis_detay || [];
    // Firma-ID aus der Bestellung holen für den Zurück-Link und andere Links
    const firmaId = siparis.firma_id;

    // --- Dynamischen Zurück-Link bestimmen ---
    let backUrl = `/${locale}/admin/operasyon/siparisler`; // Standard
    let backLinkText = "Zurück zur Bestellübersicht";

    if (fromSource === 'crm' && firmaId) {
        backUrl = `/${locale}/admin/crm/firmalar/${firmaId}/siparisler`;
        backLinkText = "Zurück zur Bestellliste der Firma";
    }
    // --- ENDE ---

    return (
        <div className="space-y-6">
            {/* Dynamischer Zurück-Link */}
            <Link
                href={backUrl}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors"
            >
                <FiArrowLeft />
                {backLinkText}
            </Link>

            {/* Hauptcontainer */}
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
                {/* Header mit Titel */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-6 pb-6 border-b border-gray-200">
                    <div>
                        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-primary">Bestelldetails</h1>
                        <p className="text-gray-500 font-mono text-sm mt-1">#{siparis.id.substring(0, 8).toUpperCase()}</p>
                        <p className="text-sm text-gray-600 mt-2">
                            Bestellt am: {formatDate(siparis.siparis_tarihi, locale)}
                        </p>
                    </div>
                     {/* Status wird jetzt im Panel unten angezeigt */}
                </div>

                {isManager && (
                    <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Teslimat Sorumlusu</h3>
                        <form action={assignSiparisPersonelAction} className="flex flex-col sm:flex-row gap-3">
                            <input type="hidden" name="siparisId" value={siparis.id} />
                            <select
                                name="personelId"
                                defaultValue={siparis.atanan_kisi_id || ''}
                                className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            >
                                <option value="">Atanmamış</option>
                                {(personelProfiles || []).map((p) => (
                                    <option key={p.id} value={p.id}>{p.tam_ad || p.id}</option>
                                ))}
                            </select>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition"
                            >
                                Kaydet
                            </button>
                        </form>
                    </div>
                )}

                 {/* Kunden- und Lieferinformationen */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                     <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                         <h3 className="font-serif text-lg font-semibold text-primary mb-2 flex items-center gap-2"><FiUser/>Kunde</h3>
                         {firmaId ? (
                             <Link href={`/${locale}/admin/crm/firmalar/${firmaId}`} className="font-semibold text-accent hover:underline block truncate">{firmaUnvan}</Link>
                         ) : (
                             <p className="font-semibold text-primary truncate">{firmaUnvan}</p>
                         )}
                         <p className="text-sm text-gray-600 mt-1 flex items-start gap-2">
                             <FiHome className="mt-0.5 flex-shrink-0 text-gray-400"/>
                             <span>{firmaAdres || 'Keine Adresse hinterlegt'}</span>
                         </p>
                     </div>
                     <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                         <h3 className="font-serif text-lg font-semibold text-primary mb-2 flex items-center gap-2"><FiTruck/>Lieferadresse</h3>
                         <p className="text-sm text-gray-600 whitespace-pre-wrap">{siparis.teslimat_adresi || 'Nicht angegeben'}</p>
                     </div>
                 </div>

                {/* Bestellpositionen */}
                <div className="mt-6">
                    <h2 className="font-serif text-xl font-bold text-primary mb-3">Bestellpositionen</h2>
                    {urunSatirlari.length > 0 ? (
                        <div className="overflow-x-auto border rounded-md">
                            <table className="min-w-full">
                                <thead className="border-b bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-sm font-semibold text-gray-600">Produkt</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Menge</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Einzelpreis (Netto)</th>
                                        <th className="px-4 py-2 text-right text-sm font-semibold text-gray-600">Gesamt (Netto)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {urunSatirlari.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50">
                                            <td className="px-4 py-3 font-medium text-gray-800">
                                                {getProductName(item.urun?.ad, locale)}
                                            </td>
                                            <td className="px-4 py-3 text-right text-gray-700">{item.miktar}</td>
                                            <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.birim_fiyat)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(item.toplam_fiyat)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                         <p className="text-gray-500 italic">Diese Bestellung enthält keine Produkte.</p>
                    )}
                </div>

                {/* Zusammenfassung */}
                <footer className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
                    <div className="w-full sm:w-1/2 md:w-1/3 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Zwischensumme (Netto)</span>
                            <span className="font-semibold text-gray-800">{formatCurrency(siparis.toplam_tutar_net)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-600">MwSt. ({siparis.kdv_orani}%)</span>
                            <span className="font-semibold text-gray-800">{formatCurrency((siparis.toplam_tutar_brut ?? 0) - (siparis.toplam_tutar_net ?? 0))}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold text-primary pt-2 border-t border-gray-300">
                            <span>Gesamtsumme (Brutto)</span>
                            <span>{formatCurrency(siparis.toplam_tutar_brut)}</span>
                        </div>
                    </div>
                </footer>

                 {/* Status Update Panel (am Ende platziert) */}
                 <div className="mt-8 pt-6 border-t border-gray-200">
                     <h3 className="font-serif text-lg font-semibold text-primary mb-3">Status aktualisieren</h3>
                     <DurumGuncellePaneli
                         siparisId={siparis.id}
                         mevcutDurum={siparis.siparis_durumu as Enums<'siparis_durumu'>} // Typ-Zuweisung
                         locale={locale} // Locale übergeben
                     />
                 </div>

            </div>
        </div>
    );
}