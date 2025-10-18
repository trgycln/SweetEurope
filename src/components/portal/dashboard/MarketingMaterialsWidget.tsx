// src/components/portal/dashboard/MarketingMaterialsWidget.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { FiDownload, FiPaperclip } from 'react-icons/fi';
import Link from 'next/link';
import { getDictionary } from '@/dictionaries'; // Dictionary importieren

// TODO: Dictionary-Typ korrekt importieren oder anpassen
type Dictionary = any;

export async function MarketingMaterialsWidget({ locale }: { locale: Locale }) {
    const dictionary = await getDictionary(locale);
    // TODO: Dictionary-Einträge für das Widget hinzufügen (z.B. portal.dashboard.materialsWidget.title)
    const widgetContent = (dictionary as Dictionary).portal?.dashboard?.materialsWidget || {
        title: "Neueste Materialien",
        viewAll: "Alle ansehen",
        noMaterials: "Keine neuen Materialien.",
    };
    const supabase = createSupabaseServerClient();

    // Rufe die neuesten 3 Materialien ab (RLS filtert automatisch)
    const { data: materials, error } = await supabase
        .from('pazarlama_materyalleri')
        .select('id, baslik, dosya_url, dosya_adi')
        .order('created_at', { ascending: false })
        .limit(3);

     if (error) {
        console.error("Fehler beim Abrufen der neuesten Materialien für Widget:", error);
     }

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                   <FiPaperclip /> {widgetContent.title}
                </h3>
                {/* Link zur vollständigen Materialseite */}
                <Link href={`/${locale}/portal/materialien`} className="text-sm font-semibold text-accent hover:underline">
                    {widgetContent.viewAll}
                </Link>
            </div>
            {materials && materials.length > 0 ? (
                <ul className="space-y-3">
                    {materials.map(material => (
                        <li key={material.id}>
                            <a href={material.dosya_url} target="_blank" rel="noopener noreferrer" download={material.dosya_adi || material.baslik}
                               className="flex items-center justify-between p-3 bg-secondary rounded-lg hover:bg-bg-subtle transition-colors group">
                                <p className="font-semibold text-sm text-primary group-hover:text-accent transition-colors truncate pr-2">{material.baslik}</p>
                                <FiDownload className="text-accent flex-shrink-0" />
                            </a>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-text-main/70">{widgetContent.noMaterials}</p>
            )}
        </div>
    );
}