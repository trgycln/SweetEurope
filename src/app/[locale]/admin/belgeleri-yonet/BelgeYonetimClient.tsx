'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
    FiSearch, FiX, FiChevronDown, FiChevronRight,
    FiAlertTriangle, FiPlus, FiLock, FiEdit2, FiFolder
} from 'react-icons/fi';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────────────────────── */
type Firma = { id: string; unvan: string };
type Tir = { id: string; referans_kodu: string };

type Belge = {
    id: string;
    ad: string;
    kategori: string;
    alt_kategori: string | null;
    sira_no: string | null;
    evrak_tarihi: string | null;
    iliski_tipi: string | null;
    iliski_id: string | null;
    firma_id: string | null;
    tir_id: string | null;
    aciklama: string | null;
    etiketler: string[] | null;
    son_gecerlilik_tarihi: string | null;
    yukleyen_id: string | null;
    olusturma_tarihi: string;
    gizli: boolean;
    otomatik_eklendi: boolean;
    tedarikci_adi: string | null;
    firma?: { unvan: string } | null;
    tir?: { referans_kodu: string } | null;
};

type Stats = {
    toplam: number;
    bu_ay: number;
    sozlesmeler: number;
};

interface Props {
    belgeler: Belge[];
    stats: Stats;
    kategoriSayilari: Record<string, number>;
    firmalar: Firma[];
    tirlar: Tir[];
    locale: string;
}

/* ── Category tree ─────────────────────────────────────────────────────── */
type KategoriNode = {
    id: string;
    label: string;
    icon: string;
    children?: { id: string; label: string }[];
};

const KATEGORI_AGACI: KategoriNode[] = [
    { id: 'gelen_evrak_dosyasi', label: 'Gelen Evrak Dosyası', icon: '📥' },
    { id: 'giden_evrak_dosyasi', label: 'Giden Evrak Dosyası', icon: '📤' },
    { id: 'sozlesmeler_dosyasi', label: 'Sözleşmeler Dosyası', icon: '📋' },
    { id: 'kurulus_evraklari', label: 'Resmi Kuruluş Evrakları', icon: '🏛️' },
    { id: 'personel_ozluk_dosyalari', label: 'Personel Özlük Dosyaları', icon: '👥' },
    { id: 'sertifikalar', label: 'Sertifikalar (HACCP vs.)', icon: '🏅' },
    { id: 'diger', label: 'Diğer Klasörler', icon: '📁' },
];

const TEDARIKCI_OPTIONS = ['FO', 'Sweet Heaven Gıda A.Ş.', 'Diğer'];



/* ── SummaryCard ───────────────────────────────────────────────────────── */
function SummaryCard({
    icon, label, value, color = 'slate', onClick,
}: {
    icon: string; label: string; value: number; color?: 'slate' | 'red' | 'orange' | 'blue' | 'green';
    onClick?: () => void;
}) {
    const colorClasses = {
        slate: 'bg-white border-slate-200 text-slate-800',
        red: 'bg-red-50 border-red-200 text-red-800',
        orange: 'bg-orange-50 border-orange-200 text-orange-800',
        blue: 'bg-blue-50 border-blue-200 text-blue-800',
        green: 'bg-green-50 border-green-200 text-green-800',
    };
    return (
        <div
            className={`rounded-xl border p-4 ${colorClasses[color]} ${onClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''}`}
            onClick={onClick}
        >
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-2xl font-bold leading-none">{value}</div>
            <div className="text-xs mt-1 opacity-80">{label}</div>
        </div>
    );
}

