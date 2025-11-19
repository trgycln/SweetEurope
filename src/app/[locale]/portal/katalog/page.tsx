// src/app/[locale]/portal/katalog/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KatalogClient } from "@/components/portal/katalog/KatalogClient";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { Database, Tables, Enums } from "@/lib/supabase/database.types";
import { resolvePartnerPreis } from "@/lib/pricing";
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typen
export type ProduktMitPreis = Tables<'urunler'> & { partnerPreis: number | null };
export type Kategorie = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'ust_kategori_id'>;

// Props-Typ für die Seite
interface KatalogPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function KatalogPage({
    params,
    searchParams
}: KatalogPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren
    const locale = params.locale;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);
    const pageContent = (dictionary as any).portal?.catalogPage || { title: "Produktkatalog" };

    // 1. Benutzer und Profil
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.rol) {
        console.error(`Profil nicht gefunden für Benutzer ${user.id} im Katalog.`);
        notFound();
    }
    const userRole = profile.rol;

    // 2. Filter-Parameter
    const searchQuery = typeof searchParams.q === 'string' ? searchParams.q : '';
    const categoryFilter = typeof searchParams.kategorie === 'string' ? searchParams.kategorie : '';
    const favoritenFilter = searchParams.favoriten === 'true'; // Favoriten-Filter lesen

    // 3. Daten abrufen
    let produkteQuery = supabase
        .from('urunler')
        .select('*, kategoriler(ad)')
        .eq('aktif', true); // Nur aktive Produkte

    // Suchfilter (JSONB-Suche in allen Sprachen + stok_kodu)
        if (searchQuery) {
         const searchQueryLike = `%${searchQuery}%`;
         produkteQuery = produkteQuery.or(
            `ad->>de.ilike.${searchQueryLike},ad->>en.ilike.${searchQueryLike},ad->>tr.ilike.${searchQueryLike},ad->>ar.ilike.${searchQueryLike},stok_kodu.ilike.${searchQueryLike}`
         );
    }
    
    // Kategoriefilter
    if (categoryFilter) {
        produkteQuery = produkteQuery.eq('kategori_id', categoryFilter);
    }

    // Sortierung
    produkteQuery = produkteQuery.order(`ad->>${locale}`, { ascending: true, nullsFirst: false });

    // Parallele Abfragen
    const [produkteRes, kategorienRes, favoritenRes] = await Promise.all([
        produkteQuery,
        // Kategorien für Hierarchie
        supabase
            .from('kategoriler')
            .select('id, ad, ust_kategori_id')
            .order('ust_kategori_id', { ascending: true, nullsFirst: true })
            .order(`ad->>${locale}`),
        // Favoriten für diesen Benutzer
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id)
    ]);

    // 4. Datenverarbeitung
    let produkte: Tables<'urunler'>[] = [];
    if (produkteRes.error) {
        console.error("Fehler beim Laden der Produkte:", produkteRes.error);
        // Bei Fehler leeres Array anzeigen
    } else {
        produkte = produkteRes.data || [];
    }

        const kategorien: Kategorie[] = kategorienRes.data || [];
    const favoritenIds = new Set((favoritenRes.data || []).map(f => f.urun_id));

    // Favorit filtresi uygula ve kullanıcı-özel fiyatı (kural/istisna dahil) hesapla
    const filteredProdukte = produkte.filter(p => !favoritenFilter || favoritenIds.has(p.id));
    const personalisierteProdukte: ProduktMitPreis[] = await Promise.all(
      filteredProdukte.map(async (produkt) => {
        try {
          const partnerPreis = await resolvePartnerPreis({
            supabase,
            urun: produkt as Tables<'urunler'>,
            userRole: profile.rol as Enums['user_role'],
            firmaId: (profile.firma_id as string) || '',
            qty: 1,
          });
          return { ...produkt, partnerPreis };
        } catch {
          return { ...produkt, partnerPreis: null };
        }
      })
    );

    // 5. An Client übergeben
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