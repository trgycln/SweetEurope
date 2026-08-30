'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
    FiEdit, FiPhone, FiMail, FiUser, FiTag, FiCalendar, FiExternalLink,
    FiTrendingUp, FiDollarSign, FiPackage, FiCheckSquare, FiActivity,
    FiClock, FiMapPin, FiShoppingCart, FiPlus, FiAlertCircle, FiAward,
    FiBarChart2, FiPieChart
} from 'react-icons/fi';
import { FaInstagram, FaGlobe, FaLinkedin, FaMapMarkedAlt, FaFacebook } from 'react-icons/fa';
import { PortalErigimiVerButton } from './PortalErigimiVerButton';
import { FirmaOzetGrafik } from './FirmaOzetGrafik';
import { FirmaSiparisDurumChart } from './FirmaSiparisDurumChart';

interface MusteriDetayHubProps {
    firma: any;
    siparisler: any[];
    gorevler: any[];
    kisiler: any[];
    aktiviteler: any[];
    portalUsers: any[];
    ustBayi?: { id: string; unvan: string } | null;
    locale: string;
    isPortal?: boolean;
    etkinlikEkleFormSlot?: React.ReactNode;
    siparisDetaylar?: any[];
}

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    'MÜŞTERİ':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'Müşteri':        { bg: 'bg-green-100',  text: 'text-green-800',  dot: 'bg-green-500' },
    'ALT BAYİ':       { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500' },
    'NUMUNE VERİLDİ': { bg: 'bg-cyan-100',   text: 'text-cyan-800',   dot: 'bg-cyan-500' },
    'TEMAS EDİLDİ':   { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: 'bg-blue-500' },
    'ADAY':           { bg: 'bg-amber-100',  text: 'text-amber-800',  dot: 'bg-amber-400' },
    'REDDEDİLDİ':     { bg: 'bg-red-100',    text: 'text-red-800',    dot: 'bg-red-400' },
};

const STATUS_LABEL: Record<string, string> = {
    'MÜŞTERİ': 'Aktif Müşteri',
    'Müşteri': 'Aktif Müşteri',
    'ALT BAYİ': 'Alt Bayi',
    'NUMUNE VERİLDİ': 'Numune Verildi',
    'TEMAS EDİLDİ': 'Temas Edildi',
    'ADAY': 'Aday',
    'REDDEDİLDİ': 'Reddedildi',
};

const SIPARIS_STATUS_CHIP: Record<string, string> = {
    'Beklemede': 'bg-amber-100 text-amber-700',
    'Hazırlanıyor': 'bg-blue-100 text-blue-700',
    'processing': 'bg-cyan-100 text-cyan-700',
    'Yola Çıktı': 'bg-violet-100 text-violet-700',
    'shipped': 'bg-violet-100 text-violet-700',
    'Teslim Edildi': 'bg-emerald-100 text-emerald-700',
    'delivered': 'bg-emerald-100 text-emerald-700',
    'İptal Edildi': 'bg-red-100 text-red-700',
    'cancelled': 'bg-red-100 text-red-700',
};

const ETK_ICON: Record<string, string> = {
    'Not': '📝',
    'Telefon Görüşmesi': '📞',
    'Toplantı': '🤝',
    'E-posta': '✉️',
    'Teklif': '📄',
};

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

