// src/components/portal/dashboard/MusteriCockpit.tsx
// Müşteri rolü için modern, yüksek performanslı ve prestijli cockpit dashboard

import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import Image from 'next/image';
import {
    FiPackage, FiHeart, FiDollarSign, FiShoppingCart,
    FiPhone, FiExternalLink, FiCalendar, FiAward,
    FiClock, FiPlus, FiPlay, FiBell, FiShield, FiArrowRight,
    FiCheckCircle, FiLayers, FiTag
} from 'react-icons/fi';
import { cookies } from 'next/headers';
import { getPortalLabels, formatCurrency, formatLocaleDate } from '@/lib/portalLabels';

function toLocalDate(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUS_CHIP: Record<string, { bg: string; dot: string; label: string }> = {
    'Beklemede': { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Beklemede' },
    'Hazırlanıyor': { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Hazırlanıyor' },
    'processing': { bg: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', label: 'In Bearbeitung' },
    'Yola Çıktı': { bg: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', label: 'Yolda' },
    'shipped': { bg: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500', label: 'Versandt' },
    'Teslim Edildi': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Teslim Edildi' },
    'delivered': { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Geliefert' },
    'İptal Edildi': { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'İptal Edildi' },
    'cancelled': { bg: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500', label: 'Storniert' },
};

// ─── B2B Kademeli Fiyat Bileşeni (PriceTiers) ────────────────────────────────
function PriceTiers({
    fiyat1,
    fiyat5,
    fiyatPalet,
    koliAdet,
    paletAdet,
    fmt,
    locale,
}: {
    fiyat1: number | null | undefined;
    fiyat5: number | null | undefined;
    fiyatPalet: number | null | undefined;
    koliAdet: number | null | undefined;
    paletAdet: number | null | undefined;
    fmt: (v: number | null | undefined) => string;
    locale: string;
}) {
    const isDe = locale === 'de';
    const isTr = locale === 'tr';

    const f1 = Number(fiyat1 ?? 0);
    const f5 = Number(fiyat5 ?? 0);
    const fp = Number(fiyatPalet ?? 0);
    const kCount = Number(koliAdet ?? 0);
    const pCount = Number(paletAdet ?? 0);

    const tiers = [
        {
            key: 'tier1',
            label: isDe ? '1 Karton' : isTr ? '1 Koli' : '1 Carton',
            sub: kCount > 0 ? `${kCount} ${isDe ? 'Stk.' : 'ad.'}` : null,
            price: f1,
            badge: null,
            bgClass: 'bg-slate-50 border-slate-200/70 text-slate-700',
            priceColor: 'text-slate-800 font-bold',
        },
        {
            key: 'tier5',
            label: isDe ? 'Ab 5 Kartons' : isTr ? '5+ Koli' : '5+ Cartons',
            sub: isDe ? 'Toptan' : isTr ? 'Toptan' : 'Wholesale',
            price: f5 > 0 ? f5 : (f1 > 0 ? f1 * 0.95 : 0), // Fallback if f5 not yet set in db
            badge: isDe ? 'Mengenrabatt' : isTr ? 'İndirimli' : 'Discount',
            bgClass: 'bg-amber-50/70 border-amber-200/80 text-amber-900',
            priceColor: 'text-amber-700 font-bold',
        },
        {
            key: 'tierPallet',
            label: isDe ? '1 Palette' : isTr ? '1 Palet' : '1 Pallet',
            sub: pCount > 0 ? `${pCount} ${isDe ? 'Ktn.' : 'koli'}` : null,
            price: fp,
            badge: isDe ? 'Bestpreis' : isTr ? 'En Uygun' : 'Best Price',
            bgClass: 'bg-blue-50/70 border-blue-200/80 text-blue-900',
            priceColor: 'text-blue-700 font-extrabold',
        },
    ].filter(t => t.price > 0);

    if (tiers.length === 0) return null;

    return (
        <div className="space-y-1.5 pt-2.5 mt-2 border-t border-slate-100">
            {tiers.map((t) => (
                <div
                    key={t.key}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] ${t.bgClass} transition-colors`}
                >
                    <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-semibold text-slate-700 truncate">{t.label}</span>
                        {t.sub && (
                            <span className="text-[10px] text-slate-600 bg-white/80 px-1.5 py-0.5 rounded border border-slate-200/60 flex-shrink-0">
                                {t.sub}
                            </span>
                        )}
                    </div>
                    <div className="text-right flex-shrink-0">
                        <span className={`${t.priceColor}`}>
                            {fmt(t.price)}
                            <span className="text-[9px] font-normal text-slate-600 ml-0.5">/{isDe ? 'Stk.' : 'ad.'}</span>
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}

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

    // Müşteri olma süresi hesaplama
    const membershipYears = firmaCreatedAt
        ? Math.floor((Date.now() - new Date(firmaCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 365))
        : 0;
    const membershipMonths = firmaCreatedAt
        ? Math.floor((Date.now() - new Date(firmaCreatedAt).getTime()) / (1000 * 60 * 60 * 24 * 30))
        : 0;

    // ── Paralel Veri Çekimi ────────────────────────────────────────
    const [
        aktifSiparislerRes,
        sonSiparislerRes,
        favoritesRes,
        finansalRes,
        sikUrunlerRes,
        yeniUrunlerRes,
        duyurularRes,
        enCokSatilanlarRes,
    ] = await Promise.all([
        // Aktif Siparişler
        (supabase as any).from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net, teslimat_adresi')
            .eq('firma_id', firmaId)
            .in('siparis_durumu', ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing', 'shipped'])
            .order('siparis_tarihi', { ascending: false })
            .limit(5),

        // Son Siparişler (Geçmiş kontrolü)
        (supabase as any).from('siparisler')
            .select('id, siparis_tarihi, siparis_durumu, toplam_tutar_net')
            .eq('firma_id', firmaId)
            .order('siparis_tarihi', { ascending: false })
            .limit(10),

        // Favoriler Sayısı
        supabase.from('favori_urunler')
            .select('urun_id', { count: 'exact', head: true })
            .eq('kullanici_id', userId),

        // Finansal Koşullar
        (supabase as any).from('firmalar_finansal')
            .select('odeme_vadesi_gun, ozel_indirim_orani')
            .eq('firma_id', firmaId)
            .maybeSingle(),

        // Sık Sipariş Edilen Ürünler (RPC)
        supabase.rpc('get_hizli_siparis_urunleri', { p_firma_id: firmaId }),

        // Yeni Eklenen Ürünler (son 30 gün)
        (supabase as any).from('urunler')
            .select(`
                id, ad, slug, ana_resim_url, stok_kodu,
                satis_fiyati_musteri,
                satis_fiyati_toptanci,
                satis_fiyati_alt_bayi,
                koli_ici_adet,
                palet_ici_adet,
                stok_miktari
            `)
            .eq('aktif', true)
            .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString())
            .order('created_at', { ascending: false })
            .limit(4),

        // Aktif Duyurular & Kampanyalar
        (supabase as any).from('duyurular')
            .select('id, baslik, icerik, tip, created_at')
            .eq('aktif', true)
            .order('created_at', { ascending: false })
            .limit(3),

        // En Çok Satılan Ürünler (Global)
        (supabase as any)
            .from('urunler')
            .select(`
                id, ad, slug, ana_resim_url, stok_kodu,
                satis_fiyati_musteri,
                satis_fiyati_toptanci,
                satis_fiyati_alt_bayi,
                koli_ici_adet,
                palet_ici_adet,
                stok_miktari
            `)
            .eq('aktif', true)
            .not('ana_resim_url', 'is', null)
            .order('degerlendirme_sayisi', { ascending: false })
            .limit(6),
    ]);

    const aktifSiparisler = (aktifSiparislerRes.data ?? []) as any[];
    const sonSiparisler = (sonSiparislerRes.data ?? []) as any[];
    const yeniUrunler = (yeniUrunlerRes.data ?? []) as any[];
    const duyurular = (duyurularRes.data ?? []) as any[];
    const enCokSatilanlar = (enCokSatilanlarRes.data ?? []) as any[];

    // ── Sık Sipariş Edilen Ürünleri Tüm Fiyat & Paket Alanlarıyla Zenginleştir ──
    const rawSikUrunler = ((sikUrunlerRes.data as any[]) ?? []).slice(0, 8);
    const sikUrunIds = rawSikUrunler.map(u => u.id || u.urun_id).filter(Boolean);

    let sikUrunler: any[] = [];
    if (sikUrunIds.length > 0) {
        const { data: enrichedUrunler } = await (supabase as any)
            .from('urunler')
            .select(`
                id, ad, slug, ana_resim_url, stok_kodu,
                satis_fiyati_musteri,
                satis_fiyati_toptanci,
                satis_fiyati_alt_bayi,
                koli_ici_adet,
                palet_ici_adet,
                stok_miktari
            `)
            .in('id', sikUrunIds);

        if (enrichedUrunler && enrichedUrunler.length > 0) {
            const urunMap = new Map(enrichedUrunler.map((u: any) => [u.id, u]));
            sikUrunler = sikUrunIds.map(id => urunMap.get(id)).filter(Boolean);
        } else {
            sikUrunler = rawSikUrunler;
        }
    } else {
        sikUrunler = enCokSatilanlar.slice(0, 6);
    }

    // ── Değişkenler & Koşullar ────────────────────────────────────
    const aktifSiparisSayisi = aktifSiparisler.length;
    const favoriteCount = favoritesRes.count ?? 0;
    const odemeVadesi = finansalRes.data?.odeme_vadesi_gun ?? 30;
    const indirimOrani = finansalRes.data?.ozel_indirim_orani ?? 0;

    const mainDuyuru = duyurular.find((d: any) => d.tip === 'kampanya') || duyurular[0];
    const otherDuyurular = duyurular.filter((d: any) => d.id !== mainDuyuru?.id);

    const isNewCustomer = sonSiparisler.length === 0;
    const membershipText = membershipYears > 0
        ? `${membershipYears} ${L.year}`
        : membershipMonths > 0
            ? `${membershipMonths} ${L.months}`
            : locale === 'de' ? 'Neu' : 'Yeni';

    return (
        <div className="space-y-6 pb-12">

            {/* ── 1. Kampanya / Önemli Duyuru Banner ── */}
            {mainDuyuru && (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white rounded-2xl p-4 sm:p-5 shadow-md shadow-orange-500/10 flex items-center justify-between gap-4 flex-wrap">
                    <div className="absolute right-0 top-0 w-64 h-full bg-white/10 skew-x-12 pointer-events-none" />
                    <div className="flex items-center gap-3.5 relative z-10">
                        <div className="w-11 h-11 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs">
                            <FiBell size={20} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">
                                    {mainDuyuru.tip === 'kampanya' ? `🎁 ${L.announcementCampaign}` : `📢 ${L.announcement}`}
                                </span>
                            </div>
                            <p className="text-sm sm:text-base font-bold mt-0.5 text-white">{mainDuyuru.baslik}</p>
                            {mainDuyuru.icerik && (
                                <p className="text-xs text-white/90 mt-0.5 line-clamp-1 max-w-2xl">{mainDuyuru.icerik}</p>
                            )}
                        </div>
                    </div>
                    <Link
                        href={`/${locale}/portal/katalog`}
                        className="relative z-10 text-xs font-bold bg-white text-orange-700 px-4 py-2.5 rounded-xl hover:bg-orange-50 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 flex-shrink-0"
                    >
                        {L.promoBannerCta} <FiArrowRight size={13} />
                    </Link>
                </div>
            )}

            {/* ── 2. Modern Hero & Hoşgeldin Kartı ── */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-5 sm:p-7 shadow-lg border border-slate-800">
                {/* Arkaplan ambient ışıma */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute right-1/3 -bottom-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2.5 py-0.5 rounded-full">
                                <FiShield size={12} /> B2B Partner Portal
                            </span>
                            <span className="text-xs text-slate-400 font-medium">|</span>
                            <span className="text-xs text-slate-300">
                                {locale === 'de' ? 'Partner seit' : 'Müşterimizsiniz'}: <strong className="text-white font-semibold">{membershipText}</strong>
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-serif">
                            {locale === 'de' ? 'Willkommen' : 'Hoşgeldiniz'}, {firmaUnvan}
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
                            {locale === 'de'
                                ? 'Verwalten Sie Ihre Bestellungen, Favoriten und individuellen Großhandelspreise auf einen Blick.'
                                : 'Siparişlerinizi, favorilerinizi ve avantajlı toptan fiyatlarınızı tek ekrandan yönetin.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0 pt-2 sm:pt-0">
                        <Link
                            href={`/${locale}/portal/katalog`}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-blue-500/25 transition-all"
                        >
                            <FiShoppingCart size={15} />
                            {locale === 'de' ? 'Katalog öffnen' : 'Kataloğa Git'}
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── 3. KPI Gösterge Kartları ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                {/* 1. Aktif Siparişler */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{L.activeOrders}</span>
                            <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FiPackage size={18} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900">{aktifSiparisSayisi}</span>
                            <span className="flex items-center gap-1.5 text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                {L.inProgress}
                            </span>
                        </div>
                    </div>
                    <Link
                        href={`/${locale}/portal/siparisler`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                        {locale === 'de' ? 'Bestellungen einsehen' : 'Siparişleri Gör'} →
                    </Link>
                </div>

                {/* 2. Favoriler */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{L.myFavorites}</span>
                            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FiHeart size={18} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900">{favoriteCount}</span>
                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-md">
                                {locale === 'de' ? 'Gespeichert' : 'Kayıtlı Ürün'}
                            </span>
                        </div>
                    </div>
                    <Link
                        href={`/${locale}/portal/favoriler`}
                        className="text-xs font-semibold text-purple-600 hover:text-purple-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                        {L.view} →
                    </Link>
                </div>

                {/* 3. Avantajlar & Vade */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-slate-300 transition-all group flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{L.yourBenefits}</span>
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                                <FiAward size={18} />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-extrabold text-slate-900">{odemeVadesi} {L.days}</span>
                            {indirimOrani > 0 && (
                                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    %{indirimOrani} {L.discount}
                                </span>
                            )}
                        </div>
                    </div>
                    <Link
                        href={`/${locale}/portal/hesap-ozetim`}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 mt-3 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                        {locale === 'de' ? 'Kontoübersicht' : 'Hesap Özeti'} →
                    </Link>
                </div>
            </div>

            {/* ── 4. Hızlı İşlemler Barı ── */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 sm:p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">{L.quickActions}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    {[
                        {
                            label: L.newOrder,
                            sub: locale === 'de' ? 'Katalog durchsuchen' : 'Katalogdan seç',
                            icon: <FiShoppingCart size={18} />,
                            href: `/${locale}/portal/katalog`,
                            iconBg: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
                        },
                        {
                            label: L.fromFavorites,
                            sub: locale === 'de' ? 'Schnell nachbestellen' : 'Hızlı tekrar sipariş',
                            icon: <FiHeart size={18} />,
                            href: `/${locale}/portal/favoriler`,
                            iconBg: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
                        },
                        {
                            label: L.sampleRequest,
                            sub: locale === 'de' ? 'Kostenlos testen' : 'Ücretsiz deneyin',
                            icon: <FiPackage size={18} />,
                            href: `/${locale}/portal/taleplerim`,
                            iconBg: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
                        },
                        {
                            label: L.contact,
                            sub: locale === 'de' ? 'Fragen & Support' : 'Sorular ve destek',
                            icon: <FiPhone size={18} />,
                            href: `/${locale}/contact`,
                            iconBg: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
                        },
                    ].map(a => (
                        <Link
                            key={a.label}
                            href={a.href}
                            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-200/70 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all group"
                        >
                            <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${a.iconBg}`}>
                                {a.icon}
                            </span>
                            <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{a.label}</p>
                                <p className="text-[10px] text-slate-400 truncate hidden sm:block">{a.sub}</p>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── 5. Aktif Siparişler & Duyurular ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Sol: Aktif Siparişler Listesi */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiPackage size={16} className="text-orange-500" /> {L.activeOrdersTitle}
                            </h3>
                            <Link
                                href={`/${locale}/portal/siparisler`}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                            >
                                {L.allLink} <FiExternalLink size={11} />
                            </Link>
                        </div>

                        {aktifSiparisler.length === 0 ? (
                            <div className="p-8 sm:p-12 text-center">
                                <div className="w-14 h-14 mx-auto bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mb-3">
                                    <FiPackage size={24} />
                                </div>
                                <p className="text-sm font-semibold text-slate-700">{L.noActiveOrders}</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                                    {locale === 'de'
                                        ? 'Sie haben derzeit keine offenen Bestellungen. Erstellen Sie eine neue Bestellung aus dem Katalog.'
                                        : 'Şu anda açık bir siparişiniz bulunmuyor. Katalogdan kolayca yeni sipariş verebilirsiniz.'}
                                </p>
                                <Link
                                    href={`/${locale}/portal/katalog`}
                                    className="mt-4 inline-flex items-center gap-1.5 text-xs px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold transition-all shadow-xs"
                                >
                                    <FiPlus size={13} /> {L.placeNewOrder}
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {aktifSiparisler.map((s: any) => {
                                    const chip = STATUS_CHIP[s.siparis_durumu] || {
                                        bg: 'bg-slate-100 text-slate-700 border-slate-200',
                                        dot: 'bg-slate-400',
                                        label: s.siparis_durumu,
                                    };
                                    return (
                                        <Link
                                            key={s.id}
                                            href={`/${locale}/portal/siparisler/${s.id}`}
                                            className="block px-5 py-3.5 hover:bg-slate-50/70 transition-colors"
                                        >
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                                            #{s.id.slice(0, 8).toUpperCase()}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${chip.bg}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${chip.dot}`} />
                                                            {chip.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                                                        <FiCalendar size={11} className="text-slate-400" />
                                                        {formatLocaleDate(s.siparis_tarihi, locale)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm sm:text-base font-extrabold text-slate-900">{fmt(s.toplam_tutar_net)}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{L.net}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ: Duyurular */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiBell size={16} className="text-amber-500" /> {L.announcements}
                            </h3>
                        </div>
                        {otherDuyurular.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-xs text-slate-400">{L.noAnnouncements}</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {otherDuyurular.map((d: any) => (
                                    <div key={d.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                                        <div className="flex items-start gap-2.5">
                                            <span className="text-lg flex-shrink-0 mt-0.5">
                                                {d.tip === 'kampanya' ? '🎁' : d.tip === 'urun' ? '🆕' : '📢'}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-slate-800 line-clamp-2">{d.baslik}</p>
                                                {d.icerik && (
                                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{d.icerik}</p>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                                                    {formatLocaleDate(d.created_at, locale)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 6. Sık Sipariş Edilen Ürünler (Häufig bestellte Produkte) ── */}
            {sikUrunler.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                <FiClock size={17} className="text-blue-600" /> {L.frequentProducts}
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {locale === 'de'
                                    ? 'Ihre am häufigsten bestellten Produkte mit tagesaktuellen Staffelpreisen.'
                                    : 'En sık sipariş verdiğiniz ürünler ve güncel kademeli toptan fiyatları.'}
                            </p>
                        </div>
                        <Link
                            href={`/${locale}/portal/katalog`}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 self-start sm:self-auto"
                        >
                            {L.fullCatalog} <FiExternalLink size={12} />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sikUrunler.map((u: any) => {
                            const urunAd = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Sweet Heaven Produkt';
                            const targetHref = `/${locale}/portal/katalog/${u.id || u.urun_id}`;
                            return (
                                <div
                                    key={u.id || u.urun_id}
                                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden group"
                                >
                                    <div>
                                        {/* Ürün Görseli */}
                                        <Link href={targetHref} className="block relative aspect-[4/3] bg-gradient-to-b from-slate-50 to-slate-100/70 p-3 overflow-hidden">
                                            {u.ana_resim_url ? (
                                                <Image
                                                    src={u.ana_resim_url}
                                                    alt={urunAd}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-300">
                                                    <FiPackage size={32} />
                                                </div>
                                            )}
                                            {u.stok_kodu && (
                                                <span className="absolute top-2.5 left-2.5 text-[10px] font-mono font-medium text-slate-600 bg-white/90 backdrop-blur-xs border border-slate-200/60 px-2 py-0.5 rounded-md shadow-xs">
                                                    {u.stok_kodu}
                                                </span>
                                            )}
                                        </Link>

                                        {/* Ürün Bilgisi */}
                                        <div className="p-3.5">
                                            <Link href={targetHref} className="block group">
                                                <h4
                                                    title={urunAd}
                                                    className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-primary transition-colors"
                                                >
                                                    {urunAd}
                                                </h4>
                                            </Link>

                                            {/* Kademeli Fiyat Tablosu (1 Karton, 5+ Kartons, 1 Palette) */}
                                            <PriceTiers
                                                fiyat1={u.satis_fiyati_musteri}
                                                fiyat5={u.satis_fiyati_toptanci}
                                                fiyatPalet={u.satis_fiyati_alt_bayi}
                                                koliAdet={u.koli_ici_adet}
                                                paletAdet={u.palet_ici_adet}
                                                fmt={fmt}
                                                locale={locale}
                                            />
                                        </div>
                                    </div>

                                    {/* Sipariş Ekle Aksiyonu */}
                                    <div className="p-3.5 pt-0">
                                        <Link
                                            href={targetHref}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-primary text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
                                        >
                                            <FiShoppingCart size={13} />
                                            {locale === 'de' ? 'Bestellen' : 'Sipariş Ver'}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── 7. Yeni Ürünler (Yeni Eklenenler) ── */}
            {yeniUrunler.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                            ✨ {L.newProducts}
                            <span className="text-[11px] font-normal text-slate-400">({L.last30Days})</span>
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {yeniUrunler.map((u: any) => {
                            const urunAd = u.ad?.[locale] || u.ad?.de || u.ad?.tr || 'Sweet Heaven Produkt';
                            const targetHref = `/${locale}/portal/katalog/${u.id}`;
                            return (
                                <div
                                    key={u.id}
                                    className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col justify-between overflow-hidden group"
                                >
                                    <div>
                                        <Link href={targetHref} className="block relative aspect-[4/3] bg-gradient-to-b from-slate-50 to-slate-100/70 p-3 overflow-hidden">
                                            <span className="absolute top-2.5 left-2.5 z-10 text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                                {L.newBadge}
                                            </span>
                                            {u.ana_resim_url ? (
                                                <Image
                                                    src={u.ana_resim_url}
                                                    alt={urunAd}
                                                    fill
                                                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-slate-300">
                                                    <FiPackage size={32} />
                                                </div>
                                            )}
                                        </Link>
                                        <div className="p-3.5">
                                            <Link href={targetHref} className="block group">
                                                <h4
                                                    title={urunAd}
                                                    className="text-xs sm:text-sm font-bold text-slate-800 line-clamp-2 min-h-[2.5rem] leading-snug group-hover:text-primary transition-colors"
                                                >
                                                    {urunAd}
                                                </h4>
                                            </Link>
                                            <PriceTiers
                                                fiyat1={u.satis_fiyati_musteri}
                                                fiyat5={u.satis_fiyati_toptanci}
                                                fiyatPalet={u.satis_fiyati_alt_bayi}
                                                koliAdet={u.koli_ici_adet}
                                                paletAdet={u.palet_ici_adet}
                                                fmt={fmt}
                                                locale={locale}
                                            />
                                        </div>
                                    </div>
                                    <div className="p-3.5 pt-0">
                                        <Link
                                            href={targetHref}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all active:scale-95"
                                        >
                                            <FiShoppingCart size={13} />
                                            {locale === 'de' ? 'Bestellen' : 'Sipariş Ver'}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
