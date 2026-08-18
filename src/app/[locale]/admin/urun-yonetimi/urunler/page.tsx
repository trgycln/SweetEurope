// src/app/[locale]/admin/urun-yonetimi/urunler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Tables, Database } from '@/lib/supabase/database.types'; // Database importieren
import { FiPlus, FiArchive, FiAlertTriangle, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { formatCurrency, getLocalizedName } from '@/lib/utils';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import { UrunFiltre } from './urun-filtre';
import { Pagination } from './pagination';
import EditableUrunRowClient from "./EditableUrunRowClient";
import UrunExcelImportPanel from './UrunExcelImportPanel';
import UrunExcelExportPanel from './UrunExcelExportPanel';
import StokHesaplaButton from './StokHesaplaButton';
import { getGlobalCachedUser, getCachedProfile, getCachedCategories, getCachedSuppliers, getCachedPricingSettings } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

// Typdefinition mit Kategorie
type UrunWithKategori = Tables<'urunler'> & {
    kategoriler: {
        ad: any; // Lässt JSON zu
    } | null;
};

// Stok Durum Göstergesi Komponente (localized)
const StokDurumGostergesi = ({ miktar, esik, labels }: { miktar: number | null; esik: number | null; labels: { sufficient: string; low: string; out: string } }) => {
     const mevcutMiktar = miktar ?? 0;
     const uyariEsigi = esik ?? 0;
     let durum = { text: labels.sufficient, color: 'bg-green-100 text-green-800', icon: <FiCheckCircle size={12}/> };
     if (mevcutMiktar <= 0) {
         durum = { text: labels.out, color: 'bg-red-100 text-red-800', icon: <FiXCircle size={12}/> };
     } else if (mevcutMiktar <= uyariEsigi) {
         durum = { text: labels.low, color: 'bg-yellow-100 text-yellow-800', icon: <FiAlertTriangle size={12}/> };
     }
     return (
         <div className="flex items-center gap-2">
             <span className="font-medium text-gray-800">{mevcutMiktar}</span>
             <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold leading-5 rounded-full ${durum.color}`}>
                 {durum.icon} {durum.text}
             </span>
         </div>
     );
};

// Props-Typ für die Seite
interface UrunlerListPageProps { // Props-Typ hinzugefügt
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        kategori?: string;
        durum?: string;
        stok?: string;
        q?: string;
        page?: string;
        tedarikci?: string;
        urun_gami?: string[] | null;
        lojistik?: string;
        ozellik?: string;
    }>;
}

// Hauptseitenkomponente
export default async function UrunlerListPage({
    params,
    searchParams
}: UrunlerListPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const { locale } = await params; // Next.js 15: params should be awaited
    const dictionary = await getDictionary(locale);
    const content = (dictionary as any).adminDashboard?.productsPage || {};

    // Benutzer prüfen (Cached)
    const { data: { user } } = await getGlobalCachedUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }
    // Rollenprüfung (Cached)
    const { profile } = await getCachedProfile(supabase, user.id);
    const isAdmin = profile?.rol === 'Yönetici';
    const canImportProducts = profile?.rol === 'Yönetici' || profile?.rol === 'Personel' || profile?.rol === 'Ekip Üyesi';
    const canSeePurchasePrice = profile?.rol !== 'Personel';
     // Ekip Üyesi sadece okuma yapabilir, düzenleme yetkisi yok

    // Filter aus searchParams lesen
    const sp = searchParams ? await searchParams : undefined; // await searchParams if provided
    const kategoriFilter = sp?.kategori;
    const durumFilter = sp?.durum;
    const stokFilter = sp?.stok;
    const queryParam = sp?.q;
    const tedarikciFilter = sp?.tedarikci;
    const urunGamiFilter = sp?.urun_gami;
    const lojistikFilter = sp?.lojistik;
    const ozellikFilter = sp?.ozellik;
    const currentPage = Math.max(1, Number.parseInt(sp?.page || '1') || 1);
    const itemsPerPage = 50;

    // Get all categories for filter (Cached)
    const allKategoriler = await getCachedCategories();

    // Fetch pricing parameters for tier price calculation (Cached)
    const pricingSettings = await getCachedPricingSettings();
    const _shipFrozen = pricingSettings.pricing_shipping_frozen_per_box ?? (350 / 384);
    const _shipDry = pricingSettings.pricing_shipping_non_cold_per_box ?? 0.45;
    const _custFrozen = pricingSettings.pricing_customs_frozen_percent ?? pricingSettings.pricing_customs_percent ?? 15;
    const _opPct = pricingSettings.pricing_operational_percent ?? 15;
    const _altBayiMargin = pricingSettings.pricing_alt_bayi_margin ?? pricingSettings.pricing_tier1_margin_percent ?? 5;
    const _koliBazliMargin = pricingSettings.pricing_koli_bazli_margin ?? pricingSettings.pricing_tier3_margin_percent ?? 50;
    const _cokKoliMargin = pricingSettings.pricing_cok_koli_margin ?? pricingSettings.pricing_tier2_margin_percent ?? 30;
    const _paletMargin = pricingSettings.pricing_palet_margin ?? 15;

    const calcTierPrices = (alis: number | null | undefined) => {
        const a = Number(alis) || 0;
        if (a <= 0) return { altBayi: null, koliBazli: null, cokKoli: null, palet: null };
        const ship = _shipFrozen;
        const landed = (a + ship) * (1 + _custFrozen / 100) * (1 + _opPct / 100);
        const r = (n: number) => Math.round(n * 100) / 100;
        return {
            altBayi: r(landed * (1 + _altBayiMargin / 100)),
            koliBazli: r(landed * (1 + _koliBazliMargin / 100)),
            cokKoli: r(landed * (1 + _cokKoliMargin / 100)),
            palet: r(landed * (1 + _paletMargin / 100)),
        };
    };

    const tedarikciler = await getCachedSuppliers();

    const { data: urunGamiRaw } = await supabase
        .from('urunler')
        .select('urun_gami')
        .not('urun_gami', 'is', null)
        .limit(100);

    const urunGamiOptions: string[] = [
        ...new Set(
            (urunGamiRaw ?? [])
                .map((r) => r.urun_gami)
                .filter((v): v is string => Boolean(v))
        ),
    ].sort();

    // Supabase-Abfrage erstellen (ohne count für Performance)
    let query = supabase
        .from('urunler')
                .select(`
            id,
            ad,
            ana_resim_url,
            stok_kodu,
            stok_miktari,
            stok_esigi,
            satis_fiyati_musteri,
            satis_fiyati_alt_bayi,
            aktif,
            is_bestseller,
            is_featured,
            kategori_id,
            tedarikci_id,
            urun_gami,
            lojistik_sinifi,
            distributor_alis_fiyati,
            kategoriler ( ad )
        `, { count: 'exact' });

    // Kategori-Filter — collect all descendants recursively
    if (kategoriFilter) {
        const getAllDescendantIds = (parentId: string, allKats: typeof allKategoriler): string[] => {
            const children = (allKats ?? []).filter(k => k.ust_kategori_id === parentId);
            return children.flatMap(c => [c.id, ...getAllDescendantIds(c.id, allKats)]);
        };
        const allCategoryIds = [kategoriFilter, ...getAllDescendantIds(kategoriFilter, allKategoriler)];
        query = query.in('kategori_id', allCategoryIds);
    }

    // Status-Filter (aktif/pasif)
    if (durumFilter === 'aktif') {
        query = query.eq('aktif', true);
    } else if (durumFilter === 'pasif') {
        query = query.eq('aktif', false);
    }

    // Stok-Filter
    let kritischMode = false;
    if (stokFilter === 'kritisch') {
        // Phase 1: DB-Filterung für stok_miktari > 0 (Spalten-Vergleich nicht unterstützt)
        query = query.gt('stok_miktari', 0);
        kritischMode = true;
    } else if (stokFilter === 'aufgebraucht') {
        query = query.or('stok_miktari.lte.0,stok_miktari.is.null');
    } else if (stokFilter === 'ausreichend') {
        query = query.gt('stok_miktari', 0);
    }

    // Neue Filter
    if (tedarikciFilter) query = query.eq('tedarikci_id', tedarikciFilter);
    if (urunGamiFilter) query = (query as any).contains('urun_gami', [urunGamiFilter]);
    if (lojistikFilter) query = query.eq('lojistik_sinifi', lojistikFilter);
    if (ozellikFilter) {
        query = query.eq(`teknik_ozellikler->>${ozellikFilter}` as any, 'true');
    }

    // Suchfilter: alle Sprachen (tr, de, en, ar) + stok_kodu + ean_gtin + hersteller_name, Türkçe karakter bağımsız
    if (queryParam) {
        const { buildSupabaseSearchFilter } = await import('@/lib/utils');
        const filterStrings = buildSupabaseSearchFilter(queryParam);
        for (const fs of filterStrings) {
            query = query.or(fs);
        }
    }

    // ─── kritisch: fetch all, filter in JS, then paginate in JS ────────────────
    let urunListesi: UrunWithKategori[] = [];
    let totalCount: number | null = 0;
    let totalPages: number;
    let clampedPage: number;

    if (kritischMode) {
        // Phase 2: Fetch ALL matching rows (no range limit) — acceptable for admin (<1000 products)
        const { data: allRows, error: kritischError } = await query
            .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
            .order(`ad->>de`, { ascending: true, nullsFirst: false });

        if (kritischError) {
            console.error("Fehler beim Laden der Produkte:", kritischError.message);
            return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{content.loadError || 'Produktliste konnte nicht geladen werden.'}</div>;
        }

        // JS-side filter: stok_miktari <= stok_esigi (and > 0 already enforced by DB)
        const filtered = (allRows as any[]).filter(
            (r) => (r.stok_miktari ?? 0) <= (r.stok_esigi ?? 0)
        );

        totalCount = filtered.length;
        totalPages = Math.ceil(totalCount / itemsPerPage);
        clampedPage = Math.min(currentPage, Math.max(1, totalPages));
        const fromK = (clampedPage - 1) * itemsPerPage;
        urunListesi = filtered.slice(fromK, fromK + itemsPerPage) as UrunWithKategori[];
    } else {
        // Original path: DB-based count + pagination
        const { count } = await query;
        totalCount = count;
        totalPages = Math.ceil((totalCount || 0) / itemsPerPage);
        clampedPage = Math.min(currentPage, Math.max(1, totalPages));
        const from = (clampedPage - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;

        // Sortieren und Daten abrufen
        const { data: urunler, error } = await query
             .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
             .order(`ad->>de`, { ascending: true, nullsFirst: false })
             .range(from, to);

        if (error) {
            console.error("Fehler beim Laden der Produkte:", error.message, error.code);
            return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{content.loadError || 'Produktliste konnte nicht geladen werden.'}</div>;
        }

        urunListesi = (urunler as any[]) || [];
    }

    return (
        <div className="space-y-4">
            {/* ─── Compact toolbar ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-baseline gap-2 mr-2">
                    <h1 className="text-lg font-bold text-slate-900">Ürün Yönetimi</h1>
                    <span className="text-sm text-slate-400">
                        {totalCount || 0} ürün
                        {(kategoriFilter || durumFilter || stokFilter || queryParam || tedarikciFilter || urunGamiFilter || lojistikFilter || ozellikFilter) && ' (filtrelenmiş)'}
                    </span>
                </div>

                <UrunFiltre
                    kategoriler={allKategoriler || []}
                    tedarikciler={tedarikciler || []}
                    urunGamiOptions={urunGamiOptions}
                    locale={locale}
                    labels={{
                        searchPlaceholder: 'Ürün adı veya kodu...',
                        searchButton: 'Ara',
                        filterLabel: 'Filtreler:',
                        allCategories: 'Tüm kategoriler',
                        allStatuses: 'Tüm durumlar',
                        allStocks: 'Tüm stoklar',
                        allSuppliers: 'Tüm tedarikçiler',
                        allProductLines: 'Tüm ürün gamları',
                        allLogistics: 'Tüm lojistik',
                        allFeatures: 'Tüm özellikler',
                        statusActiveLabel: 'Aktif',
                        statusInactiveLabel: 'Pasif',
                        stockCriticalLabel: 'Kritik',
                        stockOutLabel: 'Tükendi',
                        stockSufficientLabel: 'Yeterli',
                        clearFilters: 'Sıfırla',
                        active: {
                            searchPrefix: 'Arama:',
                            categoryFiltered: 'Kategori filtreli',
                            statusPrefix: 'Durum:',
                            stockPrefix: 'Stok:',
                            supplierPrefix: 'Tedarikçi:',
                            productLinePrefix: 'Gam:',
                            logisticsPrefix: 'Lojistik:',
                            featurePrefix: 'Özellik:',
                        }
                    }}
                />

                {isAdmin && (
                    <div className="ml-auto flex items-center gap-2">
                        <StokHesaplaButton />
                        <Link href={`/${locale}/admin/urun-yonetimi/toplu-gorsel-yukleme`}>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md text-sm font-semibold shadow-sm hover:bg-slate-50 whitespace-nowrap">
                                <FiArchive size={14} />
                                Toplu Görsel
                            </button>
                        </Link>
                        <Link href={`/${locale}/admin/urun-yonetimi/urunler/yeni`}>
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-md text-sm font-semibold shadow-sm hover:bg-slate-800 whitespace-nowrap">
                                <FiPlus size={14} />
                                Yeni Ürün
                            </button>
                        </Link>
                    </div>
                )}
            </div>

            {/* ─── Export paneli (katlanabilir) ────────────────────────────── */}
            {canImportProducts && (
                <details className="group rounded-xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
                            <FiDownload size={14} />
                            Excel Dışa Aktar
                            <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-900">
                                Tedarikçi &amp; kategori bazında filtreli indirme
                            </span>
                        </div>
                        <span className="text-xs text-emerald-700 group-open:hidden">Aç ▾</span>
                        <span className="hidden text-xs text-emerald-700 group-open:inline">Kapat ▴</span>
                    </summary>
                    <div className="border-t border-emerald-200 px-4 pb-4 pt-3">
                        <UrunExcelExportPanel
                            locale={locale}
                            suppliers={(tedarikciler as Array<{ id: string; unvan: string | null }>) || []}
                            kategoriler={(allKategoriler as Array<{ id: string; ad: unknown; ust_kategori_id: string | null }>) || []}
                        />
                    </div>
                </details>
            )}

            {/* ─── Import paneli (katlanabilir) ────────────────────────────── */}
            {canImportProducts && (
                <details className="group rounded-xl border border-amber-200 bg-amber-50/60 shadow-sm">
                    <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                            Excel / CSV ile Toplu İçe Aktar
                            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                Mevcut ürünleri günceller · Yeni ürün oluşturur · Boş alanlar eski değeri korur
                            </span>
                        </div>
                        <span className="text-xs text-amber-700 group-open:hidden">Aç ▾</span>
                        <span className="hidden text-xs text-amber-700 group-open:inline">Kapat ▴</span>
                    </summary>
                    <div className="border-t border-amber-200 px-4 pb-4 pt-3">
                        <UrunExcelImportPanel
                            locale={locale}
                            suppliers={(tedarikciler as Array<{ id: string; unvan: string | null }>) || []}
                        />
                    </div>
                </details>
            )}

            {/* ─── Ürün tablosu ────────────────────────────────────────────── */}
            {urunListesi.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center shadow-sm">
                    <FiArchive className="mx-auto mb-3 text-4xl text-slate-300" />
                    <p className="text-sm text-slate-500">
                        {(kategoriFilter || durumFilter || stokFilter || queryParam || tedarikciFilter || urunGamiFilter || lojistikFilter || ozellikFilter)
                            ? 'Bu filtrelere uygun ürün bulunamadı.'
                            : 'Henüz ürün eklenmemiş.'}
                    </p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-10 px-3 py-2.5"></th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Ürün</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Kategori</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Gam</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stok</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aktif</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-orange-500" title="Bestseller">🏆</th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-yellow-500" title="Empfohlen">⭐</th>
                                    {canSeePurchasePrice && (
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Alış</th>
                                    )}
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-blue-700">Alt Bayi</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-violet-700">Koli Bazlı</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-emerald-700">5 Koli+</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-orange-600">Palet</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 w-24">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {urunListesi.map((urun) => (
                                    <EditableUrunRowClient
                                        key={urun.id}
                                        urun={urun}
                                        tierPrices={calcTierPrices(urun.distributor_alis_fiyati)}
                                        locale={locale}
                                        content={content}
                                        isAdmin={isAdmin}
                                        canSeePurchasePrice={canSeePurchasePrice}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-t border-slate-100 px-4 py-2">
                        <Pagination
                            currentPage={clampedPage}
                            totalPages={totalPages}
                            totalItems={totalCount || 0}
                            itemsPerPage={itemsPerPage}
                            labels={{
                                prev: content.pagination?.prev || 'Önceki',
                                next: content.pagination?.next || 'Sonraki',
                                showing: content.pagination?.showing || 'Gösterilen',
                                to: content.pagination?.to || '-',
                                of: content.pagination?.of || '/',
                                products: content.pagination?.products || 'ürün'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}