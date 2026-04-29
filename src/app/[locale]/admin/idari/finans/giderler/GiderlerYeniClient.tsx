'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    FiPlus, FiX, FiEdit2, FiTrash2, FiCheck, FiAlertTriangle,
    FiExternalLink, FiRefreshCw, FiTruck, FiRepeat, FiDollarSign,
    FiTrendingUp, FiTrendingDown, FiChevronDown, FiLock,
} from 'react-icons/fi';
import { toast } from 'sonner';
import {
    approveGiderler,
    deleteGiderAction,
    toggleSablonAktifAction,
    deleteSablonAction,
    createGiderlerFromTemplates,
} from '@/app/actions/gider-actions';

/* ── Types ─────────────────────────────────────────────────────────────── */
type GiderYeni = {
    id: string;
    tarih: string;
    tutar: number;
    aciklama: string | null;
    durum: string;
    odeme_sikligi: string | null;
    gider_kalemi_id: string | null;
    kaynak?: string | null;
    tir_id?: string | null;
    otomatik_eklendi?: boolean | null;
    tekrar_tipi?: string | null;
    sablon_id?: string | null;
    profiller?: { tam_ad: string | null } | null;
    gider_kalemleri?: {
        id: string;
        ad: string | null;
        gider_ana_kategoriler?: { ad: string | null } | null;
    } | null;
};

type TirGrubu = {
    id: string;
    referans_kodu: string;
    varis_tarihi: string | null;
    navlun_soguk: number;
    navlun_kuru: number;
    gumruk: number;
    traces: number;
    toplam: number;
};

type SablonType = {
    id: string;
    sablon_adi: string;
    tutar?: number;
    varsayilan_tutar?: number;
    donem_tipi?: string | null;
    tekrar_tipi?: string | null;
    aktif: boolean;
    aciklama?: string | null;
    kategori?: string | null;
};

type KategoriRow = { kategori: string; tutar: number; oran: number };

interface Props {
    giderler: GiderYeni[];
    sablonlar: SablonType[];
    tirGruplari: TirGrubu[];
    kategoriDagilimi: KategoriRow[];
    stats: { toplam: number; tirToplam: number; sabitToplam: number; manuelToplam: number };
    prevPeriodToplam: number;
    locale: string;
    currentPeriod: string;
    isAdmin: boolean;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);

function getKategoriRenk(kat: string): string {
    if (kat.includes('Navlun')) return 'bg-blue-500';
    if (kat.includes('Gümrük')) return 'bg-orange-500';
    if (kat.includes('TRACES') || kat.includes('Ardiye')) return 'bg-teal-500';
    if (kat.includes('Kira') || kat.includes('Depo')) return 'bg-purple-500';
    if (kat.includes('Muhasebe') || kat.includes('Hukuk')) return 'bg-green-500';
    if (kat.includes('Pazarlama') || kat.includes('Seyahat')) return 'bg-red-500';
    if (kat.includes('TIR')) return 'bg-blue-400';
    return 'bg-slate-400';
}

function giderBorderColor(g: GiderYeni): string {
    const kaynak = g.kaynak ?? 'manuel';
    if (kaynak === 'tir') return 'border-l-blue-400';
    if (kaynak === 'sablon') return 'border-l-purple-400';
    return 'border-l-slate-300';
}

function giderKategoriAdi(g: GiderYeni): string {
    const kaynak = g.kaynak ?? 'manuel';
    if (kaynak === 'tir') {
        const a = (g.aciklama ?? '').toLowerCase();
        if (a.includes('navlun (donuk)')) return 'Navlun (Donuk)';
        if (a.includes('navlun (kuru)')) return 'Navlun (Kuru)';
        if (a.includes('gümrük')) return 'Gümrük Vergisi';
        if (a.includes('traces')) return 'TRACES / Ardiye';
        return 'TIR Maliyeti';
    }
    return g.gider_kalemleri?.gider_ana_kategoriler?.ad ?? g.gider_kalemleri?.ad ?? '—';
}

