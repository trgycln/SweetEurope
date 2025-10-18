// src/app/[locale]/portal/katalog/page.tsx (maybeMatch entfernt)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KatalogClient } from "@/components/portal/katalog/KatalogClient";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { Database, Tables, Enums } from "@/lib/supabase/database.types";

export type ProduktMitPreis = Tables<'urunler'> & { partnerPreis: number | null };
type Kategorie = Pick<Tables<'kategoriler'>, 'id' | 'ad'>;

export default async function KatalogPage({
    params,
    searchParams
}: {
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
}) {
    const locale = params.locale;
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary(locale);
    const pageContent = (dictionary as any).portal?.catalogPage || { title: "Produktkatalog" };

    // 1. Benutzer und Profil
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.rol) { notFound(); }
    const userRole = profile.rol;

    // 2. Filter-Parameter
    const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : '';
    const categoryFilter = typeof searchParams.kategorie === 'string' ? searchParams.kategorie : '';

    // 3. Daten abrufen: Produkte, Kategorien, Favoriten
    // KORREKTUR: Query schrittweise aufbauen
    let produkteQuery = supabase
        .from('urunler')
        .select('*, kategoriler(ad)') // Wähle alle Felder und den Kategorienamen
        .eq('aktif', true) // Nur aktive Produkte
        .ilike( `ad->>${locale}`, `%${searchQuery}%`); // Suche im lokalisierten Namen

    // KORREKTUR: Kategorie-Filter nur anwenden, wenn categoryFilter existiert
    if (categoryFilter) {
        produkteQuery = produkteQuery.eq('kategori_id', categoryFilter);
    }

    // Sortierung NACH den Filtern hinzufügen
    produkteQuery = produkteQuery.order(`ad->>${locale}`);

    // Restliche Abfragen parallel ausführen
    const [produkteRes, kategorienRes, favoritenRes] = await Promise.all([
        produkteQuery, // Die aufgebaute Produkt-Query ausführen
        supabase.from('kategoriler').select('id, ad').order(`ad->>${locale}`),
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id)
    ]);

    // Datenverarbeitung (wie zuvor)
    let produkte: Tables<'urunler'>[] = [];
    if (produkteRes.error) {
        console.error("Fehler beim Laden der Produkte:", produkteRes.error);
    } else {
        produkte = produkteRes.data || [];
    }
    const kategorien: Kategorie[] = kategorienRes.data || [];
    const favoritenIds = new Set((favoritenRes.data || []).map(f => f.urun_id));

    const personalisierteProdukte: ProduktMitPreis[] = produkte.map(produkt => {
        let partnerPreis: number | null = null;
        if (userRole === 'Alt Bayi') partnerPreis = produkt.satis_fiyati_alt_bayi;
        else if (userRole === 'Müşteri') partnerPreis = produkt.satis_fiyati_musteri;
        return { ...produkt, partnerPreis };
    });

    // Client Komponente aufrufen (wie zuvor)
    return (
        <KatalogClient
            initialProdukte={personalisierteProdukte}
            kategorien={kategorien}
            favoritenIds={favoritenIds}
            locale={locale}
            dictionary={dictionary}
            initialSearchQuery={searchQuery}
            initialCategoryFilter={categoryFilter}
        />
    );
}