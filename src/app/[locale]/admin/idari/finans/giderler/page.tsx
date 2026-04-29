import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';
import GiderlerYeniClient from './GiderlerYeniClient';

export const dynamic = 'force-dynamic';

function getDateRange(period: string) {
    const now = new Date();
    let start: Date, end: Date;
    switch (period) {
        case 'last-month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end   = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'this-year':
            start = new Date(now.getFullYear(), 0, 1);
            end   = new Date(now.getFullYear(), 11, 31);
            break;
        default: // this-month
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    const fmt = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(start), end: fmt(end) };
}

interface PageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{ period?: string }>;
}

export default async function GiderlerPage({ params, searchParams }: PageProps) {
    noStore();
    const { locale } = await params;
    const sp = searchParams ? await searchParams : {};
    const currentPeriod = (sp.period as string) || 'this-month';

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol ?? '')) {
        return redirect(`/${locale}/admin/dashboard`);
    }

    const { start, end } = getDateRange(currentPeriod);

    // Önceki dönem başlangıcı (karşılaştırma için)
    const prevStart = (() => {
        const now = new Date();
        if (currentPeriod === 'last-month') {
            const s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            const e = new Date(now.getFullYear(), now.getMonth() - 1, 0);
            const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            return { start: f(s), end: f(e) };
        }
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        const f = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return { start: f(s), end: f(e) };
    })();

    const [
        giderlerRes,
        prevGiderlerRes,
        tirRes,
        sablonlarRes,
    ] = await Promise.all([
        supabase
            .from('giderler')
            .select(`
                id, tarih, tutar, aciklama, durum, odeme_sikligi, created_at,
                gider_kalemi_id, islem_yapan_kullanici_id,
                profiller(tam_ad),
                gider_kalemleri(id, ad, ana_kategori_id, gider_ana_kategoriler(ad))
            `)
            .gte('tarih', start)
            .lte('tarih', end)
            .order('tarih', { ascending: false }),

        supabase
            .from('giderler')
            .select('tutar')
            .gte('tarih', prevStart.start)
            .lte('tarih', prevStart.end),

        (supabase as any)
            .from('ithalat_partileri')
            .select('id, referans_kodu, varis_tarihi, navlun_soguk_eur, navlun_kuru_eur, gumruk_vergi_toplam_eur, traces_numune_ardiye_eur, created_at')
            .gte('created_at', `${start}T00:00:00`)
            .lte('created_at', `${end}T23:59:59`)
            .order('created_at', { ascending: false })
            .limit(20),

        (supabase as any)
            .from('gider_sablonlari')
            .select('*')
            .order('created_at', { ascending: false }),
    ]);

    const giderler = (giderlerRes.data ?? []) as any[];
    const prevPeriodToplam = (prevGiderlerRes.data ?? []).reduce((s: number, g: any) => s + Number(g.tutar ?? 0), 0);
    const tirGruplari = (tirRes.data ?? []).map((t: any) => ({
        id: t.id,
        referans_kodu: t.referans_kodu,
        varis_tarihi: t.varis_tarihi,
        navlun_soguk: Number(t.navlun_soguk_eur ?? 0),
        navlun_kuru: Number(t.navlun_kuru_eur ?? 0),
        gumruk: Number(t.gumruk_vergi_toplam_eur ?? 0),
        traces: Number(t.traces_numune_ardiye_eur ?? 0),
        toplam: Number(t.navlun_soguk_eur ?? 0) + Number(t.navlun_kuru_eur ?? 0) + Number(t.gumruk_vergi_toplam_eur ?? 0) + Number(t.traces_numune_ardiye_eur ?? 0),
    }));
    const sablonlar = (sablonlarRes.data ?? []) as any[];

    // Stats hesapla
    const toplam = giderler.reduce((s, g) => s + Number(g.tutar ?? 0), 0);
    const tirToplam = giderler
        .filter((g) => (g as any).kaynak === 'tir')
        .reduce((s, g) => s + Number(g.tutar ?? 0), 0);
    const sabitToplam = giderler
        .filter((g) => (g as any).kaynak === 'sablon')
        .reduce((s, g) => s + Number(g.tutar ?? 0), 0);
    const manuelToplam = toplam - tirToplam - sabitToplam;

    // Kategori dağılımı
    const kategoriMap = new Map<string, number>();
    for (const g of giderler) {
        const kaynak = (g as any).kaynak ?? 'manuel';
        let kat = 'Diğer';
        if (kaynak === 'tir') {
            const aciklama = (g.aciklama ?? '').toLowerCase();
            if (aciklama.includes('navlun')) kat = 'Navlun (TIR)';
            else if (aciklama.includes('gümrük')) kat = 'Gümrük Vergisi';
            else if (aciklama.includes('traces') || aciklama.includes('ardiye')) kat = 'TRACES / Ardiye';
            else kat = 'TIR - Diğer';
        } else {
            kat = (g as any).gider_kalemleri?.gider_ana_kategoriler?.ad ?? 'Diğer';
        }
        kategoriMap.set(kat, (kategoriMap.get(kat) ?? 0) + Number(g.tutar ?? 0));
    }
    const kategoriDagilimi = Array.from(kategoriMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([kategori, tutar]) => ({
            kategori,
            tutar,
            oran: toplam > 0 ? Math.round((tutar / toplam) * 100) : 0,
        }));

    return (
        <GiderlerYeniClient
            giderler={giderler}
            sablonlar={sablonlar}
            tirGruplari={tirGruplari}
            kategoriDagilimi={kategoriDagilimi}
            stats={{ toplam, tirToplam, sabitToplam, manuelToplam }}
            prevPeriodToplam={prevPeriodToplam}
            locale={locale}
            currentPeriod={currentPeriod}
            isAdmin={profile?.rol === 'Yönetici'}
        />
    );
}