export function MusteriDetayHub({
    firma,
    siparisler,
    gorevler,
    kisiler,
    aktiviteler,
    portalUsers,
    ustBayi,
    locale,
    isPortal = false,
    etkinlikEkleFormSlot,
    siparisDetaylar = []
}: MusteriDetayHubProps) {
    const now = Date.now();
    const status = firma.status || 'ADAY';
    const statusStyle = STATUS_COLORS[status] || STATUS_COLORS['ADAY'];
    const statusLabel = STATUS_LABEL[status] || status;

    // Ciro ve sipariş hesaplamaları
    const gecerliSiparisler = useMemo(() => {
        return siparisler.filter(o => !['İptal Edildi', 'cancelled'].includes(o.siparis_durumu));
    }, [siparisler]);

    const lifetimeCiro = useMemo(() => {
        return gecerliSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || o.toplam_tutar_brut || 0), 0);
    }, [gecerliSiparisler]);

    const currentYear = new Date().getFullYear();
    const buYilSiparisler = useMemo(() => {
        return gecerliSiparisler.filter(o => o.siparis_tarihi && new Date(o.siparis_tarihi).getFullYear() === currentYear);
    }, [gecerliSiparisler, currentYear]);

    const buYilCiro = useMemo(() => {
        return buYilSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || o.toplam_tutar_brut || 0), 0);
    }, [buYilSiparisler]);

    const ortSepet = useMemo(() => {
        return gecerliSiparisler.length > 0 ? lifetimeCiro / gecerliSiparisler.length : 0;
    }, [gecerliSiparisler, lifetimeCiro]);

    const aktifSiparisler = useMemo(() => {
        return gecerliSiparisler.filter(o =>
            ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing', 'shipped'].includes(o.siparis_durumu)
        );
    }, [gecerliSiparisler]);

    // Son sipariş zamanı
    const sonSiparis = gecerliSiparisler[0];
    const sonSiparisGunOnce = sonSiparis?.siparis_tarihi
        ? Math.floor((now - new Date(sonSiparis.siparis_tarihi).getTime()) / 86400000)
        : null;

    let saglikLabel = 'Pasif';
    let saglikColor = 'border-slate-200/80 bg-gradient-to-br from-slate-50 to-white text-slate-700';
    if (sonSiparisGunOnce !== null) {
        if (sonSiparisGunOnce <= 30) { saglikLabel = '🟢 Aktif Müşteri'; saglikColor = 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white text-emerald-800'; }
        else if (sonSiparisGunOnce <= 60) { saglikLabel = '🔵 Düzenli Alıcı'; saglikColor = 'border-blue-200/80 bg-gradient-to-br from-blue-50 to-white text-blue-800'; }
        else if (sonSiparisGunOnce <= 90) { saglikLabel = '🟡 Sipariş Bekleniyor'; saglikColor = 'border-amber-200/80 bg-gradient-to-br from-amber-50 to-white text-amber-800'; }
        else { saglikLabel = '🔴 Uzun Süredir Alım Yok'; saglikColor = 'border-red-200/80 bg-gradient-to-br from-red-50 to-white text-red-800'; }
    }

    // Aylık Grafik Verisi (Son 12 Ay)
    const aylikGrafikVeri = useMemo(() => {
        const monthsMap: Record<string, { ciro: number; adet: number }> = {};
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthsMap[key] = { ciro: 0, adet: 0 };
        }

        gecerliSiparisler.forEach(s => {
            if (!s.siparis_tarihi) return;
            const d = new Date(s.siparis_tarihi);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (monthsMap[key]) {
                monthsMap[key].ciro += Number(s.toplam_tutar_net || s.toplam_tutar_brut || 0);
                monthsMap[key].adet += 1;
            }
        });

        return Object.entries(monthsMap).map(([month, val]) => ({
            month,
            ciro: Math.round(val.ciro),
            adet: val.adet
        }));
    }, [gecerliSiparisler]);

    // Sipariş Durum Dağılımı (Pasta Grafik)
    const durumDagilimi = useMemo(() => {
        const counts: Record<string, number> = {};
        siparisler.forEach(s => {
            const st = s.siparis_durumu || 'Beklemede';
            counts[st] = (counts[st] || 0) + 1;
        });
        return Object.entries(counts).map(([durum, adet]) => ({ durum, adet }));
    }, [siparisler]);

    // En Çok Aldığı Top Ürünler
    const topUrunler = useMemo(() => {
        const productStats = new Map<string, { ad: string; miktar: number; tutar: number; sayi: number }>();
        
        // Eğer sipariş detayları varsa oradan topla
        siparisDetaylar.forEach(item => {
            if (!item?.urun) return;
            const urunAd = item.urun.ad?.tr || item.urun.ad?.de || item.urun.ad || 'Ürün';
            const existing = productStats.get(item.urun_id) || { ad: urunAd, miktar: 0, tutar: 0, sayi: 0 };
            existing.miktar += Number(item.adet || item.miktar || 0);
            existing.tutar += Number(item.toplam_tutar || 0);
            existing.sayi += 1;
            productStats.set(item.urun_id, existing);
        });

        return Array.from(productStats.values())
            .sort((a, b) => b.tutar - a.tutar)
            .slice(0, 5);
    }, [siparisDetaylar]);

    const acikGorevler = gorevler.filter(g => !g.tamamlandi);

    const basePath = isPortal ? `/${locale}/portal/musterilerim` : `/${locale}/admin/crm/firmalar`;
    const siparisYeniPath = isPortal
        ? `/${locale}/portal/siparisler/yeni?firmaId=${firma.id}`
        : `/${locale}/admin/crm/firmalar/${firma.id}/siparisler/yeni`;

    return (
        <div className="space-y-5">
            {/* ── 1. ÜST HEADER & HIZLI İLETİŞİM ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        {/* Başlık ve Rozetler */}
                        <div className="flex items-center gap-2.5 flex-wrap mb-2">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{firma.unvan}</h1>

                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${statusStyle.bg} ${statusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                                {statusLabel}
                            </span>

                            {ustBayi && (
                                <Link
                                    href={isPortal ? `/${locale}/portal/musterilerim` : `/${locale}/admin/crm/firmalar/${ustBayi.id}`}
                                    className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1 hover:bg-purple-200 transition-colors"
                                    title="Bağlı Olduğu Alt Bayi"
                                >
                                    🤝 Alt Bayi: {ustBayi.unvan}
                                </Link>
                            )}

                            {firma.kategori && (
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                    {firma.kategori}
                                </span>
                            )}
                        </div>

                        {/* Temel İletişim Satırı */}
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-600">
                            {(firma.sehir || firma.ilce) && (
                                <span className="flex items-center gap-1 font-medium text-slate-800">
                                    <FiMapPin size={13} className="text-blue-600" />
                                    {[firma.posta_kodu, firma.ilce, firma.sehir].filter(Boolean).join(', ')}
                                </span>
                            )}
                            {firma.telefon && (
                                <a href={`tel:${firma.telefon}`} className="flex items-center gap-1 hover:text-blue-600 font-mono">
                                    <FiPhone size={12} className="text-slate-400" /> {firma.telefon}
                                </a>
                            )}
                            {firma.email && (
                                <a href={`mailto:${firma.email}`} className="flex items-center gap-1 hover:text-blue-600">
                                    <FiMail size={12} className="text-slate-400" /> {firma.email}
                                </a>
                            )}
                            {firma.sorumlu_personel?.tam_ad && (
                                <span className="flex items-center gap-1">
                                    <FiUser size={12} className="text-slate-400" /> Sorumlu: <strong className="text-slate-700">{firma.sorumlu_personel.tam_ad}</strong>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Sağ Aksiyon Butonları */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <PortalErigimiVerButton
                            firmaId={firma.id}
                            firmaUnvan={firma.unvan}
                            firmaEmail={firma.email || null}
                            yetkiliKisi={firma.yetkili_kisi || null}
                            locale={locale}
                            portalUsers={portalUsers}
                            firmaStatus={status}
                        />

                        {firma.google_maps_url && (
                            <a
                                href={firma.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
                            >
                                <FaMapMarkedAlt size={13} /> Haritada Aç
                            </a>
                        )}

                        <Link
                            href={isPortal ? `/${locale}/portal/musterilerim/${firma.id}/duzenle` : `/${locale}/admin/crm/firmalar/${firma.id}/duzenle`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                            <FiEdit size={13} /> Düzenle
                        </Link>
                    </div>
                </div>
            </div>

            {/* ── 2. 5 PERFORMANS & SAĞLIK KPI KARTI ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. Toplam Ciro */}
                <div className="bg-white border border-blue-200/80 rounded-xl p-4 shadow-xs bg-gradient-to-br from-blue-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Lifetime Ciro</span>
                        <FiDollarSign className="text-blue-500" size={15} />
                    </div>
                    <p className="text-lg font-bold text-blue-900">{fmt(lifetimeCiro)}</p>
                    <p className="text-[11px] text-blue-700 mt-1 font-medium">{gecerliSiparisler.length} sipariş</p>
                </div>

                {/* 2. Bu Yılki Alım */}
                <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-xs bg-gradient-to-br from-emerald-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{currentYear} Cirosu</span>
                        <FiTrendingUp className="text-emerald-500" size={15} />
                    </div>
                    <p className="text-lg font-bold text-emerald-900">{fmt(buYilCiro)}</p>
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">{buYilSiparisler.length} sipariş</p>
                </div>

                {/* 3. Ortalama Sepet (AOV) */}
                <div className="bg-white border border-purple-200/80 rounded-xl p-4 shadow-xs bg-gradient-to-br from-purple-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Ortalama Sepet</span>
                        <FiShoppingCart className="text-purple-500" size={15} />
                    </div>
                    <p className="text-lg font-bold text-purple-900">{fmt(ortSepet)}</p>
                    <p className="text-[11px] text-purple-700 mt-1 font-medium">Sipariş başına</p>
                </div>

                {/* 4. Süreçteki Siparişler */}
                <div className="bg-white border border-orange-200/80 rounded-xl p-4 shadow-xs bg-gradient-to-br from-orange-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-700">Aktif Sipariş</span>
                        <FiPackage className="text-orange-500" size={15} />
                    </div>
                    <p className="text-lg font-bold text-orange-900">{aktifSiparisler.length} <span className="text-xs font-normal text-slate-500">Adet</span></p>
                    <p className="text-[11px] text-orange-700 mt-1 font-medium">
                        {aktifSiparisler.length > 0 ? 'Dağıtımda / Hazırlanıyor' : 'Süreçte yok'}
                    </p>
                </div>

                {/* 5. Müşteri Sağlığı */}
                <div className={`border rounded-xl p-4 shadow-xs ${saglikColor}`}>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider">Müşteri Sağlığı</span>
                        <FiClock size={15} />
                    </div>
                    <p className="text-sm font-bold truncate">{saglikLabel}</p>
                    <p className="text-[11px] mt-1 font-medium">
                        {sonSiparisGunOnce !== null ? `${sonSiparisGunOnce} gün önce` : 'Alım yok'}
                    </p>
                </div>
            </div>

            {/* ── 2.5 STRATEJİK SATIŞ & ÜRÜN EŞLEŞME KARTI (AI INSIGHTS & SALES STRATEGY) ── */}
            {(() => {
                const tekOz = (firma.teknik_ozellikler as any) || {};
                const hasStrateji = !!(
                    tekOz.satis_stratejisi ||
                    tekOz.crosssell_firsati ||
                    tekOz.tahmini_aylik_potansiyel_eur ||
                    (Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0) ||
                    tekOz.churn_riski ||
                    tekOz.isletme_tipi ||
                    tekOz.notlar
                );

                const GAM_META: Record<string, { label: string; bg: string; text: string; border: string; emoji: string }> = {
                    barista:  { label: 'Barista & Kahve Barı', bg: 'bg-amber-50',    text: 'text-amber-800', border: 'border-amber-200', emoji: '☕' },
                    dondurma: { label: 'Eis & Gelato / Dondurma', bg: 'bg-blue-50',     text: 'text-blue-800',  border: 'border-blue-200',  emoji: '🍦' },
                    pastaci:  { label: 'Konditorei / Pastane', bg: 'bg-pink-50',     text: 'text-pink-800',  border: 'border-pink-200',  emoji: '🍰' },
                    icecek:   { label: 'Getränke & İçecek', bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-200', emoji: '🍹' },
                };

                const ISLETME_TIPI: Record<string, string> = {
                    kafe: 'Kafe / Coffee Shop', restoran: 'Restoran', pastane: 'Pastane / Fırın',
                    dondurma: 'Dondurma Dükkanı', otel: 'Otel / Konaklama', catering: 'Catering & Etkinlik',
                    bufe: 'Büfe / Bistro', diger: 'Diğer İşletme',
                };

                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Sol: Satış Stratejisi & Potansiyel */}
                        <div className="bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border border-amber-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    🎯 Satış Stratejisi & Büyüme Fırsatı
                                </h3>
                                {tekOz.tahmini_aylik_potansiyel_eur && (
                                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                        ~{fmt(tekOz.tahmini_aylik_potansiyel_eur)} / ay Potansiyel
                                    </span>
                                )}
                            </div>

                            {tekOz.satis_stratejisi ? (
                                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/80 p-3 rounded-xl border border-amber-100">
                                    {tekOz.satis_stratejisi}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500 italic">
                                    Bu müşteri için henüz özel bir satış stratejisi notu girilmemiş.
                                </p>
                            )}

                            {/* Cross-sell & Churn Riskleri */}
                            <div className="flex flex-wrap gap-2 pt-1">
                                {tekOz.crosssell_firsati && (
                                    <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                        🌱 <strong>Çapraz Satış:</strong> {tekOz.crosssell_firsati}
                                    </div>
                                )}
                                {tekOz.churn_riski && (
                                    <div className="text-[11px] font-semibold text-red-800 bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                                        ⚠️ <strong>Risk:</strong> {tekOz.churn_neden || 'Kayıp / Churn Riski'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Sağ: Tercih Edilen Ürün Gamı & İşletme Tipi */}
                        <div className="bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border border-purple-200/80 rounded-2xl p-5 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                                    🏷️ Tercih Edilen Ürün Gamı & Eşleşme
                                </h3>
                                {tekOz.isletme_tipi && (
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                        {ISLETME_TIPI[tekOz.isletme_tipi] || tekOz.isletme_tipi}
                                    </span>
                                )}
                            </div>

                            {/* Gam Rozetleri */}
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0 ? (
                                    tekOz.tercihli_urun_gami.map((gam: string) => {
                                        const meta = GAM_META[gam] || { label: gam, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', emoji: '📦' };
                                        return (
                                            <span
                                                key={gam}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${meta.bg} ${meta.text} ${meta.border}`}
                                            >
                                                <span>{meta.emoji}</span> {meta.label}
                                            </span>
                                        );
                                    })
                                ) : (
                                    <span className="text-xs text-slate-500 italic">
                                        Tercihli ürün gamı henüz seçilmemiş.
                                    </span>
                                )}
                            </div>

                            {/* Altyapı & Rakip Bilgisi */}
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-100 text-xs text-slate-600">
                                {tekOz.koltuk_sayisi != null && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Kapasite</span>
                                        <span className="font-semibold text-slate-800">{tekOz.koltuk_sayisi} Koltuk / Masa</span>
                                    </div>
                                )}
                                {tekOz.rakip_kullaniyor_mu && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Rakip Ürün</span>
                                        <span className="font-semibold text-red-600">{tekOz.rakip_marka || 'Mevcut'}</span>
                                    </div>
                                )}
                                {tekOz.odeme_yontemi && (
                                    <div>
                                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Ödeme Koşulu</span>
                                        <span className="font-semibold text-slate-800 capitalize">{tekOz.odeme_yontemi}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── 3. DETAYLI GRAFİK BÖLÜMÜ (SON 12 AY CİRO & SİPARİŞ DURUM DAĞILIMI) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Aylık Ciro Çubuk Grafiği - 2/3 */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-xs p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FiBarChart2 className="text-blue-600" size={16} /> Son 12 Ay Sipariş & Ciro Hacmi
                        </h3>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Net Toplam: {fmt(lifetimeCiro)}
                        </span>
                    </div>
                    <FirmaOzetGrafik data={aylikGrafikVeri} />
                </div>

                {/* Sipariş Durum Pasta Grafiği - 1/3 */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FiPieChart className="text-purple-600" size={16} /> Sipariş Dağılımı
                        </h3>
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {siparisler.length} Sipariş
                        </span>
                    </div>
                    <FirmaSiparisDurumChart data={durumDagilimi.length > 0 ? durumDagilimi : [{ durum: 'Beklemede', adet: 0 }]} />
                </div>
            </div>

            {/* ── 4. ANA İÇERİK IZGARASI (SOL: SİPARİŞ & ETKİNLİK | SAĞ: KARTVİZİT & GÖREVLER) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* ── SOL KOLON (2/3): Sipariş Geçmişi & Notlar ── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Son Siparişler Tablosu */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FiShoppingCart size={14} className="text-blue-600" />
                                Son Siparişler ({gecerliSiparisler.length})
                            </span>
                            <Link
                                href={siparisYeniPath}
                                className="inline-flex items-center gap-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
                            >
                                <FiPlus size={13} /> Yeni Sipariş Gir
                            </Link>
                        </div>

                        {gecerliSiparisler.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                Bu müşteriye ait henüz sipariş kaydı bulunmuyor.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2.5">Sipariş No</th>
                                            <th className="px-4 py-2.5">Tarih</th>
                                            <th className="px-4 py-2.5">Durum</th>
                                            <th className="px-4 py-2.5 text-right">Tutar (Net)</th>
                                            <th className="px-4 py-2.5 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {gecerliSiparisler.slice(0, 5).map((s: any) => (
                                            <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-800">
                                                    #{s.id.substring(0, 8).toUpperCase()}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {s.siparis_tarihi ? new Date(s.siparis_tarihi).toLocaleDateString('tr-TR') : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SIPARIS_STATUS_CHIP[s.siparis_durumu] || 'bg-slate-100 text-slate-600'}`}>
                                                        {s.siparis_durumu}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                    {fmt(s.toplam_tutar_net || s.toplam_tutar_brut)}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={isPortal ? `/${locale}/portal/siparisler/${s.id}` : `/${locale}/admin/operasyon/siparisler/${s.id}`}
                                                        className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                                    >
                                                        Detay ➔
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Etkinlik Ekleme Formu Slotu (varsa) */}
                    {etkinlikEkleFormSlot && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                📝 Görüşme Notu / Etkinlik Ekle
                            </h3>
                            {etkinlikEkleFormSlot}
                        </div>
                    )}

                    {/* Görüşme Notları & Etkinlik Akışı */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FiActivity size={14} className="text-indigo-600" />
                                Görüşme & Temas Geçmişi ({aktiviteler.length})
                            </span>
                        </div>

                        {aktiviteler.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                Henüz kayıtlı görüşme veya ziyaret notu bulunmuyor.
                            </div>
                        ) : (
                            <div className="p-4 space-y-3">
                                {aktiviteler.map((etk: any) => (
                                    <div key={etk.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start gap-3">
                                        <span className="text-xl p-1.5 rounded-lg bg-white shadow-2xs border border-slate-200">
                                            {ETK_ICON[etk.etkinlik_tipi] || '📌'}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <span className="text-xs font-bold text-slate-800">{etk.etkinlik_tipi}</span>
                                                <span className="text-[11px] text-slate-400">{timeAgo(etk.created_at)}</span>
                                            </div>
                                            <p className="text-xs text-slate-700 leading-relaxed">{etk.aciklama}</p>
                                            {etk.olusturan_personel?.tam_ad && (
                                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                                    <FiUser size={10} /> Ekleyen: {etk.olusturan_personel.tam_ad}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SAĞ KOLON (1/3): Müşteri Kartviziti & Görevler ── */}
                <div className="space-y-5">
                    {/* 📍 Lokasyon & Adres Kartı */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FiMapPin size={13} className="text-blue-600" /> Lokasyon & İletişim
                        </h3>
                        <div className="text-xs text-slate-700 space-y-2">
                            {firma.adres && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Adres</span>
                                    <p className="font-medium">{firma.adres}</p>
                                </div>
                            )}
                            {(firma.sehir || firma.ilce || firma.posta_kodu) && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Bölge</span>
                                    <p className="font-medium">{[firma.posta_kodu, firma.ilce, firma.sehir].filter(Boolean).join(', ')}</p>
                                </div>
                            )}
                            {firma.telefon && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Telefon</span>
                                    <a href={`tel:${firma.telefon}`} className="font-mono text-blue-600 hover:underline">
                                        {firma.telefon}
                                    </a>
                                </div>
                            )}
                            {firma.email && (
                                <div>
                                    <span className="text-slate-400 block text-[10px] uppercase font-bold">E-Posta</span>
                                    <a href={`mailto:${firma.email}`} className="text-blue-600 hover:underline break-all">
                                        {firma.email}
                                    </a>
                                </div>
                            )}
                        </div>

                        {firma.google_maps_url && (
                            <a
                                href={firma.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-colors"
                            >
                                <FaMapMarkedAlt size={13} /> Google Haritalarda Gör ➔
                            </a>
                        )}
                    </div>

                    {/* 👤 Yetkili & İlgili Kişiler */}
                    {kisiler.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <FiUser size={13} className="text-purple-600" /> Yetkililer ({kisiler.length})
                            </h3>
                            <div className="divide-y divide-slate-100">
                                {kisiler.map((k: any) => (
                                    <div key={k.id} className="py-2 flex items-start gap-2.5">
                                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                            {(k.ad_soyad || '?')[0].toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0 text-xs">
                                            <p className="font-bold text-slate-800 truncate">{k.ad_soyad}</p>
                                            {k.unvan && <p className="text-[10px] text-slate-400">{k.unvan}</p>}
                                            {k.telefon && (
                                                <a href={`tel:${k.telefon}`} className="text-[11px] text-blue-600 hover:underline block font-mono">
                                                    {k.telefon}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ✅ Görevler & Hatırlatmalar */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-3">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <FiCheckSquare size={13} className="text-teal-600" /> Hatırlatmalar & Görevler ({acikGorevler.length})
                        </h3>
                        {acikGorevler.length === 0 ? (
                            <p className="text-slate-400 text-xs py-2">Bekleyen açık görev yok.</p>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {acikGorevler.map((g: any) => (
                                    <div key={g.id} className="py-2">
                                        <p className="text-xs font-semibold text-slate-800">{g.baslik}</p>
                                        {g.son_tarih && (
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                <FiCalendar size={10} /> {new Date(g.son_tarih).toLocaleDateString('tr-TR')}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 🌐 Sosyal Medya & Web */}
                    {(firma.instagram_url || firma.facebook_url || firma.web_url) && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Web & Sosyal</h3>
                            <div className="flex flex-wrap gap-2">
                                {firma.instagram_url && (
                                    <a href={firma.instagram_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 bg-pink-50 text-pink-700 hover:bg-pink-100 rounded-lg text-xs font-semibold transition-colors">
                                        <FaInstagram /> Instagram
                                    </a>
                                )}
                                {firma.web_url && (
                                    <a href={firma.web_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-xs font-semibold transition-colors">
                                        <FaGlobe /> Website
                                    </a>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 🏷️ Etiketler (Tags) */}
                    {Array.isArray(firma.etiketler) && firma.etiketler.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <FiTag size={12} className="text-indigo-600" /> Etiketler
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {firma.etiketler.map((t: string) => (
                                    <span key={t} className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                        {t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
