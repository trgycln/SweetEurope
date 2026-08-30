'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    FiUsers, FiDollarSign, FiPackage, FiTruck, FiAlertCircle,
    FiCheckCircle, FiPhone, FiMail, FiMapPin, FiEdit, FiPlus,
    FiExternalLink, FiClock, FiActivity, FiKey, FiLayers
} from 'react-icons/fi';
import { PortalErigimiVerButton } from './PortalErigimiVerButton';

interface AltBayiDetayHubProps {
    firma: any;
    bayiMusterileri: any[];
    bayiMusteriSiparisleri: any[];
    bayiStoklari: any[];
    bayiIkmalSiparisleri: any[];
    portalUsers: any[];
    locale: string;
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

export function AltBayiDetayHub({
    firma,
    bayiMusterileri,
    bayiMusteriSiparisleri,
    bayiStoklari,
    bayiIkmalSiparisleri,
    portalUsers,
    locale
}: AltBayiDetayHubProps) {
    const [activeTab, setActiveTab] = useState<'musteriler' | 'stoklar' | 'ikmal' | 'portal'>('musteriler');

    const now = new Date();
    const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // ── Hesaplamalar ──
    const aktifMusteriSayisi = bayiMusterileri.filter(m => m.status === 'MÜŞTERİ' || m.status === 'Müşteri').length;
    const adayMusteriSayisi = bayiMusterileri.length - aktifMusteriSayisi;

    const gecerliMSiparisler = bayiMusteriSiparisleri.filter(o => !['İptal Edildi', 'cancelled'].includes(o.siparis_durumu));
    const toplamMusteriCirosu = gecerliMSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);
    const buAyMSiparisler = gecerliMSiparisler.filter(o => o.siparis_tarihi >= currentMonthStart);
    const buAyMusteriCirosu = buAyMSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);

    const gecerliIkmalSiparisler = bayiIkmalSiparisleri.filter(o => !['İptal Edildi', 'cancelled'].includes(o.siparis_durumu));
    const toplamIkmalCirosu = gecerliIkmalSiparisler.reduce((s, o) => s + Number(o.toplam_tutar_net || 0), 0);

    const acikSiparisler = gecerliMSiparisler.filter(o => ['Beklemede', 'Hazırlanıyor', 'Yola Çıktı', 'processing'].includes(o.siparis_durumu));
    const teslimSiparisler = gecerliMSiparisler.filter(o => ['Teslim Edildi', 'delivered'].includes(o.siparis_durumu));

    const kritikStoklar = bayiStoklari.filter(s => (s.miktar || 0) <= (s.kritik_stok_seviyesi || 10));

    return (
        <div className="space-y-6">
            {/* ── ÜST KURUMSAL BAYİ HEADER KARTI ── */}
            <div className="bg-white border border-purple-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Mor Gradient Bayi Rozet Bandı */}
                <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white px-6 py-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl p-2.5 rounded-xl bg-white/10 backdrop-blur-xs">🏢</span>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-2xl font-bold text-white tracking-tight">{firma.unvan}</h1>
                                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white border border-white/30 backdrop-blur-xs shadow-xs">
                                        🤝 Yetkili Bölge Dağıtım Bayisi
                                    </span>
                                </div>
                                <p className="text-xs text-purple-100 font-medium mt-1 opacity-95">
                                    ElysonSweets GmbH Bölgesel Dağıtım & Satış İştiraki
                                </p>
                            </div>
                        </div>

                        {/* Hızlı Aksiyon Butonları */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <PortalErigimiVerButton
                                firmaId={firma.id}
                                firmaUnvan={firma.unvan}
                                firmaEmail={firma.email || null}
                                yetkiliKisi={firma.yetkili_kisi || null}
                                locale={locale}
                                portalUsers={portalUsers}
                                firmaStatus={firma.status || 'ALT BAYİ'}
                            />
                            <Link
                                href={`/${locale}/admin/operasyon/siparisler/yeni?firma_id=${firma.id}`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                            >
                                <FiPackage size={14} /> Merkeze İkmal Siparişi Aç
                            </Link>
                            <Link
                                href={`/${locale}/admin/crm/firmalar/${firma.id}/duzenle`}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors backdrop-blur-xs"
                            >
                                <FiEdit size={13} /> Düzenle
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Bayi İletişim ve Bölge Detayları */}
                <div className="px-6 py-3.5 bg-purple-50/40 border-t border-purple-100 flex items-center justify-between flex-wrap gap-4 text-xs text-slate-600">
                    <div className="flex items-center gap-5 flex-wrap">
                        {(firma.sehir || firma.ilce) && (
                            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                                <FiMapPin className="text-purple-600" size={14} />
                                Bölge: {[firma.posta_kodu, firma.ilce, firma.sehir].filter(Boolean).join(', ')}
                            </span>
                        )}
                        {firma.yetkili_kisi && (
                            <span className="flex items-center gap-1.5">
                                <span className="text-slate-400">•</span> Yetkili: <strong className="text-slate-700">{firma.yetkili_kisi}</strong>
                            </span>
                        )}
                        {firma.sorumlu_personel?.tam_ad && (
                            <span className="flex items-center gap-1.5">
                                <span className="text-slate-400">•</span> Merkez Sorumlusu: <strong className="text-purple-900">{firma.sorumlu_personel.tam_ad}</strong>
                            </span>
                        )}
                        {firma.telefon && (
                            <a href={`tel:${firma.telefon}`} className="flex items-center gap-1 hover:text-purple-700 font-mono">
                                <FiPhone size={12} /> {firma.telefon}
                            </a>
                        )}
                        {firma.email && (
                            <a href={`mailto:${firma.email}`} className="flex items-center gap-1 hover:text-purple-700">
                                <FiMail size={12} /> {firma.email}
                            </a>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {firma.vergi_no && (
                            <span className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px] text-slate-500 font-mono">
                                VKN: {firma.vergi_no}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 5 STRATEJİK BAYİ KPI KARTI ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* 1. Müşteri Ağı */}
                <div className="bg-white border border-blue-200/80 rounded-xl p-4 shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Müşteri Portföyü</span>
                        <FiUsers className="text-blue-500" size={16} />
                    </div>
                    <p className="text-xl font-bold text-slate-900">{bayiMusterileri.length} <span className="text-xs font-normal text-slate-500">Restoran / Kafe</span></p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className="text-emerald-600 font-semibold">{aktifMusteriSayisi} Aktif</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-amber-600">{adayMusteriSayisi} Aday</span>
                    </div>
                </div>

                {/* 2. Bayi Satış Cirosu */}
                <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Müşteri Satış Cirosu</span>
                        <FiDollarSign className="text-emerald-500" size={16} />
                    </div>
                    <p className="text-xl font-bold text-slate-900">{fmt(buAyMusteriCirosu)}</p>
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">Bu Ay (Top: {fmt(toplamMusteriCirosu)})</p>
                </div>

                {/* 3. Merkezden İkmal Alımı */}
                <div className="bg-white border border-purple-200/80 rounded-xl p-4 shadow-sm bg-gradient-to-br from-purple-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Merkezden Toptan Alım</span>
                        <FiTruck className="text-purple-500" size={16} />
                    </div>
                    <p className="text-xl font-bold text-slate-900">{fmt(toplamIkmalCirosu)}</p>
                    <p className="text-[11px] text-purple-700 mt-1 font-medium">{gecerliIkmalSiparisler.length} İkmal Sevkiyatı</p>
                </div>

                {/* 4. Dağıtım & Sipariş Hacmi */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm bg-gradient-to-br from-slate-50/50 to-white">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">Dağıtım Hacmi</span>
                        <FiPackage className="text-slate-500" size={16} />
                    </div>
                    <p className="text-xl font-bold text-slate-900">{gecerliMSiparisler.length} <span className="text-xs font-normal text-slate-500">Sipariş</span></p>
                    <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className={acikSiparisler.length > 0 ? "text-amber-600 font-semibold" : "text-slate-400"}>
                            {acikSiparisler.length} Dağıtımda
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-600">{teslimSiparisler.length} Teslim</span>
                    </div>
                </div>

                {/* 5. Depo & Stok Sağlığı */}
                <div className={`border rounded-xl p-4 shadow-sm bg-gradient-to-br ${kritikStoklar.length > 0 ? 'bg-red-50/70 border-red-300 from-red-50/80' : 'bg-white border-emerald-200/80 from-emerald-50/40'} to-white`}>
                    <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${kritikStoklar.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                            Depo & Stok Durumu
                        </span>
                        <FiActivity className={kritikStoklar.length > 0 ? 'text-red-500' : 'text-emerald-500'} size={16} />
                    </div>
                    <p className="text-xl font-bold text-slate-900">
                        {kritikStoklar.length > 0 ? (
                            <span className="text-red-700">{kritikStoklar.length} Ürün Kritik!</span>
                        ) : (
                            <span className="text-emerald-700">Stoklar Yeterli</span>
                        )}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 font-medium">{bayiStoklari.length} Kalem Ürün Depoda</p>
                </div>
            </div>

            {/* ── 4 ANA SEKMELİ KONSOL PANELİ ── */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {/* Sekme Butonları */}
                <div className="flex items-center border-b border-slate-200 bg-slate-50/70 px-4 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('musteriler')}
                        className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'musteriler'
                                ? 'border-purple-700 text-purple-900 bg-white shadow-xs'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FiUsers size={15} />
                        Müşteri Ağı & Portföy ({bayiMusterileri.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('stoklar')}
                        className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'stoklar'
                                ? 'border-purple-700 text-purple-900 bg-white shadow-xs'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FiPackage size={15} />
                        Bayi Raf / Depo Stokları ({bayiStoklari.length})
                        {kritikStoklar.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-red-700 text-[10px]">
                                {kritikStoklar.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('ikmal')}
                        className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'ikmal'
                                ? 'border-purple-700 text-purple-900 bg-white shadow-xs'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FiTruck size={15} />
                        Merkezden İkmal Siparişleri ({bayiIkmalSiparisleri.length})
                    </button>

                    <button
                        onClick={() => setActiveTab('portal')}
                        className={`flex items-center gap-2 px-4 py-3.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                            activeTab === 'portal'
                                ? 'border-purple-700 text-purple-900 bg-white shadow-xs'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <FiKey size={15} />
                        Bayi Yetkilileri & Portal Hesapları ({portalUsers.length})
                    </button>
                </div>

                {/* ── SEKME İÇERİKLERİ ── */}
                <div className="p-6">
                    {/* SEKME 1: MÜŞTERİLER */}
                    {activeTab === 'musteriler' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {firma.unvan} Tarafından Yönetilen Müşteri Listesi
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Bu bayinin bölgesinde sorumlu olduğu ve sipariş dağıttığı restoran/kafeler
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link
                                        href={`/${locale}/admin/crm/firmalar/yeni?ust_bayi_firma_id=${firma.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                    >
                                        <FiPlus size={14} /> Bu Bayiye Yeni Müşteri Ekle
                                    </Link>
                                </div>
                            </div>

                            {bayiMusterileri.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
                                    <FiUsers size={32} className="mx-auto mb-2 text-slate-300" />
                                    Bu alt bayiye henüz müşteri bağlanmamış.
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Müşteri / İşletme Adı</th>
                                                <th className="px-4 py-3">Statü</th>
                                                <th className="px-4 py-3">Lokasyon</th>
                                                <th className="px-4 py-3">Telefon</th>
                                                <th className="px-4 py-3 text-right">Toplam Sipariş</th>
                                                <th className="px-4 py-3 text-right">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bayiMusterileri.map((m: any) => {
                                                const mSiparisler = bayiMusteriSiparisleri.filter(s => s.firma_id === m.id);
                                                const mStatus = m.status || 'ADAY';
                                                const mStyle = STATUS_COLORS[mStatus] || STATUS_COLORS['ADAY'];
                                                const mCiro = mSiparisler.reduce((sum: number, o: any) => sum + Number(o.toplam_tutar_net || 0), 0);

                                                return (
                                                    <tr key={m.id} className="hover:bg-purple-50/30 transition-colors">
                                                        <td className="px-4 py-3.5">
                                                            <Link href={`/${locale}/admin/crm/firmalar/${m.id}`} className="font-bold text-slate-800 hover:text-purple-700 hover:underline">
                                                                {m.unvan}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3.5">
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${mStyle.bg} ${mStyle.text}`}>
                                                                {STATUS_LABEL[mStatus] || mStatus}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-slate-600">
                                                            {[m.ilce, m.sehir].filter(Boolean).join(', ') || '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-slate-600 font-mono">
                                                            {m.telefon || '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-semibold text-slate-700">
                                                            <div>{mSiparisler.length} sipariş</div>
                                                            <div className="text-[10px] text-slate-400 font-normal">{fmt(mCiro)} ciro</div>
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right">
                                                            <Link
                                                                href={`/${locale}/admin/crm/firmalar/${m.id}`}
                                                                className="text-purple-700 hover:text-purple-900 font-bold hover:underline"
                                                            >
                                                                Müşteriyi İncele ➔
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SEKME 2: BAYİ STOKLARI */}
                    {activeTab === 'stoklar' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        {firma.unvan} Raf & Depo Stok Matrisi
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Bayinin elindeki güncel adetler ve ikmal ihtiyaçları
                                    </p>
                                </div>
                                <Link
                                    href={`/${locale}/admin/operasyon/siparisler/yeni?firma_id=${firma.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                >
                                    <FiPackage size={14} /> İkmal Sevkiyatı Başlat
                                </Link>
                            </div>

                            {bayiStoklari.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
                                    <FiPackage size={32} className="mx-auto mb-2 text-slate-300" />
                                    Bu bayiye ait henüz tanımlı depo stok kaydı bulunmuyor.
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Ürün Adı</th>
                                                <th className="px-4 py-3">Stok Kodu</th>
                                                <th className="px-4 py-3 text-right">Depodaki Miktar</th>
                                                <th className="px-4 py-3 text-right">Kritik Eşik</th>
                                                <th className="px-4 py-3 text-center">Stok Durumu</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bayiStoklari.map((stok: any) => {
                                                const urun = stok.urunler || {};
                                                const isKritik = (stok.miktar || 0) <= (stok.kritik_stok_seviyesi || 10);

                                                return (
                                                    <tr key={stok.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3.5 font-bold text-slate-800">
                                                            {urun.ad?.tr || urun.ad?.de || urun.ad || 'Ürün'}
                                                        </td>
                                                        <td className="px-4 py-3.5 font-mono text-slate-500">
                                                            {urun.stok_kodu || '—'}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-sm">
                                                            {stok.miktar ?? 0} Adet / Koli
                                                        </td>
                                                        <td className="px-4 py-3.5 text-right text-slate-500">
                                                            {stok.kritik_stok_seviyesi ?? 10}
                                                        </td>
                                                        <td className="px-4 py-3.5 text-center">
                                                            {isKritik ? (
                                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                                                                    🔴 Kritik Eşik (İkmal Lazım)
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                                                                    🟢 Yeterli
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* SEKME 3: İKMAL SİPARİŞLERİ */}
                    {activeTab === 'ikmal' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Merkez ➔ {firma.unvan} Toptan İkmal Geçmişi
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Bayinin depolarını doldurmak için Merkezden çektiği toptan siparişler
                                    </p>
                                </div>
                                <Link
                                    href={`/${locale}/admin/operasyon/siparisler/yeni?firma_id=${firma.id}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                >
                                    <FiPlus size={14} /> Yeni Toptan Sevkiyat Oluştur
                                </Link>
                            </div>

                            {bayiIkmalSiparisleri.length === 0 ? (
                                <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-400 text-xs">
                                    <FiTruck size={32} className="mx-auto mb-2 text-slate-300" />
                                    Bu bayiye ait henüz tamamlanmış veya bekleyen toptan ikmal kaydı bulunmuyor.
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Sipariş No</th>
                                                <th className="px-4 py-3">Tarih</th>
                                                <th className="px-4 py-3">Tutar (Brüt)</th>
                                                <th className="px-4 py-3">Durum</th>
                                                <th className="px-4 py-3 text-right">İşlem</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {bayiIkmalSiparisleri.map((o: any) => (
                                                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3.5 font-bold text-purple-900 font-mono">
                                                        #{o.id.substring(0, 8).toUpperCase()}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600">
                                                        {new Date(o.siparis_tarihi).toLocaleDateString('tr-TR')}
                                                    </td>
                                                    <td className="px-4 py-3.5 font-bold text-slate-900">
                                                        {fmt(o.toplam_tutar_brut || o.toplam_tutar_net)}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                                            {o.siparis_durumu}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <Link
                                                            href={`/${locale}/admin/operasyon/siparisler/${o.id}`}
                                                            className="text-purple-700 hover:text-purple-900 font-bold hover:underline"
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
                    )}

                    {/* SEKME 4: PORTAL VE YETKİLİLER */}
                    {activeTab === 'portal' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Bayi Portal Yetkilileri & Giriş Bilgileri
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Alt bayinin portala giriş yapıp müşteri ve siparişlerini yönettiği hesaplar
                                    </p>
                                </div>
                                <PortalErigimiVerButton
                                    firmaId={firma.id}
                                    firmaUnvan={firma.unvan}
                                    firmaEmail={firma.email || null}
                                    yetkiliKisi={firma.yetkili_kisi || null}
                                    locale={locale}
                                    portalUsers={portalUsers}
                                    firmaStatus={firma.status || 'ALT BAYİ'}
                                />
                            </div>

                            {portalUsers.length === 0 ? (
                                <div className="border-2 border-dashed border-amber-200 bg-amber-50/50 rounded-xl p-8 text-center text-amber-800 text-xs">
                                    <FiKey size={32} className="mx-auto mb-2 text-amber-500" />
                                    <p className="font-bold">Bu alt bayiye ait henüz tanımlı bir portal kullanıcısı bulunmuyor.</p>
                                    <p className="mt-1 text-slate-600">Yukarıdaki "Portal Erişimi Ver" butonunu kullanarak bayiye kullanıcı adı ve şifre tanımlayabilirsiniz.</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="px-4 py-3">Kullanıcı Adı / İsim</th>
                                                <th className="px-4 py-3">Giriş E-postası</th>
                                                <th className="px-4 py-3">Rol</th>
                                                <th className="px-4 py-3">Son Giriş Zamanı</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {portalUsers.map((u: any) => (
                                                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3.5 font-bold text-slate-800">
                                                        {u.tam_ad || 'Yetkili'}
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-600 font-mono">
                                                        {u.email || '—'}
                                                    </td>
                                                    <td className="px-4 py-3.5">
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                                            {u.rol}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-slate-500">
                                                        {u.last_sign_in_at
                                                            ? new Date(u.last_sign_in_at).toLocaleString('tr-TR')
                                                            : 'Henüz giriş yapmadı'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
