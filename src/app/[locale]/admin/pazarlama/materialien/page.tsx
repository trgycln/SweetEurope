// src/app/[locale]/admin/pazarlama/materialien/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
// Die Client Component importieren
import { MaterialienClient } from './MaterialienClient';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { redirect } from 'next/navigation'; // Import für Redirect
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

type MaterialRow = Tables<'pazarlama_materyalleri'>;

// Props-Typ für die Seite
interface MaterialienListPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale }; // Locale Typ verwenden
    searchParams?: {
        q?: string;
        kategori?: string;
        hedef?: string;
    };
}

// Dies ist die Server Component
export default async function MaterialienListPage({
    params,
    searchParams
}: MaterialienListPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren
    const locale = params.locale; // Locale holen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung
    // const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    // if (!user) { return redirect(`/${locale}/login`); }
    // ... Rollenprüfung ...

    // Filterwerte extrahieren
    const searchQuery = searchParams?.q || '';
    const kategorieFilter = searchParams?.kategori || '';
    const hedefFilter = searchParams?.hedef || '';

    // Basisabfrage
    let query = supabase
        .from('pazarlama_materyalleri')
        .select(`*`); // Wähle alle Spalten aus

    // Filter anwenden
    if (searchQuery) {
        query = query.ilike('baslik', `%${searchQuery}%`); // Suche nach Titel
    }
    if (kategorieFilter) {
        query = query.eq('kategori', kategorieFilter as Enums<'materyal_kategori'>); // Typ-Zuweisung
    }
    if (hedefFilter) {
        query = query.eq('hedef_kitle', hedefFilter as Enums<'hedef_rol'>); // Typ-Zuweisung
    }

    // Daten abrufen und sortieren
    const { data: materialienData, error } = await query.order('created_at', { ascending: false });

    let materialien: MaterialRow[] = []; // Initialisiere als leeres Array

    if (error) {
        console.error("Server: Marketingmaterial-Daten konnten nicht abgerufen werden:", JSON.stringify(error, null, 2));
        // Zeige eine Fehlermeldung, anstatt die Client-Komponente zu rendern
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Fehler beim Laden der Marketingmaterialien. Details: {error.message}</div>;
    } else {
        materialien = materialienData as MaterialRow[]; // Weise Daten zu
    }

    // Optionen für die Filter-Komponente definieren (aus Enums)
    const kategorieOptions: Enums<'materyal_kategori'>[] = ["Broşürler", "Ürün Fotoğrafları", "Sosyal Medya Kitleri", "Fiyat Listeleri", "Diğer"];
    const hedefKitleOptions: Enums<'hedef_rol'>[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    // Die Client Component aufrufen und die abgerufenen Daten als Props übergeben
    return (
        <MaterialienClient
            materialListe={materialien} // Übergebe das (möglicherweise leere) Array
            params={params} // params (enthält locale) übergeben
            kategorieOptions={kategorieOptions}
            hedefKitleOptions={hedefKitleOptions}
        />
    );
}