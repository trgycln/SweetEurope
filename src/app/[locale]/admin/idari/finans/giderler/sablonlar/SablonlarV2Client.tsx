'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    FiPlus, FiEdit2, FiTrash2, FiArrowLeft, FiX, FiSave,
    FiRefreshCw, FiCalendar, FiClock, FiHash, FiRepeat,
    FiCheck, FiZap, FiAlertCircle, FiPlay, FiPause,
} from 'react-icons/fi';
import { toast } from 'sonner';
import {
    createSablonV2, updateSablonV2, deleteSablonV2,
    toggleSablonV2, generateExpensesForMonth,
    type SablonInput,
} from '@/app/actions/gider-sablon-actions';

/* ── Types ─────────────────────────────────────────────────── */
type Sablon = {
    id: string;
    sablon_adi: string;
    tip: 'sureli_tekrar' | 'sureli_sozlesme' | 'taksitli' | null;
    gider_kalemi_id: string | null;
    varsayilan_tutar: number | null;
    tutar?: number | null;
    tekrar_periyodu: string | null;
    baslangic_tarihi: string | null;
    bitis_tarihi: string | null;
    taksit_sayisi: number | null;
    son_olusturma_tarihi: string | null;
    aktif: boolean;
    aciklama: string | null;
    notlar: string | null;
    olusturulan_gider_sayisi: number;
    gider_kalemleri?: {
        id: string;
        ad: string;
        gider_ana_kategoriler?: { ad: string } | null;
    } | null;
};

type GiderKalemi = {
    id: string;
    ad: string;
    ana_kategori_id: string;
    gider_ana_kategoriler?: { ad: string } | null;
};

interface Props {
    sablonlar: Sablon[];
    giderKalemleri: GiderKalemi[];
    locale: string;
    isAdmin: boolean;
}

/* ── Helpers ───────────────────────────────────────────────── */
const fmt = (n: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n);

const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const tipLabels: Record<string, { label: string; color: string; icon: string }> = {
    sureli_tekrar: { label: 'Süresiz Tekrar', color: 'bg-blue-100 text-blue-700', icon: '🔁' },
    sureli_sozlesme: { label: 'Süreli Sözleşme', color: 'bg-orange-100 text-orange-700', icon: '📅' },
    taksitli: { label: 'Taksitli', color: 'bg-purple-100 text-purple-700', icon: '💳' },
};

const periyotLabels: Record<string, string> = {
    aylik: 'Aylık',
    ceyreklik: 'Çeyreklik',
    yarim_yillik: 'Yarım Yıllık',
    yillik: 'Yıllık',
};

function calcRemaining(s: Sablon): { kalan: string; uyari: boolean; bitti: boolean } {
    const today = new Date().toISOString().slice(0, 10);
    if (s.tip === 'sureli_sozlesme' && s.bitis_tarihi) {
        if (s.bitis_tarihi < today) return { kalan: 'Süresi doldu', uyari: true, bitti: true };
        const bitis = new Date(s.bitis_tarihi);
        const now = new Date();
        const monthsLeft = (bitis.getFullYear() - now.getFullYear()) * 12 + (bitis.getMonth() - now.getMonth());
        return {
            kalan: monthsLeft <= 0 ? `${Math.ceil((bitis.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} gün` : `${monthsLeft} ay`,
            uyari: monthsLeft <= 2,
            bitti: false,
        };
    }
    if (s.tip === 'taksitli' && s.taksit_sayisi) {
        const used = s.olusturulan_gider_sayisi;
        const kalan = s.taksit_sayisi - used;
        if (kalan <= 0) return { kalan: 'Tamamlandı', uyari: false, bitti: true };
        return { kalan: `${kalan}/${s.taksit_sayisi} taksit`, uyari: kalan <= 2, bitti: false };
    }
    return { kalan: 'Süresiz', uyari: false, bitti: false };
}

