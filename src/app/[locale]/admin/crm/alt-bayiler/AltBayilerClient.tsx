'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
    FiSearch, FiTruck, FiUsers, FiDollarSign,
    FiPackage, FiAlertCircle, FiCheckCircle, FiPhone, FiMail,
    FiMapPin, FiExternalLink, FiChevronRight, FiX, FiLayers
} from 'react-icons/fi';

export interface BayiPerformansItem {
    id: string;
    unvan: string;
    sehir: string | null;
    ilce: string | null;
    telefon: string | null;
    email: string | null;
    yetkili_kisi: string | null;
    sorumlu_personel?: { tam_ad: string | null } | null;
    status: string | null;
    kategori: string | null;
    musteriler: any[];
    musteriSayisi: number;
    aktifMusteriSayisi: number;
    adayMusteriSayisi: number;
    toplamMusteriCirosu: number;
    buAyMusteriCirosu: number;
    toplamIkmalCirosu: number;
    toplamSiparisSayisi: number;
    acikSiparisSayisi: number;
    teslimSiparisSayisi: number;
    stokKalemSayisi: number;
    kritikStokSayisi: number;
    kritikStoklar: string[];
}

const fmt = (v: number | null | undefined) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v ?? 0);

interface AltBayilerClientProps {
    initialBayiler: BayiPerformansItem[];
    locale: string;
}

