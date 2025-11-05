// src/app/[locale]/admin/ayarlar/sablonlar/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SablonYonetimIstemcisi } from './sablon-yonetim-istemcisi'; // Client-Komponente
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Props-Typ für die Seite
interface SablonYonetimPageProps {
    params: { locale: Locale }; // Locale aus params holen
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function SablonYonetimPage({ params }: SablonYonetimPageProps) {
    noStore(); // Caching deaktivieren
    const locale = params.locale; // Locale holen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`); // Sprachspezifischer Redirect
    }

    // Optional: Rollenprüfung (z.B. nur Admins)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici') {
    //     return redirect(`/${locale}/admin/dashboard`); // Oder Fehlerseite
    // }


    // Kategorien für das Dropdown abrufen
    const { data: kategoriler, error: kategoriError } = await supabase
        .from('kategoriler')
        .select('id, ad, ust_kategori_id')
        // Nach lokalisiertem Namen sortieren
        .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
        .order(`ad->>de`, { ascending: true, nullsFirst: false }); // Fallback-Sortierung

    if (kategoriError) {
        console.error("Fehler beim Laden der Kategorien:", kategoriError);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Kategorien konnten nicht geladen werden.</div>;
    }

    return (
        <div className="space-y-8">
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">Vorlagenverwaltung</h1> {/* Angepasst */}
                <p className="text-text-main/80 mt-1">
                    Verwalten Sie hier die technischen Eigenschaftsfelder für Ihre Produktkategorien. {/* Angepasst */}
                </p>
            </header>

            {/* Client-Komponente für die interaktive Verwaltung */}
            <SablonYonetimIstemcisi
                serverKategoriler={kategoriler || []}
                locale={locale} // Korrekte Locale übergeben
            />
        </div>
    );
}