/* ── Main Component ────────────────────────────────────────── */
export default function SablonlarV2Client({ sablonlar, giderKalemleri, locale, isAdmin }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [modalOpen, setModalOpen] = useState(false);
    const [editSablon, setEditSablon] = useState<Sablon | null>(null);
    const [filterTip, setFilterTip] = useState<string>('all');

    const runAction = (action: () => Promise<any>, successMsg?: string, onSuccess?: () => void) => {
        startTransition(async () => {
            const result = await action();
            if (result?.success) {
                toast.success(successMsg || result.message || 'İşlem başarılı');
                onSuccess?.();
                router.refresh();
            } else {
                toast.error(result?.error || result?.message || 'Hata');
            }
        });
    };

    const filtered = useMemo(() => {
        if (filterTip === 'all') return sablonlar;
        if (filterTip === 'inactive') return sablonlar.filter(s => !s.aktif);
        return sablonlar.filter(s => s.tip === filterTip && s.aktif);
    }, [sablonlar, filterTip]);

    const stats = useMemo(() => {
        const active = sablonlar.filter(s => s.aktif);
        const aylikToplam = active
            .filter(s => s.tekrar_periyodu === 'aylik' || !s.tekrar_periyodu)
            .reduce((sum, s) => sum + Number(s.varsayilan_tutar ?? s.tutar ?? 0), 0);
        return {
            total: sablonlar.length,
            active: active.length,
            aylikToplam,
            tipDagilimi: {
                sureli_tekrar: active.filter(s => s.tip === 'sureli_tekrar').length,
                sureli_sozlesme: active.filter(s => s.tip === 'sureli_sozlesme').length,
                taksitli: active.filter(s => s.tip === 'taksitli').length,
            },
        };
    }, [sablonlar]);

    const handleGenerate = () => {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!confirm(`Bu ay (${yearMonth}) için aktif şablonlardan taslak giderler oluşturulacak. Devam?`)) return;
        runAction(() => generateExpensesForMonth(yearMonth));
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                    <Link href={`/${locale}/admin/idari/finans/giderler`}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
                        <FiArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Sürekli Giderler ve Şablonlar</h1>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Süresiz tekrar · Süreli sözleşme · Taksitli ödemeler
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={handleGenerate} disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-sm font-semibold hover:bg-purple-200 transition-colors disabled:opacity-50">
                        {isPending ? <FiRefreshCw size={14} className="animate-spin" /> : <FiZap size={14} />}
                        Bu Ay Giderleri Oluştur
                    </button>
                    <button onClick={() => { setEditSablon(null); setModalOpen(true); }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                        <FiPlus size={14} /> Yeni Şablon
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-xs text-slate-500 font-medium">Aktif Şablon</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.active}</p>
                    <p className="text-[11px] text-slate-400">/ {stats.total} toplam</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-600 font-medium">Aylık Toplam</p>
                    <p className="text-2xl font-bold text-blue-800">{fmt(stats.aylikToplam)}</p>
                    <p className="text-[11px] text-blue-400">tahmini sabit gider</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <p className="text-xs text-orange-600 font-medium">Süreli Sözleşme</p>
                    <p className="text-2xl font-bold text-orange-800">{stats.tipDagilimi.sureli_sozlesme}</p>
                    <p className="text-[11px] text-orange-400">bitiş tarihi olan</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-600 font-medium">Taksitli</p>
                    <p className="text-2xl font-bold text-purple-800">{stats.tipDagilimi.taksitli}</p>
                    <p className="text-[11px] text-purple-400">aktif taksit planı</p>
                </div>
            </div>

            {/* Filtre */}
            <div className="flex flex-wrap items-center gap-1.5">
                {[
                    { id: 'all', label: 'Tümü', count: sablonlar.length },
                    { id: 'sureli_tekrar', label: '🔁 Süresiz', count: stats.tipDagilimi.sureli_tekrar },
                    { id: 'sureli_sozlesme', label: '📅 Süreli', count: stats.tipDagilimi.sureli_sozlesme },
                    { id: 'taksitli', label: '💳 Taksitli', count: stats.tipDagilimi.taksitli },
                    { id: 'inactive', label: '⏸️ Pasif', count: sablonlar.filter(s => !s.aktif).length },
                ].map(chip => (
                    <button key={chip.id} onClick={() => setFilterTip(chip.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1 ${filterTip === chip.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
                        {chip.label}
                        <span className={`text-[10px] ${filterTip === chip.id ? 'text-slate-300' : 'text-slate-400'}`}>{chip.count}</span>
                    </button>
                ))}
            </div>

            {/* Şablon listesi */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
                    <div className="text-4xl mb-3">📋</div>
                    <p className="text-base font-semibold text-slate-700">Henüz şablon yok</p>
                    <p className="text-sm text-slate-500 mt-1">Sabit giderler, sözleşmeler veya taksitli ödemeler için şablon ekleyin.</p>
                    <button onClick={() => { setEditSablon(null); setModalOpen(true); }}
                        className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors">
                        + İlk şablonu ekle
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(s => {
                        const tipInfo = tipLabels[s.tip ?? 'sureli_tekrar'] || tipLabels.sureli_tekrar;
                        const remaining = calcRemaining(s);
                        const tutar = Number(s.varsayilan_tutar ?? s.tutar ?? 0);

                        return (
                            <div key={s.id}
                                className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-opacity ${!s.aktif ? 'opacity-60 border-slate-200' : remaining.bitti ? 'border-red-200' : remaining.uyari ? 'border-amber-200' : 'border-slate-200'}`}>
                                <div className="p-4 flex items-start justify-between gap-3 flex-wrap">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <h3 className="text-base font-bold text-slate-800">{s.sablon_adi}</h3>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tipInfo.color}`}>
                                                {tipInfo.icon} {tipInfo.label}
                                            </span>
                                            {!s.aktif && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">Pasif</span>}
                                            {remaining.uyari && s.aktif && (
                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                                    <FiAlertCircle size={9} /> {remaining.bitti ? 'Bitti' : 'Bitiyor'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                            {s.gider_kalemleri && (
                                                <span className="flex items-center gap-1">
                                                    <FiHash size={11} className="text-slate-400" />
                                                    {s.gider_kalemleri.gider_ana_kategoriler?.ad ? `${s.gider_kalemleri.gider_ana_kategoriler.ad} › ` : ''}
                                                    <strong className="text-slate-600">{s.gider_kalemleri.ad}</strong>
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <FiRepeat size={11} className="text-slate-400" />
                                                {periyotLabels[s.tekrar_periyodu || 'aylik']}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <FiCalendar size={11} className="text-slate-400" />
                                                Başlangıç: {formatDate(s.baslangic_tarihi)}
                                            </span>
                                            {s.tip === 'sureli_sozlesme' && (
                                                <span className="flex items-center gap-1">
                                                    <FiClock size={11} className="text-orange-400" />
                                                    Bitiş: {formatDate(s.bitis_tarihi)} ({remaining.kalan})
                                                </span>
                                            )}
                                            {s.tip === 'taksitli' && (
                                                <span className="flex items-center gap-1">
                                                    <FiHash size={11} className="text-purple-400" />
                                                    {remaining.kalan}
                                                </span>
                                            )}
                                        </div>
                                        {s.aciklama && (
                                            <p className="text-xs text-slate-500 mt-1.5 italic">"{s.aciklama}"</p>
                                        )}
                                        {s.olusturulan_gider_sayisi > 0 && (
                                            <p className="text-[11px] text-blue-600 mt-1">
                                                ✓ {s.olusturulan_gider_sayisi} gider oluşturuldu
                                                {s.son_olusturma_tarihi && ` · son: ${formatDate(s.son_olusturma_tarihi)}`}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-slate-800">{fmt(tutar)}</p>
                                            <p className="text-[10px] text-slate-400">{periyotLabels[s.tekrar_periyodu || 'aylik']}</p>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => runAction(() => toggleSablonV2(s.id, !s.aktif), s.aktif ? 'Pasifleştirildi' : 'Aktifleştirildi')}
                                                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                                                title={s.aktif ? 'Pasifleştir' : 'Aktifleştir'}>
                                                {s.aktif ? <FiPause size={14} /> : <FiPlay size={14} />}
                                            </button>
                                            <button onClick={() => { setEditSablon(s); setModalOpen(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Düzenle">
                                                <FiEdit2 size={14} />
                                            </button>
                                            {isAdmin && (
                                                <button onClick={() => {
                                                    if (s.olusturulan_gider_sayisi > 0) {
                                                        if (!confirm(`Bu şablondan ${s.olusturulan_gider_sayisi} gider oluşturulmuş. Silmek istediğinize emin misiniz? (Giderler silinmeyecek)`)) return;
                                                    } else {
                                                        if (!confirm(`"${s.sablon_adi}" şablonunu silmek istediğinize emin misiniz?`)) return;
                                                    }
                                                    runAction(() => deleteSablonV2(s.id), 'Şablon silindi');
                                                }}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil">
                                                    <FiTrash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Taksit progress bar */}
                                {s.tip === 'taksitli' && s.taksit_sayisi && s.aktif && (
                                    <div className="px-4 pb-3">
                                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-purple-500 h-1.5 transition-all"
                                                style={{ width: `${Math.min(100, (s.olusturulan_gider_sayisi / s.taksit_sayisi) * 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <SablonModal
                    sablon={editSablon}
                    giderKalemleri={giderKalemleri}
                    onClose={() => { setModalOpen(false); setEditSablon(null); }}
                    onSubmit={(data) => {
                        const action = editSablon
                            ? () => updateSablonV2(editSablon.id, data)
                            : () => createSablonV2(data);
                        runAction(action, editSablon ? 'Güncellendi' : 'Oluşturuldu', () => {
                            setModalOpen(false);
                            setEditSablon(null);
                        });
                    }}
                    isPending={isPending}
                />
            )}
        </div>
    );
}

/* ── Modal ─────────────────────────────────────────────────── */
function SablonModal({
    sablon, giderKalemleri, onClose, onSubmit, isPending,
}: {
    sablon: Sablon | null;
    giderKalemleri: GiderKalemi[];
    onClose: () => void;
    onSubmit: (data: SablonInput) => void;
    isPending: boolean;
}) {
    const isEdit = !!sablon;
    const [tip, setTip] = useState<'sureli_tekrar' | 'sureli_sozlesme' | 'taksitli'>(
        (sablon?.tip as any) || 'sureli_tekrar'
    );

    const today = new Date().toISOString().slice(0, 10);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const data: SablonInput = {
            sablon_adi: fd.get('sablon_adi') as string,
            tip,
            gider_kalemi_id: (fd.get('gider_kalemi_id') as string) || null,
            varsayilan_tutar: parseFloat(fd.get('varsayilan_tutar') as string),
            tekrar_periyodu: fd.get('tekrar_periyodu') as any,
            baslangic_tarihi: fd.get('baslangic_tarihi') as string,
            bitis_tarihi: tip === 'sureli_sozlesme' ? (fd.get('bitis_tarihi') as string) : null,
            taksit_sayisi: tip === 'taksitli' ? parseInt(fd.get('taksit_sayisi') as string) : null,
            aciklama: (fd.get('aciklama') as string) || null,
            notlar: (fd.get('notlar') as string) || null,
        };
        onSubmit(data);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between z-10">
                    <h3 className="text-base font-bold text-slate-800">
                        {isEdit ? `Şablonu Düzenle: ${sablon.sablon_adi}` : 'Yeni Gider Şablonu'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Tip seçimi */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Gider Tipi <span className="text-red-500">*</span></label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                                { id: 'sureli_tekrar', label: 'Süresiz Tekrar', desc: 'Kira, internet, maaş', icon: '🔁', color: 'blue' },
                                { id: 'sureli_sozlesme', label: 'Süreli Sözleşme', desc: 'Elektrik 12 ay, sigorta', icon: '📅', color: 'orange' },
                                { id: 'taksitli', label: 'Taksitli', desc: 'Araba 18 taksit, kredi', icon: '💳', color: 'purple' },
                            ].map(t => (
                                <button key={t.id} type="button" onClick={() => setTip(t.id as any)}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${tip === t.id ? `border-${t.color}-500 bg-${t.color}-50` : 'border-slate-200 hover:border-slate-300'}`}>
                                    <div className="text-xl mb-1">{t.icon}</div>
                                    <p className="text-sm font-semibold text-slate-800">{t.label}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">{t.desc}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Şablon adı */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Şablon Adı <span className="text-red-500">*</span></label>
                        <input type="text" name="sablon_adi" required minLength={3}
                            defaultValue={sablon?.sablon_adi}
                            placeholder="Örn: Ofis Kirası, Audi A4 Leasing, Strom 12-Monat-Vertrag"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>

                    {/* Kategori */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori <span className="text-red-500">*</span></label>
                        <select name="gider_kalemi_id" required defaultValue={sablon?.gider_kalemi_id ?? ''}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                            <option value="">— Kategori seçin —</option>
                            {giderKalemleri.map(k => (
                                <option key={k.id} value={k.id}>
                                    {k.gider_ana_kategoriler?.ad ? `${k.gider_ana_kategoriler.ad} › ` : ''}{k.ad}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Tutar + Periyot */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tutar (€) <span className="text-red-500">*</span></label>
                            <input type="number" name="varsayilan_tutar" required min="0.01" step="0.01"
                                defaultValue={sablon?.varsayilan_tutar ?? sablon?.tutar ?? ''}
                                placeholder="0.00"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Periyot <span className="text-red-500">*</span></label>
                            <select name="tekrar_periyodu" required defaultValue={sablon?.tekrar_periyodu || 'aylik'}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
                                <option value="aylik">Aylık</option>
                                <option value="ceyreklik">Çeyreklik (3 ayda 1)</option>
                                <option value="yarim_yillik">Yarım Yıllık (6 ayda 1)</option>
                                <option value="yillik">Yıllık</option>
                            </select>
                        </div>
                    </div>

                    {/* Tarihler */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Başlangıç Tarihi <span className="text-red-500">*</span>
                            </label>
                            <input type="date" name="baslangic_tarihi" required
                                defaultValue={sablon?.baslangic_tarihi || today}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                        {tip === 'sureli_sozlesme' && (
                            <div>
                                <label className="block text-sm font-medium text-orange-700 mb-1">
                                    Bitiş Tarihi <span className="text-red-500">*</span>
                                </label>
                                <input type="date" name="bitis_tarihi" required
                                    defaultValue={sablon?.bitis_tarihi ?? ''}
                                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                            </div>
                        )}
                        {tip === 'taksitli' && (
                            <div>
                                <label className="block text-sm font-medium text-purple-700 mb-1">
                                    Toplam Taksit Sayısı <span className="text-red-500">*</span>
                                </label>
                                <input type="number" name="taksit_sayisi" required min="1" max="120" step="1"
                                    defaultValue={sablon?.taksit_sayisi ?? ''}
                                    placeholder="Örn: 18"
                                    className="w-full border border-purple-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                            </div>
                        )}
                    </div>

                    {/* Açıklama */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama (opsiyonel)</label>
                        <input type="text" name="aciklama" defaultValue={sablon?.aciklama ?? ''}
                            placeholder="Otomatik oluşturulan giderlerin açıklaması"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>

                    {/* Notlar */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Dahili Notlar (opsiyonel)</label>
                        <textarea name="notlar" rows={2} defaultValue={sablon?.notlar ?? ''}
                            placeholder="Sözleşme detayları, hatırlatmalar..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                    </div>

                    {/* Footer */}
                    <div className="flex gap-3 pt-2 border-t border-slate-100">
                        <button type="button" onClick={onClose}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={isPending}
                            className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                            <FiSave size={14} />
                            {isPending ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Şablonu Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
