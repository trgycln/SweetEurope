import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { Locale } from '@/i18n-config';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiArrowLeft, FiTrendingUp, FiPackage, FiExternalLink,
    FiShoppingCart, FiRepeat, FiHeart, FiFileText, FiCalendar
} from 'react-icons/fi';
import { HesapOzetTrend } from '@/components/portal/hesap-ozetim/HesapOzetTrend';
import { formatCurrency, formatLocaleDate } from '@/lib/portalLabels';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ locale: Locale }>;
}

export default async function HesapOzetimPage({ params }: PageProps) {
    noStore();
    const { locale } = await params;

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
            .select('unvan, created_at, vkn_tckn, vergi_dairesi')
            .eq('id', profile.firma_id)
            .single(),

        (supabase as any).from('firmalar_finansal')
            .select('ozel_indirim_orani, risk_limiti, guncel_bakiye')
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
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net, toplam_tutar_brut')
            .eq('firma_id', profile.firma_id)
            .order('siparis_tarihi', { ascending: false })
            .limit(5),

        // Favori sayısı
        supabase.from('favori_urunler')
            .select('urun_id', { count: 'exact', head: true })
            .eq('kullanici_id', user.id),
    ]);

    const firma = firmaRes.data;
    const finansal = finansalRes.data || {};
    const indirimOrani = finansal.ozel_indirim_orani ?? 0;
    
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
        ? `${Math.floor(membershipDays / 365)} ${locale === 'de' ? 'Jahre' : 'yıl'}`
        : `${Math.floor(membershipDays / 30)} ${locale === 'de' ? 'Monate' : 'ay'}`;

    const STATUS_LABEL: Record<string, { de: string; tr: string; color: string }> = {
        'Beklemede':    { de: 'Ausstehend',     tr: 'Beklemede',    color: 'bg-amber-50 text-amber-700 border-amber-200' },
        'Hazırlanıyor': { de: 'In Bearbeitung', tr: 'Hazırlanıyor', color: 'bg-blue-50 text-blue-700 border-blue-200' },
        'Yola Çıktı':   { de: 'Unterwegs',      tr: 'Yola Çıktı',  color: 'bg-violet-50 text-violet-700 border-violet-200' },
        'Teslim Edildi':{ de: 'Geliefert',      tr: 'Teslim Edildi', color: 'bg-green-50 text-green-700 border-green-200' },
        'İptal Edildi': { de: 'Storniert',      tr: 'İptal Edildi', color: 'bg-red-50 text-red-700 border-red-200' },
        'iptal_talep_edildi': { de: 'Storno beantr.', tr: 'İptal Talep', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    };

    return (
        <div className="space-y-6 pb-10 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-5">
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/portal/dashboard`}
                        className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 tracking-tight">
                            {locale === 'de' ? 'Kontoauszug & Saldo' : 'Cari Bakiye & Ekstre'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                            <span>{firma?.unvan}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                            <span>{locale === 'de' ? 'Kunde seit' : 'Kayıt'}: {membershipText}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Financial Summary Card (Professional B2B Look) */}
            <div className="bg-slate-900 rounded-2xl p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                    {/* Yıllık Hacim */}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                            {locale === 'de' ? 'Bestellvolumen (Netto, Lfd. Jahr)' : 'Sipariş Hacmi (Net, Bu Yıl)'}
                        </p>
                        <div className="flex items-baseline gap-3">
                            <span className="text-4xl lg:text-5xl font-bold tracking-tight text-white">
                                {fmt(yilTotal)}
                            </span>
                        </div>
                        {yillikDelta !== null && (
                            <p className="text-sm flex items-center gap-1.5 mt-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${yillikDelta >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                                    {yillikDelta >= 0 ? '+' : ''}{yillikDelta}%
                                </span>
                                <span className="text-slate-400">
                                    {locale === 'de' ? 'ggü. Vorjahr' : 'önceki yıla göre'}
                                </span>
                            </p>
                        )}
                    </div>
                    


                    {/* Firma Bilgileri */}
                    <div className="space-y-2 md:border-l md:border-slate-700 md:pl-8">
                        <p className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                            {locale === 'de' ? 'Rechnungsdetails' : 'Fatura Bilgileri'}
                        </p>
                        <div className="space-y-1.5 mt-3 text-sm text-slate-300">
                            <p className="font-medium text-white">{firma?.unvan}</p>
                            {firma?.vergi_dairesi && (
                                <p>{locale === 'de' ? 'Finanzamt' : 'V.D.'}: {firma.vergi_dairesi}</p>
                            )}
                            {firma?.vkn_tckn && (
                                <p>{locale === 'de' ? 'Steuernummer' : 'VKN'}: {firma.vkn_tckn}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* KPI Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <FiShoppingCart size={16} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {locale === 'de' ? 'Ø Warenkorb' : 'Ort. Sepet'}
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{fmt(ortSiparis)}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {locale === 'de' ? 'Netto pro Bestellung' : 'sipariş başına net'}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FiRepeat size={16} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {locale === 'de' ? 'Bestellungen' : 'Siparişler'}
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{siparislerYil.length}</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {locale === 'de' ? 'im laufenden Jahr' : 'bu yıl içinde'}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600">
                            <FiHeart size={16} />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {locale === 'de' ? 'Favoriten' : 'Favoriler'}
                        </p>
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{favoriSayisi}</p>
                    <Link href={`/${locale}/portal/favoriler`}
                        className="text-xs text-pink-600 hover:text-pink-800 mt-1 inline-block font-medium">
                        {locale === 'de' ? 'Katalog ansehen →' : 'Kataloğa git →'}
                    </Link>
                </div>

            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Sol Taraf: Trend & En çok alınanlar */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Trend grafik */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FiTrendingUp className="text-slate-400" />
                                {locale === 'de' ? 'Bestelltrend (Letzte 12 Monate)' : 'Sipariş Trendi (Son 12 Ay)'}
                            </h3>
                        </div>
                        {trendData.every(d => d.tutar === 0) ? (
                            <div className="py-12 text-center bg-slate-50 rounded-lg border border-slate-100">
                                <p className="text-sm text-slate-500">
                                    {locale === 'de' ? 'Noch keine Bestelldaten für diesen Zeitraum vorhanden.' : 'Bu dönem için henüz sipariş verisi bulunmuyor.'}
                                </p>
                            </div>
                        ) : (
                            <div className="pt-2">
                                <HesapOzetTrend data={trendData} />
                            </div>
                        )}
                    </div>

                    {/* En çok alınan ürünler */}
                    {enCokAlinan.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <FiPackage className="text-slate-400" />
                                    {locale === 'de' ? 'Meistbestellte Artikel' : 'En Çok Sipariş Edilenler'}
                                </h3>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {enCokAlinan.map((u: any) => {
                                    const ad = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Ürün';
                                    return (
                                        <Link key={u.id || u.urun_id}
                                            href={`/${locale}/portal/katalog/${u.id || u.urun_id}`}
                                            className="flex flex-col border border-slate-100 rounded-xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group bg-slate-50/50">
                                            <div className="aspect-[4/3] bg-white relative border-b border-slate-100">
                                                {u.ana_resim_url ? (
                                                    <Image src={u.ana_resim_url} alt={ad} fill sizes="200px"
                                                        className="object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="flex items-center justify-center h-full">
                                                        <FiPackage className="text-slate-200" size={32} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 flex-1 flex flex-col justify-between">
                                                <p className="text-xs font-semibold text-slate-700 line-clamp-2 leading-snug">{ad}</p>
                                                <p className="text-sm font-bold text-slate-900 mt-2">
                                                    {fmt(Number(u.satis_fiyati_musteri ?? 0))}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sağ Taraf: Son siparişler (Ekstre niyetine) */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden h-full">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FiCalendar className="text-slate-400" />
                                {locale === 'de' ? 'Aktuelle Auszüge' : 'Güncel Ekstre'}
                            </h3>
                            <Link href={`/${locale}/portal/siparisler`}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md">
                                {locale === 'de' ? 'Alle' : 'Tümü'} <FiExternalLink size={10} />
                            </Link>
                        </div>
                        
                        {sonSiparisler.length === 0 ? (
                            <div className="p-8 text-center flex flex-col items-center justify-center h-[calc(100%-60px)]">
                                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                    <FiFileText className="text-slate-300" size={20} />
                                </div>
                                <p className="text-sm text-slate-500 mb-4">
                                    {locale === 'de' ? 'Keine Einträge vorhanden' : 'Kayıt bulunamadı'}
                                </p>
                                <Link href={`/${locale}/portal/katalog`}
                                    className="inline-flex items-center gap-2 text-xs px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-semibold transition-colors">
                                    {locale === 'de' ? 'Katalog öffnen' : 'Kataloga Git'}
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {sonSiparisler.map((s: any) => {
                                    const statusCfg = STATUS_LABEL[s.siparis_durumu];
                                    return (
                                        <Link key={s.id}
                                            href={`/${locale}/portal/siparisler/${s.id}`}
                                            className="block px-5 py-4 hover:bg-slate-50 transition-colors group">
                                            
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-xs font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                                                    #{s.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                {statusCfg && (
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${statusCfg.color}`}>
                                                        {locale === 'de' ? statusCfg.de : statusCfg.tr}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <div className="flex justify-between items-end">
                                                <div>
                                                    <p className="text-[11px] text-slate-500 font-medium">
                                                        {formatLocaleDate(s.siparis_tarihi, locale)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-slate-900">{fmt(s.toplam_tutar_net)}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                                                        {locale === 'de' ? 'Netto' : 'Net'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                                
                                <div className="p-4 bg-slate-50/50">
                                    <Link href={`/${locale}/portal/siparisler`} className="w-full flex items-center justify-center gap-2 text-sm text-slate-600 font-medium py-2 hover:text-slate-900 transition-colors">
                                        {locale === 'de' ? 'Vollständigen Auszug anzeigen' : 'Tüm Ekstreyi Görüntüle'}
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
