// src/app/[locale]/portal/finanslarim/page.tsx
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';
import { redirect } from 'next/navigation';
import FinanslarimClient from './FinanslarimClient';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
    searchParams?: Promise<{ period?: string }>;
}

function getDateRange(period: string) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    let start: Date, end: Date, prevStart: Date, prevEnd: Date;

    switch (period) {
        case 'last-month':
            start = new Date(y, m - 1, 1);
            end = new Date(y, m, 0);
            prevStart = new Date(y, m - 2, 1);
            prevEnd = new Date(y, m - 1, 0);
            break;
        case 'this-year':
            start = new Date(y, 0, 1);
            end = new Date(y, 11, 31);
            prevStart = new Date(y - 1, 0, 1);
            prevEnd = new Date(y - 1, 11, 31);
            break;
        case 'last-6-months':
            start = new Date(y, m - 5, 1);
            end = new Date(y, m + 1, 0);
            prevStart = new Date(y, m - 11, 1);
            prevEnd = new Date(y, m - 5, 0);
            break;
        default: // this-month
            start = new Date(y, m, 1);
            end = new Date(y, m + 1, 0);
            prevStart = new Date(y, m - 1, 1);
            prevEnd = new Date(y, m, 0);
    }
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { start: fmt(start), end: fmt(end), prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
}

