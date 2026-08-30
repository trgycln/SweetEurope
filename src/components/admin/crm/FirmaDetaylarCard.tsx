'use client';

import React from 'react';
import Link from 'next/link';
import {
    FiMapPin, FiPhone, FiMail, FiGlobe, FiInfo, FiBriefcase,
    FiDollarSign, FiTag, FiUser, FiEdit, FiAward, FiShield,
    FiCheckCircle, FiHelpCircle
} from 'react-icons/fi';
import { FaInstagram, FaFacebook, FaLinkedin, FaMapMarkedAlt } from 'react-icons/fa';

interface FirmaDetaylarCardProps {
    firma: any;
    locale: string;
    isPortal?: boolean;
}

export function FirmaDetaylarCard({ firma, locale, isPortal = false }: FirmaDetaylarCardProps) {
    const editHref = isPortal
        ? `/${locale}/portal/musterilerim/${firma.id}/duzenle`
        : `/${locale}/admin/crm/firmalar/${firma.id}/duzenle`;

    const tekOz = (firma.teknik_ozellikler as any) || {};

    const fmtLocal = (v: number | null | undefined) =>
        new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

    const GAM_META: Record<string, { label: string; bg: string; text: string; border: string; emoji: string; hint: string }> = {
        barista:  { label: 'Barista & Kahve Barı', bg: 'bg-amber-50',    text: 'text-amber-800', border: 'border-amber-200', emoji: '☕', hint: 'Kahve şurupları, sıcak/soğuk soslar, püreler.' },
        dondurma: { label: 'Eis & Gelato / Dondurma', bg: 'bg-blue-50',     text: 'text-blue-800',  border: 'border-blue-200',  emoji: '🍦', hint: 'Dondurma sosları, kuplar, toppingler.' },
        pastaci:  { label: 'Konditorei / Pastane', bg: 'bg-pink-50',     text: 'text-pink-800',  border: 'border-pink-200',  emoji: '🍰', hint: 'Pastacılık dolguları, kremalar, parlatıcılar.' },
        icecek:   { label: 'Getränke & İçecek', bg: 'bg-emerald-50',  text: 'text-emerald-800', border: 'border-emerald-200', emoji: '🍹', hint: 'Limonata bazları, frappe ve smoothie tozları.' },
    };

    const ISLETME_TIPI: Record<string, string> = {
        kafe: 'Kafe / Coffee Shop', restoran: 'Restoran', pastane: 'Pastane / Fırın',
        dondurma: 'Dondurma Dükkanı', otel: 'Otel / Konaklama', catering: 'Catering & Etkinlik',
        bufe: 'Büfe / Bistro', diger: 'Diğer İşletme',
    };

    return (
        <div className="space-y-6">
            {/* ── 1. ÜST BAŞLIK, ROZETLER & DÜZENLE BUTONU ── */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/80 flex-wrap gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <FiInfo className="text-blue-600" /> Firma Detayları & Kurumsal Profil
                    </h2>
                    {firma.oncelik && (
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            firma.oncelik === 'A' ? 'bg-red-50 text-red-700 border-red-200' :
                            firma.oncelik === 'B' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`} title="Müşteri Segmenti & Öncelik Puanı">
                            Öncelik: {firma.oncelik} Segment
                        </span>
                    )}
                    {firma.kaynak && (
                        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200" title="Müşterinin nasıl bulunduğu / kaynak">
                            Kaynak: {firma.kaynak}
                        </span>
                    )}
                </div>
                <Link
                    href={editHref}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                    <FiEdit size={13} /> Bilgileri Düzenle
                </Link>
            </div>

            {/* ── 2. ETİKETLER (TAGS) ── */}
            {Array.isArray(firma.etiketler) && firma.etiketler.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <FiTag size={13} className="text-indigo-600" /> Etiketler:
                    </span>
                    {firma.etiketler.map((t: string) => (
                        <span key={t} className="text-xs font-medium px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-800 shadow-2xs">
                            {t}
                        </span>
                    ))}
                </div>
            )}

            {/* ── 3. FERAH 3 TEMEL BİLGİ KARTIZIZITI (İLETİŞİM | TİCARİ | SOSYAL MEDYA) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* 1. İletişim & Adres Bilgileri */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <FiMapPin className="text-blue-600" size={15} /> İletişim & Adres Bilgileri
                        <span className="text-slate-400 font-normal cursor-help" title="Firmanın fiziksel konumu ve iletişim bilgileri.">ℹ️</span>
                    </h3>
                    <div className="space-y-3 text-xs">
                        <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Yetkili / Muhatap</span>
                            <span className="text-slate-900 font-bold text-sm">{firma.yetkili_kisi || '—'}</span>
                        </div>
                        <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Açık Adres (Sokak & No)</span>
                            <span className="text-slate-800 font-medium leading-relaxed">{firma.adres || 'Adres girilmemiş'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Şehir / Bölge</span>
                                <span className="text-slate-900 font-semibold">{[firma.ilce, firma.sehir].filter(Boolean).join(', ') || '—'}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Posta Kodu</span>
                                <span className="text-slate-900 font-mono font-bold">{firma.posta_kodu || '—'}</span>
                            </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                            {firma.telefon && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">Telefon:</span>
                                    <a href={`tel:${firma.telefon}`} className="font-mono font-bold text-blue-600 hover:underline">
                                        {firma.telefon}
                                    </a>
                                </div>
                            )}
                            {firma.email && (
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-400 font-medium">E-Posta:</span>
                                    <a href={`mailto:${firma.email}`} className="font-semibold text-blue-600 hover:underline break-all max-w-[170px]">
                                        {firma.email}
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Ticari & Kurumsal Kimlik */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <FiBriefcase className="text-purple-600" size={15} /> Ticari & Kurumsal Kimlik
                        <span className="text-slate-400 font-normal cursor-help" title="Fatura, vergi ve banka mutabakat bilgileri.">ℹ️</span>
                    </h3>
                    <div className="space-y-3 text-xs">
                        <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Ticari Ünvan</span>
                            <span className="text-slate-900 font-bold text-sm">{firma.unvan}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Vergi Dairesi</span>
                                <span className="text-slate-800 font-medium">{firma.vergi_dairesi || '—'}</span>
                            </div>
                            <div>
                                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Vergi / Steuernummer</span>
                                <span className="text-slate-900 font-mono font-bold">{firma.vergi_no || '—'}</span>
                            </div>
                        </div>
                        <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Banka IBAN</span>
                            <span className="text-slate-900 font-mono font-medium text-xs break-all bg-slate-50 p-2 rounded-lg border border-slate-100 block">
                                {firma.iban || 'IBAN girilmemiş'}
                            </span>
                        </div>
                        {firma.sorumlu_personel?.tam_ad && (
                            <div className="pt-2 border-t border-slate-100">
                                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sorumlu Satış Temsilcisi</span>
                                <span className="text-slate-900 font-bold">{firma.sorumlu_personel.tam_ad}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Web & Sosyal Medya */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-100">
                        <FiGlobe className="text-emerald-600" size={15} /> Web & Sosyal Medya
                        <span className="text-slate-400 font-normal cursor-help" title="İşletmenin dijital varlıkları ve harita konumu.">ℹ️</span>
                    </h3>
                    <div className="space-y-3.5 text-xs">
                        <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Web Sitesi</span>
                            {firma.web_url ? (
                                <a
                                    href={firma.web_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline flex items-center gap-1.5 font-semibold break-all"
                                >
                                    <FiGlobe size={13} /> {firma.web_url.replace(/^https?:\/\//, '')}
                                </a>
                            ) : <span className="text-slate-400 italic">Web sitesi eklenmemiş</span>}
                        </div>

                        <div>
                            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instagram</span>
                            {firma.instagram_url ? (
                                <a
                                    href={firma.instagram_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-pink-600 hover:underline flex items-center gap-1.5 font-semibold break-all"
                                >
                                    <FaInstagram size={13} /> {firma.instagram_url.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@')}
                                </a>
                            ) : <span className="text-slate-400 italic">Instagram eklenmemiş</span>}
                        </div>

                        {firma.google_maps_url && (
                            <div className="pt-2 border-t border-slate-100">
                                <a
                                    href={firma.google_maps_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition"
                                >
                                    <FaMapMarkedAlt size={14} /> Google Haritalarda Gör ➔
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 4. STRATEJİK B2B SATIŞ KARTLARI (SATIŞ STRATEJİSİ & ÜRÜN EŞLEŞMESİ) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-200/80">
                {/* Sol: B2B Satış Stratejisi & Büyüme Potansiyeli */}
                <div className="bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 border border-amber-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                            🎯 B2B Satış Stratejisi & Potansiyel
                            <span className="text-amber-700/60 font-normal cursor-help" title="Müşteriye özel belirlenen satış yaklaşımı ve aylık tahmini ciro potansiyeli.">ℹ️</span>
                        </h3>
                        {tekOz.tahmini_aylik_potansiyel_eur && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                                ~{fmtLocal(tekOz.tahmini_aylik_potansiyel_eur)} / ay Potansiyel
                            </span>
                        )}
                    </div>

                    {tekOz.satis_stratejisi ? (
                        <p className="text-xs text-slate-800 leading-relaxed font-medium bg-white/90 p-3.5 rounded-xl border border-amber-100 shadow-2xs">
                            {tekOz.satis_stratejisi}
                        </p>
                    ) : (
                        <p className="text-xs text-slate-400 italic bg-white/50 p-3 rounded-xl border border-amber-50">
                            Bu müşteri için henüz bir satış stratejisi notu girilmemiş. Düzenle formundan ekleyebilirsiniz.
                        </p>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                        {tekOz.crosssell_firsati && (
                            <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                                🌱 <strong>Çapraz Satış:</strong> {tekOz.crosssell_firsati}
                            </div>
                        )}
                        {tekOz.churn_riski && (
                            <div className="text-xs font-semibold text-red-800 bg-red-50 border border-red-200 px-3 py-1 rounded-xl">
                                ⚠️ <strong>Risk:</strong> {tekOz.churn_neden || 'Kayıp / Churn Riski'}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sağ: Tercih Edilen Ürün Gamı & Mekan Profili */}
                <div className="bg-gradient-to-br from-purple-50/60 via-white to-purple-50/20 border border-purple-200/90 rounded-2xl p-5 shadow-xs space-y-3.5">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                            🏷️ Tercih Edilen Ürün Gamı & Eşleşme
                            <span className="text-purple-700/60 font-normal cursor-help" title="İşletmenin odaklandığı tatlı ve içecek kategorileri.">ℹ️</span>
                        </h3>
                        {tekOz.isletme_tipi && (
                            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                                {ISLETME_TIPI[tekOz.isletme_tipi] || tekOz.isletme_tipi}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {Array.isArray(tekOz.tercihli_urun_gami) && tekOz.tercihli_urun_gami.length > 0 ? (
                            tekOz.tercihli_urun_gami.map((gam: string) => {
                                const meta = GAM_META[gam] || { label: gam, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', emoji: '📦', hint: '' };
                                return (
                                    <span
                                        key={gam}
                                        title={meta.hint}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shadow-2xs ${meta.bg} ${meta.text} ${meta.border}`}
                                    >
                                        <span>{meta.emoji}</span> {meta.label}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-xs text-slate-400 italic bg-white/50 p-3 rounded-xl border border-purple-50 w-full block">
                                Tercihli ürün gamı henüz seçilmemiş.
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-100 text-xs text-slate-700">
                        {tekOz.koltuk_sayisi != null && (
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mekan Kapasitesi</span>
                                <span className="font-bold text-slate-900 text-sm">{tekOz.koltuk_sayisi} Koltuk / Masa</span>
                            </div>
                        )}
                        {tekOz.rakip_kullaniyor_mu && (
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Rakip Marka Bilgisi</span>
                                <span className="font-bold text-red-600 text-sm">{tekOz.rakip_marka || 'Mevcut'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
