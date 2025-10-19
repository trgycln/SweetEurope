// src/app/[locale]/portal/katalog/page.tsx (Angepasst für Hierarchie)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KatalogClient } from "@/components/portal/katalog/KatalogClient";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config"; // Annahme, dass Locale hier ist, sonst aus utils
import { Database, Tables, Enums } from "@/lib/supabase/database.types";

export type ProduktMitPreis = Tables<'urunler'> & { partnerPreis: number | null };
// KORREKTUR: Kategorie-Typ erweitern
export type Kategorie = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'ust_kategori_id'>;

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

    // 3. Daten abrufen
    let produkteQuery = supabase
        .from('urunler')
        .select('*, kategoriler(ad)')
        .eq('aktif', true)
        .ilike( `ad->>${locale}`, `%${searchQuery}%`);

    if (categoryFilter) {
        produkteQuery = produkteQuery.eq('kategori_id', categoryFilter);
    }
    
    produkteQuery = produkteQuery.order(`ad->>${locale}`);

    const [produkteRes, kategorienRes, favoritenRes] = await Promise.all([
        produkteQuery,
        // KORREKTUR: 'ust_kategori_id' abrufen und korrekt sortieren
        supabase
            .from('kategoriler')
            .select('id, ad, ust_kategori_id') // ust_kategori_id hinzugefügt
            .order('ust_kategori_id', { ascending: true, nullsFirst: true }) // Hauptkategorien zuerst
            .order(`ad->>${locale}`), // Dann alphabetisch
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id)
    ]);

    // 4. Datenverarbeitung
    let produkte: Tables<'urunler'>[] = [];
    if (produkteRes.error) {
        console.error("Fehler beim Laden der Produkte:", produkteRes.error);
    } else {
        produkte = produkteRes.data || [];
    }
    
    // KORREKTUR: 'kategorien' wird jetzt als volle Liste mit 'ust_kategori_id' übergeben
    const kategorien: Kategorie[] = kategorienRes.data || [];
    const favoritenIds = new Set((favoritenRes.data || []).map(f => f.urun_id));

    const personalisierteProdukte: ProduktMitPreis[] = produkte.map(produkt => {
        let partnerPreis: number | null = null;
        if (userRole === 'Alt Bayi') partnerPreis = produkt.satis_fiyati_alt_bayi;
        else if (userRole === 'Müşteri') partnerPreis = produkt.satis_fiyati_musteri;
        return { ...produkt, partnerPreis };
    });

    // 5. An Client übergeben
    return (
        <KatalogClient
            initialProdukte={personalisierteProdukte}
            kategorien={kategorien} // Übergibt die volle, sortierte Liste
            favoritenIds={favoritenIds}
            locale={locale}
            dictionary={dictionary}
            initialSearchQuery={searchQuery}
            initialCategoryFilter={categoryFilter}
        />
    );
}