/* ── Sub-components ─────────────────────────────────────────────────────── */
function StatCard({
    label, value, sub, color = 'slate', icon: Icon, onClick,
}: {
    label: string; value: string; sub?: string;
    color?: 'slate' | 'blue' | 'purple' | 'green' | 'red' | 'orange';
    icon?: React.ComponentType<{ size?: number; className?: string }>;
    onClick?: () => void;
}) {
    const bg: Record<string, string> = {
        slate: 'bg-white border-slate-200', blue: 'bg-blue-50 border-blue-200',
        purple: 'bg-purple-50 border-purple-200', green: 'bg-green-50 border-green-200',
        red: 'bg-red-50 border-red-200', orange: 'bg-amber-50 border-amber-200',
    };
    const text: Record<string, string> = {
        slate: 'text-slate-800', blue: 'text-blue-800', purple: 'text-purple-800',
        green: 'text-green-800', red: 'text-red-700', orange: 'text-amber-800',
    };
    return (
        <div
            onClick={onClick}
            className={`rounded-xl border p-4 ${bg[color]} ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
        >
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon size={13} className={`${text[color]} opacity-70`} />}
                <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <p className={`text-xl font-bold leading-tight ${text[color]}`}>{value}</p>
            {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
    );
}

/* ── Yeni Gider Modal ─────────────────────────────────────────────────────*/
function YeniGiderModal({ onClose, locale }: { onClose: () => void; locale: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                const { createGiderAction } = await import('@/app/actions/gider-actions');
                const result = await createGiderAction(undefined, fd);
                if (result?.type === 'success' || !result?.message) {
                    toast.success('Gider eklendi');
                    onClose();
                    router.refresh();
                } else {
                    toast.error(result.message || 'Hata oluştu');
                }
            } catch {
                toast.error('Gider eklenemedi');
            }
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">💸 Yeni Manuel Gider</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={18} />
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="p-5 space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tarih <span className="text-red-500">*</span></label>
                        <input type="date" name="tarih" required
                            defaultValue={new Date().toISOString().split('T')[0]}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama <span className="text-red-500">*</span></label>
                        <input type="text" name="aciklama" required placeholder="Gider açıklaması..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (€) <span className="text-red-500">*</span></label>
                        <input type="number" name="tutar" required min="0.01" step="0.01" placeholder="0.00"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors">
                            {isPending ? 'Kaydediliyor...' : '💾 Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── Main Component ─────────────────────────────────────────────────────── */
export default function GiderlerYeniClient({
    giderler, sablonlar, tirGruplari, kategoriDagilimi,
    stats, prevPeriodToplam, locale, currentPeriod, isAdmin,
}: Props) {
    const router = useRouter();
    const pathname = usePathname();
    const [activeChip, setActiveChip] = useState<string>('tumu');
    const [modalOpen, setModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const degisim = prevPeriodToplam > 0
        ? Math.round(((stats.toplam - prevPeriodToplam) / prevPeriodToplam) * 100)
        : null;

    const setPeriod = (p: string) => router.push(`${pathname}?period=${p}`);

    // Chip filter
    const filtered = giderler.filter((g) => {
        const kaynak = (g as any).kaynak ?? 'manuel';
        if (activeChip === 'tir') return kaynak === 'tir';
        if (activeChip === 'sabit') return kaynak === 'sablon';
        if (activeChip === 'degisken') return kaynak === 'manuel';
        if (activeChip === 'bekleyen') return g.durum === 'Taslak';
        return true;
    });

    // Delete gider
    const handleDelete = (id: string) => {
        if (!confirm('Bu gideri silmek istediğinizden emin misiniz?')) return;
        startTransition(async () => {
            try {
                await deleteGiderAction(id);
                toast.success('Gider silindi');
                router.refresh();
            } catch {
                toast.error('Silme işlemi başarısız');
            }
        });
    };

    // Approve draft
    const handleApprove = (id: string) => {
        startTransition(async () => {
            try {
                await approveGiderler([id]);
                toast.success('Gider onaylandı');
                router.refresh();
            } catch {
                toast.error('Onaylama başarısız');
            }
        });
    };

    // Toggle sablon
    const handleToggleSablon = (id: string, aktif: boolean) => {
        startTransition(async () => {
            try {
                await toggleSablonAktifAction(id, !aktif);
                toast.success(!aktif ? 'Şablon aktifleştirildi' : 'Şablon devre dışı');
                router.refresh();
            } catch {
                toast.error('İşlem başarısız');
            }
        });
    };

    // Delete sablon
    const handleDeleteSablon = (id: string) => {
        if (!confirm('Bu şablonu silmek istediğinizden emin misiniz?')) return;
        startTransition(async () => {
            try {
                await deleteSablonAction(id);
                toast.success('Şablon silindi');
                router.refresh();
            } catch {
                toast.error('Silme başarısız');
            }
        });
    };

    // Create from templates
    const handleCreateFromTemplates = () => {
        const month = new Date().toISOString().substring(0, 7);
        startTransition(async () => {
            try {
                await createGiderlerFromTemplates(month);
                toast.success('Şablonlardan giderler oluşturuldu');
                router.refresh();
            } catch {
                toast.error('Şablon giderleri oluşturulamadı');
            }
        });
    };

    const PERIOD_LABELS: Record<string, string> = {
        'this-month': 'Bu Ay', 'last-month': 'Geçen Ay', 'this-year': 'Bu Yıl',
    };
    const CHIPS = [
        { id: 'tumu', label: 'Tümü', count: giderler.length },
        { id: 'tir', label: '🚛 TIR', count: giderler.filter(g => (g as any).kaynak === 'tir').length },
        { id: 'sabit', label: '🔄 Sabit', count: giderler.filter(g => (g as any).kaynak === 'sablon').length },
        { id: 'degisken', label: '✏️ Değişken', count: giderler.filter(g => !['tir', 'sablon'].includes((g as any).kaynak ?? 'manuel')).length },
        { id: 'bekleyen', label: '⏳ Onay Bekleyen', count: giderler.filter(g => g.durum === 'Taslak').length },
    ];

    return (
        <div className="space-y-5">
            {modalOpen && <YeniGiderModal onClose={() => setModalOpen(false)} locale={locale} />}

            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gider Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        TIR maliyetleri otomatik aktarılır · Sabit giderler otomatik tekrarlar
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Dönem seçici */}
                    <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
                        {Object.entries(PERIOD_LABELS).map(([k, l]) => (
                            <button key={k} onClick={() => setPeriod(k)}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${currentPeriod === k ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                                {l}
                            </button>
                        ))}
                    </div>
                    <Link href={`/${locale}/admin/idari/finans/giderler/sablonlar`}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">
                        <FiRepeat size={13} /> Şablon Yönetimi
                    </Link>
                    <button onClick={() => setModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <FiPlus size={13} /> Yeni Gider
                    </button>
                </div>
            </div>

            {/* ── Bilgi bandı ── */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                <strong>ℹ️</strong> TIR kaydedilince navlun, gümrük ve TRACES maliyetleri otomatik aktarılır. Sabit giderler her ay otomatik oluşturulur.
                Sadece değişken giderleri manuel girersiniz.
            </div>

            {/* ── Onay bekleyen uyarısı ── */}
            {giderler.filter(g => g.durum === 'Taslak').length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                        <FiAlertTriangle size={14} />
                        {giderler.filter(g => g.durum === 'Taslak').length} gider onay bekliyor
                    </span>
                    <button onClick={() => setActiveChip('bekleyen')}
                        className="text-xs text-amber-700 font-bold hover:text-amber-900 underline">
                        Göster →
                    </button>
                </div>
            )}

            {/* ── Özet kartlar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <StatCard label="Dönem Toplam" value={fmt(stats.toplam)} color="slate"
                    icon={FiDollarSign} onClick={() => setActiveChip('tumu')} />
                <StatCard label="TIR Maliyetleri" value={fmt(stats.tirToplam)} color="blue"
                    icon={FiTruck} onClick={() => setActiveChip('tir')} />
                <StatCard label="Sabit Giderler" value={fmt(stats.sabitToplam)} color="purple"
                    icon={FiRepeat} onClick={() => setActiveChip('sabit')} />
                <StatCard label="Değişken" value={fmt(stats.manuelToplam)} color="orange"
                    onClick={() => setActiveChip('degisken')} />
                <StatCard
                    label="Geçen Aya Göre"
                    value={degisim !== null ? `${degisim > 0 ? '+' : ''}${degisim}%` : '—'}
                    sub={prevPeriodToplam > 0 ? `Geçen: ${fmt(prevPeriodToplam)}` : undefined}
                    color={degisim === null ? 'slate' : degisim > 0 ? 'red' : 'green'}
                    icon={degisim !== null && degisim > 0 ? FiTrendingUp : FiTrendingDown}
                />
            </div>

            {/* ── İki sütun analiz ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sol — Kategori dağılımı */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">📊 Kategori Dağılımı</h3>
                    {kategoriDagilimi.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">Bu dönemde gider yok</p>
                    ) : (
                        <div className="space-y-2.5">
                            {kategoriDagilimi.slice(0, 8).map((row) => (
                                <div key={row.kategori}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-slate-600 truncate max-w-[160px]">{row.kategori}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-700">{fmt(row.tutar)}</span>
                                            <span className="text-[10px] text-slate-400 w-8 text-right">{row.oran}%</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                                        <div
                                            className={`h-1.5 rounded-full ${getKategoriRenk(row.kategori)}`}
                                            style={{ width: `${row.oran}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sağ — TIR bazlı maliyet özeti */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">🚛 TIR Maliyet Özeti</h3>
                    {tirGruplari.length === 0 ? (
                        <p className="text-sm text-slate-400 py-4 text-center">Bu dönemde TIR kaydı yok</p>
                    ) : (
                        <div className="space-y-3">
                            {tirGruplari.slice(0, 4).map((tir) => (
                                <div key={tir.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-700">{tir.referans_kodu}</span>
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {fmt(tir.toplam)}
                                            </span>
                                            <Link href={`/${locale}/admin/urun-yonetimi/tir-girisi`}
                                                className="text-[10px] text-slate-400 hover:text-blue-600 flex items-center gap-0.5">
                                                <FiExternalLink size={9} />
                                            </Link>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                        {[
                                            { l: 'Navlun (Donuk)', v: tir.navlun_soguk },
                                            { l: 'Navlun (Kuru)', v: tir.navlun_kuru },
                                            { l: 'Gümrük Vergisi', v: tir.gumruk },
                                            { l: 'TRACES / Ardiye', v: tir.traces },
                                        ].filter(r => r.v > 0).map(row => (
                                            <div key={row.l} className="text-[10px] text-slate-500">
                                                <span className="text-slate-400">{row.l}</span>
                                                <span className="font-semibold text-slate-600 ml-1">{fmt(row.v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {tir.varis_tarihi && (
                                        <p className="text-[9px] text-slate-400 mt-1.5">
                                            Varış: {new Date(tir.varis_tarihi).toLocaleDateString('tr-TR')} ·{' '}
                                            <span className="text-slate-300">TIR sayfasından değiştirilebilir</span>
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Gider listesi ── */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Chip filtreleri */}
                <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-1.5">
                    {CHIPS.map(chip => (
                        <button key={chip.id} onClick={() => setActiveChip(chip.id)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${activeChip === chip.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                            {chip.label}
                            <span className={`text-[10px] ${activeChip === chip.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                {chip.count}
                            </span>
                        </button>
                    ))}
                    <span className="text-xs text-slate-400 ml-auto">{filtered.length} gider</span>
                </div>

                {filtered.length === 0 ? (
                    <div className="py-12 text-center">
                        <div className="text-3xl mb-2">📭</div>
                        <p className="text-sm text-slate-500">Bu filtrede gider yok</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Gider</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kategori</th>
                                    <th className="px-3 py-2.5 text-right text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tutar</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Tarih</th>
                                    <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Durum</th>
                                    <th className="px-3 py-2.5 w-20" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map((g) => {
                                    const kaynak = (g as any).kaynak ?? 'manuel';
                                    const isTir = kaynak === 'tir';
                                    const isSablon = kaynak === 'sablon';
                                    const border = giderBorderColor(g);
                                    const kat = giderKategoriAdi(g);

                                    return (
                                        <tr key={g.id} className={`group hover:bg-slate-50/50 transition-colors border-l-2 ${border}`}>
                                            {/* Gider adı */}
                                            <td className="px-4 py-3 max-w-[240px]">
                                                <p className="text-sm font-medium text-slate-800 truncate">
                                                    {g.aciklama || g.gider_kalemleri?.ad || '—'}
                                                </p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {isTir && (
                                                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                                                            🚛 TIR · Otomatik
                                                        </span>
                                                    )}
                                                    {isSablon && (
                                                        <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">
                                                            🔄 Sabit · Otomatik
                                                        </span>
                                                    )}
                                                    {(g as any).otomatik_eklendi && !isTir && !isSablon && (
                                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">
                                                            🤖 Otomatik
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Kategori */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {kat}
                                                </span>
                                            </td>

                                            {/* Tutar */}
                                            <td className="px-3 py-3 whitespace-nowrap text-right">
                                                <span className={`text-sm font-bold ${isTir ? 'text-blue-700' : isSablon ? 'text-purple-700' : 'text-slate-800'}`}>
                                                    {fmt(Number(g.tutar ?? 0))}
                                                </span>
                                            </td>

                                            {/* Tarih */}
                                            <td className="px-3 py-3 whitespace-nowrap text-[11px] text-slate-500">
                                                {g.tarih ? new Date(g.tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}
                                            </td>

                                            {/* Durum */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                {g.durum === 'Onaylandı' ? (
                                                    <span className="text-[10px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ Onaylı</span>
                                                ) : g.durum === 'Taslak' ? (
                                                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⏳ Taslak</span>
                                                ) : (
                                                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{g.durum}</span>
                                                )}
                                            </td>

                                            {/* İşlemler */}
                                            <td className="px-3 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isTir ? (
                                                        <Link href={`/${locale}/admin/urun-yonetimi/tir-girisi`}
                                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium">
                                                            TIR'a Git <FiExternalLink size={9} />
                                                        </Link>
                                                    ) : (
                                                        <>
                                                            {g.durum === 'Taslak' && (
                                                                <button onClick={() => handleApprove(g.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                                    title="Onayla">
                                                                    <FiCheck size={13} />
                                                                </button>
                                                            )}
                                                            {isAdmin && (
                                                                <button onClick={() => handleDelete(g.id)}
                                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Sil">
                                                                    <FiX size={13} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Alt satır: Şablonlar + Analiz ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Sabit gider şablonları */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-slate-700">🔄 Sabit Gider Şablonları</h3>
                        <div className="flex gap-2">
                            <button onClick={handleCreateFromTemplates} disabled={isPending}
                                className="text-[11px] text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 border border-purple-200 rounded-lg px-2 py-1 hover:bg-purple-50 transition-colors disabled:opacity-50">
                                {isPending ? <FiRefreshCw size={10} className="animate-spin" /> : '▶'}
                                Bu Ay Oluştur
                            </button>
                        </div>
                    </div>

                    {sablonlar.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">Henüz şablon yok</p>
                    ) : (
                        <div className="space-y-2">
                            {sablonlar.map((s) => {
                                const tutar = s.tutar ?? (s as any).varsayilan_tutar ?? 0;
                                const donemTipi = s.donem_tipi ?? s.tekrar_tipi ?? 'Aylık';
                                return (
                                    <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${s.aktif ? 'bg-purple-50/50 border-purple-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-700 truncate">{s.sablon_adi}</p>
                                            <p className="text-[10px] text-slate-400">{donemTipi} · {fmt(Number(tutar))}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <button onClick={() => handleToggleSablon(s.id, s.aktif)}
                                                className={`w-8 h-4 rounded-full transition-colors relative ${s.aktif ? 'bg-purple-500' : 'bg-slate-300'}`}>
                                                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${s.aktif ? 'left-4.5 translate-x-0' : 'left-0.5'}`} />
                                            </button>
                                            {isAdmin && (
                                                <button onClick={() => handleDeleteSablon(s.id)}
                                                    className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors">
                                                    <FiX size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Analiz kartı */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">📈 Gider Analizi</h3>
                    <div className="space-y-3">
                        {/* Sabit vs değişken */}
                        {stats.toplam > 0 && (
                            <div>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                                    <span>Sabit + TIR / Değişken</span>
                                    <span>
                                        {Math.round(((stats.tirToplam + stats.sabitToplam) / stats.toplam) * 100)}% ·{' '}
                                        {Math.round((stats.manuelToplam / stats.toplam) * 100)}%
                                    </span>
                                </div>
                                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                                    <div className="bg-blue-400 transition-all"
                                        style={{ width: `${(stats.tirToplam / stats.toplam) * 100}%` }} />
                                    <div className="bg-purple-400 transition-all"
                                        style={{ width: `${(stats.sabitToplam / stats.toplam) * 100}%` }} />
                                    <div className="bg-slate-300 transition-all flex-1" />
                                </div>
                                <div className="flex gap-3 mt-1.5 text-[10px] text-slate-500">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-blue-400 rounded-full" />TIR</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-purple-400 rounded-full" />Sabit</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-full" />Değişken</span>
                                </div>
                            </div>
                        )}

                        {/* Metrikler */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            {tirGruplari.length > 0 && (
                                <div className="bg-slate-50 rounded-lg p-2.5">
                                    <p className="text-[10px] text-slate-400">TIR başına ort. maliyet</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {fmt(tirGruplari.reduce((s, t) => s + t.toplam, 0) / tirGruplari.length)}
                                    </p>
                                </div>
                            )}
                            <div className="bg-slate-50 rounded-lg p-2.5">
                                <p className="text-[10px] text-slate-400">Dönem toplam gider</p>
                                <p className="text-sm font-bold text-slate-700">{fmt(stats.toplam)}</p>
                            </div>
                        </div>

                        <Link href={`/${locale}/admin/idari/finans/raporlama`}
                            className="flex items-center justify-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-800 font-semibold mt-2 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                            Detaylı Raporlama <FiExternalLink size={10} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
