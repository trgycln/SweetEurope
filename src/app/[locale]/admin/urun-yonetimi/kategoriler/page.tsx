// src/app/[locale]/admin/urun-yonetimi/kategoriler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { KategoriYonetimIstemcisi } from './kategori-yonetim-istemcisi';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Props-Typ für die Seite
interface KategoriYonetimPageProps {
    params: { locale: Locale };
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function KategoriYonetimPage({ params }: KategoriYonetimPageProps) {
    noStore(); // Caching deaktivieren
    const locale = params.locale; // Locale holen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        // Zur sprachspezifischen Login-Seite weiterleiten
        return redirect(`/${locale}/login?next=/admin/urun-yonetimi/kategoriler`);
    }
    
    // Optional: Rollenprüfung (z.B. nur Admins)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici') {
    //     return redirect(`/${locale}/admin/dashboard`); // Oder Fehlerseite
    // }

    // Alle Kategorien abrufen, nach lokalisiertem Namen sortieren
    const { data: kategoriler, error } = await supabase
        .from('kategoriler')
        .select('*')
        // Sortieren nach dem Namen in der aktuellen Sprache (oder einem Fallback)
        .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
        .order(`ad->>de`, { ascending: true, nullsFirst: false }); // Fallback-Sortierung

    if (error) {
        console.error("Fehler beim Laden der Kategorien:", error);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Kategorien konnten nicht geladen werden. Details: {error.message}</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Kategorieverwaltung</h1>
                <p className="text-text-main/80 mt-1">
                    Erstellen, bearbeiten und verwalten Sie die Hierarchie Ihrer Produktkategorien.
                </p>
            </header>

            {/* Client-Komponente für die interaktive Verwaltung */}
            <KategoriYonetimIstemcisi
                serverKategoriler={kategoriler || []}
                locale={locale} // Locale übergeben
            />
        </div>
    );
}