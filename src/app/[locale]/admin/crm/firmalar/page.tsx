// src/app/[locale]/admin/crm/firmalar/page.tsx
import React, { Suspense } from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { KOLN_PLZ_MAP } from '@/lib/plzLookup';
import FirmaListClient from './FirmaListClient';
import { matchesAnyField, matchesSearch } from '@/lib/searchUtils';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

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
        bayi_firma_id?: string;
        temassiz?: string;
        kaynak?: string;
        portal_status?: string;
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

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const ticariTipFilter = sp.ticari_tip || '';
    const isAltBayiList = ticariTipFilter === 'alt_bayi';
    const bayiFirmaIdFilter = sp.bayi_firma_id || '';
    const searchQuery = sp.q || '';
    const statusFilterRaw = sp.status;
    const statusFilter = statusFilterRaw === undefined
        ? (isAltBayiList || bayiFirmaIdFilter ? '' : 'MÜŞTERİ')
        : (statusFilterRaw === 'ALL' ? '' : statusFilterRaw);
    const statusNotInFilter = sp.status_not_in?.split(',') || [];
    const kategoriFilter = sp.kategori || '';
    const cityFilter = sp.city || '';
    const districtFilter = sp.district || '';
    const plzFilter = sp.posta_kodu || '';
    const temassizFilter = sp.temassiz === '1';
    const kaynakFilter = sp.kaynak || '';
    const portalStatusFilter = sp.portal_status || '';

    let supabaseAdmin: ReturnType<typeof createSupabaseServiceClient> | null = null;
    try {
        supabaseAdmin = createSupabaseServiceClient();
    } catch {
        supabaseAdmin = null;
    }

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

    const [locationRes, portalProfilesRes, altBayilerRes, subCustomersRes] = await Promise.all([
        locationQuery,
        (supabaseAdmin ?? supabase)
            .from('profiller')
            .select('id, firma_id, tam_ad, rol')
            .not('firma_id', 'is', null),
        supabase
            .from('firmalar')
            .select('id, unvan')
            .or('ticari_tip.eq.alt_bayi,kategori.eq.Alt Bayi')
            .order('unvan', { ascending: true }),
        (supabase as any)
            .from('firmalar')
            .select('ust_bayi_firma_id')
            .not('ust_bayi_firma_id', 'is', null),
    ]);

    const locationData = locationRes.data;
    const allPortalProfiles = portalProfilesRes.data || [];
    const altBayiler = altBayilerRes.data || [];
    const altBayiMap = new Map(altBayiler.map(b => [b.id, b.unvan]));

    // Bayi bazlı müşteri sayıları
    const subCustomerCountMap = new Map<string, number>();
    for (const row of (subCustomersRes.data || []) as any[]) {
        if (!row.ust_bayi_firma_id) continue;
        const count = subCustomerCountMap.get(row.ust_bayi_firma_id) || 0;
        subCustomerCountMap.set(row.ust_bayi_firma_id, count + 1);
    }

    // Fetch Auth users for last_sign_in_at
    const authUserMap = new Map<string, { last_sign_in_at: string | null; email: string | null }>();
    if (supabaseAdmin) {
        try {
            const { data: authUsersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
            if (authUsersData?.users) {
                for (const u of authUsersData.users) {
                    authUserMap.set(u.id, {
                        last_sign_in_at: u.last_sign_in_at ?? null,
                        email: u.email ?? null,
                    });
                }
            }
        } catch (err) {
            console.error('Portal auth users could not be fetched:', err);
        }
    }

    // Map profiles by firma_id
    const profilesByFirma = new Map<string, any[]>();
    for (const p of allPortalProfiles) {
        if (!p.firma_id) continue;
        const list = profilesByFirma.get(p.firma_id) || [];
        list.push(p);
        profilesByFirma.set(p.firma_id, list);
    }

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

    // Helper to calculate portal state for a firma
    const getFirmaPortalInfo = (fId: string) => {
        const pList = profilesByFirma.get(fId) || [];
        if (pList.length === 0) {
            return { portal_status: 'none' as const, portal_last_sign_in_at: null, portal_user_count: 0 };
        }
        let latestLogin: string | null = null;
        for (const p of pList) {
            const authInfo = authUserMap.get(p.id);
            if (authInfo?.last_sign_in_at) {
                if (!latestLogin || new Date(authInfo.last_sign_in_at) > new Date(latestLogin)) {
                    latestLogin = authInfo.last_sign_in_at;
                }
            }
        }
        if (latestLogin) {
            return { portal_status: 'active' as const, portal_last_sign_in_at: latestLogin, portal_user_count: pList.length };
        }
        return { portal_status: 'pending' as const, portal_last_sign_in_at: null, portal_user_count: pList.length };
    };

    // --- Summary stats (global, unfiltered) ---
    let allFirmalar: any[] = [];
    let summaryPage = 0;
    while (true) {
        const { data } = await supabase
            .from('firmalar')
            .select('id, status, son_etkilesim_tarihi, created_at, goruldu, kaynak')
            .range(summaryPage * 1000, (summaryPage + 1) * 1000 - 1);
        if (!data) break;
        allFirmalar.push(...data);
        if (data.length < 1000) break;
        summaryPage++;
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 86400000;
    const thirtyDaysAgo = now - 30 * 86400000;

    let portalAktifCount = 0;
    let portalPendingCount = 0;
    let portalYokCount = 0;

    for (const f of allFirmalar) {
        const info = getFirmaPortalInfo(f.id);
        if (info.portal_status === 'active') portalAktifCount++;
        else if (info.portal_status === 'pending') portalPendingCount++;
        else portalYokCount++;
    }

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
        gorulmemisWebBasvuru: allFirmalar?.filter(f =>
            f.goruldu === false &&
            (f.kaynak || '').toLowerCase() === 'web' &&
            ['ADAY', 'TEMAS EDİLDİ', 'NUMUNE VERİLDİ'].includes(f.status || '')
        ).length ?? 0,
        portalAktif: portalAktifCount,
        portalPending: portalPendingCount,
        portalYok: portalYokCount,
    };

    // --- Main filtered query ---
    let query = supabase
        .from('firmalar')
        .select(`
            id, unvan, status, kategori, sehir, ilce, posta_kodu,
            telefon, adres, son_etkilesim_tarihi, oncelik_puani, oncelik, etiketler,
            kaynak, goruldu, created_at, parent_firma_id, instagram_url, google_maps_url,
            yetkili_kisi, ust_bayi_firma_id,
            sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
        `);

    // Diakritik-duyarsız arama: searchQuery & cityFilter & districtFilter
    if (statusFilter) {
        const mapped = canonicalize(statusFilter);
        if (mapped) query = query.eq('status', mapped as any);
    }
    if (statusNotInFilter.length > 0) {
        const mapped = statusNotInFilter.map(canonicalize).filter(Boolean);
        if (mapped.length > 0) {
            const list = mapped.map(v => `"${v}"`).join(',');
            query = query.not('status', 'in', `(${list})`);
        }
    }
    if (kategoriFilter) query = query.eq('kategori', kategoriFilter);
    if (plzFilter) query = query.eq('posta_kodu', plzFilter);
    if (temassizFilter) {
        const cutoff = new Date(thirtyDaysAgo).toISOString();
        query = query.or(`son_etkilesim_tarihi.is.null,son_etkilesim_tarihi.lt.${cutoff}`);
    }
    if (kaynakFilter === 'web') {
        query = query.eq('kaynak', 'Web').eq('goruldu', false);
    }

    if (ticariTipFilter) {
        query = query.eq('ticari_tip', ticariTipFilter);
    } else {
        query = query
            .or('ticari_tip.eq.musteri,ticari_tip.is.null')
            .or('kategori.neq.Alt Bayi,kategori.is.null');
    }

    if (bayiFirmaIdFilter === 'merkez') {
        query = query.is('ust_bayi_firma_id', null);
    } else if (bayiFirmaIdFilter) {
        query = query.eq('ust_bayi_firma_id', bayiFirmaIdFilter);
    }

    const orderedQuery = query.order('created_at', { ascending: false });
    let rawFirmalar: any[] = [];
    let queryError: any = null;
    let mainPage = 0;
    while (true) {
        const { data, error } = await orderedQuery.range(mainPage * 1000, (mainPage + 1) * 1000 - 1);
        if (error) {
            queryError = error;
            break;
        }
        if (!data) break;
        rawFirmalar.push(...data);
        if (data.length < 1000) break;
        mainPage++;
    }

    if (queryError) {
        return (
            <div className="p-6 text-red-500 bg-red-50 rounded-lg">
                Firma listesi yüklenemedi: {queryError.message}
            </div>
        );
    }

    // Attach portal information and sub-dealer info to each firm
    let firmalar = (rawFirmalar || []).map((f: any) => {
        const pInfo = getFirmaPortalInfo(f.id);
        const ustBayiUnvan = f.ust_bayi_firma_id ? altBayiMap.get(f.ust_bayi_firma_id) : null;
        return {
            ...f,
            ...pInfo,
            ust_bayi: ustBayiUnvan ? { id: f.ust_bayi_firma_id, unvan: ustBayiUnvan } : null,
            bagli_musteri_sayisi: subCustomerCountMap.get(f.id) || 0,
        };
    }).sort((a, b) => {
        if (a.status === 'REDDEDİLDİ' && b.status !== 'REDDEDİLDİ') return 1;
        if (a.status !== 'REDDEDİLDİ' && b.status === 'REDDEDİLDİ') return -1;
        return 0;
    });

    // Portal Status Filter
    if (portalStatusFilter) {
        firmalar = firmalar.filter((f: any) => f.portal_status === portalStatusFilter);
    }

    // Diakritik-duyarsız (ı/i, ş/s, ö/o, ü/u, ç/c, ğ/g, ß/ss, ä/a ...) JS-side filtreleme
    if (searchQuery || cityFilter || districtFilter) {
        firmalar = firmalar.filter((f: any) => {
            if (searchQuery && !matchesAnyField([f.unvan, f.adres, f.sehir, f.ilce, f.yetkili_kisi], searchQuery)) return false;
            if (cityFilter && !matchesSearch(f.sehir, cityFilter)) return false;
            if (districtFilter && !matchesSearch(f.ilce, districtFilter)) return false;
            return true;
        });
    }

    const hasLocationFilter = !!(cityFilter || districtFilter || plzFilter);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-slate-800">
                    {isAltBayiList ? 'Alt Bayiler' : 'Firma Yönetimi (CRM)'}
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                    Müşteri adaylarını, aktif müşterileri, portal kullanımını ve temas geçmişini yönetin.
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
                    currentPortalStatus={portalStatusFilter}
                    temassizActive={temassizFilter}
                    hasLocationFilter={hasLocationFilter}
                    kaynakFilter={kaynakFilter}
                    cityOptions={uniqueCities}
                    districtOptions={uniqueDistricts}
                    zipCodeOptions={uniqueZipCodes}
                    zipCodeLabels={plzLabels}
                    categoryOptions={uniqueCategories}
                    bayiOptions={altBayiler}
                    currentBayiFirmaId={bayiFirmaIdFilter}
                />
            </Suspense>
        </div>
    );
}
