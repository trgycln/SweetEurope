// src/components/portal/dashboard/MarketingMaterialsWidget.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { FiDownload, FiPaperclip } from 'react-icons/fi';
import Link from 'next/link';
import { getDictionary } from '@/dictionaries';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { redirect } from 'next/navigation'; // Importieren, falls Benutzerprüfung hinzugefügt wird
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// TODO: Dictionary-Typ korrekt importieren oder anpassen
type Dictionary = any;

export async function MarketingMaterialsWidget({ locale }: { locale: Locale }) {
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung (Layout macht dies vielleicht schon)
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) return null; // Oder Redirect

    const dictionary = await getDictionary(locale);
    // TODO: Dictionary-Einträge für das Widget hinzufügen (z.B. portal.dashboard.materialsWidget.title)
    const widgetContent = (dictionary as Dictionary).portal?.dashboard?.materialsWidget || {
        title: "Neueste Materialien",
        viewAll: "Alle ansehen",
        noMaterials: "Keine neuen Materialien.",
    };

    // Rufe die neuesten 3 Materialien ab (RLS filtert automatisch)
    const { data: materials, error } = await supabase
        .from('pazarlama_materyalleri')
        .select('id, baslik, dosya_url, dosya_adi')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error("Fehler beim Abrufen der neuesten Materialien für Widget:", error);
        // Bei Fehler eine leere Karte anzeigen, anstatt die Seite abstürzen zu lassen
    }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200"> {/* Border hinzugefügt */}
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                   <FiPaperclip /> {widgetContent.title}
                </h3>
                {/* Link zur vollständigen Materialseite */}
                <Link href={`/${locale}/portal/materialien`} className="text-sm font-semibold text-accent hover:underline">
                    {widgetContent.viewAll}
                </Link>
            </div>
            {/* Sicherstellen, dass 'materials' ein Array ist */}
            {Array.isArray(materials) && materials.length > 0 ? (
                <ul className="space-y-3">
                    {materials.map(material => (
                        <li key={material.id}>
                            <a href={material.dosya_url} target="_blank" rel="noopener noreferrer" download={material.dosya_adi || material.baslik}
                               className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-accent hover:bg-white transition-colors group"> {/* Styling angepasst */}
                                <p className="font-semibold text-sm text-primary group-hover:text-accent transition-colors truncate pr-2">{material.baslik}</p>
                                <FiDownload className="text-accent flex-shrink-0" />
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-gray-500">{widgetContent.noMaterials}</p> // Styling angepasst
            )}
        </div>
    );
}