/* ── CategorySidebar ───────────────────────────────────────────────────── */
function CategorySidebar({
    selected, onSelect,
    toplam, kategoriSayilari, kategoriSuresiBitenler,
}: {
    selected: string;
    onSelect: (id: string) => void;
    toplam: number;
    kategoriSayilari: Record<string, number>;
}) {
    return (
        <div className="space-y-1">
            {/* Tümü */}
            <button
                onClick={() => onSelect('tumu')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected === 'tumu' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
            >
                <span>📋 Tüm Fihrist</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${selected === 'tumu' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {toplam}
                </span>
            </button>

            <div className="pt-2 pb-0.5">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Klasörler</p>
            </div>

            {KATEGORI_AGACI.map(kat => (
                <div key={kat.id}>
                    <button
                        onClick={() => onSelect(kat.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected === kat.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2">
                            {kat.icon} {kat.label}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">{kategoriSayilari[kat.id] || 0}</span>
                        </div>
                    </button>
                </div>
            ))}
        </div>
    );
}

/* ── AddModal ───────────────────────────────────────────────────────── */
function AddModal({
    onClose, onSuccess, firmalar, tirlar, defaultKategori, belgeler
}: {
    onClose: () => void;
    onSuccess: (belge: Belge) => void;
    firmalar: Firma[];
    tirlar: Tir[];
    defaultKategori?: string;
    belgeler: Belge[];
}) {
    const [form, setForm] = useState({
        ad: '',
        kategori: defaultKategori || 'gelen_evrak_dosyasi',
        sira_no: '',
        evrak_tarihi: '',
        tedarikci_adi: '',
        aciklama: '',
        etiketler: '',
        gizli: false,
    });
    const [saving, setSaving] = useState(false);

    // Kategori değiştiğinde o kategorideki en yüksek sıra numarasını bulup 1 artırır
    useEffect(() => {
        const belgelerInCat = belgeler.filter(b => b.kategori === form.kategori && b.sira_no);
        if (belgelerInCat.length === 0) {
            setForm(p => ({ ...p, sira_no: '1' }));
            return;
        }

        let max = 0;
        let foundNumeric = false;
        belgelerInCat.forEach(b => {
            const num = parseInt(b.sira_no || '0', 10);
            if (!isNaN(num)) {
                if (num > max) max = num;
                foundNumeric = true;
            }
        });

        if (foundNumeric) {
            setForm(p => ({ ...p, sira_no: (max + 1).toString() }));
        } else {
            setForm(p => ({ ...p, sira_no: '1' }));
        }
    }, [form.kategori, belgeler]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.ad || !form.kategori) {
            toast.error('Evrak adı ve kategori zorunludur');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/belgeler', { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Kayıt başarısız');
            }

            toast.success('Evrak başarıyla kaydedildi');
            onSuccess(data.belge);
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Kayıt hatası');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">📇 Yeni Evrak Kaydı</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Belge adı */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Evrak / Belge Adı <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.ad}
                            onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
                            placeholder="Ör: Tedarikçi Faturası - Ocak 2026"
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Kategori (Klasör Tipi) <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.kategori}
                                onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {KATEGORI_AGACI.map(k => (
                                    <option key={k.id} value={k.id}>{k.icon} {k.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Evrak Tarihi</label>
                            <input
                                type="date"
                                value={form.evrak_tarihi}
                                onChange={e => setForm(p => ({ ...p, evrak_tarihi: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Dosya İçi Sıra Numarası
                        </label>
                        <input
                            type="text"
                            value={form.sira_no}
                            onChange={e => setForm(p => ({ ...p, sira_no: e.target.value }))}
                            placeholder="Ör: 045"
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Etiketler</label>
                        <input
                            type="text"
                            value={form.etiketler}
                            onChange={e => setForm(p => ({ ...p, etiketler: e.target.value }))}
                            placeholder="fatura, gümrük, ..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    {/* Açıklama */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Detaylı Açıklama</label>
                        <textarea
                            value={form.aciklama}
                            onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                            rows={3}
                            placeholder="Evrakın içeriği hakkında aramalarda bulmayı kolaylaştıracak notlar..."
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        />
                    </div>

                    {/* Gizli */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.gizli}
                            onChange={e => setForm(p => ({ ...p, gizli: e.target.checked }))}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-slate-700 flex items-center gap-1">
                            <FiLock size={13} className="text-slate-400" /> Gizli evrak (sadece yöneticiler görebilir)
                        </span>
                    </label>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} disabled={saving}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={saving || !form.ad}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ── EditModal ─────────────────────────────────────────────────────────── */
function EditModal({
    belge, firmalar, tirlar, onClose, onSuccess,
}: {
    belge: Belge;
    firmalar: Firma[];
    tirlar: Tir[];
    onClose: () => void;
    onSuccess: (updated: Belge) => void;
}) {
    const [form, setForm] = useState({
        ad: belge.ad,
        kategori: belge.kategori,
        sira_no: belge.sira_no ?? '',
        evrak_tarihi: belge.evrak_tarihi ?? '',
        aciklama: belge.aciklama ?? '',
        etiketler: belge.etiketler?.join(', ') ?? '',
        gizli: belge.gizli,
    });
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.ad || !form.kategori) {
            toast.error('Evrak adı ve kategori zorunludur');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/belgeler/${belge.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ad: form.ad,
                    kategori: form.kategori,
                    sira_no: form.sira_no || null,
                    evrak_tarihi: form.evrak_tarihi || null,
                    aciklama: form.aciklama || null,
                    etiketler: form.etiketler
                        ? form.etiketler.split(',').map(t => t.trim()).filter(Boolean)
                        : [],
                    gizli: form.gizli,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Güncelleme başarısız');
            toast.success('Evrak güncellendi');
            onSuccess(data.belge);
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Güncelleme hatası');
        } finally {
            setSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">✏️ Evrak Düzenle</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[340px]">{belge.ad}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Evrak Adı <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.ad}
                            onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Kategori <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.kategori}
                                onChange={e => setForm(p => ({ ...p, kategori: e.target.value }))}
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {KATEGORI_AGACI.map(k => (
                                    <option key={k.id} value={k.id}>{k.icon} {k.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Evrak Tarihi</label>
                            <input
                                type="date"
                                value={form.evrak_tarihi}
                                onChange={e => setForm(p => ({ ...p, evrak_tarihi: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Dosya İçi Sıra Numarası
                        </label>
                        <input
                            type="text"
                            value={form.sira_no}
                            onChange={e => setForm(p => ({ ...p, sira_no: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Etiketler</label>
                        <input
                            type="text"
                            value={form.etiketler}
                            onChange={e => setForm(p => ({ ...p, etiketler: e.target.value }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    {/* Açıklama */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                        <textarea
                            value={form.aciklama}
                            onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                            rows={3}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                        />
                    </div>

                    {/* Gizli */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.gizli}
                            onChange={e => setForm(p => ({ ...p, gizli: e.target.checked }))}
                            className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-slate-700 flex items-center gap-1">
                            <FiLock size={13} className="text-slate-400" /> Gizli belge
                        </span>
                    </label>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} disabled={saving}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={saving}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

/* ── BelgeRow ─────────────────────────────────────────────────────────── */
function BelgeRow({
    belge, locale, firmalar, tirlar, onDelete, onUpdate,
}: {
    belge: Belge;
    locale: string;
    firmalar: Firma[];
    tirlar: Tir[];
    onDelete: (id: string) => void;
    onUpdate: (belge: Belge) => void;
}) {
    const [deleting, setDeleting] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    // Kategori adını bul
    const findKategoriLabel = (id: string): string => {
        for (const k of KATEGORI_AGACI) {
            if (k.id === id) return k.label;
            for (const c of k.children ?? []) {
                if (c.id === id) return c.label;
            }
        }
        return id;
    };

    const handleDelete = async () => {
        if (!confirm('Bu evrak kaydını silmek istediğinizden emin misiniz?')) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/belgeler/${belge.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Silme hatası');
            onDelete(belge.id);
            toast.success('Evrak kaydı silindi');
        } catch {
            toast.error('Silme işlemi başarısız');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            {editOpen && (
                <EditModal
                    belge={belge}
                    firmalar={firmalar}
                    tirlar={tirlar}
                    onClose={() => setEditOpen(false)}
                    onSuccess={updated => { onUpdate(updated); setEditOpen(false); }}
                />
            )}
            <tr className="group border-b border-slate-100 hover:bg-slate-50/50 transition-colors border-l-2 border-l-blue-400">
            {/* Evrak ad + Açıklama */}
            <td className="px-4 py-3 max-w-[260px]">
                <div className="flex items-start gap-2.5">
                    <span className="text-xl flex-shrink-0 leading-none mt-0.5">
                        📄
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 break-words leading-snug" title={belge.ad}>
                            {belge.ad}
                        </p>

                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {belge.aciklama && (
                                <span className="text-[11px] text-slate-500 truncate max-w-[180px]" title={belge.aciklama}>
                                    {belge.aciklama}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 mt-1">
                            {belge.gizli && (
                                <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                                    <FiLock size={8} /> Gizli
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>

            {/* Fiziksel Konum */}
            <td className="px-3 py-3 whitespace-nowrap">
                <div className="space-y-1">
                    <span className="text-[11px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                        <FiFolder size={10} /> {findKategoriLabel(belge.kategori)}
                    </span>
                    {belge.sira_no && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md block w-max">
                            Sıra No: <strong>{belge.sira_no}</strong>
                        </span>
                    )}
                </div>
            </td>



            {/* Tarih */}
            <td className="px-3 py-3 whitespace-nowrap text-[11px] text-slate-500">
                {belge.evrak_tarihi ? (
                    <span className="text-slate-700 font-medium border-b border-slate-200 border-dashed pb-0.5">
                        {new Date(belge.evrak_tarihi).toLocaleDateString('tr-TR')}
                    </span>
                ) : (
                    <span className="text-slate-300">—</span>
                )}
            </td>



            {/* İşlem butonları */}
            <td className="px-3 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setEditOpen(true)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="İncele / Düzenle"
                    >
                        <FiEdit2 size={14} />
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                        title="Sil"
                    >
                        <FiX size={14} />
                    </button>
                </div>
            </td>
            </tr>
        </>
    );
}

/* ── Main Component ────────────────────────────────────────────────────── */
export default function BelgeYonetimClient({
    belgeler: initialBelgeler, stats: initialStats,
    kategoriSayilari,
    firmalar, tirlar, locale,
}: Props) {
    const [belgeler, setBelgeler] = useState<Belge[]>(initialBelgeler);
    const [selectedKategori, setSelectedKategori] = useState('tumu');
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadDefaultKategori, setUploadDefaultKategori] = useState('gelen_evrak_dosyasi');

    // Active filter chips
    const [activeChips, setActiveChips] = useState<Set<string>>(new Set());

    const toggleChip = (chip: string) => {
        setActiveChips(prev => {
            const next = new Set(prev);
            next.has(chip) ? next.delete(chip) : next.add(chip);
            return next;
        });
    };

    const now = Date.now();
    const thirtyDays = 30 * 86400000;
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

    // Filtered documents
    const filtered = useMemo(() => {
        let result = belgeler;

        // Category filter
        if (selectedKategori !== 'tumu') {
            result = result.filter(b => b.kategori === selectedKategori);
        }

        // Text search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(b =>
                b.ad.toLowerCase().includes(q) ||
                (b.aciklama && b.aciklama.toLowerCase().includes(q)) ||
                (b.sira_no && b.sira_no.toLowerCase().includes(q)) ||
                b.firma?.unvan?.toLowerCase().includes(q) ||
                b.etiketler?.some(t => t.toLowerCase().includes(q))
            );
        }

        // Status chips
        if (activeChips.has('bu_ay')) {
            result = result.filter(b => new Date(b.olusturma_tarihi).getTime() > thisMonthStart);
        }

        // Sıra numarasına göre doğal sıralama (örn: "2" < "10")
        result.sort((a, b) => {
            const noA = a.sira_no || '';
            const noB = b.sira_no || '';
            
            // Eğer her ikisi de boşsa oluşturma tarihine göre (yeni en üstte)
            if (!noA && !noB) {
                return new Date(b.olusturma_tarihi).getTime() - new Date(a.olusturma_tarihi).getTime();
            }
            if (!noA) return 1;
            if (!noB) return -1;
            
            // localeCompare numeric ile doğal sıralama ("001" vs "2" vs "A10")
            return noA.localeCompare(noB, 'tr', { numeric: true });
        });

        return result;
    }, [belgeler, selectedKategori, searchTerm, activeChips, now, thirtyDays, thisMonthStart]);

    // Recompute stats from current belgeler
    const stats = useMemo(() => ({
        toplam: belgeler.length,
        bu_ay: belgeler.filter(b => new Date(b.olusturma_tarihi).getTime() > thisMonthStart).length,
        sozlesmeler: belgeler.filter(b => b.kategori === 'sozlesmeler_dosyasi' || b.kategori === 'sozlesmeler').length,
    }), [belgeler, now, thirtyDays, thisMonthStart]);

    // Sidebar counts from current belgeler
    const currentKategoriSayilari = useMemo(() => {
        const counts: Record<string, number> = {};
        belgeler.forEach(b => {
            counts[b.kategori] = (counts[b.kategori] || 0) + 1;
        });
        return counts;
    }, [belgeler]);



    const handleDelete = (id: string) => {
        setBelgeler(prev => prev.filter(b => b.id !== id));
    };

    const handleUpdate = (updated: Belge) => {
        setBelgeler(prev => prev.map(b => b.id === updated.id ? updated : b));
    };

    const handleUploadSuccess = (newBelge: Belge) => {
        setBelgeler(prev => [newBelge, ...prev]);
    };

    const FILTER_CHIPS = [
        { id: 'bu_ay', label: '📅 Bu Ay Eklenen', color: 'blue' },
    ];

    return (
        <div className="space-y-4">



            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Evrak Fihristi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Gelen/giden evrak, sözleşmeler ve resmi kuruluş belgelerinin fiziksel takibi
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setUploadDefaultKategori('gelen_evrak_dosyasi'); setUploadModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                        <FiPlus size={14} /> Yeni Evrak Kaydı
                    </button>
                </div>
            </div>

            {/* ── Özet kartlar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard icon="📋" label="Toplam Kayıtlı Evrak" value={stats.toplam} color="slate"
                    onClick={() => setSelectedKategori('tumu')} />
                <SummaryCard icon="📅" label="Bu Ay Eklenenler" value={stats.bu_ay} color="blue"
                    onClick={() => toggleChip('bu_ay')} />
                <SummaryCard icon="🤝" label="Sözleşmeler" value={stats.sozlesmeler} color="green"
                    onClick={() => setSelectedKategori('sozlesmeler_dosyasi')} />
            </div>

            {/* ── Ana içerik: sidebar + liste ── */}
            <div className="flex gap-4 items-start">
                {/* Left sidebar */}
                <aside className="hidden lg:block w-64 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-3">
                    <CategorySidebar
                        selected={selectedKategori}
                        onSelect={setSelectedKategori}
                        toplam={belgeler.length}
                        kategoriSayilari={currentKategoriSayilari}
                    />
                </aside>

                {/* Right content */}
                <div className="flex-1 min-w-0 space-y-3">

                    {/* Search + filter chips */}
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-3">
                        {/* Search */}
                        <div className="relative">
                            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Evrak adı, sıra no, açıklama ara..."
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                            />
                        </div>

                        {/* Filter chips */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            {FILTER_CHIPS.map(chip => (
                                <button
                                    key={chip.id}
                                    onClick={() => toggleChip(chip.id)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                        activeChips.has(chip.id)
                                            ? 'bg-slate-800 text-white border-slate-800'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                    }`}
                                >
                                    {chip.label}
                                </button>
                            ))}

                            {(activeChips.size > 0 || searchTerm) && (
                                <button
                                    onClick={() => { setActiveChips(new Set()); setSearchTerm(''); }}
                                    className="px-2.5 py-1 rounded-full text-xs text-slate-500 hover:text-red-500 border border-slate-200 flex items-center gap-1 transition-colors"
                                >
                                    <FiX size={10} /> Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Document table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        {/* Table header info */}
                        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <p className="text-xs text-slate-500">
                                <strong className="text-slate-700">{filtered.length}</strong> evrak listelendi
                            </p>
                            {selectedKategori !== 'tumu' && (
                                <button
                                    onClick={() => setSelectedKategori('tumu')}
                                    className="text-xs text-blue-600 hover:text-blue-800"
                                >
                                    × Filtreyi kaldır
                                </button>
                            )}
                        </div>

                        {filtered.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="text-4xl mb-3">📭</div>
                                <p className="text-slate-600 font-semibold text-sm">Evrak kaydı bulunamadı</p>
                                <p className="text-slate-400 text-xs mt-1">Filtre kriterini değiştirin veya yeni evrak kaydedin.</p>
                                <button
                                    onClick={() => setUploadModalOpen(true)}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                                >
                                    <FiPlus size={14} /> İlk Evrak Kaydını Ekle
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Evrak & Açıklama</th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Fiziksel Konum</th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Evrak Tarihi</th>
                                            <th className="px-3 py-2.5 w-24" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filtered.map(b => (
                                            <BelgeRow
                                                key={b.id}
                                                belge={b}
                                                locale={locale}
                                                firmalar={firmalar}
                                                tirlar={tirlar}
                                                onDelete={handleDelete}
                                                onUpdate={handleUpdate}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Add modal ── */}
            {uploadModalOpen && (
                <AddModal
                    onClose={() => setUploadModalOpen(false)}
                    onSuccess={handleUploadSuccess}
                    firmalar={firmalar}
                    tirlar={tirlar}
                    defaultKategori={uploadDefaultKategori}
                    belgeler={belgeler}
                />
            )}
        </div>
    );
}
