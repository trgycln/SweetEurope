// src/app/[locale]/admin/pazarlama/materialien/page.tsx (Nur noch Server Component)

// WICHTIG: KEIN 'use client' hier oben!
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Database, Tables, Enums } from '@/lib/supabase/database.types';
// Die Client Component importieren
import { MaterialienClient } from './MaterialienClient';

export const dynamic = 'force-dynamic';

type MaterialRow = Tables<'pazarlama_materyalleri'>;

// Dies ist der Server Component Wrapper
export default async function MaterialienListPage({
    searchParams,
    params
}: {
    searchParams?: {
        q?: string;
        kategori?: string;
        hedef?: string;
    };
    params: { locale: string };
}) {
    const supabase = createSupabaseServerClient();

    const searchQuery = searchParams?.q || '';
    const kategorieFilter = searchParams?.kategori || '';
    const hedefFilter = searchParams?.hedef || '';

    let query = supabase
        .from('pazarlama_materyalleri')
        .select(`*`); // Wähle alle Spalten aus

    // Filter anwenden
    if (searchQuery) query = query.ilike('baslik', `%${searchQuery}%`);
    if (kategorieFilter) query = query.eq('kategori', kategorieFilter);
    if (hedefFilter) query = query.eq('hedef_kitle', hedefFilter);

    // Daten abrufen und sortieren
    const { data: materialienData, error } = await query.order('created_at', { ascending: false });

    let materialien: MaterialRow[] = []; // Initialisiere als leeres Array

    if (error) {
        console.error("Server: Marketingmaterial-Daten konnten nicht abgerufen werden:", JSON.stringify(error, null, 2));
        // Bei Fehler bleibt 'materialien' leer, der Client zeigt eine entsprechende Meldung an.
    } else {
        materialien = materialienData as MaterialRow[]; // Weise Daten zu, wenn kein Fehler auftritt
    }

    // Optionen für die Filter-Komponente definieren
    const kategorieOptions: Enums<'materyal_kategori'>[] = ["Broşürler", "Ürün Fotoğrafları", "Sosyal Medya Kitleri", "Fiyat Listeleri", "Diğer"];
    const hedefKitleOptions: Enums<'hedef_rol'>[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    // Die Client Component aufrufen und die abgerufenen Daten als Props übergeben
    return (
        <MaterialienClient
            materialListe={materialien} // Übergebe das (möglicherweise leere) Array
            params={params}
            kategorieOptions={kategorieOptions}
            hedefKitleOptions={hedefKitleOptions}
        />
    );
}