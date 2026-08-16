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
import { cookies } from 'next/headers'; 
import { unstable_noStore as noStore } from 'next/cache'; 
import { matchesAnyField, extractMultilingual } from '@/lib/searchUtils';
import { ProduktMitPreis, Kategorie } from './types';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

interface KatalogPageProps {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const BADGE_DEFS = [
    { key: 'vegan', short: 'Vegan', bg: 'bg-green-100 text-green-800 border-green-200' },
    { key: 'glutenfrei', short: 'Glutenfrei', bg: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { key: 'laktosefrei', short: 'Laktosefrei', bg: 'bg-blue-100 text-blue-800 border-blue-200' },
    { key: 'bio', short: 'Bio', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { key: 'ohne_zucker', short: 'Zuckerfrei', bg: 'bg-sky-100 text-sky-800 border-sky-200' },
] as const;

const getLocalizedName = (adObj: any, locale: Locale, fallback = 'Unbenannt') => {
    if (!adObj) return fallback;
    if (typeof adObj === 'string') return adObj;
    return adObj[locale] || adObj['de'] || Object.values(adObj)[0] as string || fallback;
};

export default async function KatalogPage({
    params,
    searchParams
}: KatalogPageProps) {
    noStore();
    const { locale } = await params;
    const resolvedSearchParams = await searchParams;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const dictionary = await getDictionary(locale);

    const { data: { user } } = await getGlobalCachedUser();
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

    // Filter-Parameter
    const searchQuery = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q.toLowerCase() : '';
    const categoryFilter = typeof resolvedSearchParams.kategorie === 'string' ? resolvedSearchParams.kategorie : '';
    const favoritenFilter = resolvedSearchParams.favoriten === 'true';
    const stokFilter = resolvedSearchParams.stok === 'true';
    const badgesParam = typeof resolvedSearchParams.badges === 'string' && resolvedSearchParams.badges ? resolvedSearchParams.badges.split(',') : [];
    const zertifikateParam = typeof resolvedSearchParams.zertifikate === 'string' && resolvedSearchParams.zertifikate ? resolvedSearchParams.zertifikate.split(',') : [];
    const tatParam = typeof resolvedSearchParams.tat === 'string' && resolvedSearchParams.tat ? resolvedSearchParams.tat.split(',') : [];
    const sortBy = typeof resolvedSearchParams.sort === 'string' ? resolvedSearchParams.sort : 'name';
    const pageParam = typeof resolvedSearchParams.page === 'string' ? parseInt(resolvedSearchParams.page, 10) : 1;
    let currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

    let produkteQuery = supabase
        .from('urunler')
        .select('*, kategoriler(ad)')
        .eq('aktif', true);

    const [produkteRes, kategorienRes, favoritenRes] = await Promise.all([
        produkteQuery,
        supabase
            .from('kategoriler')
            .select('id, ad, ust_kategori_id, slug')
            .order('ust_kategori_id', { ascending: true, nullsFirst: true })
            .order(`ad->>${locale}`),
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id)
    ]);

    let produkte: Tables<'urunler'>[] = produkteRes.data || [];
    const kategorien: Kategorie[] = kategorienRes.data || [];
    const favoritenIds = new Set((favoritenRes.data || []).map(f => f.urun_id));

    // Kategoriefilter hierarchy mapping
    const relevanteIds = new Set<string>();
    if (categoryFilter) {
        relevanteIds.add(categoryFilter);
        const queue = [categoryFilter];
        while (queue.length > 0) {
            const current = queue.shift()!;
            kategorien.filter(k => k.ust_kategori_id === current).forEach(child => {
                if (!relevanteIds.has(child.id)) {
                    relevanteIds.add(child.id);
                    queue.push(child.id);
                }
            });
        }
    }

    // JS Filtering
    let filteredProdukte = produkte.filter(p => {
        if (favoritenFilter && !favoritenIds.has(p.id)) return false;
        if (categoryFilter && !relevanteIds.has(p.kategori_id as string)) return false;
        if (stokFilter && (p.stok_miktari ?? 1) <= 0) return false;
        
        const tekniks = (p.teknik_ozellikler || {}) as Record<string, unknown>;
        
        if (badgesParam.length > 0) {
            const hasAllBadges = badgesParam.every(key => {
                const v = tekniks[key];
                return v === true || v === 'true' || v === 'evet' || v === 1;
            });
            if (!hasAllBadges) return false;
        }

        if (zertifikateParam.length > 0) {
            const hasAllZertifikate = zertifikateParam.every(z => 
                ((p as any).zertifikate || []).includes(z)
            );
            if (!hasAllZertifikate) return false;
        }

        if (tatParam.length > 0) {
            const produktTatlar: string[] = (() => {
                const g = tekniks.geschmack;
                if (!g) return [];
                if (Array.isArray(g)) return g;
                try { return JSON.parse(g as string); } catch { return []; }
            })();
            const hasAnyTat = tatParam.some(t => produktTatlar.includes(t));
            if (!hasAnyTat) return false;
        }

        if (searchQuery) {
            const nameTr = (p.ad as any)?.tr?.toLowerCase() || '';
            const nameDe = (p.ad as any)?.de?.toLowerCase() || '';
            const sku = p.stok_kodu?.toLowerCase() || '';
            const ean = (p as any).ean_gtin?.toLowerCase() || '';
            const aciklama = (p.aciklamalar as any)?.[locale]?.toLowerCase() || (p.aciklamalar as any)?.de?.toLowerCase() || '';
            const zertStr = ((p as any).zertifikate || []).join(' ').toLowerCase();
            const badgeStr = BADGE_DEFS
                .filter(b => {
                    const v = tekniks[b.key];
                    return v === true || v === 'true' || v === 'evet' || v === 1;
                })
                .map(b => b.short.toLowerCase())
                .join(' ');
                
            const passtZuSuche = nameTr.includes(searchQuery) || nameDe.includes(searchQuery) || 
                                 sku.includes(searchQuery) || ean.includes(searchQuery) || 
                                 aciklama.includes(searchQuery) || zertStr.includes(searchQuery) || 
                                 badgeStr.includes(searchQuery);
            if (!passtZuSuche) return false;
        }
        return true;
    });

    // JS Sorting
    filteredProdukte.sort((a, b) => {
        if (sortBy === 'price_asc') {
            return (a.satis_fiyati_musteri ?? 0) - (b.satis_fiyati_musteri ?? 0);
        }
        if (sortBy === 'price_desc') {
            return (b.satis_fiyati_musteri ?? 0) - (a.satis_fiyati_musteri ?? 0);
        }
        if (sortBy === 'new') {
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        }
        const na = getLocalizedName(a.ad, locale).toLowerCase();
        const nb = getLocalizedName(b.ad, locale).toLowerCase();
        return na.localeCompare(nb);
    });

    // Pagination
    const ITEMS_PER_PAGE = 24;
    const totalItems = filteredProdukte.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const paginatedProdukte = filteredProdukte.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Resolve Partner Preis ONLY for paginated products
    const personalisierteProdukte: ProduktMitPreis[] = await Promise.all(
        paginatedProdukte.map(async (produkt) => {
            try {
                const partnerPreis = await resolvePartnerPreis({
                    supabase,
                    urun: produkt,
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
    
    // Convert to regular array for serialization
    const favoritenIdsArray = Array.from(favoritenIds);

    return (
        <KatalogClient
            initialProdukte={personalisierteProdukte}
            kategorien={kategorien}
            favoritenIdsArray={favoritenIdsArray}
            locale={locale}
            dictionary={dictionary}
            
            // Stats & Pagination
            totalItems={totalItems}
            totalPages={totalPages}
            currentPage={currentPage}
            
            // Pass all initial active filters to client so they initialize correctly
            initialSearchQuery={searchQuery}
            initialCategoryFilter={categoryFilter}
            initialFavoritenFilter={favoritenFilter}
            initialStokFilter={stokFilter}
            initialBadges={badgesParam}
            initialZertifikate={zertifikateParam}
            initialTat={tatParam}
            initialSort={sortBy}
            
            userRole={userRole}
        />
    );
}