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

    // Benutzer prüfen
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }
     // Rollenprüfung
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
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
    const currentPage = Math.max(1, Number.parseInt(sp?.page || '1') || 1);
    const itemsPerPage = 50;

    // Get all categories for filter
    const { data: allKategoriler } = await supabase
        .from('kategoriler')
        .select('id, ad, ust_kategori_id')
        .order(`ad->>${locale}`, { ascending: true });

    const { data: tedarikciler } = await supabase
        .from('tedarikciler')
        .select('id, unvan')
        .order('unvan', { ascending: true })
        .limit(1000);

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
            kategori_id,
            distributor_alis_fiyati,
            kategoriler ( ad )
        `, { count: 'exact' });

    // Kategori-Filter
    if (kategoriFilter) {
        // Get subcategories of selected category
        const subcatIds = allKategoriler
            ?.filter(k => k.ust_kategori_id === kategoriFilter)
            .map(k => k.id) || [];
        
        const allCategoryIds = [kategoriFilter, ...subcatIds];
        query = query.in('kategori_id', allCategoryIds);
    }

    // Status-Filter (aktif/pasif)
    if (durumFilter === 'aktif') {
        query = query.eq('aktif', true);
    } else if (durumFilter === 'pasif') {
        query = query.eq('aktif', false);
    }

    // Stok-Filter
    if (stokFilter === 'kritisch') {
        // Products where stock <= threshold AND stock > 0
        query = query.or('and(stok_miktari.lte.stok_esigi,stok_miktari.gt.0)');
    } else if (stokFilter === 'aufgebraucht') {
        query = query.or('stok_miktari.lte.0,stok_miktari.is.null');
    } else if (stokFilter === 'ausreichend') {
        query = query.gt('stok_miktari', 0);
    }

    // Suchfilter: alle Sprachen (tr, de, en, ar) + stok_kodu, Türkçe karakter bağımsız
    if (queryParam) {
        const { buildSupabaseSearchFilter } = await import('@/lib/utils');
        query = query.or(buildSupabaseSearchFilter(queryParam));
    }

    // Count total for pagination
    const { count: totalCount } = await query;
    const totalPages = Math.ceil((totalCount || 0) / itemsPerPage);
    const clampedPage = Math.min(currentPage, Math.max(1, totalPages));

    // Apply pagination
    const from = (clampedPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Sortieren und Daten abrufen
    const { data: urunler, error } = await query
         .order(`ad->>${locale}`, { ascending: true, nullsFirst: false })
         .order(`ad->>de`, { ascending: true, nullsFirst: false }) // Fallback-Sortierung
         .range(from, to);

    if (error) {
        console.error("Fehler beim Laden der Produkte:", error);
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{content.loadError || 'Produktliste konnte nicht geladen werden. Details in Server-Logs.'}</div>;
    }

    const urunListesi: UrunWithKategori[] = (urunler as any[]) || [];

    return (
        <div className="space-y-4">
            {/* ─── Compact toolbar ─────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex items-baseline gap-2 mr-2">
                    <h1 className="text-lg font-bold text-slate-900">Ürün Yönetimi</h1>
                    <span className="text-sm text-slate-400">
                        {totalCount || 0} ürün
                        {(kategoriFilter || durumFilter || stokFilter || queryParam) && ' (filtrelenmiş)'}
                    </span>
                </div>

                <UrunFiltre
                    kategoriler={allKategoriler || []}
                    locale={locale}
                    labels={{
                        searchPlaceholder: 'Ürün adı veya kodu...',
                        searchButton: 'Ara',
                        filterLabel: 'Filtreler:',
                        allCategories: 'Tüm kategoriler',
                        allStatuses: 'Tüm durumlar',
                        allStocks: 'Tüm stoklar',
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
                        {(kategoriFilter || durumFilter || stokFilter || queryParam)
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
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Stok</th>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Aktif</th>
                                    {canSeePurchasePrice && (
                                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Alış</th>
                                    )}
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-emerald-700">Kafe</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-blue-700">Alt Bayi</th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 w-24">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {urunListesi.map((urun) => (
                                    <EditableUrunRowClient
                                        key={urun.id}
                                        urun={urun}
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