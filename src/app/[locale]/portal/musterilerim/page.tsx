// src/app/[locale]/portal/musterilerim/page.tsx
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { KOLN_PLZ_MAP } from '@/lib/plzLookup';
import FirmaListClient from '@/app/[locale]/admin/crm/firmalar/FirmaListClient';
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

export default async function PortalMusterilerimPage({ params, searchParams }: PageProps) {
    noStore();
    const { locale } = await params;
    const sp = searchParams ? await searchParams : {};

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id) return redirect(`/${locale}/portal/dashboard`);
    const bayiFirmaId = profile.firma_id;

    const searchQuery = sp.q || '';
    const statusFilterRaw = sp.status;
    const statusFilter = statusFilterRaw === undefined || statusFilterRaw === 'ALL'
        ? ''
        : statusFilterRaw;
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

    // Alt bayinin bağlı müşterilerini çek (Kendisini hariç tut!)
    const [rawCustomersRes, portalProfilesRes] = await Promise.all([
        (supabase as any)
            .from('firmalar')
            .select(`
                *,
                sorumlu_personel:profiller!firmalar_sorumlu_personel_id_fkey(tam_ad)
            `)
            .neq('id', bayiFirmaId)
            .not('kategori', 'eq', 'Alt Bayi')
            .or(`ust_bayi_firma_id.eq.${bayiFirmaId},sahip_id.eq.${user.id}`)
            .order('unvan', { ascending: true }),

        (supabase as any).from('profiller').select('id, firma_id, rol')
    ]);

    const rawList = (rawCustomersRes.data || []) as any[];

    // Tekilleştirme (Deduping)
    const uniqueMap = new Map<string, any>();
    rawList.forEach(c => {
        if (!uniqueMap.has(c.id)) {
            uniqueMap.set(c.id, c);
        }
    });
    const uniqueCustomers = Array.from(uniqueMap.values());

    // Portal Durumu Eşleştirmesi
    const portalProfiles = (portalProfilesRes.data || []) as Array<{
        id: string;
        firma_id: string | null;
        rol: string | null;
    }>;

    const portalMap = new Map<string, { count: number }>();
    portalProfiles.forEach(p => {
        if (!p.firma_id) return;
        const curr = portalMap.get(p.firma_id) || { count: 0 };
        curr.count += 1;
        portalMap.set(p.firma_id, curr);
    });

    const enrichedList = uniqueCustomers.map(f => {
        const portalInfo = portalMap.get(f.id);
        const hasPortal = Boolean(portalInfo && portalInfo.count > 0);
        return {
            ...f,
            portal_status: hasPortal ? ('active' as const) : ('none' as const),
            portal_user_count: portalInfo?.count || 0,
        };
    });

    // İstatistikler (Summary Stats)
    const now = Date.now();
    const startOfWeek = new Date();
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);

    const summary = {
        toplam: enrichedList.length,
        musteri: enrichedList.filter(f => canonicalize(f.status || '') === 'MÜŞTERİ').length,
        numune: enrichedList.filter(f => canonicalize(f.status || '') === 'NUMUNE VERİLDİ').length,
        temassiz30: enrichedList.filter(f => {
            if (!f.son_etkilesim_tarihi) return true;
            return (now - new Date(f.son_etkilesim_tarihi).getTime()) > 30 * 86400000;
        }).length,
        buHaftaYeni: enrichedList.filter(f => f.created_at && new Date(f.created_at) >= startOfWeek).length,
        gorulmemisWebBasvuru: 0,
        portalAktif: enrichedList.filter(f => f.portal_status === 'active').length,
        portalPending: enrichedList.filter(f => f.portal_status === 'pending').length,
        portalYok: enrichedList.filter(f => f.portal_status === 'none').length,
    };

    // Filtreleme
    let filtered = enrichedList;

    if (searchQuery) {
        filtered = filtered.filter(f => matchesAnyField([f.unvan, f.adres, f.sehir, f.ilce, f.telefon, f.yetkili_kisi], searchQuery));
    }
    if (statusFilter) {
        filtered = filtered.filter(f => canonicalize(f.status || '') === statusFilter);
    }
    if (statusNotInFilter.length > 0) {
        filtered = filtered.filter(f => !statusNotInFilter.includes(canonicalize(f.status || '')));
    }
    if (kategoriFilter) {
        filtered = filtered.filter(f => (f.kategori || '').toLowerCase() === kategoriFilter.toLowerCase());
    }
    if (cityFilter) {
        filtered = filtered.filter(f => matchesSearch(f.sehir, cityFilter));
    }
    if (districtFilter) {
        filtered = filtered.filter(f => matchesSearch(f.ilce, districtFilter));
    }
    if (plzFilter) {
        filtered = filtered.filter(f => (f.posta_kodu || '').startsWith(plzFilter));
    }
    if (temassizFilter) {
        filtered = filtered.filter(f => !f.son_etkilesim_tarihi || (now - new Date(f.son_etkilesim_tarihi).getTime()) > 30 * 86400000);
    }
    if (portalStatusFilter) {
        filtered = filtered.filter(f => f.portal_status === portalStatusFilter);
    }

    // Dropdown seçenekleri
    const cityOptions = Array.from(new Set(enrichedList.map(f => f.sehir?.trim()).filter(Boolean))).sort() as string[];
    const districtOptions = Array.from(new Set(enrichedList.map(f => f.ilce?.trim()).filter(Boolean))).sort() as string[];
    const zipCodeOptions = Array.from(new Set(enrichedList.map(f => f.posta_kodu?.trim()).filter(Boolean))).sort() as string[];
    const categoryOptions = Array.from(new Set(enrichedList.map(f => f.kategori?.trim()).filter(Boolean))).sort() as string[];

    const zipCodeLabels: Record<string, string> = {};
    Object.entries(KOLN_PLZ_MAP).forEach(([plz, data]) => {
        zipCodeLabels[plz] = `${plz} - ${data.district}`;
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <span>👥</span> Müşteri & Portföy Yönetimi
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Bölgenizdeki tüm kayıtlı restoran, kafe ve potansiyel işletmeler
                    </p>
                </div>
            </div>

            <FirmaListClient
                firmalar={filtered}
                summary={summary}
                locale={locale}
                isAltBayiList={false}
                currentStatus={statusFilter}
                currentKategori={kategoriFilter}
                currentCity={cityFilter}
                currentDistrict={districtFilter}
                currentPlz={plzFilter}
                currentPortalStatus={portalStatusFilter}
                temassizActive={temassizFilter}
                hasLocationFilter={!!(cityFilter || districtFilter || plzFilter)}
                kaynakFilter={kaynakFilter}
                cityOptions={cityOptions}
                districtOptions={districtOptions}
                zipCodeOptions={zipCodeOptions}
                zipCodeLabels={zipCodeLabels}
                categoryOptions={categoryOptions}
                baseDetailPath={`/${locale}/portal/musterilerim`}
                newCustomerPath={`/${locale}/portal/musterilerim/yeni`}
            />
        </div>
    );
}
