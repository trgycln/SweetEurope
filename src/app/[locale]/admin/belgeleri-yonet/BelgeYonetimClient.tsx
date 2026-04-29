'use client';

import { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
    FiSearch, FiUpload, FiDownload, FiEye, FiX, FiChevronDown, FiChevronRight,
    FiAlertTriangle, FiClock, FiPlus, FiLock, FiRefreshCw, FiEdit2,
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
    dosya_url: string | null;
    dosya_boyutu: number | null;
    dosya_tipi: string | null;
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
    suresi_yakin: number;
    bekleyen: number;
    bu_ay: number;
    sozlesmeler: number;
};

interface Props {
    belgeler: Belge[];
    stats: Stats;
    kategoriSayilari: Record<string, number>;
    kategoriSuresiBitenler: Record<string, number>;
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
    {
        id: 'gelen_evrak', label: 'Gelen Evrak', icon: '📥',
        children: [
            { id: 'tedarikci_faturalari', label: 'Tedarikçi Faturaları' },
            { id: 'gumruk_tir', label: 'Gümrük & TIR' },
            { id: 'irsaliyeler', label: 'İrsaliyeler' },
            { id: 'resmi_yazilar', label: 'Resmi Yazılar' },
            { id: 'musteri_siparisleri', label: 'Müşteri Siparişleri' },
            { id: 'tedarikci_kataloglari', label: 'Tedarikçi Katalogları' },
            { id: 'tedarikci_fiyat_listeleri', label: 'Tedarikçi Fiyat Listeleri' },
        ],
    },
    {
        id: 'giden_evrak', label: 'Giden Evrak', icon: '📤',
        children: [
            { id: 'musteri_faturalari', label: 'Müşteri Faturaları' },
            { id: 'teklifler', label: 'Teklifler' },
            { id: 'teslimat_irsaliyeleri', label: 'Teslimat İrsaliyeleri' },
            { id: 'giden_resmi_yazilar', label: 'Resmi Yazılar' },
        ],
    },
    { id: 'sozlesmeler', label: 'Sözleşmeler', icon: '📋' },
    { id: 'sertifikalar', label: 'Sertifikalar (HACCP)', icon: '🏅' },
    { id: 'gizli', label: 'Gizli Belgeler', icon: '🔒' },
    { id: 'diger', label: 'Diğer', icon: '📁' },
];

// Kategoriler için tedarikçi gösterilmeli
const TEDARIKCI_ALT_KATEGORILER = ['tedarikci_kataloglari', 'tedarikci_fiyat_listeleri'];
const TEDARIKCI_OPTIONS = ['FO', 'Sweet Heaven Gıda A.Ş.', 'Diğer'];

const ALT_KATEGORILER: Record<string, { id: string; label: string }[]> = {
    gelen_evrak: [
        { id: 'tedarikci_faturalari', label: 'Tedarikçi Faturaları' },
        { id: 'gumruk_tir', label: 'Gümrük & TIR' },
        { id: 'irsaliyeler', label: 'İrsaliyeler' },
        { id: 'resmi_yazilar', label: 'Resmi Yazılar' },
        { id: 'musteri_siparisleri', label: 'Müşteri Siparişleri' },
        { id: 'tedarikci_kataloglari', label: 'Tedarikçi Katalogları' },
        { id: 'tedarikci_fiyat_listeleri', label: 'Tedarikçi Fiyat Listeleri' },
    ],
    giden_evrak: [
        { id: 'musteri_faturalari', label: 'Müşteri Faturaları' },
        { id: 'teklifler', label: 'Teklifler' },
        { id: 'teslimat_irsaliyeleri', label: 'Teslimat İrsaliyeleri' },
        { id: 'giden_resmi_yazilar', label: 'Resmi Yazılar' },
    ],
};

