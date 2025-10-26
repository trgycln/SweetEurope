// src/app/[locale]/admin/crm/firmalar/[firmaId]/etkinlikler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums, Tables } from '@/lib/supabase/database.types'; // Tables hinzugefügt
import { FiSend } from 'react-icons/fi';
// Annahme: actions.ts liegt im selben Verzeichnis
import { yeniEtkinlikEkleAction } from './actions';
import EtkinlikKarti from './EtkinlikKarti'; // Client Komponente für die Darstellung
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale, falls benötigt
import { redirect } from 'next/navigation'; // Import für Redirect

type EtkinlikTipi = Enums<'etkinlik_tipi'>;

// Typ für Etkinlik mit Profilinformationen
type EtkinlikWithProfile = Tables<'etkinlikler'> & {
    olusturan_personel: {
        tam_ad: string | null;
    } | null; // Profil kann null sein, falls FK nicht gesetzt oder Profil gelöscht
};

// Zeitdifferenz-Formatierungsfunktion (unverändert)
function zamanFarkiFormatla(tarihStr: string | null): string {
    if (!tarihStr) return ''; // Fallback für null Datum
    const tarih = new Date(tarihStr);
    const simdi = new Date();
    // Prüfen ob Datum gültig ist
    if (isNaN(tarih.getTime())) return '';

    const farkSaniye = Math.floor((simdi.getTime() - tarih.getTime()) / 1000);

    if (farkSaniye < 60) return "az önce";
    let aralik = Math.floor(farkSaniye / 60);
    if (aralik < 60) return aralik + " dakika önce";
    aralik = Math.floor(farkSaniye / 3600);
    if (aralik < 24) return aralik + " saat önce";
    aralik = Math.floor(farkSaniye / 86400);
    if (aralik < 30) return aralik + " gün önce"; // Annahme Monat ~ 30 Tage
    aralik = Math.floor(farkSaniye / 2592000); // 30 Tage
    if (aralik < 12) return aralik + " ay önce";
    aralik = Math.floor(farkSaniye / 31536000); // 365 Tage
    return aralik + " yıl önce";
}

// Props-Typ für die Seite
interface EtkinliklerPageProps {
    params: {
        locale: Locale; // Locale wird vom Layout bereitgestellt
        firmaId: string;
    };
    // searchParams könnten hier auch hinzugefügt werden, falls benötigt
}

export default async function EtkinliklerPage({ params }: EtkinliklerPageProps) {
    const { firmaId, locale } = params; // Locale extrahieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Benutzer abrufen (wichtig für Berechtigungen und Zuordnung)
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Fehler beim Abrufen des Benutzers oder kein Benutzer -> Redirect zum Login
    if (userError || !user) {
        console.error("Fehler beim Abrufen des Benutzers in EtkinliklerPage oder kein Benutzer:", userError);
        return redirect(`/${locale}/login?next=/admin/crm/firmalar/${firmaId}/etkinlikler`);
    }

    // Optional: Überprüfen, ob der Benutzer die Berechtigung hat, diese Seite zu sehen
    // const { data: profile } = await supabase.from('profiller')...
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') { /* redirect */ }

    // Etkinlikler abrufen
    // KORREKTUR im SELECT: Foreign Key Namen explizit angeben für Klarheit
    const { data: etkinlikler, error: etkinliklerError } = await supabase
        .from('etkinlikler')
        .select(`*, olusturan_personel: profiller!etkinlikler_olusturan_personel_id_fkey( tam_ad )`)
        .eq('firma_id', firmaId)
        .order('created_at', { ascending: false });

    if (etkinliklerError) {
        console.error("Fehler beim Laden der Aktivitäten:", etkinliklerError);
        // Bessere Fehlermeldung anzeigen
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Aktivitäten. Details: {etkinliklerError.message}</div>;
    }

    // Typ-Zuweisung für bessere Typsicherheit
    const etkinlikListesi: EtkinlikWithProfile[] = etkinlikler || [];

    // Verfügbare Aktivitätstypen (aus Enums oder Konstanten holen)
    // Stellen Sie sicher, dass 'Constants' korrekt importiert ist, falls Sie es verwenden
    // const etkinlikTipleri: EtkinlikTipi[] = Constants.public.Enums.etkinlik_tipi || [];
    // Oder manuell:
    const etkinlikTipleri: EtkinlikTipi[] = ['Not', 'Telefon Görüşmesi', 'Toplantı', 'E-posta', 'Teklif'];

    // Server Action mit der firmaId vorbereiten
    const formActionWithId = yeniEtkinlikEkleAction.bind(null, firmaId);

    return (
        // Layout mit zwei Spalten
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Linke Spalte: Formular zum Hinzufügen */}
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Neue Aktivität hinzufügen</h2>
                <form action={formActionWithId} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200"> {/* Styling angepasst */}
                    {/* Aktivitätstyp Dropdown */}
                    <div>
                        <label htmlFor="etkinlik_tipi" className="block text-sm font-bold text-gray-700 mb-1">Aktivitätstyp</label>
                        <select
                            id="etkinlik_tipi"
                            name="etkinlik_tipi" // Name muss mit formData in der Action übereinstimmen
                            required
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent" // Styling angepasst
                        >
                            {/* Optional: Placeholder */}
                            {/* <option value="" disabled selected>Bitte wählen...</option> */}
                            {etkinlikTipleri.map(tip => <option key={tip} value={tip}>{tip}</option>)}
                        </select>
                    </div>
                    {/* Beschreibung Textarea */}
                    <div>
                        <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-1">Beschreibung / Notiz</label>
                        <textarea
                            id="aciklama"
                            name="aciklama" // Name muss mit formData in der Action übereinstimmen
                            rows={5}
                            required
                            placeholder="Details zum Gespräch oder Ihre Notiz hier eingeben..."
                            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent" // Styling angepasst
                        />
                    </div>
                    {/* Senden Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            // Optional: Pending-Status von useFormStatus verwenden, wenn nötig
                            // disabled={pending} // Muss importiert werden: import { useFormStatus } from 'react-dom'; const { pending } = useFormStatus();
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm transition disabled:opacity-50"
                        >
                            <FiSend size={16} /> Hinzufügen
                        </button>
                    </div>
                </form>
            </div>

            {/* Rechte Spalte: Aktivitätenliste */}
            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Aktivitätsverlauf</h2>
                <div className="space-y-6">
                    {/* Prüfen, ob Aktivitäten vorhanden sind */}
                    {etkinlikListesi.length > 0 ? (
                        etkinlikListesi.map(etkinlik => {
                            const zamanFarki = zamanFarkiFormatla(etkinlik.created_at);

                            return (
                                // EtkinlikKarti Komponente verwenden
                                <EtkinlikKarti
                                    key={etkinlik.id}
                                    // Striktere Typisierung, falls EtkinlikKarti dies erwartet
                                    etkinlik={etkinlik as EtkinlikWithProfile}
                                    zamanFarki={zamanFarki}
                                    // ikonAdi wird wahrscheinlich in EtkinlikKarti basierend auf etkinlik.etkinlik_tipi gesetzt
                                    // ikonAdi={etkinlik.etkinlik_tipi} // Vermutlich nicht hier benötigt
                                    currentUser={user} // Aktuellen Benutzer übergeben (für Bearbeiten/Löschen-Rechte?)
                                />
                            );
                        })
                    ) : (
                        // Nachricht, wenn keine Aktivitäten vorhanden sind
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Für diese Firma wurden noch keine Aktivitäten erfasst.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}