// src/components/portal/dashboard/Announcements.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiRss, FiCalendar } from 'react-icons/fi';
import { Enums, Tables } from '@/lib/supabase/database.types';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { redirect } from 'next/navigation'; // Importieren, falls Benutzerprüfung hinzugefügt wird
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// Typ für eine einzelne Ankündigung
type Announcement = Tables<'duyurular'>;

export async function Announcements({ locale }: { locale: Locale }) {
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung (Layout macht dies vielleicht schon, aber sicher ist sicher)
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) return null; // Oder Redirect

    const dictionary = await getDictionary(locale);
    // Sicherer Zugriff auf das Dictionary
    const content = (dictionary as any).portal?.dashboard || {
        announcementsTitle: "Ankündigungen",
        announcementsPlaceholder: "Derzeit keine neuen Ankündigungen."
    };
    
    // Ankündigungen abrufen
    // RLS (Row Level Security) sollte automatisch filtern nach:
    // 1. 'aktif' = true
    // 2. 'yayin_tarihi' <= jetzt
    // 3. ('bitis_tarihi' >= jetzt ODER 'bitis_tarihi' IS NULL)
    // 4. 'hedef_kitle' = 'Tüm Partnerler' ODER (Benutzerrolle = 'Alt Bayi' UND 'hedef_kitle' = 'Sadece Alt Bayiler')
    const { data: announcements, error } = await supabase
        .from('duyurular')
        .select('*')
        // RLS sollte die Filterung übernehmen. Falls nicht, hier manuell filtern:
        // .eq('aktif', true)
        // .lte('yayin_tarihi', new Date().toISOString())
        // .or(`bitis_tarihi.is.null,bitis_tarihi.gte.${new Date().toISOString()}`)
        // .in('hedef_kitle', ['Tüm Partnerler', userRole === 'Alt Bayi' ? 'Sadece Alt Bayiler' : null].filter(Boolean))
        .order('yayin_tarihi', { ascending: false }) // Neueste zuerst
        .limit(5); // Begrenze auf die letzten 5

    if (error) {
        console.error("Fehler beim Abrufen der Ankündigungen (Widget):", error);
        // Bei Fehler eine leere Karte anzeigen, anstatt die Seite abstürzen zu lassen
    }

    // Helferfunktion zum Formatieren des Datums
    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) {
            return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }); // Fallback
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"> {/* Border hinzugefügt */}
            <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <FiRss />
                {content.announcementsTitle}
            </h3>
            {/* Sicherstellen, dass 'announcements' ein Array ist, bevor map aufgerufen wird */}
            {Array.isArray(announcements) && announcements.length > 0 ? (
                <ul className="space-y-4">
                    {announcements.map(announcement => (
                        <li key={announcement.id} className="border-b border-gray-200 pb-4 last:border-none last:pb-0">
                            {/* Optional: Verlinkung, falls Ankündigungen Detailseiten haben */}
                            {/* <Link href={`/${locale}/portal/announcements/${announcement.id}`}> */}
                                <div className="group">
                                    <p className="font-semibold text-primary group-hover:text-accent transition-colors">
                                        {announcement.baslik}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"> {/* Styling angepasst */}
                                        <FiCalendar size={12}/> {formatDate(announcement.yayin_tarihi)}
                                    </p>
                                    {/* Inhalt nur anzeigen, wenn vorhanden */}
                                    {announcement.icerik && (
                                        <p className="text-sm text-gray-700 mt-2 line-clamp-3"> {/* Styling angepasst */}
                                            {announcement.icerik}
                                        </p>
                                    )}
                                </div>
                            {/* </Link> */}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500">{content.announcementsPlaceholder}</p> // Styling angepasst
            )}
        </div>
    );
}