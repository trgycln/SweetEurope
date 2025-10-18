// src/app/[locale]/portal/materialien/page.tsx
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiDownload, FiPaperclip, FiTag, FiUsers } from 'react-icons/fi'; // Icons

// Typ für die Material-Daten
type Material = Tables<'pazarlama_materyalleri'>;

// Hilfsfunktion zur Formatierung der Dateigröße
const formatBytes = (bytes: number | null, decimals = 1) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Stelle sicher, dass bytes eine Zahl ist, bevor toFixed aufgerufen wird
    const size = typeof bytes === 'number' ? parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) : 0;
    return size + ' ' + sizes[i];
}

export default async function MaterialienPortalPage({
    params
}: {
    params: { locale: Locale };
}) {
    const locale = params.locale;
    const dictionary = await getDictionary(locale);
    // TODO: Dictionary-Einträge für diese Seite hinzufügen (z.B. portal.materialsPage.title)
    const content = (dictionary as any).portal?.materialsPage || {
        title: "Marketingmaterialien",
        description: "Hier finden Sie nützliche Materialien wie Broschüren, Preislisten und Bilder.",
        noMaterials: "Aktuell sind keine Marketingmaterialien verfügbar.",
        download: "Herunterladen",
    };
    const supabase = createSupabaseServerClient();

    // Benutzer prüfen (RLS kümmert sich um die Filterung der Materialien)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Materialien abrufen (RLS filtert automatisch nach Rolle und hedef_kitle)
    const { data: materialien, error } = await supabase
        .from('pazarlama_materyalleri')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fehler beim Abrufen der Marketingmaterialien für Portal:", error);
        // Optional: Bessere Fehlermeldung
    }

    const materialListe: Material[] = materialien || [];

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>

            {materialListe.length === 0 ? (
                <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-white shadow-sm">
                    <FiPaperclip className="mx-auto text-5xl text-gray-300 mb-4" />
                    <p className="mt-2 text-text-main/70">{content.noMaterials}</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <ul className="divide-y divide-bg-subtle">
                        {materialListe.map((material) => (
                            <li key={material.id} className="p-4 sm:p-6 hover:bg-secondary/50 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div className="flex-grow">
                                        <h3 className="font-semibold text-primary">{material.baslik}</h3>
                                        {material.aciklama && (
                                            <p className="text-sm text-text-main/70 mt-1">{material.aciklama}</p>
                                        )}
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-main/60 mt-2">
                                            <span className="inline-flex items-center gap-1">
                                                <FiTag size={12} /> {material.kategori}
                                            </span>
                                            <span className="inline-flex items-center gap-1">
                                                <FiUsers size={12} /> {material.hedef_kitle}
                                            </span>
                                             {material.dosya_boyutu_kb && (
                                                <span className="inline-flex items-center gap-1">
                                                    <FiPaperclip size={12} /> {formatBytes(material.dosya_boyutu_kb * 1024)}
                                                </span>
                                             )}
                                        </div>
                                    </div>
                                    <a
                                        href={material.dosya_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        download={material.dosya_adi || material.baslik} // Optional: Bietet Dateinamen beim Download an
                                        className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-sm hover:bg-opacity-90 transition-all font-bold text-sm w-full sm:w-auto"
                                    >
                                        <FiDownload size={16} /> {content.download}
                                    </a>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}