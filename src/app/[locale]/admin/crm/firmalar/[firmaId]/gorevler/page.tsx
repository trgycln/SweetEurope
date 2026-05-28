// src/app/[locale]/admin/crm/firmalar/[firmaId]/gorevler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiPlus, FiCalendar, FiFlag, FiUser } from 'react-icons/fi';
// Annahme: actions.ts ist im selben Verzeichnis
import { firmaIcinGorevEkleAction } from './actions';
import TamamlaButton from './TamamlaButton';
import GeriAlButton from './GeriAlButton';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { redirect } from 'next/navigation'; // Import für Redirect
import { Tables, Enums } from '@/lib/supabase/database.types'; // Import für Typisierung
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für die erweiterten Aufgaben-Daten mit Profilen
type GorevWithProfil = Tables<'gorevler'> & {
    atanan_profil: Pick<Tables<'profiller'>, 'tam_ad'> | null;
    olusturan_profil: Pick<Tables<'profiller'>, 'tam_ad'> | null;
};

// Typ für Profil-Optionen im Dropdown
type ProfilOption = Pick<Tables<'profiller'>, 'id' | 'tam_ad'>;

// Props-Typ für die Seite
interface FirmaGorevleriPageProps {
    params: {
        locale: Locale; // Locale wird vom Layout bereitgestellt
        firmaId: string;
    };
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function FirmaGorevleriPage({ params }: FirmaGorevleriPageProps) {
    const { firmaId, locale } = params; // Locale extrahieren
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung (wichtig für Berechtigungen und Zuordnung)
    const { data: { user }, error: userAuthError } = await getGlobalCachedUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login?next=/admin/crm/firmalar/${firmaId}/gorevler`);
    }
     // Optional: Rollenprüfung
     // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
     // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') { /* redirect */ }

    // Parallele Datenabfragen: Aufgaben für die Firma und alle Profile für das Dropdown
    const [gorevlerRes, profillerRes] = await Promise.all([
        supabase.from('gorevler').select(`
            *,
            atanan_profil: profiller!atanan_kisi_id(tam_ad),
            olusturan_profil: profiller!olusturan_kisi_id(tam_ad)
        `)
            .eq('ilgili_firma_id', firmaId)
            // Sortiert zuerst nach "nicht abgeschlossen", dann nach Fälligkeitsdatum
            .order('tamamlandi', { ascending: true })
            .order('son_tarih', { ascending: true, nullsFirst: false }), // NULLS LAST wäre vielleicht besser?
        // Nur Profile auswählen, die aktiv sind (falls es eine 'aktiv' Spalte gibt)
        supabase.from('profiller')
            .select('id, tam_ad')
            // .eq('aktiv', true) // Beispiel: Nur aktive Benutzer anzeigen
            .order('tam_ad') // Nach Namen sortieren
    ]);

    const { data: gorevlerData, error: gorevlerError } = gorevlerRes;
    const { data: profilerData, error: profillerError } = profillerRes;

    // Fehlerbehandlung
    if (gorevlerError || profillerError) {
        console.error("Fehler beim Laden der Aufgaben oder Profile:", gorevlerError || profillerError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Daten. Details in den Server-Logs.</div>;
    }

    // Typ-Zuweisung
    const gorevler: GorevWithProfil[] = gorevlerData || [];
    const profiller: ProfilOption[] = profilerData || [];

    // Datumsformatierung (Locale-sensitiv)
    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return 'Tarih yok';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'short' }); // Kurzformat
        } catch {
            return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }); // Fallback
        }
    };

    // Server Action mit firmaId vorbereiten
    const formAction = firmaIcinGorevEkleAction.bind(null, firmaId);
    // Styling für Inputs
    const inputBaseClasses = "w-full bg-white border border-gray-300 rounded-lg p-2 text-sm focus:ring-accent focus:border-accent"; // Angepasst

    return (
        // Layout mit zwei Spalten
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Linke Spalte: Formular zum Hinzufügen */}
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Yeni Görev Ekle</h2>
                <form action={formAction} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {/* Başlık */}
                    <div>
                        <label htmlFor="baslik" className="block text-sm font-bold text-gray-700 mb-1">Başlık <span className="text-red-500">*</span></label>
                        <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} />
                    </div>
                    {/* Atanan Kişi */}
                    <div>
                        <label htmlFor="atanan_kisi_id" className="block text-sm font-bold text-gray-700 mb-1">Atanan Kişi <span className="text-red-500">*</span></label>
                        <select id="atanan_kisi_id" name="atanan_kisi_id" required className={inputBaseClasses}>
                            <option value="" disabled>Seçiniz...</option>
                            {profiller.map(p => <option key={p.id} value={p.id}>{p.tam_ad || `ID: ${p.id}`}</option>)}
                        </select>
                    </div>
                    {/* Son Tarih */}
                    <div>
                        <label htmlFor="son_tarih" className="block text-sm font-bold text-gray-700 mb-1">Son Tarih</label>
                        <input type="date" id="son_tarih" name="son_tarih" className={inputBaseClasses} />
                    </div>
                    {/* Öncelik */}
                    <div>
                        <label htmlFor="oncelik" className="block text-sm font-bold text-gray-700 mb-1">Öncelik</label>
                        <select id="oncelik" name="oncelik" defaultValue="Orta" className={inputBaseClasses}>
                            <option value="Düşük">Düşük</option>
                            <option value="Orta">Orta</option>
                            <option value="Yüksek">Yüksek</option>
                            <option value="Acil">Acil</option>
                        </select>
                    </div>
                    {/* Açıklama */}
                    <div>
                        <label htmlFor="aciklama" className="block text-sm font-bold text-gray-700 mb-1">Açıklama</label>
                        <textarea id="aciklama" name="aciklama" rows={3} className={inputBaseClasses} placeholder="Görev hakkında ek bilgi..." />
                    </div>
                    {/* Gönder */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg font-bold text-sm hover:bg-opacity-90 transition disabled:opacity-50"
                        >
                            <FiPlus /> Görev Ekle
                        </button>
                    </div>
                </form>
            </div>

            {/* Rechte Spalte: Aufgabenliste */}
            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Bu Firmaya Ait Görevler</h2>
                <div className="space-y-3">
                    {/* Prüfen, ob Aufgaben vorhanden sind */}
                    {gorevler.length > 0 ? (
                        gorevler.map(gorev => {
                            const isCompleted = gorev.tamamlandi;
                            // Prioritätsfarben definieren
                            const priorityColorClass = gorev.oncelik === 'Yüksek' ? 'border-red-500'
                                                    : gorev.oncelik === 'Orta' ? 'border-yellow-500'
                                                    : 'border-blue-500';
                            const bgColorClass = isCompleted ? 'bg-gray-50 opacity-70' : 'bg-white'; // Hintergrund für abgeschlossene
                            const borderColorClass = isCompleted ? 'border-gray-300' : priorityColorClass;

                            return (
                                <div key={gorev.id} className={`p-4 ${bgColorClass} rounded-lg border-l-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm ${borderColorClass}`}>
                                    {/* Aufgaben Details */}
                                    <div className="flex-grow">
                                        <p className={`font-semibold ${isCompleted ? 'line-through text-gray-500' : 'text-primary'}`}>{gorev.baslik}</p>
                                        {gorev.aciklama && (
                                            <p className="text-xs text-gray-500 mt-0.5">{gorev.aciklama}</p>
                                        )}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                                            {gorev.son_tarih && (
                                                <span className="flex items-center gap-1">
                                                    <FiCalendar size={12}/> {formatDate(gorev.son_tarih)}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <FiUser size={12}/> {gorev.atanan_profil?.tam_ad || 'Atanmadı'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FiFlag size={12}/> {gorev.oncelik || '-'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Aktionsbuttons (Client Komponenten) */}
                                    <div className="flex-shrink-0 mt-2 sm:mt-0">
                                        {isCompleted ? (
                                             // Stellt sicher, dass firmaId übergeben wird
                                            <GeriAlButton gorevId={gorev.id} firmaId={firmaId} />
                                        ) : (
                                            // Stellt sicher, dass firmaId übergeben wird
                                            <TamamlaButton gorevId={gorev.id} firmaId={firmaId} />
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        // Nachricht, wenn keine Aufgaben vorhanden sind
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Bu firmaya henüz görev atanmamış.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}