/* ── Utilities ─────────────────────────────────────────────────────────── */
function formatFileSize(bytes: number | null): string {
    if (!bytes) return '—';
    const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function getFileIcon(tipi: string | null): string {
    if (!tipi) return '📎';
    if (tipi.includes('pdf')) return '📄';
    if (tipi.includes('excel') || tipi.includes('spreadsheet')) return '📊';
    if (tipi.includes('word') || tipi.includes('document')) return '📝';
    if (tipi.startsWith('image/')) return '🖼️';
    return '📎';
}

function getFileTypeLabel(tipi: string | null): string {
    if (!tipi) return 'Dosya';
    if (tipi.includes('pdf')) return 'PDF';
    if (tipi.includes('excel') || tipi.includes('spreadsheet')) return 'Excel';
    if (tipi.includes('word') || tipi.includes('document')) return 'Word';
    if (tipi.startsWith('image/')) return 'Görsel';
    return 'Dosya';
}

function daysUntilExpiry(date: string | null): number | null {
    if (!date) return null;
    return Math.floor((new Date(date).getTime() - Date.now()) / 86400000);
}

function leftBorderClass(belge: Belge): string {
    if (belge.otomatik_eklendi && !belge.dosya_url) return 'border-l-orange-400';
    const days = daysUntilExpiry(belge.son_gecerlilik_tarihi);
    if (days !== null && days < 30) return 'border-l-red-500';
    return 'border-l-green-400';
}

function findKategoriLabel(id: string): string {
    for (const k of KATEGORI_AGACI) {
        if (k.id === id) return k.label;
        for (const c of k.children ?? []) {
            if (c.id === id) return c.label;
        }
    }
    return id;
}

/* ── ExpiryBadge ───────────────────────────────────────────────────────── */
function ExpiryBadge({ date }: { date: string | null }) {
    const days = daysUntilExpiry(date);
    if (days === null) return <span className="text-slate-300 text-xs">—</span>;
    if (days < 0) return <span className="text-[11px] font-semibold text-red-600">⚠ Doldu</span>;
    if (days < 30) return <span className="text-[11px] font-semibold text-red-600">⚠ {days}g kaldı</span>;
    if (days < 90) {
        return <span className="text-[11px] font-semibold text-amber-600">⚡ {Math.floor(days / 30)}ay kaldı</span>;
    }
    return (
        <span className="text-[11px] text-slate-500">
            {new Date(date!).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
        </span>
    );
}

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
    kategoriSuresiBitenler: Record<string, number>;
}) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['gelen_evrak', 'giden_evrak']));

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    return (
        <div className="space-y-1">
            {/* Tümü */}
            <button
                onClick={() => onSelect('tumu')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected === 'tumu' ? 'bg-blue-600 text-white font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
            >
                <span>📋 Tümü</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${selected === 'tumu' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {toplam}
                </span>
            </button>

            <div className="pt-1 pb-0.5">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gelen Evrak</p>
            </div>

            {/* Gelen Evrak group */}
            {KATEGORI_AGACI.filter(k => k.id === 'gelen_evrak').map(kat => (
                <div key={kat.id}>
                    <button
                        onClick={() => { toggleExpand(kat.id); onSelect(kat.id); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected === kat.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2">
                            {expanded.has(kat.id)
                                ? <FiChevronDown size={12} className="text-slate-400" />
                                : <FiChevronRight size={12} className="text-slate-400" />
                            }
                            {kat.icon} {kat.label}
                        </span>
                        <span className="text-xs text-slate-400">{kategoriSayilari[kat.id] || 0}</span>
                    </button>
                    {expanded.has(kat.id) && kat.children?.map(child => (
                        <button
                            key={child.id}
                            onClick={() => onSelect(child.id)}
                            className={`w-full flex items-center justify-between pl-8 pr-3 py-1.5 rounded-lg text-xs transition-colors ${selected === child.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <span>↳ {child.label}</span>
                            <div className="flex items-center gap-1">
                                {(kategoriSuresiBitenler[child.id] || 0) > 0 && (
                                    <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-full font-bold">
                                        ⚠{kategoriSuresiBitenler[child.id]}
                                    </span>
                                )}
                                <span className="text-slate-300">{kategoriSayilari[child.id] || 0}</span>
                            </div>
                        </button>
                    ))}
                </div>
            ))}

            <div className="pt-2 pb-0.5">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Giden Evrak</p>
            </div>

            {/* Giden Evrak group */}
            {KATEGORI_AGACI.filter(k => k.id === 'giden_evrak').map(kat => (
                <div key={kat.id}>
                    <button
                        onClick={() => { toggleExpand(kat.id); onSelect(kat.id); }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected === kat.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                        <span className="flex items-center gap-2">
                            {expanded.has(kat.id)
                                ? <FiChevronDown size={12} className="text-slate-400" />
                                : <FiChevronRight size={12} className="text-slate-400" />
                            }
                            {kat.icon} {kat.label}
                        </span>
                        <span className="text-xs text-slate-400">{kategoriSayilari[kat.id] || 0}</span>
                    </button>
                    {expanded.has(kat.id) && kat.children?.map(child => (
                        <button
                            key={child.id}
                            onClick={() => onSelect(child.id)}
                            className={`w-full flex items-center justify-between pl-8 pr-3 py-1.5 rounded-lg text-xs transition-colors ${selected === child.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <span>↳ {child.label}</span>
                            <span className="text-slate-300">{kategoriSayilari[child.id] || 0}</span>
                        </button>
                    ))}
                </div>
            ))}

            <div className="pt-2 pb-0.5">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Özel</p>
            </div>

            {KATEGORI_AGACI.filter(k => !['gelen_evrak', 'giden_evrak'].includes(k.id)).map(kat => (
                <button
                    key={kat.id}
                    onClick={() => onSelect(kat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${selected === kat.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-slate-100 text-slate-700'}`}
                >
                    <span>{kat.icon} {kat.label}</span>
                    <div className="flex items-center gap-1">
                        {(kategoriSuresiBitenler[kat.id] || 0) > 0 && (
                            <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded-full font-bold">
                                ⚠{kategoriSuresiBitenler[kat.id]}
                            </span>
                        )}
                        <span className="text-xs text-slate-400">{kategoriSayilari[kat.id] || 0}</span>
                    </div>
                </button>
            ))}
        </div>
    );
}

/* ── UploadModal ───────────────────────────────────────────────────────── */
function UploadModal({
    onClose, onSuccess, firmalar, tirlar, defaultKategori,
}: {
    onClose: () => void;
    onSuccess: (belge: Belge) => void;
    firmalar: Firma[];
    tirlar: Tir[];
    defaultKategori?: string;
}) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [form, setForm] = useState({
        file: null as File | null,
        ad: '',
        kategori: defaultKategori || 'gelen_evrak',
        alt_kategori: '',
        firma_id: '',
        tir_id: '',
        tedarikci_adi: '',
        son_gecerlilik_tarihi: '',
        aciklama: '',
        etiketler: '',
        gizli: false,
    });
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const altKats = ALT_KATEGORILER[form.kategori] ?? [];

    const handleFile = (f: File) => {
        setForm(prev => ({
            ...prev,
            file: f,
            ad: prev.ad || f.name.replace(/\.[^/.]+$/, ''),
        }));
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.ad || !form.kategori) {
            toast.error('Belge adı ve kategori zorunludur');
            return;
        }

        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('ad', form.ad);
            fd.append('kategori', form.kategori);
            if (form.alt_kategori) fd.append('alt_kategori', form.alt_kategori);
            if (form.firma_id) fd.append('firma_id', form.firma_id);
            if (form.tir_id) fd.append('tir_id', form.tir_id);
            if (form.tedarikci_adi) fd.append('tedarikci_adi', form.tedarikci_adi);
            if (form.son_gecerlilik_tarihi) fd.append('son_gecerlilik_tarihi', form.son_gecerlilik_tarihi);
            if (form.aciklama) fd.append('aciklama', form.aciklama);
            if (form.etiketler) fd.append('etiketler', form.etiketler);
            fd.append('gizli', form.gizli ? 'true' : 'false');
            if (form.file) fd.append('file', form.file);

            const res = await fetch('/api/belgeler/upload', { method: 'POST', body: fd });
            const data = await res.json();

            if (!res.ok) {
                const msg = data.details ? `${data.error}: ${data.details}` : (data.error || 'Yükleme başarısız');
                throw new Error(msg);
            }

            toast.success('Belge başarıyla kaydedildi');
            onSuccess(data.belge);
            onClose();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Yükleme hatası');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                {/* Modal header */}
                <div className="sticky top-0 bg-white px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800">📎 Belge Yükle / Kaydet</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* File drop zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-400 bg-slate-50'}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                        />
                        {form.file ? (
                            <div className="space-y-1">
                                <div className="text-3xl">{getFileIcon(form.file.type)}</div>
                                <p className="font-semibold text-slate-700 text-sm">{form.file.name}</p>
                                <p className="text-xs text-slate-400">{formatFileSize(form.file.size)}</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <FiUpload size={24} className="mx-auto text-slate-400" />
                                <p className="text-sm text-slate-500">Dosyayı sürükle veya tıkla</p>
                                <p className="text-xs text-slate-400">PDF, Word, Excel, Görsel — max 50 MB</p>
                            </div>
                        )}
                    </div>
                    {form.file && (
                        <button type="button" onClick={() => setForm(p => ({ ...p, file: null }))}
                            className="text-xs text-red-500 hover:text-red-700">
                            × Dosyayı kaldır
                        </button>
                    )}

                    {/* Belge adı */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Belge Adı <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.ad}
                            onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
                            placeholder="Ör: Tedarikçi Faturası - Ocak 2025"
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    {/* Kategori + Alt kategori */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Kategori <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.kategori}
                                onChange={e => setForm(p => ({ ...p, kategori: e.target.value, alt_kategori: '', tedarikci_adi: '' }))}
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {KATEGORI_AGACI.map(k => (
                                    <option key={k.id} value={k.id}>{k.icon} {k.label}</option>
                                ))}
                            </select>
                        </div>
                        {altKats.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Alt Kategori</label>
                                <select
                                    value={form.alt_kategori}
                                    onChange={e => setForm(p => ({ ...p, alt_kategori: e.target.value }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                >
                                    <option value="">— Seçin —</option>
                                    {altKats.map(a => (
                                        <option key={a.id} value={a.id}>{a.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Tedarikçi — sadece tedarikci_kataloglari / tedarikci_fiyat_listeleri seçilince */}
                    {TEDARIKCI_ALT_KATEGORILER.includes(form.alt_kategori) && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tedarikçi <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.tedarikci_adi}
                                onChange={e => setForm(p => ({ ...p, tedarikci_adi: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="">— Tedarikçi seçin —</option>
                                {TEDARIKCI_OPTIONS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Firma + TIR */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Firma Bağlantısı</label>
                            <select
                                value={form.firma_id}
                                onChange={e => setForm(p => ({ ...p, firma_id: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="">— Firma seçin —</option>
                                {firmalar.map(f => (
                                    <option key={f.id} value={f.id}>{f.unvan}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">TIR / Parti</label>
                            <select
                                value={form.tir_id}
                                onChange={e => setForm(p => ({ ...p, tir_id: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="">— TIR seçin —</option>
                                {tirlar.map(t => (
                                    <option key={t.id} value={t.id}>{t.referans_kodu}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Son geçerlilik + Açıklama */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Son Geçerlilik</label>
                            <input
                                type="date"
                                value={form.son_gecerlilik_tarihi}
                                onChange={e => setForm(p => ({ ...p, son_gecerlilik_tarihi: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Etiketler</label>
                            <input
                                type="text"
                                value={form.etiketler}
                                onChange={e => setForm(p => ({ ...p, etiketler: e.target.value }))}
                                placeholder="haccp, gümrük, ..."
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                    </div>

                    {/* Açıklama */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                        <textarea
                            value={form.aciklama}
                            onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                            rows={2}
                            placeholder="İsteğe bağlı not..."
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
                            <FiLock size={13} className="text-slate-400" /> Gizli belge (sadece yöneticiler görebilir)
                        </span>
                    </label>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                        <button type="button" onClick={onClose} disabled={uploading}
                            className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
                            İptal
                        </button>
                        <button type="submit" disabled={uploading || !form.ad}
                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            {uploading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Kaydediliyor...
                                </span>
                            ) : '💾 Kaydet'}
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
        alt_kategori: belge.alt_kategori ?? '',
        tedarikci_adi: belge.tedarikci_adi ?? '',
        firma_id: belge.firma_id ?? '',
        tir_id: belge.tir_id ?? '',
        son_gecerlilik_tarihi: belge.son_gecerlilik_tarihi ?? '',
        aciklama: belge.aciklama ?? '',
        etiketler: belge.etiketler?.join(', ') ?? '',
        gizli: belge.gizli,
    });
    const [saving, setSaving] = useState(false);

    const altKats = ALT_KATEGORILER[form.kategori] ?? [];
    const showTedarikci = TEDARIKCI_ALT_KATEGORILER.includes(form.alt_kategori);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.ad || !form.kategori) {
            toast.error('Belge adı ve kategori zorunludur');
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
                    alt_kategori: form.alt_kategori || null,
                    tedarikci_adi: form.tedarikci_adi || null,
                    firma_id: form.firma_id || null,
                    tir_id: form.tir_id || null,
                    son_gecerlilik_tarihi: form.son_gecerlilik_tarihi || null,
                    aciklama: form.aciklama || null,
                    etiketler: form.etiketler
                        ? form.etiketler.split(',').map(t => t.trim()).filter(Boolean)
                        : [],
                    gizli: form.gizli,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Güncelleme başarısız');
            toast.success('Belge güncellendi');
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
                        <h3 className="text-lg font-bold text-slate-800">✏️ Belge Düzenle</h3>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[340px]">{belge.ad}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <FiX size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    {/* Belge adı */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Belge Adı <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.ad}
                            onChange={e => setForm(p => ({ ...p, ad: e.target.value }))}
                            required
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        />
                    </div>

                    {/* Kategori + Alt kategori */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Kategori <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.kategori}
                                onChange={e => setForm(p => ({ ...p, kategori: e.target.value, alt_kategori: '', tedarikci_adi: '' }))}
                                required
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                {KATEGORI_AGACI.map(k => (
                                    <option key={k.id} value={k.id}>{k.icon} {k.label}</option>
                                ))}
                            </select>
                        </div>
                        {altKats.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Alt Kategori</label>
                                <select
                                    value={form.alt_kategori}
                                    onChange={e => setForm(p => ({ ...p, alt_kategori: e.target.value, tedarikci_adi: '' }))}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                                >
                                    <option value="">— Seçin —</option>
                                    {altKats.map(a => (
                                        <option key={a.id} value={a.id}>{a.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Tedarikçi */}
                    {showTedarikci && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tedarikçi</label>
                            <select
                                value={form.tedarikci_adi}
                                onChange={e => setForm(p => ({ ...p, tedarikci_adi: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="">— Tedarikçi seçin —</option>
                                {TEDARIKCI_OPTIONS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Firma + TIR */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Firma Bağlantısı</label>
                            <select
                                value={form.firma_id}
                                onChange={e => setForm(p => ({ ...p, firma_id: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="">— Firma seçin —</option>
                                {firmalar.map(f => (
                                    <option key={f.id} value={f.id}>{f.unvan}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">TIR / Parti</label>
                            <select
                                value={form.tir_id}
                                onChange={e => setForm(p => ({ ...p, tir_id: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            >
                                <option value="">— TIR seçin —</option>
                                {tirlar.map(t => (
                                    <option key={t.id} value={t.id}>{t.referans_kodu}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Son geçerlilik + Etiketler */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Son Geçerlilik</label>
                            <input
                                type="date"
                                value={form.son_gecerlilik_tarihi}
                                onChange={e => setForm(p => ({ ...p, son_gecerlilik_tarihi: e.target.value }))}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Etiketler</label>
                            <input
                                type="text"
                                value={form.etiketler}
                                onChange={e => setForm(p => ({ ...p, etiketler: e.target.value }))}
                                placeholder="haccp, gümrük, ..."
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                        </div>
                    </div>

                    {/* Açıklama */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Açıklama</label>
                        <textarea
                            value={form.aciklama}
                            onChange={e => setForm(p => ({ ...p, aciklama: e.target.value }))}
                            rows={2}
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
                            {saving ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                    Kaydediliyor...
                                </span>
                            ) : '💾 Kaydet'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}

/* ── FileUploadInline (pending belge için) ─────────────────────────────── */
function InlineFileUpload({ belgeId, onSuccess }: { belgeId: string; onSuccess: (belge: Belge) => void }) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', f);
            const res = await fetch(`/api/belgeler/${belgeId}`, { method: 'PUT', body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success('Dosya yüklendi');
            onSuccess(data.belge);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Yükleme hatası');
        } finally {
            setUploading(false);
        }
    };

    return (
        <>
            <input ref={inputRef} type="file" className="hidden" onChange={handleChange} />
            <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-1 text-[11px] text-orange-600 hover:text-orange-800 font-semibold border border-orange-200 rounded-lg px-2 py-1 hover:bg-orange-50 transition-colors disabled:opacity-50"
                title="Belge yükle"
            >
                {uploading ? <FiRefreshCw size={11} className="animate-spin" /> : <FiUpload size={11} />}
                Yükle
            </button>
        </>
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
    const border = leftBorderClass(belge);

    const handleDelete = async () => {
        if (!confirm('Bu belgeyi silmek istediğinizden emin misiniz?')) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/belgeler/${belge.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Silme hatası');
            onDelete(belge.id);
            toast.success('Belge silindi');
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
            <tr className={`group border-b border-slate-100 hover:bg-slate-50/50 transition-colors border-l-2 ${border}`}>
            {/* Dosya ikonu + ad */}
            <td className="px-4 py-3 max-w-[260px]">
                <div className="flex items-start gap-2.5">
                    <span className="text-xl flex-shrink-0 leading-none mt-0.5">
                        {belge.otomatik_eklendi && !belge.dosya_url ? '⏳' : getFileIcon(belge.dosya_tipi)}
                    </span>
                    <div className="min-w-0">
                        {/* Kullanıcı adı — birincil, büyük */}
                        <p className="text-sm font-medium text-slate-800 truncate leading-snug">
                            {belge.ad}
                        </p>

                        {/* Teknik bilgiler — ikincil, küçük */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {belge.dosya_tipi && (
                                <span className="text-[11px] text-slate-400">
                                    {getFileTypeLabel(belge.dosya_tipi)}
                                    {belge.dosya_boyutu ? ` · ${formatFileSize(belge.dosya_boyutu)}` : ''}
                                </span>
                            )}
                            {belge.aciklama && (
                                <span className="text-[11px] text-slate-400 truncate max-w-[160px]">{belge.aciklama}</span>
                            )}
                        </div>

                        {/* Durum badge'leri */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                            {belge.otomatik_eklendi && (
                                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">🤖 Otomatik</span>
                            )}
                            {belge.gizli && (
                                <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded-full font-semibold flex items-center gap-0.5">
                                    <FiLock size={8} /> Gizli
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </td>

            {/* Kategori badge */}
            <td className="px-3 py-3 whitespace-nowrap">
                <div className="space-y-1">
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full block text-center">
                        {findKategoriLabel(belge.kategori)}
                    </span>
                    {belge.alt_kategori && (
                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full block text-center">
                            {findKategoriLabel(belge.alt_kategori)}
                        </span>
                    )}
                </div>
            </td>

            {/* Firma / TIR / Tedarikçi bağlantısı */}
            <td className="px-3 py-3 whitespace-nowrap text-xs">
                {belge.tedarikci_adi ? (
                    <span className="text-slate-700 font-medium">📦 {belge.tedarikci_adi}</span>
                ) : belge.firma?.unvan ? (
                    <Link href={`/${locale}/admin/crm/firmalar/${belge.firma_id}`}
                        className="text-blue-600 hover:text-blue-800 font-medium hover:underline">
                        🏢 {belge.firma.unvan}
                    </Link>
                ) : belge.tir?.referans_kodu ? (
                    <span className="text-slate-600">🚛 {belge.tir.referans_kodu}</span>
                ) : (
                    <span className="text-slate-300">—</span>
                )}
            </td>

            {/* Tarih */}
            <td className="px-3 py-3 whitespace-nowrap text-[11px] text-slate-500">
                {new Date(belge.olusturma_tarihi).toLocaleDateString('tr-TR', {
                    day: '2-digit', month: '2-digit', year: 'numeric'
                })}
            </td>

            {/* Son geçerlilik */}
            <td className="px-3 py-3 whitespace-nowrap">
                <ExpiryBadge date={belge.son_gecerlilik_tarihi} />
            </td>

            {/* İşlem butonları */}
            <td className="px-3 py-3 whitespace-nowrap">
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {belge.dosya_url ? (
                        <>
                            <a
                                href={belge.dosya_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Görüntüle"
                            >
                                <FiEye size={14} />
                            </a>
                            <a
                                href={belge.dosya_url}
                                download
                                className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="İndir"
                            >
                                <FiDownload size={14} />
                            </a>
                        </>
                    ) : (
                        <InlineFileUpload belgeId={belge.id} onSuccess={onUpdate} />
                    )}
                    <button
                        onClick={() => setEditOpen(true)}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Düzenle"
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
    kategoriSayilari, kategoriSuresiBitenler,
    firmalar, tirlar, locale,
}: Props) {
    const [belgeler, setBelgeler] = useState<Belge[]>(initialBelgeler);
    const [selectedKategori, setSelectedKategori] = useState('tumu');
    const [searchTerm, setSearchTerm] = useState('');
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [uploadDefaultKategori, setUploadDefaultKategori] = useState('gelen_evrak');
    const [tedarikciFiltre, setTedarikciFiltre] = useState('');

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
            const cat = KATEGORI_AGACI.find(k => k.id === selectedKategori);
            if (cat?.children) {
                const childIds = cat.children.map(c => c.id);
                result = result.filter(b =>
                    b.kategori === selectedKategori || childIds.includes(b.alt_kategori ?? '')
                );
            } else {
                result = result.filter(b =>
                    b.kategori === selectedKategori || b.alt_kategori === selectedKategori
                );
            }
        }

        // Text search
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            result = result.filter(b =>
                b.ad.toLowerCase().includes(q) ||
                b.aciklama?.toLowerCase().includes(q) ||
                b.firma?.unvan?.toLowerCase().includes(q) ||
                b.etiketler?.some(t => t.toLowerCase().includes(q))
            );
        }

        // Status chips
        if (activeChips.has('suresi_yakin')) {
            result = result.filter(b => {
                if (!b.son_gecerlilik_tarihi) return false;
                const exp = new Date(b.son_gecerlilik_tarihi).getTime();
                return exp > now && exp < now + thirtyDays;
            });
        }
        if (activeChips.has('bekleyen')) {
            result = result.filter(b => b.otomatik_eklendi && !b.dosya_url);
        }
        if (activeChips.has('bu_ay')) {
            result = result.filter(b => new Date(b.olusturma_tarihi).getTime() > thisMonthStart);
        }
        if (activeChips.has('otomatik')) {
            result = result.filter(b => b.otomatik_eklendi);
        }

        // File type chips
        if (activeChips.has('pdf')) result = result.filter(b => b.dosya_tipi?.includes('pdf'));
        if (activeChips.has('excel')) result = result.filter(b =>
            b.dosya_tipi?.includes('excel') || b.dosya_tipi?.includes('spreadsheet'));
        if (activeChips.has('word')) result = result.filter(b =>
            b.dosya_tipi?.includes('word') || b.dosya_tipi?.includes('document'));
        if (activeChips.has('gorsel')) result = result.filter(b => b.dosya_tipi?.startsWith('image/'));

        // Tedarikçi filtresi
        if (tedarikciFiltre) {
            result = result.filter(b => b.tedarikci_adi === tedarikciFiltre);
        }

        return result;
    }, [belgeler, selectedKategori, searchTerm, activeChips, tedarikciFiltre, now, thirtyDays, thisMonthStart]);

    // Recompute stats from current belgeler
    const stats = useMemo(() => ({
        toplam: belgeler.length,
        suresi_yakin: belgeler.filter(b => {
            if (!b.son_gecerlilik_tarihi) return false;
            const exp = new Date(b.son_gecerlilik_tarihi).getTime();
            return exp > now && exp < now + thirtyDays;
        }).length,
        bekleyen: belgeler.filter(b => b.otomatik_eklendi && !b.dosya_url).length,
        bu_ay: belgeler.filter(b => new Date(b.olusturma_tarihi).getTime() > thisMonthStart).length,
        sozlesmeler: belgeler.filter(b => b.kategori === 'sozlesmeler').length,
    }), [belgeler, now, thirtyDays, thisMonthStart]);

    // Sidebar counts from current belgeler
    const currentKategoriSayilari = useMemo(() => {
        const counts: Record<string, number> = {};
        belgeler.forEach(b => {
            counts[b.kategori] = (counts[b.kategori] || 0) + 1;
            if (b.alt_kategori) counts[b.alt_kategori] = (counts[b.alt_kategori] || 0) + 1;
        });
        return counts;
    }, [belgeler]);

    const currentKategoriSuresiBitenler = useMemo(() => {
        const counts: Record<string, number> = {};
        belgeler.filter(b => {
            if (!b.son_gecerlilik_tarihi) return false;
            const exp = new Date(b.son_gecerlilik_tarihi).getTime();
            return exp > now && exp < now + thirtyDays;
        }).forEach(b => {
            counts[b.kategori] = (counts[b.kategori] || 0) + 1;
        });
        return counts;
    }, [belgeler, now, thirtyDays]);

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
        { id: 'pdf', label: 'PDF', color: 'red' },
        { id: 'excel', label: 'Excel', color: 'green' },
        { id: 'word', label: 'Word', color: 'blue' },
        { id: 'gorsel', label: 'Görsel', color: 'purple' },
        { id: 'suresi_yakin', label: '⚠ Süresi Yakın', color: 'red' },
        { id: 'bekleyen', label: '⏳ Bekleyen', color: 'orange' },
        { id: 'bu_ay', label: '📅 Bu Ay', color: 'blue' },
        { id: 'otomatik', label: '🤖 Otomatik', color: 'slate' },
    ];

    return (
        <div className="space-y-4">

            {/* ── Uyarı bantları ── */}
            {stats.suresi_yakin > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-red-800 flex items-center gap-2">
                        <FiAlertTriangle size={15} />
                        {stats.suresi_yakin} belgenin süresi 30 gün içinde doluyor.
                    </span>
                    <button
                        onClick={() => { setActiveChips(new Set(['suresi_yakin'])); }}
                        className="text-xs text-red-700 hover:text-red-900 font-bold underline"
                    >
                        İncele →
                    </button>
                </div>
            )}
            {stats.bekleyen > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                        <FiClock size={15} />
                        {stats.bekleyen} TIR / kayıt için belge henüz yüklenmedi.
                    </span>
                    <button
                        onClick={() => { setActiveChips(new Set(['bekleyen'])); }}
                        className="text-xs text-orange-700 hover:text-orange-900 font-bold underline"
                    >
                        Yükle →
                    </button>
                </div>
            )}

            {/* ── Header ── */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Belge & Evrak Yönetimi</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Gelen/giden evrak, sözleşmeler, gümrük belgeleri ve sertifikalar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setUploadDefaultKategori('giden_evrak'); setUploadModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                    >
                        📤 Giden Evrak Oluştur
                    </button>
                    <button
                        onClick={() => { setUploadDefaultKategori('gelen_evrak'); setUploadModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                    >
                        <FiPlus size={14} /> Belge Yükle
                    </button>
                </div>
            </div>

            {/* ── Özet kartlar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <SummaryCard icon="📁" label="Toplam Belge" value={stats.toplam} color="slate"
                    onClick={() => setSelectedKategori('tumu')} />
                <SummaryCard icon="⚠️" label="Süresi Yakın" value={stats.suresi_yakin} color="red"
                    onClick={() => toggleChip('suresi_yakin')} />
                <SummaryCard icon="⏳" label="Belge Bekleyen" value={stats.bekleyen} color="orange"
                    onClick={() => toggleChip('bekleyen')} />
                <SummaryCard icon="📅" label="Bu Ay Eklenen" value={stats.bu_ay} color="blue"
                    onClick={() => toggleChip('bu_ay')} />
                <SummaryCard icon="📋" label="Aktif Sözleşme" value={stats.sozlesmeler} color="green"
                    onClick={() => setSelectedKategori('sozlesmeler')} />
            </div>

            {/* ── Ana içerik: sidebar + liste ── */}
            <div className="flex gap-4 items-start">
                {/* Left sidebar */}
                <aside className="hidden lg:block w-56 flex-shrink-0 bg-white border border-slate-200 rounded-xl p-3">
                    <CategorySidebar
                        selected={selectedKategori}
                        onSelect={setSelectedKategori}
                        toplam={belgeler.length}
                        kategoriSayilari={currentKategoriSayilari}
                        kategoriSuresiBitenler={currentKategoriSuresiBitenler}
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
                                placeholder="Belge adı, firma, açıklama, etiket ara..."
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

                            {/* Tedarikçi dropdown — sadece tedarikçi kategorileri seçiliyken */}
                            {TEDARIKCI_ALT_KATEGORILER.includes(selectedKategori) && (
                                <select
                                    value={tedarikciFiltre}
                                    onChange={e => setTedarikciFiltre(e.target.value)}
                                    className="px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer"
                                >
                                    <option value="">📦 Tüm Tedarikçiler</option>
                                    {TEDARIKCI_OPTIONS.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            )}

                            {(activeChips.size > 0 || searchTerm || tedarikciFiltre) && (
                                <button
                                    onClick={() => { setActiveChips(new Set()); setSearchTerm(''); setTedarikciFiltre(''); }}
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
                                <strong className="text-slate-700">{filtered.length}</strong> belge listelendi
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
                                <p className="text-slate-600 font-semibold text-sm">Belge bulunamadı</p>
                                <p className="text-slate-400 text-xs mt-1">Filtre kriterini değiştirin veya yeni belge ekleyin.</p>
                                <button
                                    onClick={() => setUploadModalOpen(true)}
                                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                                >
                                    <FiPlus size={14} /> İlk Belgeyi Ekle
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Belge</th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Kategori</th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Bağlantı</th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Eklenme</th>
                                            <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Son Geçerlilik</th>
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

                    {/* Yasal uyarı */}
                    <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-sm text-blue-800">
                        <strong>⚖️ Almanya Yasal Zorunluluğu:</strong>{' '}
                        Ticari belgeler <strong>10 yıl</strong> (§257 HGB),
                        gümrük belgeleri <strong>5 yıl</strong> saklanmalıdır.
                    </div>
                </div>
            </div>

            {/* ── Upload modal ── */}
            {uploadModalOpen && (
                <UploadModal
                    onClose={() => setUploadModalOpen(false)}
                    onSuccess={handleUploadSuccess}
                    firmalar={firmalar}
                    tirlar={tirlar}
                    defaultKategori={uploadDefaultKategori}
                />
            )}
        </div>
    );
}
