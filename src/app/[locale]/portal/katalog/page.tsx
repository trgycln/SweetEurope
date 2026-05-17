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
import { matchesAnyField, extractMultilingual } from '@/lib/searchUtils';

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Types imported from separate file to avoid circular dependencies
import { ProduktMitPreis, Kategorie } from './types';

// Props-Typ für die Seite (Next.js 15: params/searchParams sind jetzt Promises)
interface KatalogPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function KatalogPage({
    params,
    searchParams
}: KatalogPageProps) {
    noStore(); // Caching deaktivieren
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;

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
    const searchQuery = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q : '';
    const categoryFilter = typeof resolvedSearchParams.kategorie === 'string' ? resolvedSearchParams.kategorie : '';
    const favoritenFilter = resolvedSearchParams.favoriten === 'true'; // Favoriten-Filter lesen

    // 3. Daten abrufen
    let produkteQuery = supabase
        .from('urunler')
        .select('*, kategoriler(ad)')
        .eq('aktif', true); // Nur aktive Produkte

    // Suchfilter: client-side, çoklu-dil + diakritik-duyarsız
    // (DB tarafında uygulamıyoruz; tüm aktif ürünler getirilir, sonra JS'de filtrelenir.
    //  Türkçe/Almanca/İngilizce/Arapça tüm ad alanları + stok_kodu içinde aranır.)
    
    // Kategoriefilter: Wenn eine Hauptkategorie ausgewählt ist, beziehen wir auch alle Unterkategorien ein
    if (categoryFilter) {
        // Hauptkategorie + alle Unterkategorien sammeln
        const { data: alleKategorien } = await supabase
            .from('kategoriler')
            .select('id, ust_kategori_id');
        const relevanteIds = new Set<string>([categoryFilter]);
        if (Array.isArray(alleKategorien)) {
            const queue = [categoryFilter];
            while (queue.length > 0) {
                const current = queue.shift()!;
                alleKategorien
                    .filter(k => k.ust_kategori_id === current)
                    .forEach(child => {
                        if (!relevanteIds.has(child.id)) {
                            relevanteIds.add(child.id);
                            queue.push(child.id);
                        }
                    });
            }
        }
        produkteQuery = produkteQuery.in('kategori_id', Array.from(relevanteIds));
    }

    // Sortierung
    produkteQuery = produkteQuery.order(`ad->>${locale}`, { ascending: true, nullsFirst: false });

    // Parallele Abfragen
    const [produkteRes, kategorienRes, favoritenRes] = await Promise.all([
        produkteQuery,
        // Kategorien für Hierarchie
        supabase
            .from('kategoriler')
            .select('id, ad, ust_kategori_id, slug')
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

    // Favorit + arama (çoklu-dil ad alanları + stok_kodu) filtrelerini uygula
    const filteredProdukte = produkte.filter(p => {
        if (favoritenFilter && !favoritenIds.has(p.id)) return false;
        if (searchQuery) {
            const adFields = extractMultilingual((p as any).ad);
            const allFields = [...adFields, (p as any).stok_kodu];
            if (!matchesAnyField(allFields, searchQuery)) return false;
        }
        return true;
    });
    // Limit concurrent price resolution to prevent stack overflow
    const BATCH_SIZE = 20;
    const personalisierteProdukte: ProduktMitPreis[] = [];

    for (let i = 0; i < filteredProdukte.length; i += BATCH_SIZE) {
      const batch = filteredProdukte.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (produkt) => {
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
      personalisierteProdukte.push(...batchResults);
    }

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