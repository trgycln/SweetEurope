import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiArrowLeft, FiTrendingUp, FiPackage, FiExternalLink,
    FiShoppingCart, FiAward, FiRepeat, FiHeart,
} from 'react-icons/fi';
import { HesapOzetTrend } from '@/components/portal/hesap-ozetim/HesapOzetTrend';
import { getPortalLabels, formatCurrency, formatLocaleDate } from '@/lib/portalLabels';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

// Tier hesabı
function calcTier(yearTotal: number, locale: string) {
    const tiers = [
        { min: 50000, label: { de: 'Platin', tr: 'Platin' }, color: 'from-violet-500 to-fuchsia-600', emoji: '💎' },
        { min: 20000, label: { de: 'Gold', tr: 'Altın' }, color: 'from-amber-500 to-orange-500', emoji: '🥇' },
        { min: 8000,  label: { de: 'Silber', tr: 'Gümüş' }, color: 'from-slate-400 to-slate-500', emoji: '🥈' },
        { min: 2000,  label: { de: 'Bronze', tr: 'Bronz' }, color: 'from-orange-700 to-amber-800', emoji: '🥉' },
        { min: 0,     label: { de: 'Neu', tr: 'Yeni' }, color: 'from-slate-300 to-slate-400', emoji: '🌱' },
    ];
    const thresholds = [2000, 8000, 20000, 50000];
    const current = tiers.find(t => yearTotal >= t.min) || tiers[tiers.length - 1];
    const nextThreshold = thresholds.find(t => t > yearTotal) ?? null;
    return { ...current, nextThreshold };
}