export function AltBayilerClient({ initialBayiler, locale }: AltBayilerClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTab, setFilterTab] = useState<'all' | 'critical' | 'active'>('all');
    const [selectedBayiForModal, setSelectedBayiForModal] = useState<BayiPerformansItem | null>(null);

    // Filtreleme
    const filteredBayiler = useMemo(() => {
        return initialBayiler.filter(bayi => {
            // Arama
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const unvanMatch = bayi.unvan.toLowerCase().includes(q);
                const sehirMatch = (bayi.sehir || '').toLowerCase().includes(q);
                const yetkiliMatch = (bayi.yetkili_kisi || '').toLowerCase().includes(q);
                if (!unvanMatch && !sehirMatch && !yetkiliMatch) return false;
            }

            // Tab Filtresi
            if (filterTab === 'critical') {
                return bayi.kritikStokSayisi > 0;
            }
            if (filterTab === 'active') {
                return bayi.musteriSayisi > 0;
            }

            return true;
        });
    }, [initialBayiler, searchQuery, filterTab]);

    return (
        <div className="space-y-4">
            {/* ── Arama ve Hızlı Filtre Çubuğu ── */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input
                        type="text"
                        placeholder="Bayi adı, şehir veya yetkili ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all text-slate-800"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <FiX size={13} />
                        </button>
                    )}
                </div>

                {/* Filtre Butonları */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                    <button
                        onClick={() => setFilterTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            filterTab === 'all'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        Tüm Bayiler ({initialBayiler.length})
                    </button>
                    <button
                        onClick={() => setFilterTab('active')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            filterTab === 'active'
                                ? 'bg-purple-800 text-white'
                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                        }`}
                    >
                        👥 Müşterisi Olanlar ({initialBayiler.filter(b => b.musteriSayisi > 0).length})
                    </button>
                    <button
                        onClick={() => setFilterTab('critical')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                            filterTab === 'critical'
                                ? 'bg-amber-700 text-white'
                                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                        }`}
                    >
                        ⚠️ Kritik Stoklu ({initialBayiler.filter(b => b.kritikStokSayisi > 0).length})
                    </button>
                </div>
            </div>

            {/* ── Bayi Performans Matrisi Tablosu ── */}
            {filteredBayiler.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 shadow-sm">
                    <FiTruck size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-700">Aramanıza uygun alt bayi bulunamadı.</p>
                    <p className="text-xs mt-1">Arama terimini değiştirin veya filtreleri temizleyin.</p>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="px-5 py-3.5">🏢 Alt Bayi & Bölge</th>
                                    <th className="px-5 py-3.5">👥 Müşteri Portföyü</th>
                                    <th className="px-5 py-3.5">📦 Sipariş Hacmi</th>
                                    <th className="px-5 py-3.5">💰 Bayi Satış Cirosu</th>
                                    <th className="px-5 py-3.5">🚚 Merkezden İkmal</th>
                                    <th className="px-5 py-3.5">📊 Depo & Stok</th>
                                    <th className="px-5 py-3.5 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {filteredBayiler.map(bayi => {
                                    const hasCriticalStock = bayi.kritikStokSayisi > 0;

                                    return (
                                        <tr key={bayi.id} className="hover:bg-purple-50/20 transition-colors group">
                                            {/* 1. Bayi / Lokasyon / İletişim */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <Link
                                                        href={`/${locale}/admin/crm/firmalar/${bayi.id}`}
                                                        className="font-bold text-slate-900 text-sm hover:text-purple-700 hover:underline transition-colors"
                                                    >
                                                        {bayi.unvan}
                                                    </Link>
                                                    <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                                                        {(bayi.sehir || bayi.ilce) && (
                                                            <span className="flex items-center gap-0.5 font-medium text-slate-600">
                                                                <FiMapPin size={11} className="text-purple-600" />
                                                                {[bayi.ilce, bayi.sehir].filter(Boolean).join(', ')}
                                                            </span>
                                                        )}
                                                        {bayi.yetkili_kisi && (
                                                            <span>• Yetkili: {bayi.yetkili_kisi}</span>
                                                        )}
                                                    </div>
                                                    {bayi.telefon && (
                                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                            {bayi.telefon}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 2. Müşteri Portföyü */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedBayiForModal(bayi)}
                                                        className="text-left font-bold text-slate-800 hover:text-purple-700 transition-colors flex items-center gap-1"
                                                    >
                                                        👥 {bayi.musteriSayisi} Müşteri / İşletme
                                                    </button>
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {bayi.aktifMusteriSayisi > 0 && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                                                                {bayi.aktifMusteriSayisi} Aktif
                                                            </span>
                                                        )}
                                                        {bayi.adayMusteriSayisi > 0 && (
                                                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full">
                                                                {bayi.adayMusteriSayisi} Aday
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 3. Sipariş Hacmi */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-800">
                                                        {bayi.toplamSiparisSayisi} Sipariş
                                                    </span>
                                                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                                        {bayi.acikSiparisSayisi > 0 ? (
                                                            <span className="text-amber-700 font-semibold">
                                                                ⏳ {bayi.acikSiparisSayisi} Dağıtımda
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">Bekleyen yok</span>
                                                        )}
                                                        <span>• {bayi.teslimSiparisSayisi} Teslim</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 4. Müşteri Satış Cirosu */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-emerald-800 text-sm">
                                                        {fmt(bayi.buAyMusteriCirosu)}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        Bu Ay (Toplam: {fmt(bayi.toplamMusteriCirosu)})
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 5. Merkezden Toptan İkmal */}
                                            <td className="px-5 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-purple-900 text-xs">
                                                        {fmt(bayi.toplamIkmalCirosu)}
                                                    </span>
                                                    <span className="text-[10px] text-purple-600">
                                                        Toptan Mal Çekimi
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 6. Depo & Stok Durumu */}
                                            <td className="px-5 py-4">
                                                {hasCriticalStock ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md w-fit">
                                                            🔴 {bayi.kritikStokSayisi} Ürün Kritik!
                                                        </span>
                                                        <span className="text-[10px] text-red-600 truncate max-w-[140px]" title={bayi.kritikStoklar.join(', ')}>
                                                            {bayi.kritikStoklar.join(', ')}
                                                        </span>
                                                    </div>
                                                ) : bayi.stokKalemSayisi > 0 ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                                                        🟢 Stok İyi ({bayi.stokKalemSayisi} Kalem)
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] text-slate-400">
                                                        Stok kaydı yok
                                                    </span>
                                                )}
                                            </td>

                                            {/* 7. Aksiyonlar */}
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedBayiForModal(bayi)}
                                                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                                        title="Müşterilerini Hızlı İncele"
                                                    >
                                                        Müşteriler
                                                    </button>
                                                    <Link
                                                        href={`/${locale}/admin/crm/firmalar/${bayi.id}`}
                                                        className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-purple-800 rounded-lg transition-colors flex items-center gap-1"
                                                    >
                                                        Yönet <FiChevronRight size={13} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Müşteri Hızlı İnceleme Modal'ı ── */}
            {selectedBayiForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                                    <span>🤝</span> {selectedBayiForModal.unvan} — Müşteri Ağı
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Toplam {selectedBayiForModal.musteriSayisi} kayıtlı müşteri / restoran
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedBayiForModal(null)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                <FiX size={18} />
                            </button>
                        </div>

                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                            {selectedBayiForModal.musteriler.length === 0 ? (
                                <p className="text-center text-slate-400 text-sm py-6">
                                    Bu bayiye ait henüz kayıtlı müşteri bulunmuyor.
                                </p>
                            ) : (
                                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                                    {selectedBayiForModal.musteriler.map((m: any) => (
                                        <div key={m.id} className="p-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3">
                                            <div>
                                                <Link
                                                    href={`/${locale}/admin/crm/firmalar/${m.id}`}
                                                    className="font-bold text-slate-800 text-sm hover:text-blue-600 hover:underline"
                                                >
                                                    {m.unvan}
                                                </Link>
                                                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                                    <span>{[m.ilce, m.sehir].filter(Boolean).join(', ') || 'Lokasyon yok'}</span>
                                                    {m.telefon && <span>• {m.telefon}</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    m.status === 'MÜŞTERİ' ? 'bg-green-100 text-green-800' :
                                                    m.status === 'NUMUNE VERİLDİ' ? 'bg-cyan-100 text-cyan-800' :
                                                    'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {m.status || 'ADAY'}
                                                </span>
                                                <Link
                                                    href={`/${locale}/admin/crm/firmalar/${m.id}`}
                                                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold p-1 hover:bg-blue-50 rounded"
                                                >
                                                    Detay ➔
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                            <Link
                                href={`/${locale}/admin/crm/firmalar?bayi_firma_id=${selectedBayiForModal.id}&status=ALL`}
                                className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline"
                            >
                                👥 Tüm Müşterilerini CRM Listesinde Aç ➔
                            </Link>
                            <button
                                onClick={() => setSelectedBayiForModal(null)}
                                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-700 transition-colors"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
