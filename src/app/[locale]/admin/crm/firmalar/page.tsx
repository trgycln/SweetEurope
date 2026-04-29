// src/app/[locale]/admin/crm/firmalar/page.tsx
import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { KOLN_PLZ_MAP } from '@/lib/plzLookup';
import FirmaListClient from './FirmaListClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{
        q?: string;
        status?: string;
        status_not_in?: string;
        kategori?: string;
        city?: string;
        district?: string;
        posta_kodu?: string;
        ticari_tip?: string;
        temassiz?: string;
    }>;
}

const STATUS_CANONICAL_MAP: Record<string, string> = {
    'aday': 'ADAY', 'isitiliyor': 'ADAY', 'ısıtılıyor': 'ADAY',
    'takipte': 'ADAY', 'iletisimde': 'ADAY', 'iletişimde': 'ADAY',
    'potansiyel': 'ADAY', 'temas edildi': 'TEMAS EDİLDİ',
    'temas kuruldu': 'TEMAS EDİLDİ', 'numune verildi': 'NUMUNE VERİLDİ',
    'müşteri': 'MÜŞTERİ', 'musteri': 'MÜŞTERİ',
    'reddedildi': 'REDDEDİLDİ', 'pasif': 'REDDEDİLDİ',
    'ADAY': 'ADAY', 'TEMAS EDİLDİ': 'TEMAS EDİLDİ',
    'NUMUNE VERİLDİ': 'NUMUNE VERİLDİ', 'MÜŞTERİ': 'MÜŞTERİ',
    'REDDEDİLDİ': 'REDDEDİLDİ',
};

function canonicalize(value: string) {
    const key = value.trim();
    return STATUS_CANONICAL_MAP[key] || STATUS_CANONICAL_MAP[key.toLocaleLowerCase('tr-TR')] || '';
}

