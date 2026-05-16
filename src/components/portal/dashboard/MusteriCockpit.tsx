// src/components/portal/dashboard/MusteriCockpit.tsx
// Müşteri rolü için profesyonel cockpit dashboard

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiPackage, FiHeart, FiDollarSign, FiTrendingUp, FiShoppingCart,
    FiPhone, FiExternalLink, FiAlertCircle, FiCalendar, FiAward,
    FiClock, FiPlus, FiPlay, FiBell, FiTrendingDown,
} from 'react-icons/fi';
import { cookies } from 'next/headers';
import { getPortalLabels, formatCurrency, formatLocaleDate } from '@/lib/portalLabels';

function toLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Yıllık ciroya göre tier hesabı (label'lar locale ile gelir)
function calcTier(yearTotal: number, L: ReturnType<typeof getPortalLabels>): { label: string; color: string; emoji: string; next?: string; nextThreshold?: number } {
    if (yearTotal >= 50000) return { label: L.tierPlatinum, color: 'from-violet-500 to-fuchsia-600', emoji: '💎' };
    if (yearTotal >= 20000) return { label: L.tierGold, color: 'from-amber-500 to-orange-500', emoji: '🥇', next: L.tierPlatinum, nextThreshold: 50000 };
    if (yearTotal >= 8000) return { label: L.tierSilver, color: 'from-slate-400 to-slate-500', emoji: '🥈', next: L.tierGold, nextThreshold: 20000 };
    if (yearTotal >= 2000) return { label: L.tierBronze, color: 'from-orange-700 to-amber-800', emoji: '🥉', next: L.tierSilver, nextThreshold: 8000 };
    return { label: L.tierNew, color: 'from-slate-300 to-slate-400', emoji: '🌱', next: L.tierBronze, nextThreshold: 2000 };
}

const STATUS_CHIP: Record<string, string> = {
    'Beklemede': 'bg-amber-100 text-amber-700 border-amber-200',
    'Hazırlanıyor': 'bg-blue-100 text-blue-700 border-blue-200',
    'processing': 'bg-cyan-100 text-cyan-700 border-cyan-200',
    'Yola Çıktı': 'bg-violet-100 text-violet-700 border-violet-200',
    'shipped': 'bg-violet-100 text-violet-700 border-violet-200',
    'Teslim Edildi': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'delivered': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'İptal Edildi': 'bg-red-100 text-red-700 border-red-200',
    'cancelled': 'bg-red-100 text-red-700 border-red-200',
};

interface Props {
    userId: string;
    firmaId: string;
    locale: string;
    firmaUnvan: string;
    firmaCreatedAt: string | null;
}

export default async function MusteriCockpit({ userId, firmaId, locale, firmaUnvan, firmaCreatedAt }: Props) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const L = getPortalLabels(locale);
    const fmt = (v: number | null | undefined) => formatCurrency(v, locale);

    const now = new Date();
    const yearStart = toLocalDate(new Date(now.getFullYear(), 0, 1));
    const prevYearStart = toLocalDate(new Date(now.getFullYear() - 1, 0, 1));
    const prevYearEnd = toLocalDate(new Date(now.getFullYear() - 1, 11, 31));

    // Müşteri olma süresi
    const membershipYears = firmaCreatedAt
        ? Math.floor((Date.now() - new Date(firmaCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;
    const membershipMonths = firmaCreatedAt
        ? Math.floor((Date.now() - new Date(firmaCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

    // ── Paralel sorgular ────────────────────────────────────────
    const [
        siparislerYilRes,
        siparislerOncekYilRes,
        aktifSiparislerRes,
        sonSiparislerRes,
        favoritesRes,
        finansalRes,
        bekleyenTalepRes,
        sikUrunlerRes,
        yeniUrunlerRes,
        duyurularRes,
    ] = await Promise.all([
        supabase.from('siparisler')
            .select('toplam_tutar_net, siparis_tarihi, siparis_durumu')
            .eq('firma_id', firmaId)
            .gte('siparis_tarihi', yearStart)
            .order('siparis_tarihi', { ascending: false }),

        supabase.from('siparisler')
            .select('toplam_tutar_net')
            .eq('firma_id', firmaId)
            .gte('siparis_tarihi', prevYearStart)
            .lte('siparis_tarihi', prevYearEnd),

        (supabase as any).from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net, teslimat_adresi')
            .eq('firma_id', firmaId)
            .in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing', 'shipped'])
            .order('siparis_tarihi', { ascending: false })
            .limit(5),

        (supabase as any).from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net')
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false })
            .limit(10),

        supabase.from('favori_urunler')
            .select('urun_id', { count: 'exact', head: true })
            .eq('kullanici_id', userId),

        (supabase as any).from('firmalar_finansal')
            .select('odeme_vadesi_gun, ozel_indirim_orani')
            .eq('firma_id', firmaId)
            .maybeSingle(),

        (supabase as any).from('sample_requests')
            .select('id', { count: 'exact', head: true })
            .eq('firma_id', firmaId)
            .in('status', ['Beklemede', 'pending', 'İncelemede']),

        // En çok sipariş edilen ürünler (son 6 ay)
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId }),

        // Yeni eklenen ürünler (son 30 gün)
        (supabase as any).from('urunler')
            .select('id, ad, slug, ana_resim_url, satis_fiyati_musteri, koli_ici_adet, stok_kodu')
            .eq('aktif', true)
            .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
            .order('created_at', { ascending: false })
            .limit(4),

        // Aktif duyurular
        (supabase as any).from('duyurular')
            .select('id, baslik, icerik, tip, created_at')
            .eq('aktif', true)
            .order('created_at', { ascending: false })
            .limit(3),
    ]);

    const siparislerYil = (siparislerYilRes.data ?? []) as any[];
    const siparislerOncekYil = (siparislerOncekYilRes.data ?? []) as any[];
    const aktifSiparisler = (aktifSiparislerRes.data ?? []) as any[];
    const sonSiparisler = (sonSiparislerRes.data ?? []) as any[];
    const sikUrunler = ((sikUrunlerRes.data as any[]) ?? []).slice(0, 6);
    const yeniUrunler = (yeniUrunlerRes.data ?? []) as any[];
    const duyurular = (duyurularRes.data ?? []) as any[];

    // ── Hesaplamalar ────────────────────────────────────────────
    const yilTotal = siparislerYil.reduce((s, o: any) => s + Number(o.toplam_tutar_net || 0), 0);
    const oncekiYilTotal = siparislerOncekYil.reduce((s, o: any) => s + Number(o.toplam_tutar_net || 0), 0);
    const yillikDelta = oncekiYilTotal > 0 ? Math.round(((yilTotal - oncekiYilTotal) / oncekiYilTotal) * 100) : null;

    const aktifSiparisSayisi = aktifSiparisler.length;
    const favoriteCount = favoritesRes.count ?? 0;
    const bekleyenTalep = bekleyenTalepRes.count ?? 0;

    // Tier hesabı
    const tier = calcTier(yilTotal, L);
    const tierProgress = tier.nextThreshold ? Math.min(100, Math.round((yilTotal / tier.nextThreshold) * 100)) : 100;

    // Açık bakiye tahmini: son 30 gün içindeki teslim edilmiş + bekleyen tahsilat
    const odemeVadesi = finansalRes.data?.odeme_vadesi_gun ?? 30;
    const indirimOrani = finansalRes.data?.ozel_indirim_orani ?? 0;

    // En önemli duyuru (kampanya tipi)
    const mainDuyuru = duyurular.find((d: any) => d.tip === 'kampanya') || duyurular[0];
    const otherDuyurular = duyurular.filter((d: any) => d.id !== mainDuyuru?.id);

    return (
        <div className="space-y-5 pb-10">

            {/* ── Sticky Kampanya Banner ── */}
            {mainDuyuru && (
                <div className="bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 text-white rounded-xl p-4 shadow-lg flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <FiBell size={18} />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-90">
                                {mainDuyuru.tip === 'kampanya' ? `🎁 ${L.announcementCampaign}` : `📢 ${L.announcement}`}
                            </p>
                            <p className="text-base font-bold">{mainDuyuru.baslik}</p>
                            {mainDuyuru.icerik && (
                                <p className="text-xs opacity-90 mt-0.5 line-clamp-1">{mainDuyuru.icerik}</p>
                            )}
                        </div>
                    </div>
                    <Link href={`/${locale}/portal/katalog`}
                        className="text-xs font-bold bg-white text-orange-700 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors flex items-center gap-1 flex-shrink-0">
                        {L.promoBannerCta} <FiPlay size={11} />
                    </Link>
                </div>
            )}

            {/* ── Hoşgeldin Bandı + Tier ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className={`bg-gradient-to-r ${tier.color} px-5 py-3 text-white`}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{tier.emoji}</span>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest opacity-90">{tier.label} {L.customerLabel}</p>
                                <p className="text-lg font-bold">{L.welcome}, {firmaUnvan}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] opacity-80 uppercase tracking-wider">{L.customerSince}</p>
                            <p className="text-sm font-bold">
                                {membershipYears > 0 ? `${membershipYears} ${L.year}` : `${membershipMonths} ${L.months}`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tier progress (sonraki seviyeye kadar) */}
                {tier.next && tier.nextThreshold && (
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-600 flex items-center gap-1">
                                <FiAward size={12} className="text-amber-500" />
                                <strong>{tier.next}</strong> {L.nextLevel}
                            </span>
                            <span className="text-slate-500">
                                <strong className="text-slate-700">{fmt(yilTotal)}</strong> / {fmt(tier.nextThreshold)}
                                <span className="text-[10px] text-slate-400 ml-1">({tierProgress}%)</span>
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full bg-gradient-to-r ${tier.color} transition-all`}
                                style={{ width: `${tierProgress}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1.5">
                            {L.nextLevelRemaining}: <strong className="text-slate-600">{fmt(tier.nextThreshold - yilTotal)}</strong>
                        </p>
                    </div>
                )}
            </div>

            {/* ── KPI Kartlar (4) ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-blue-200/60 p-4 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">{L.yearTotal}</p>
                        <FiTrendingUp size={14} className="text-blue-500" />
                    </div>
                    <p className="text-xl font-bold text-blue-800">{fmt(yilTotal)}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <p className="text-[11px] text-slate-500">{siparislerYil.length} {L.nOrders}</p>
                        {yillikDelta !== null && (
                            <span className={`text-[10px] font-bold ${yillikDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {yillikDelta >= 0 ? '+' : ''}{yillikDelta}%
                            </span>
                        )}
                    </div>
                </div>

                <div className="rounded-xl border border-orange-200/60 p-4 bg-gradient-to-br from-orange-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">{L.activeOrders}</p>
                        <FiPackage size={14} className="text-orange-500" />
                    </div>
                    <p className="text-xl font-bold text-orange-800">{aktifSiparisSayisi}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{L.inProgress}</p>
                </div>

                <div className="rounded-xl border border-purple-200/60 p-4 bg-gradient-to-br from-purple-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">{L.myFavorites}</p>
                        <FiHeart size={14} className="text-purple-500" />
                    </div>
                    <p className="text-xl font-bold text-purple-800">{favoriteCount}</p>
                    <Link href={`/${locale}/portal/favoriler`} className="text-[11px] text-purple-600 hover:text-purple-800 mt-1 inline-block">
                        {L.view} →
                    </Link>
                </div>

                <div className="rounded-xl border border-emerald-200/60 p-4 bg-gradient-to-br from-emerald-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">{L.yourBenefits}</p>
                        <FiAward size={14} className="text-emerald-500" />
                    </div>
                    {indirimOrani > 0 ? (
                        <>
                            <p className="text-xl font-bold text-emerald-800">%{indirimOrani} {L.discount}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{odemeVadesi} {L.days}</p>
                        </>
                    ) : (
                        <>
                            <p className="text-xl font-bold text-emerald-800">{odemeVadesi} {L.days}</p>
                            <p className="text-[11px] text-slate-500 mt-1">{L.paymentTerm}</p>
                        </>
                    )}
                </div>
            </div>

            {/* ── Hızlı İşlemler ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">{L.quickActions}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                        { label: L.newOrder, icon: <FiShoppingCart size={16} />, href: `/${locale}/portal/katalog`, bg: 'bg-blue-100 text-blue-700' },
                        { label: L.fromFavorites, icon: <FiHeart size={16} />, href: `/${locale}/portal/favoriler`, bg: 'bg-purple-100 text-purple-700' },
                        { label: L.sampleRequest, icon: <FiPackage size={16} />, href: `/${locale}/portal/taleplerim`, bg: 'bg-teal-100 text-teal-700' },
                        { label: L.contact, icon: <FiPhone size={16} />, href: `/${locale}/contact`, bg: 'bg-amber-100 text-amber-700' },
                    ].map(a => (
                        <Link key={a.label} href={a.href}
                            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700 group">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg} group-hover:scale-105 transition-transform`}>
                                {a.icon}
                            </span>
                            <span className="truncate">{a.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── Aktif Siparişler + Duyurular ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Aktif Siparişler - 2/3 */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiPackage size={14} className="text-orange-500" /> {L.activeOrdersTitle}
                        </h3>
                        <Link href={`/${locale}/portal/siparisler`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            {L.allLink} <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {aktifSiparisler.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="w-12 h-12 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-3">
                                <FiPackage size={20} className="text-slate-400" />
                            </div>
                            <p className="text-sm text-slate-500">{L.noActiveOrders}</p>
                            <Link href={`/${locale}/portal/katalog`}
                                className="mt-3 inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-semibold">
                                <FiPlus size={11} /> {L.placeNewOrder}
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {aktifSiparisler.map((s: any) => (
                                <Link key={s.id} href={`/${locale}/portal/siparisler/${s.id}`}
                                    className="block px-4 py-3 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-slate-800">
                                                    #{s.id.slice(0, 8).toUpperCase()}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_CHIP[s.siparis_durumu] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    {s.siparis_durumu}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                <FiCalendar size={9} />
                                                {formatLocaleDate(s.siparis_tarihi, locale)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-800">{fmt(s.toplam_tutar_net)}</p>
                                            <p className="text-[10px] text-slate-400">{L.net}</p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Duyurular - 1/3 */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiBell size={14} className="text-amber-500" /> {L.announcements}
                        </h3>
                    </div>
                    {otherDuyurular.length === 0 && !mainDuyuru ? (
                        <div className="p-6 text-center">
                            <p className="text-sm text-slate-400">{L.noAnnouncements}</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {otherDuyurular.length > 0 ? otherDuyurular.map((d: any) => (
                                <div key={d.id} className="px-4 py-3">
                                    <div className="flex items-start gap-2">
                                        <span className="text-base flex-shrink-0">
                                            {d.tip === 'kampanya' ? '🎁' : d.tip === 'urun' ? '🆕' : '📢'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 line-clamp-2">{d.baslik}</p>
                                            {d.icerik && (
                                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{d.icerik}</p>
                                            )}
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {formatLocaleDate(d.created_at, locale)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )) : null}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Sık Aldığınız Ürünler (1-tıkla yeniden sipariş) ── */}
            {sikUrunler.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiClock size={14} className="text-blue-500" /> {L.frequentProducts}
                            <span className="text-[10px] font-normal text-slate-400">{L.oneClickReorder}</span>
                        </h3>
                        <Link href={`/${locale}/portal/katalog`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            {L.fullCatalog} <FiExternalLink size={9} />
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {sikUrunler.map((u: any) => {
                            const urunAd = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Ürün';
                            const fiyat = u.satis_fiyati_musteri ?? 0;
                            return (
                                <Link key={u.id || u.urun_id} href={`/${locale}/portal/katalog/${u.id || u.urun_id}`}
                                    className="block border border-slate-100 rounded-lg overflow-hidden hover:border-slate-300 hover:shadow-sm transition-all group">
                                    <div className="aspect-square bg-slate-50 relative">
                                        {u.ana_resim_url ? (
                                            <Image src={u.ana_resim_url} alt={urunAd} fill sizes="150px"
                                                className="object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <FiPackage className="text-slate-300" size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2">
                                        <p className="text-xs font-semibold text-slate-700 truncate">{urunAd}</p>
                                        <p className="text-xs font-bold text-blue-700 mt-0.5">{fmt(fiyat)}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── Yeni Ürünler ── */}
            {yeniUrunler.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            ✨ {L.newProducts}
                            <span className="text-[10px] font-normal text-slate-400">{L.last30Days}</span>
                        </h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {yeniUrunler.map((u: any) => {
                            const urunAd = u.ad?.[locale] || u.ad?.de || u.ad?.tr || L.customerLabel;
                            return (
                                <Link key={u.id} href={`/${locale}/portal/katalog/${u.id}`}
                                    className="block border border-slate-100 rounded-lg overflow-hidden hover:border-emerald-300 hover:shadow-sm transition-all relative group">
                                    <span className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                                        {L.newBadge}
                                    </span>
                                    <div className="aspect-square bg-slate-50 relative">
                                        {u.ana_resim_url ? (
                                            <Image src={u.ana_resim_url} alt={urunAd} fill sizes="200px"
                                                className="object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full">
                                                <FiPackage className="text-slate-300" size={28} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-2.5">
                                        <p className="text-xs font-semibold text-slate-700 truncate">{urunAd}</p>
                                        {u.koli_ici_adet > 0 && (
                                            <p className="text-[10px] text-slate-400 mt-0.5">{u.koli_ici_adet} {L.perBox}</p>
                                        )}
                                        <p className="text-xs font-bold text-blue-700 mt-1">{fmt(u.satis_fiyati_musteri)}</p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
