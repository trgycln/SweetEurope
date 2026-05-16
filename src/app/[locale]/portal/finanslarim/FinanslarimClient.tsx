'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiEdit,
    FiX, FiSave, FiPercent, FiUsers, FiPackage, FiCalendar,
    FiBarChart2, FiPieChart, FiAlertCircle, FiExternalLink,
} from 'react-icons/fi';
import { toast } from 'sonner';
import { addGiderAction, updateGiderAction, deleteGiderAction } from './actions';
import { FinanslarimTrendChart } from '@/components/portal/finanslarim/FinanslarimTrendChart';
import { FinanslarimKategoriChart } from '@/components/portal/finanslarim/FinanslarimKategoriChart';

/* ── Types ─────────────────────────────────────────────────── */
type Satis = {
    id: string;
    created_at: string;
    durum: string;
    toplam_net: number;
    toplam_brut: number;
    musteri_id: string;
    firmalar?: { unvan: string } | null;
};

type Gider = {
    id: string;
    tarih: string;
    kategori: string | null;
    aciklama: string | null;
    tutar: number;
};

type KategoriRow = { kategori: string; tutar: number; oran: number };

type TopMusteri = { id: string; unvan: string; toplam: number; sayi: number };

type Stats = {
    gelirToplam: number;
    giderToplam: number;
    netKar: number;
    prevGelir: number;
    prevGider: number;
    prevNet: number;
    gelirDelta: number | null;
    giderDelta: number | null;
    netDelta: number | null;
};

interface Props {
    satislar: Satis[];
    giderler: Gider[];
    trendData: { month: string; gelir: number; gider: number; net: number }[];
    kategoriDagilimi: KategoriRow[];
    topMusteriler: TopMusteri[];
    stats: Stats;
    period: string;
    locale: string;
}

/* ── Sabit kategoriler (alt bayi tarafı için makul liste) ── */
const GIDER_KATEGORILERI = [
    'Kira', 'Personel', 'Nakliye', 'Malzeme', 'Pazarlama',
    'Elektrik / Gaz / Su', 'Internet / Telefon', 'Yakıt',
    'Sigorta', 'Bakım & Onarım', 'Vergi & Harçlar',
    'Banka Ücreti', 'Yazılım / SaaS', 'Diğer',
];

const fmt = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v || 0);