export default async function FirmalarListPage({ params, searchParams }: PageProps) {
    noStore();
    const { locale } = await params;
    const sp = searchParams ? await searchParams : {};

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const ticariTipFilter = sp.ticari_tip || '';
    const isAltBayiList = ticariTipFilter === 'alt_bayi';
    const searchQuery = sp.q || '';
    const statusFilter = sp.status || '';
    const statusNotInFilter = sp.status_not_in?.split(',') || [];
    const kategoriFilter = sp.kategori || '';
    const cityFilter = sp.city || '';
    const districtFilter = sp.district || '';
    const plzFilter = sp.posta_kodu || '';
    const temassizFilter = sp.temassiz === '1';

    // --- Location options for dropdowns ---
    let locationQuery = supabase
        .from('firmalar')
        .select('sehir, ilce, posta_kodu, kategori');

    if (ticariTipFilter) {
        locationQuery = locationQuery.eq('ticari_tip', ticariTipFilter);
    } else {
        locationQuery = locationQuery
            .or('ticari_tip.eq.musteri,ticari_tip.is.null')
            .not('kategori', 'eq', 'Alt Bayi');
    }

    const { data: locationData } = await locationQuery;

    const uniqueCities = Array.from(new Set(locationData?.map(f => f.sehir?.trim()).filter(Boolean))).sort() as string[];
    const uniqueDistricts = Array.from(new Set(locationData?.map(f => f.ilce?.trim()).filter(Boolean))).sort() as string[];
    const uniqueZipCodes = Array.from(new Set(locationData?.map(f => f.posta_kodu?.trim()).filter(Boolean))).sort() as string[];
    const uniqueCategories = Array.from(new Set(locationData?.map(f => f.kategori?.trim()).filter(Boolean))).sort() as string[];

    // Build PLZ label map (static Köln data + DB data)
    const plzLabels: Record<string, string> = {};
    Object.entries(KOLN_PLZ_MAP).forEach(([plz, data]) => {
        plzLabels[plz] = `${plz} – ${data.district}`;
    });
    locationData?.forEach(f => {
        const zip = f.posta_kodu?.trim();
        if (zip && !plzLabels[zip]) {
            const loc = f.ilce?.trim() || f.sehir?.trim() || '';
            plzLabels[zip] = loc ? `${zip} – ${loc}` : zip;
        }
    });

    // --- Summary stats (global, unfiltered) ---
    const { data: allFirmalar } = await supabase
        .from('firmalar')
        .select('id, status, son_etkilesim_tarihi, created_at');

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const thirtyDaysAgo = now - 30 * 86400000;

    const summary = {
        toplam: allFirmalar?.length ?? 0,
        musteri: allFirmalar?.filter(f => f.status === 'MÜŞTERİ').length ?? 0,
        numune: allFirmalar?.filter(f => f.status === 'NUMUNE VERİLDİ').length ?? 0,
        temassiz30: allFirmalar?.filter(f => {
            const d = f.son_etkilesim_tarihi ? new Date(f.son_etkilesim_tarihi).getTime() : 0;
            return !d || d < thirtyDaysAgo;
        }).length ?? 0,
        buHaftaYeni: allFirmalar?.filter(f => {
            const d = f.created_at ? new Date(f.created_at).getTime() : 0;
            return d > sevenDaysAgo;
        }).length ?? 0,
    };

    // --- Main filtered query ---
    let query = supabase
        .from('firmalar')
        .select(`
            id, unvan, status, kategori, sehir, ilce, posta_kodu,
            telefon, adres, son_etkilesim_tarihi, oncelik_puani, oncelik, etiketler,
            kaynak, created_at, parent_firma_id, instagram_url, google_maps_url,
            yetkili_kisi,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `);

    if (searchQuery) {
        const esc = searchQuery.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
        query = query.or(`unvan.ilike.%${esc}%,adres.ilike.%${esc}%`);
    }
    if (statusFilter) {
        const mapped = canonicalize(statusFilter);
        if (mapped) query = query.eq('status', mapped);
    }
    if (statusNotInFilter.length > 0) {
        const mapped = statusNotInFilter.map(canonicalize).filter(Boolean);
        if (mapped.length > 0) {
            const list = mapped.map(v => `"${v}"`).join(',');
            query = query.not('status', 'in', `(${list})`);
        }
    }
    if (kategoriFilter) query = query.eq('kategori', kategoriFilter);
    if (cityFilter) query = query.ilike('sehir', `%${cityFilter}%`);
    if (districtFilter) query = query.ilike('ilce', `%${districtFilter}%`);
    if (plzFilter) query = query.eq('posta_kodu', plzFilter);
    if (temassizFilter) {
        const cutoff = new Date(thirtyDaysAgo).toISOString();
        query = query.or(`son_etkilesim_tarihi.is.null,son_etkilesim_tarihi.lt.${cutoff}`);
    }

    if (ticariTipFilter) {
        query = query.eq('ticari_tip', ticariTipFilter);
    } else {
        query = query
            .or('ticari_tip.eq.musteri,ticari_tip.is.null')
            .not('kategori', 'eq', 'Alt Bayi')
            .is('sahip_id', null);
    }

    const { data: rawFirmalar, error } = await query.order('created_at', { ascending: false });

    if (error) {
        return (
            <div className="p-6 text-red-500 bg-red-50 rounded-lg">
                Firma listesi yüklenemedi: {error.message}
            </div>
        );
    }

    const firmalar = (rawFirmalar || []).sort((a, b) => {
        if (a.status === 'REDDEDİLDİ' && b.status !== 'REDDEDİLDİ') return 1;
        if (a.status !== 'REDDEDİLDİ' && b.status === 'REDDEDİLDİ') return -1;
        return 0;
    });

    const hasLocationFilter = !!(cityFilter || districtFilter || plzFilter);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-800">
                    {isAltBayiList ? 'Alt Bayiler' : 'Firma Yönetimi (CRM)'}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Müşteri adaylarını, aktif müşterileri ve temas geçmişini yönetin.
                </p>
            </header>

            <Suspense>
                <FirmaListClient
                    firmalar={firmalar as any}
                    summary={summary}
                    locale={locale}
                    isAltBayiList={isAltBayiList}
                    currentStatus={statusFilter}
                    currentKategori={kategoriFilter}
                    currentCity={cityFilter}
                    currentDistrict={districtFilter}
                    currentPlz={plzFilter}
                    temassizActive={temassizFilter}
                    hasLocationFilter={hasLocationFilter}
                    cityOptions={uniqueCities}
                    districtOptions={uniqueDistricts}
                    zipCodeOptions={uniqueZipCodes}
                    zipCodeLabels={plzLabels}
                    categoryOptions={uniqueCategories}
                />
            </Suspense>
        </div>
    );
}