export default async function FinanslarimPage({ params, searchParams }: PageProps) {
    noStore();
    const { locale } = await params;
    const sp = searchParams ? await searchParams : {};
    const period = sp.period || 'this-month';

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (profile?.rol !== 'Alt Bayi' || !profile.firma_id) {
        return redirect(`/${locale}/portal/dashboard`);
    }

    const { start, end, prevStart, prevEnd } = getDateRange(period);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    const sixMonthsStart = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    // Paralel sorgular
    const [
        satislarRes,
        giderlerRes,
        prevSatislarRes,
        prevGiderlerRes,
        trendSatislarRes,
        trendGiderlerRes,
        kategorilerRes,
    ] = await Promise.all([
        (supabase as any).from('alt_bayi_satislar')
            .select('id, created_at, durum, toplam_net, toplam_brut, musteri_id, firmalar:musteri_id(unvan)')
            .eq('bayi_firma_id', profile.firma_id)
            .gte('created_at', `${start}T00:00:00`)
            .lte('created_at', `${end}T23:59:59`)
            .order('created_at', { ascending: false }),

        supabase.from('alt_bayi_giderleri')
            .select('id, tarih, kategori, aciklama, tutar')
            .eq('sahip_id', user.id)
            .gte('tarih', start)
            .lte('tarih', end)
            .order('tarih', { ascending: false }),

        (supabase as any).from('alt_bayi_satislar')
            .select('toplam_net')
            .eq('bayi_firma_id', profile.firma_id)
            .gte('created_at', `${prevStart}T00:00:00`)
            .lte('created_at', `${prevEnd}T23:59:59`),

        supabase.from('alt_bayi_giderleri')
            .select('tutar')
            .eq('sahip_id', user.id)
            .gte('tarih', prevStart)
            .lte('tarih', prevEnd),

        (supabase as any).from('alt_bayi_satislar')
            .select('created_at, toplam_net')
            .eq('bayi_firma_id', profile.firma_id)
            .gte('created_at', `${sixMonthsStart}T00:00:00`),

        supabase.from('alt_bayi_giderleri')
            .select('tarih, tutar, kategori')
            .eq('sahip_id', user.id)
            .gte('tarih', sixMonthsStart),

        supabase.from('alt_bayi_gider_kategorileri')
            .select('ad')
            .eq('sahip_id', user.id)
            .order('olusturulma_tarihi', { ascending: true }),
    ]);

    const satislar = (satislarRes.data ?? []) as any[];
    const giderler = (giderlerRes.data ?? []) as any[];
    const prevSatislar = (prevSatislarRes.data ?? []) as any[];
    const prevGiderler = (prevGiderlerRes.data ?? []) as any[];
    const trendSatislar = (trendSatislarRes.data ?? []) as any[];
    const trendGiderler = (trendGiderlerRes.data ?? []) as any[];
    const customKategoriler = (kategorilerRes.data && !kategorilerRes.error)
        ? (kategorilerRes.data ?? []).map((k: any) => k.ad) as string[]
        : [] as string[];

    // Aylık trend hesapla
    const trendMap = new Map<string, { gelir: number; gider: number }>();
    for (let i = 0; i < 6; i++) {
        const d = new Date(sixMonthsAgo.getFullYear(), sixMonthsAgo.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        trendMap.set(key, { gelir: 0, gider: 0 });
    }
    for (const s of trendSatislar) {
        if (!s.created_at) continue;
        const key = s.created_at.slice(0, 7);
        const ex = trendMap.get(key);
        if (ex) ex.gelir += Number(s.toplam_net || 0);
    }
    for (const g of trendGiderler) {
        if (!g.tarih) continue;
        const key = g.tarih.slice(0, 7);
        const ex = trendMap.get(key);
        if (ex) ex.gider += Number(g.tutar || 0);
    }
    const trendData = Array.from(trendMap.entries()).map(([month, v]) => ({
        month,
        gelir: v.gelir,
        gider: v.gider,
        net: v.gelir - v.gider,
    }));

    // Kategori bazlı gider dağılımı
    const kategoriMap = new Map<string, number>();
    for (const g of giderler) {
        const kat = g.kategori || 'Diğer';
        kategoriMap.set(kat, (kategoriMap.get(kat) ?? 0) + Number(g.tutar || 0));
    }
    const giderToplam = Array.from(kategoriMap.values()).reduce((s, v) => s + v, 0);
    const kategoriDagilimi = Array.from(kategoriMap.entries())
        .map(([kategori, tutar]) => ({
            kategori,
            tutar,
            oran: giderToplam > 0 ? Math.round((tutar / giderToplam) * 100) : 0,
        }))
        .sort((a, b) => b.tutar - a.tutar);

    // Toplam hesaplamalar
    const gelirToplam = satislar.reduce((s, r: any) => s + Number(r.toplam_net || 0), 0);
    const netKar = gelirToplam - giderToplam;
    const prevGelir = prevSatislar.reduce((s, r: any) => s + Number(r.toplam_net || 0), 0);
    const prevGider = prevGiderler.reduce((s, r: any) => s + Number(r.tutar || 0), 0);
    const prevNet = prevGelir - prevGider;

    const gelirDelta = prevGelir > 0 ? Math.round(((gelirToplam - prevGelir) / prevGelir) * 100) : null;
    const giderDelta = prevGider > 0 ? Math.round(((giderToplam - prevGider) / prevGider) * 100) : null;
    const netDelta = prevNet !== 0 ? Math.round(((netKar - prevNet) / Math.abs(prevNet)) * 100) : null;

    // Top 5 müşteri (toplam ciroya göre)
    const musteriMap = new Map<string, { unvan: string; toplam: number; sayi: number }>();
    for (const s of satislar) {
        const key = s.musteri_id;
        if (!key) continue;
        const ex = musteriMap.get(key) || { unvan: s.firmalar?.unvan || 'Müşteri', toplam: 0, sayi: 0 };
        ex.toplam += Number(s.toplam_net || 0);
        ex.sayi += 1;
        musteriMap.set(key, ex);
    }
    const topMusteriler = Array.from(musteriMap.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.toplam - a.toplam)
        .slice(0, 5);

    return (
        <FinanslarimClient
            satislar={satislar}
            giderler={giderler}
            trendData={trendData}
            kategoriDagilimi={kategoriDagilimi}
            topMusteriler={topMusteriler}
            stats={{
                gelirToplam, giderToplam, netKar,
                prevGelir, prevGider, prevNet,
                gelirDelta, giderDelta, netDelta,
            }}
            customKategoriler={customKategoriler}
            period={period}
            locale={locale}
        />
    );
}