const fmtPrecise = (v: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(v || 0);

const PERIOD_LABELS: Record<string, string> = {
    'this-month': 'Bu Ay',
    'last-month': 'Geçen Ay',
    'last-6-months': 'Son 6 Ay',
    'this-year': 'Bu Yıl',
};

/* ── Main Component ────────────────────────────────────────── */
export default function FinanslarimClient({
    satislar, giderler, trendData, kategoriDagilimi, topMusteriler, stats, period, locale,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGider, setEditingGider] = useState<Gider | null>(null);

    const setPeriod = (p: string) => router.push(`${pathname}?period=${p}`);

    const karMarji = stats.gelirToplam > 0
        ? Math.round((stats.netKar / stats.gelirToplam) * 1000) / 10
        : 0;

    const handleDeleteGider = (id: string) => {
        if (!confirm('Bu gideri silmek istediğinize emin misiniz?')) return;
        startTransition(async () => {
            const result = await deleteGiderAction(id, locale);
            if (result.success) {
                toast.success('Gider silindi');
                router.refresh();
            } else {
                toast.error(result.error || 'Hata');
            }
        });
    };

    return (
        <div className="space-y-5 pb-10">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Finanslarım</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Satış, gider ve kar-zarar takibi · {PERIOD_LABELS[period] || 'Bu Ay'}
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Dönem seçici */}
                    <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
                        {Object.entries(PERIOD_LABELS).map(([k, l]) => (
                            <button key={k} onClick={() => setPeriod(k)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${period === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { setEditingGider(null); setModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <FiPlus size={13} /> Yeni Gider
                    </button>
                    <Link href={`/${locale}/portal/siparisler`}
                        className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
                        <FiPackage size={13} /> Siparişler
                    </Link>
                </div>
            </div>

            {/* ── KPI Kartlar ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Gelir */}
                <div className="rounded-xl border border-blue-200/60 p-4 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">Gelir</p>
                        <FiTrendingUp size={14} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold text-blue-800">{fmt(stats.gelirToplam)}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-slate-500">{satislar.length} satış</p>
                        {stats.gelirDelta !== null && (
                            <span className={`text-[10px] font-bold ${stats.gelirDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {stats.gelirDelta >= 0 ? '+' : ''}{stats.gelirDelta}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Gider */}
                <div className="rounded-xl border border-red-200/60 p-4 bg-gradient-to-br from-red-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">Gider</p>
                        <FiTrendingDown size={14} className="text-red-500" />
                    </div>
                    <p className="text-2xl font-bold text-red-800">{fmt(stats.giderToplam)}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-slate-500">{giderler.length} gider</p>
                        {stats.giderDelta !== null && (
                            <span className={`text-[10px] font-bold ${stats.giderDelta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                {stats.giderDelta >= 0 ? '+' : ''}{stats.giderDelta}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Net Kâr/Zarar */}
                <div className={`rounded-xl border p-4 bg-gradient-to-br ${stats.netKar >= 0 ? 'border-emerald-200/60 from-emerald-50' : 'border-orange-200/60 from-orange-50'} to-white`}>
                    <div className="flex items-center justify-between mb-1">
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${stats.netKar >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>Net Kâr/Zarar</p>
                        <FiDollarSign size={14} className={stats.netKar >= 0 ? 'text-emerald-500' : 'text-orange-500'} />
                    </div>
                    <p className={`text-2xl font-bold ${stats.netKar >= 0 ? 'text-emerald-800' : 'text-orange-700'}`}>
                        {fmt(stats.netKar)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-slate-500">{stats.netKar >= 0 ? 'Kâr' : 'Zarar'}</p>
                        {stats.netDelta !== null && (
                            <span className={`text-[10px] font-bold ${stats.netDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {stats.netDelta >= 0 ? '+' : ''}{stats.netDelta}%
                            </span>
                        )}
                    </div>
                </div>

                {/* Kâr Marjı */}
                <div className="rounded-xl border border-purple-200/60 p-4 bg-gradient-to-br from-purple-50 to-white">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">Kâr Marjı</p>
                        <FiPercent size={14} className="text-purple-500" />
                    </div>
                    <p className={`text-2xl font-bold ${karMarji >= 0 ? 'text-purple-800' : 'text-red-700'}`}>
                        %{karMarji}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Kar / Gelir oranı</p>
                </div>
            </div>

            {/* ── Aylık Trend Grafik + Kategori Pasta ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiBarChart2 size={14} className="text-blue-500" /> Son 6 Ay Gelir & Gider Trendi
                        </h3>
                        <span className="text-[11px] text-slate-400">Aylık karşılaştırma</span>
                    </div>
                    {trendData.every(d => d.gelir === 0 && d.gider === 0) ? (
                        <div className="py-12 text-center">
                            <div className="text-3xl mb-2">📊</div>
                            <p className="text-sm text-slate-500">Son 6 ayda kayıt yok</p>
                        </div>
                    ) : (
                        <FinanslarimTrendChart data={trendData} />
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiPieChart size={14} className="text-purple-500" /> Gider Kategorileri
                        </h3>
                        <span className="text-[11px] text-slate-400">{PERIOD_LABELS[period]}</span>
                    </div>
                    {kategoriDagilimi.length === 0 ? (
                        <div className="py-10 text-center">
                            <div className="text-3xl mb-2">🍰</div>
                            <p className="text-sm text-slate-400">Bu dönemde gider yok</p>
                        </div>
                    ) : (
                        <FinanslarimKategoriChart data={kategoriDagilimi} />
                    )}
                </div>
            </div>

            {/* ── Satışlar + En Çok Satan Müşteriler ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Satışlar tablosu */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiPackage size={14} className="text-orange-500" /> Satışlar (Ön Fatura)
                        </h3>
                        <Link href={`/${locale}/portal/finanslarim/satislar`}
                            className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                            Tümü <FiExternalLink size={9} />
                        </Link>
                    </div>
                    {satislar.length === 0 ? (
                        <div className="p-10 text-center">
                            <FiTrendingUp className="mx-auto text-3xl text-slate-300 mb-2" />
                            <p className="text-sm text-slate-500">Bu dönemde satış yok</p>
                            <p className="text-[11px] text-slate-400 mt-1">Satışlar siparişler sayfasından otomatik aktarılır</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tarih</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Müşteri</th>
                                        <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Durum</th>
                                        <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tutar (Net)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {satislar.slice(0, 8).map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                                {new Date(s.created_at).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                                                <Link href={`/${locale}/portal/musterilerim/${s.musteri_id}`}
                                                    className="font-semibold text-slate-700 hover:text-blue-600 transition-colors">
                                                    {s.firmalar?.unvan || 'Müşteri'}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap">
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                    {s.durum}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs font-bold text-slate-800">
                                                {fmt(s.toplam_net)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-slate-600">Toplam:</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700">{fmt(stats.gelirToplam)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Top müşteriler */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <FiUsers size={14} className="text-emerald-500" /> En İyi Müşteriler
                        </h3>
                        <span className="text-[11px] text-slate-400">{PERIOD_LABELS[period]}</span>
                    </div>
                    {topMusteriler.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">Bu dönemde satış yok</p>
                    ) : (
                        <div className="space-y-2">
                            {topMusteriler.map((m, i) => (
                                <Link key={m.id} href={`/${locale}/portal/musterilerim/${m.id}`}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                            i === 0 ? 'bg-amber-100 text-amber-700' :
                                            i === 1 ? 'bg-slate-200 text-slate-700' :
                                            i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {i + 1}
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{m.unvan}</p>
                                            <p className="text-[10px] text-slate-400">{m.sayi} satış</p>
                                        </div>
                                    </div>
                                    <p className="text-xs font-bold text-emerald-600 flex-shrink-0 ml-2">{fmt(m.toplam)}</p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Giderler Tablosu ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <FiTrendingDown size={14} className="text-red-500" /> Giderler ({giderler.length})
                    </h3>
                    <button onClick={() => { setEditingGider(null); setModalOpen(true); }}
                        className="text-[11px] flex items-center gap-1 px-2.5 py-1 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors font-semibold">
                        <FiPlus size={11} /> Yeni Gider
                    </button>
                </div>
                {giderler.length === 0 ? (
                    <div className="p-10 text-center">
                        <FiTrendingDown className="mx-auto text-3xl text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">Bu dönemde gider kaydı yok</p>
                        <button onClick={() => setModalOpen(true)}
                            className="mt-3 text-xs px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                            + İlk gideri ekle
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tarih</th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Kategori</th>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wide">Açıklama</th>
                                    <th className="px-4 py-2.5 text-right text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tutar</th>
                                    <th className="px-4 py-2.5 w-24" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {giderler.map(g => (
                                    <tr key={g.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                            {new Date(g.tarih).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap">
                                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                {g.kategori || 'Diğer'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[260px] truncate">
                                            {g.aciklama || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right text-sm font-bold text-red-700">
                                            {fmtPrecise(Number(g.tutar))}
                                        </td>
                                        <td className="px-4 py-2.5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingGider(g); setModalOpen(true); }}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Düzenle">
                                                    <FiEdit size={12} />
                                                </button>
                                                <button onClick={() => handleDeleteGider(g.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Sil">
                                                    <FiX size={12} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50">
                                <tr>
                                    <td colSpan={3} className="px-4 py-3 text-right text-xs font-bold text-slate-600">Toplam:</td>
                                    <td className="px-4 py-3 text-right text-sm font-bold text-red-700">{fmt(stats.giderToplam)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Modal ── */}
            {modalOpen && (
                <GiderModal
                    gider={editingGider}
                    onClose={() => { setModalOpen(false); setEditingGider(null); }}
                    locale={locale}
                    onSuccess={() => { router.refresh(); setModalOpen(false); setEditingGider(null); }}
                />
            )}
        </div>
    );
}

/* ── Gider Modal ───────────────────────────────────────────── */
function GiderModal({
    gider, onClose, locale, onSuccess,
}: {
    gider: Gider | null;
    onClose: () => void;
    locale: string;
    onSuccess: () => void;
}) {
    const isEdit = !!gider;
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            const result = isEdit && gider
                ? await updateGiderAction(gider.id, fd, locale)
                : await addGiderAction(fd, locale);
            if (result.success) {
                toast.success(isEdit ? 'Gider güncellendi' : 'Gider eklendi');
                onSuccess();
            } else {
                toast.error(result.error || 'Hata oluştu');
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">
                        {isEdit ? '✏️ Gideri Düzenle' : '💸 Yeni Gider'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Tarih <span className="text-red-500">*</span>
                        </label>
                        <input type="date" name="gider_tarih" required
                            defaultValue={gider?.tarih || new Date().toISOString().split('T')[0]}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                        <select name="gider_kategori" defaultValue={gider?.kategori || 'Diğer'}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                            {GIDER_KATEGORILERI.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                        <input type="text" name="gider_aciklama" defaultValue={gider?.aciklama || ''}
                            placeholder="Gider hakkında not..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Tutar (€) <span className="text-red-500">*</span>
                        </label>
                        <input type="number" name="gider_tutar" required step="0.01" min="0.01"
                            defaultValue={gider?.tutar || ''} placeholder="0.00"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            <FiSave size={14} />
                            {isPending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
