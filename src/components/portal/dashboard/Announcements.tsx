import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { FiRss, FiCalendar } from 'react-icons/fi'; // Passenderes Icon
import { Enums } from '@/lib/supabase/database.types'; // Enums importieren

export async function Announcements({ locale }: { locale: Locale }) {
    const dictionary = await getDictionary(locale);
    const content = dictionary.portal.dashboard;
    const supabase = createSupabaseServerClient();
    
    // KORREKTUR: Jetzt fragen wir die 'duyurular'-Tabelle ab.
    // Die RLS-Richtlinien, die wir in der Datenbank definiert haben,
    // filtern automatisch nur die relevanten Ankündigungen für den eingeloggten Benutzer.
    const { data: announcements, error } = await supabase
        .from('duyurular')
        .select('*') // Alle Spalten auswählen
        // RLS kümmert sich um die Filterung nach aktiv, Datum und Zielgruppe (hedef_kitle)
        .order('yayin_tarihi', { ascending: false }) // Neueste zuerst
        .limit(5); // Begrenze auf die letzten 5 Ankündigungen

    if (error) {
        console.error("Fehler beim Abrufen der Ankündigungen:", error);
        // Optional: Zeige eine Fehlermeldung im UI
        // return <div className="bg-white p-6 rounded-2xl shadow-lg"><p className="text-red-500">Ankündigungen konnten nicht geladen werden.</p></div>;
    }

    // Helferfunktion zum Formatieren des Datums
    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        try {
            return new Date(dateStr).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="font-serif text-xl font-bold text-primary mb-4 flex items-center gap-2">
                <FiRss /> {/* Passenderes Icon */}
                {content.announcementsTitle}
            </h3>
            {announcements && announcements.length > 0 ? (
                <ul className="space-y-4">
                    {announcements.map(announcement => (
                        <li key={announcement.id} className="border-b border-bg-subtle pb-4 last:border-none last:pb-0">
                             {/* Optional: Verlinkung, falls Ankündigungen Detailseiten haben */}
                            {/* <Link href={`/${locale}/portal/announcements/${announcement.id}`}> */}
                                <div className="group"> {/* 'group' für Hover-Effekte */}
                                    <p className="font-semibold text-primary group-hover:text-accent transition-colors">
                                        {announcement.baslik}
                                    </p>
                                    <p className="text-xs text-text-main/60 mt-1 flex items-center gap-1">
                                        <FiCalendar size={12}/> {formatDate(announcement.yayin_tarihi)}
                                    </p>
                                    {/* Inhalt nur anzeigen, wenn vorhanden */}
                                    {announcement.icerik && (
                                        <p className="text-sm text-text-main/80 mt-2 line-clamp-3">
                                            {announcement.icerik}
                                        </p>
                                    )}
                                </div>
                            {/* </Link> */}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-text-main/70">{content.announcementsPlaceholder}</p>
            )}
        </div>
    );
}