export default async function HesapOzetimPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id) return redirect(`/${locale}/portal/dashboard`);

    const fmt = (v: number | null | undefined) => formatCurrency(v, locale, { maximumFractionDigits: 2 });

    const now = new Date();
    const yearStart = `${now.getFullYear()}-01-01`;
    const prevYearStart = `${now.getFullYear() - 1}-01-01`;
    const prevYearEnd = `${now.getFullYear() - 1}-12-31`;
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const twelveMonthsAgoStr = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    const [
        firmaRes,
        finansalRes,
        siparislerYilRes,
        siparislerOncekYilRes,
        siparisler12AyRes,
        enCokAlinanRes,
        sonSiparislerRes,
        favoriSayisiRes,
    ] = await Promise.all([
        supabase.from('firmalar')
            .select('unvan, created_at')
            .eq('id', profile.firma_id)
            .single(),

        (supabase as any).from('firmalar_finansal')
            .select('ozel_indirim_orani')
            .eq('firma_id', profile.firma_id)
            .maybeSingle(),

        supabase.from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net, toplam_tutar_brut')
            .eq('firma_id', profile.firma_id)
            .gte('siparis_tarihi', yearStart)
            .order('siparis_tarihi', { ascending: false }),

        supabase.from('siparisler')
            .select('toplam_tutar_net')
            .eq('firma_id', profile.firma_id)
            .gte('siparis_tarihi', prevYearStart)
            .lte('siparis_tarihi', prevYearEnd),

        supabase.from('siparisler')
            .select('siparis_tarihi, toplam_tutar_net')
            .eq('firma_id', profile.firma_id)
            .gte('siparis_tarihi', twelveMonthsAgoStr),

        // En çok alınan ürünler
        (supabase as any).rpc('get_hizli_siparis_urunleri', {
            p_firma_id: profile.firma_id
        }),

        // Son 5 sipariş
        supabase.from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net')
            .eq('firma_id', profile.firma_id)
            .order('siparis_tarihi', { ascending: false })
            .limit(5),

        // Favori sayısı
        supabase.from('favori_urunler')
            .select('urun_id', { count: 'exact', head: true })
            .eq('kullanici_id', user.id),
    ]);

    const firma = firmaRes.data;
    const indirimOrani = finansalRes.data?.ozel_indirim_orani ?? 0;
    const siparislerYil = (siparislerYilRes.data ?? []) as any[];
    const siparislerOncekYil = (siparislerOncekYilRes.data ?? []) as any[];
    const siparisler12Ay = (siparisler12AyRes.data ?? []) as any[];
    const enCokAlinan = ((enCokAlinanRes.data as any[]) ?? []).slice(0, 6);
    const sonSiparisler = (sonSiparislerRes.data ?? []) as any[];
    const favoriSayisi = favoriSayisiRes.count ?? 0;

    // Hesaplamalar
    const yilTotal = siparislerYil
        .filter((s: any) => ['Teslim Edildi', 'delivered'].includes(s.siparis_durumu))
        .reduce((s: number, o: any) => s + Number(o.toplam_tutar_net || 0), 0);
    const oncekiYilTotal = siparislerOncekYil.reduce((s: number, o: any) => s + Number(o.toplam_tutar_net || 0), 0);
    const yillikDelta = oncekiYilTotal > 0 ? Math.round(((yilTotal - oncekiYilTotal) / oncekiYilTotal) * 100) : null;
    const ortSiparis = siparislerYil.length > 0 ? yilTotal / siparislerYil.length : 0;

    // Tasarruf hesabı (kademeli fiyat farkı — basit yaklaşım)
    const tasarruf = indirimOrani > 0 ? yilTotal * (indirimOrani / (100 - indirimOrani)) : 0;

    // Tier
    const tier = calcTier(yilTotal, locale);
    const tierProgress = tier.nextThreshold
        ? Math.min(100, Math.round((yilTotal / tier.nextThreshold) * 100))
        : 100;

    // Aylık trend
    const trendMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
        const d = new Date(twelveMonthsAgo.getFullYear(), twelveMonthsAgo.getMonth() + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        trendMap.set(key, 0);
    }
    for (const s of siparisler12Ay) {
        const key = (s.siparis_tarihi as string).slice(0, 7);
        const ex = trendMap.get(key);
        if (ex !== undefined) trendMap.set(key, ex + Number(s.toplam_tutar_net || 0));
    }
    const trendData = Array.from(trendMap.entries()).map(([month, tutar]) => ({ month, tutar }));

    // Müşteri süresi
    const membershipDays = firma?.created_at
        ? Math.floor((Date.now() - new Date(firma.created_at).getTime()) / 86400000)
        : 0;
    const membershipText = membershipDays >= 365
        ? `${Math.floor(membershipDays / 365)} ${locale === 'de' ? 'Jahr' : 'yıl'}`
        : `${Math.floor(membershipDays / 30)} ${locale === 'de' ? 'Monate' : 'ay'}`;

    const STATUS_LABEL: Record<string, { de: string; tr: string; color: string }> = {
        'Beklemede':    { de: 'Ausstehend',     tr: 'Beklemede',    color: 'bg-amber-100 text-amber-700' },
        'Hazırlanıyor': { de: 'In Bearbeitung', tr: 'Hazırlanıyor', color: 'bg-blue-100 text-blue-700' },
        'Yola Çıktı':   { de: 'Unterwegs',      tr: 'Yola Çıktı',  color: 'bg-violet-100 text-violet-700' },
        'Teslim Edildi':{ de: 'Geliefert',      tr: 'Teslim Edildi', color: 'bg-green-100 text-green-700' },
        'İptal Edildi': { de: 'Storniert',      tr: 'İptal Edildi', color: 'bg-red-100 text-red-700' },
        'iptal_talep_edildi': { de: 'Storno beantr.', tr: 'İptal Talep', color: 'bg-orange-100 text-orange-700' },
    };

    return (
        <div className="space-y-5 pb-10">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href={`/${locale}/portal/dashboard`}
                    className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                    <FiArrowLeft size={18} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {locale === 'de' ? 'Mein Konto' : 'Hesabım'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {firma?.unvan} · {locale === 'de' ? 'Kunde seit' : 'Müşterimizsiniz'}: <strong>{membershipText}</strong>
                    </p>
                </div>
            </div>

            {/* Tier + Progress */}
            <div className={`bg-gradient-to-r ${tier.color} rounded-xl p-5 text-white`}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">{tier.emoji}</span>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                                {locale === 'de' ? tier.label.de : tier.label.tr}
                            </p>
                            <p className="text-xl font-bold">{fmt(yilTotal)}</p>
                            <p className="text-xs opacity-75 mt-0.5">
                                {siparislerYil.length} {locale === 'de' ? 'Bestellungen dieses Jahr' : 'bu yıl sipariş'}
                                {yillikDelta !== null && (
                                    <span className={`ml-2 font-bold ${yillikDelta >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                        {yillikDelta >= 0 ? '+' : ''}{yillikDelta}%
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    {tier.nextThreshold && (
                        <div className="text-right">
                            <p className="text-xs opacity-75">
                                {locale === 'de' ? 'Zur nächsten Stufe' : 'Sonraki seviyeye'}
                            </p>
                            <p className="text-sm font-bold">{fmt(tier.nextThreshold - yilTotal)}</p>
                        </div>
                    )}
                </div>
                {tier.nextThreshold && (
                    <div className="mt-3">
                        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full bg-white/70 rounded-full transition-all"
                                style={{ width: `${tierProgress}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] opacity-60 mt-1">
                            <span>€0</span>
                            <span>{fmt(tier.nextThreshold)}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* KPI Kartlar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-blue-200/60 p-4 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                            {locale === 'de' ? 'Ø Warenkorb' : 'Ort. Sepet'}
                        </p>
                        <FiShoppingCart size={14} className="text-blue-500" />
                    </div>
                    <p className="text-xl font-bold text-blue-800">{fmt(ortSiparis)}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {locale === 'de' ? 'pro Bestellung' : 'sipariş başına'}
                    </p>
                </div>

                <div className="rounded-xl border border-purple-200/60 p-4 bg-gradient-to-br from-purple-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">
                            {locale === 'de' ? 'Bestellungen' : 'Siparişler'}
                        </p>
                        <FiRepeat size={14} className="text-purple-500" />
                    </div>
                    <p className="text-xl font-bold text-purple-800">{siparislerYil.length}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                        {locale === 'de' ? 'dieses Jahr' : 'bu yıl'}
                    </p>
                </div>

                <div className="rounded-xl border border-pink-200/60 p-4 bg-gradient-to-br from-pink-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-pink-700">
                            {locale === 'de' ? 'Favoriten' : 'Favoriler'}
                        </p>
                        <FiHeart size={14} className="text-pink-500" />
                    </div>
                    <p className="text-xl font-bold text-pink-800">{favoriSayisi}</p>
                    <Link href={`/${locale}/portal/favoriler`}
                        className="text-[11px] text-pink-600 hover:text-pink-800 mt-1 inline-block">
                        {locale === 'de' ? 'Ansehen →' : 'Görüntüle →'}
                    </Link>
                </div>

                <div className="rounded-xl border border-emerald-200/60 p-4 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
                            {locale === 'de' ? 'Ihr Vorteil' : 'Avantajınız'}
                        </p>
                        <FiAward size={14} className="text-emerald-500" />
                    </div>
                    {indirimOrani > 0 ? (
                        <>
                            <p className="text-xl font-bold text-emerald-800">%{indirimOrani}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                                {locale === 'de' ? 'Sonderrabatt' : 'özel indirim'}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="text-xl font-bold text-emerald-800">{tier.emoji}</p>
                            <p className="text-[11px] text-slate-500 mt-1">
                                {locale === 'de' ? tier.label.de : tier.label.tr}
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Tasarruf banner (indirim varsa) */}
            {tasarruf > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiAward size={18} className="text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-emerald-900">
                            {locale === 'de'
                                ? `Sie haben dieses Jahr ${fmt(tasarruf)} gespart!`
                                : `Bu yıl ${fmt(tasarruf)} tasarruf ettiniz!`}
                        </p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                            {locale === 'de'
                                ? `Dank Ihres ${indirimOrani}% Sonderrabatts`
                                : `%${indirimOrani} özel indiriminiz sayesinde`}
                        </p>
                    </div>
                </div>
            )}

            {/* En çok alınan ürünler */}
            {enCokAlinan.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiRepeat size={14} className="text-blue-500" />
                            {locale === 'de' ? 'Häufig bestellt' : 'En Çok Aldıklarım'}
                        </h3>
                        <Link href={`/${locale}/portal/siparisler/yeni`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            {locale === 'de' ? 'Neu bestellen' : 'Yeniden Sipariş'} <FiExternalLink size={9} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {enCokAlinan.map((u: any) => {
                            const ad = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Ürün';
                            return (
                                <Link key={u.id || u.urun_id}
                                    href={`/${locale}/portal/katalog/${u.id || u.urun_id}`}
                                    className="block border border-slate-100 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all group">
                                    <div className="aspect-square bg-slate-50 relative">
                                        {u.ana_resim_url ? (
                                            <Image src={u.ana_resim_url} alt={ad} fill sizes="150px"
                                                className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <FiPackage className="text-slate-300" size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-tight">{ad}</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                            {fmt(Number(u.satis_fiyati_musteri ?? 0))}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Trend grafik */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FiTrendingUp size={14} className="text-blue-500" />
                        {locale === 'de' ? 'Bestelltrend (12 Monate)' : 'Sipariş Trendi (12 Ay)'}
                    </h3>
                </div>
                {trendData.every(d => d.tutar === 0) ? (
                    <div className="py-10 text-center">
                        <p className="text-sm text-slate-400">
                            {locale === 'de' ? 'Noch keine Bestellungen' : 'Henüz sipariş yok'}
                        </p>
                    </div>
                ) : (
                    <HesapOzetTrend data={trendData} />
                )}
            </div>

            {/* Son siparişler */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FiPackage size={14} className="text-blue-500" />
                        {locale === 'de' ? 'Letzte Bestellungen' : 'Son Siparişler'}
                    </h3>
                    <Link href={`/${locale}/portal/siparisler`}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                        {locale === 'de' ? 'Alle' : 'Tümü'} <FiExternalLink size={9} />
                    </Link>
                </div>
                {sonSiparisler.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-sm text-slate-400">
                            {locale === 'de' ? 'Noch keine Bestellungen' : 'Henüz sipariş yok'}
                        </p>
                        <Link href={`/${locale}/portal/katalog`}
                            className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-semibold">
                            {locale === 'de' ? 'Zum Katalog' : 'Kataloga Git'}
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {sonSiparisler.map((s: any) => {
                            const statusCfg = STATUS_LABEL[s.siparis_durumu];
                            return (
                                <Link key={s.id}
                                    href={`/${locale}/portal/siparisler/${s.id}`}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50 transition-colors group">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-sm font-bold text-slate-800">
                                                #{s.id.slice(0, 8).toUpperCase()}
                                            </span>
                                            {statusCfg && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                                                    {locale === 'de' ? statusCfg.de : statusCfg.tr}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {formatLocaleDate(s.siparis_tarihi, locale)}
                                        </p>
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        <p className="text-sm font-bold text-slate-800">{fmt(s.toplam_tutar_net)}</p>
                                        <p className="text-[10px] text-slate-400">
                                            {locale === 'de' ? 'Netto' : 'Net'}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
