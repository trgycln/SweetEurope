'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    FiPlus, FiEdit2, FiTrash2, FiPhone, FiMail, FiMapPin, FiTruck,
    FiX, FiStar, FiPackage, FiUser, FiFileText, FiChevronDown,
    FiAlertCircle, FiCheckCircle, FiClock, FiFilter, FiExternalLink,
    FiSearch, FiCopy, FiCheck, FiRefreshCw, FiTrendingDown,
    FiBriefcase, FiLayers, FiCalendar, FiShield, FiSend
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type KargoFirma = {
    id: string;
    ad: string;
    sirket_adi: string | null;
    unvan: string | null;
    telefon: string | null;
    email: string | null;
    sehir: string | null;
    notlar: string | null;
    degerlendirme: number | null;
    durum: string;
    olusturma_tarihi: string;
    sonTeklif?: { fiyat_kg: number | null; teklif_tarihi: string; tasima_tipi: string } | null;
    teklifSayisi?: number;
};

export type Teklif = {
    id: string;
    firma_id: string;
    firma_adi?: string;
    teklif_tarihi: string;
    gecerlilik_tarihi: string | null;
    fiyat_kg: number | null;
    min_agirlik: number | null;
    transit_sure: string | null;
    tasima_tipi: string;
    notlar: string | null;
    belge_url: string | null;
    aktif: boolean;
    olusturma_tarihi?: string;
};

export type Irtibat = {
    id: string;
    ad: string;
    sirket_adi: string | null;
    unvan: string | null;
    kategori: string | null;
    telefon: string | null;
    email: string | null;
    sehir: string | null;
    notlar: string | null;
    durum: string;
    olusturma_tarihi?: string;
};

type ModalType =
    | 'firma-add'
    | 'firma-edit'
    | 'teklif-add'
    | 'teklif-edit'
    | 'irtibat-add'
    | 'irtibat-edit'
    | null;

type DeleteTarget = {
    type: 'firma' | 'teklif' | 'irtibat';
    id: string;
    name: string;
} | null;

// ─── Helper Functions ────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
    v == null
        ? '—'
        : new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const today = () => new Date().toISOString().split('T')[0];

const isExpired = (date: string | null) =>
    date ? new Date(date) < new Date(today()) : false;

const initials = (name: string) =>
    name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() ?? '')
        .join('');

const cleanPhoneForWhatsApp = (phone: string | null) => {
    if (!phone) return null;
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    // If starts with 00, replace with nothing (e.g. 0049 -> 49)
    if (cleaned.startsWith('00')) return cleaned.slice(2);
    // If German local 0159..., assume +49
    if (cleaned.startsWith('0') && cleaned.length >= 10) return '49' + cleaned.slice(1);
    return cleaned;
};

const parseDecimal = (val: string | number): number | null => {
    if (typeof val === 'number') return isNaN(val) ? null : val;
    if (!val || typeof val !== 'string') return null;
    const normalized = val.trim().replace(',', '.');
    const num = parseFloat(normalized);
    return isNaN(num) ? null : num;
};

// ─── Categories & Badges ─────────────────────────────────────────────────────

const KATEGORI_CONFIG: Record<string, { label: string; bg: string; text: string; badge: string }> = {
    gumruk_musaviri: {
        label: 'Gümrük Müşaviri',
        bg: 'bg-blue-600',
        text: 'text-blue-700',
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    muhasebeci: {
        label: 'Mali Müşavir & Muhasebe',
        bg: 'bg-emerald-600',
        text: 'text-emerald-700',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    avukat: {
        label: 'Hukuk Müşaviri & Noter',
        bg: 'bg-indigo-600',
        text: 'text-indigo-700',
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    },
    sigorta: {
        label: 'Sigorta & Ekspertiz',
        bg: 'bg-amber-600',
        text: 'text-amber-700',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    diger: {
        label: 'Diğer Hizmetler',
        bg: 'bg-slate-600',
        text: 'text-slate-700',
        badge: 'bg-slate-50 text-slate-700 border-slate-200',
    },
};

const DURUM_CONFIG: Record<string, { label: string; badge: string; dot: string }> = {
    aktif: {
        label: 'Aktif',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500',
    },
    gorusuluyor: {
        label: 'Görüşülüyor',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
    },
    pasif: {
        label: 'Pasif',
        badge: 'bg-gray-100 text-gray-600 border-gray-200',
        dot: 'bg-gray-400',
    },
};

const TASIMA_CONFIG: Record<string, { label: string; badge: string }> = {
    donuk: {
        label: 'Donuk / Soğuk',
        badge: 'bg-sky-50 text-sky-700 border-sky-200',
    },
    kuru: {
        label: 'Kuru Yük',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    karma: {
        label: 'Karma / Çift Rejim',
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
    },
};

// ─── Subcomponents ───────────────────────────────────────────────────────────

const StarRating = ({
    value,
    onChange,
    readOnly = false,
}: {
    value: number;
    onChange?: (v: number) => void;
    readOnly?: boolean;
}) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => {
            const filled = star <= (value || 0);
            return (
                <button
                    key={star}
                    type="button"
                    disabled={readOnly || !onChange}
                    onClick={() => onChange?.(star)}
                    title={onChange ? `${star} Yıldız Ver` : undefined}
                    className={`text-base transition-transform ${
                        readOnly || !onChange
                            ? 'cursor-default'
                            : 'cursor-pointer hover:scale-125 focus:outline-none'
                    } ${filled ? 'text-amber-400' : 'text-gray-200'}`}
                >
                    ★
                </button>
            );
        })}
    </div>
);

const Modal = ({
    title,
    subtitle,
    onClose,
    children,
    maxWidth = 'max-w-xl',
}: {
    title: string;
    subtitle?: string;
    onClose: () => void;
    children: React.ReactNode;
    maxWidth?: string;
}) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        onClick={onClose}
    >
        <div
            className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[92vh] flex flex-col overflow-hidden border border-gray-100`}
            onClick={e => e.stopPropagation()}
        >
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70 sticky top-0 z-10">
                <div>
                    <h2 className="font-serif text-lg font-bold text-primary">{title}</h2>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <FiX size={18} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto">{children}</div>
        </div>
    </div>
);

const Field = ({
    label,
    children,
    required,
    hint,
}: {
    label: string;
    children: React.ReactNode;
    required?: boolean;
    hint?: string;
}) => (
    <div>
        <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-gray-700">
                {label}
                {required && <span className="text-rose-500 ml-0.5">*</span>}
            </label>
            {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
        </div>
        {children}
    </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
        {...props}
        className={`w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all placeholder:text-gray-400 ${props.className ?? ''}`}
    />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
    <select
        {...props}
        className={`w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none bg-white transition-all ${props.className ?? ''}`}
    />
);

const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
        {...props}
        rows={props.rows ?? 3}
        className={`w-full px-3.5 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none resize-none transition-all placeholder:text-gray-400 ${props.className ?? ''}`}
    />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReferanslarClient({ locale }: { locale: string }) {
    const sb: any = createDynamicSupabaseClient(false);

    // Data states
    const [loading, setLoading] = useState(true);
    const [kargoFirmalar, setKargoFirmalar] = useState<KargoFirma[]>([]);
    const [teklifler, setTeklifler] = useState<Teklif[]>([]);
    const [irtibatlar, setIrtibatlar] = useState<Irtibat[]>([]);

    // Operation states
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Active Tab & View
    const [activeTab, setActiveTab] = useState<'all' | 'kargo' | 'teklifler' | 'irtibatlar'>('all');

    // Global Search & Local Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [kargoDurumFilter, setKargoDurumFilter] = useState<string>('tümü');
    const [teklifTipFilter, setTeklifTipFilter] = useState<string>('tümü');
    const [teklifDurumFilter, setTeklifDurumFilter] = useState<string>('tümü');
    const [teklifSort, setTeklifSort] = useState<'fiyat-asc' | 'fiyat-desc' | 'tarih-desc'>('fiyat-asc');
    const [irtibatKategoriFilter, setIrtibatKategoriFilter] = useState<string>('tümü');
    const [irtibatDurumFilter, setIrtibatDurumFilter] = useState<string>('tümü');

    // Modals
    const [modal, setModal] = useState<ModalType>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

    // Form states
    const emptyFirma = {
        ad: '',
        sirket_adi: '',
        unvan: '',
        telefon: '',
        email: '',
        sehir: '',
        notlar: '',
        degerlendirme: 0,
        durum: 'aktif',
    };

    const emptyTeklif = {
        firma_id: '',
        teklif_tarihi: today(),
        gecerlilik_tarihi: '',
        fiyat_kg: '',
        min_agirlik: '',
        transit_sure: '',
        tasima_tipi: 'donuk',
        notlar: '',
        belge_url: '',
        aktif: true,
    };

    const emptyIrtibat = {
        ad: '',
        sirket_adi: '',
        unvan: '',
        kategori: 'gumruk_musaviri',
        telefon: '',
        email: '',
        sehir: '',
        notlar: '',
        durum: 'aktif',
    };

    const [firmaForm, setFirmaForm] = useState({ ...emptyFirma });
    const [teklifForm, setTeklifForm] = useState({ ...emptyTeklif });
    const [irtibatForm, setIrtibatForm] = useState({ ...emptyIrtibat });

    // ─── Fetch All Data ────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [firmaRes, teklifRes, irtibatRes] = await Promise.all([
                sb.from('is_ortaklari')
                    .select('*')
                    .eq('tip', 'kargo')
                    .order('olusturma_tarihi', { ascending: false }),
                sb.from('kargo_teklifleri')
                    .select('*, is_ortaklari(ad)')
                    .order('fiyat_kg', { ascending: true }),
                sb.from('is_ortaklari')
                    .select('*')
                    .eq('tip', 'irtibat')
                    .order('olusturma_tarihi', { ascending: false }),
            ]);

            if (firmaRes.error) console.error('Kargo firmaları yükleme hatası:', firmaRes.error);
            if (teklifRes.error) console.error('Teklifler yükleme hatası:', teklifRes.error);
            if (irtibatRes.error) console.error('İrtibatlar yükleme hatası:', irtibatRes.error);

            const rawFirmalar = firmaRes.data ?? [];
            const rawTeklifler = teklifRes.data ?? [];

            // Enrich firmalar with latest offer and count
            const firmalarWithData: KargoFirma[] = rawFirmalar.map((f: any) => {
                const firmaTeklifleri = rawTeklifler
                    .filter((t: any) => t.firma_id === f.id)
                    .sort((a: any, b: any) => new Date(b.teklif_tarihi).getTime() - new Date(a.teklif_tarihi).getTime());

                const sonTeklif = firmaTeklifleri.length > 0
                    ? {
                          fiyat_kg: firmaTeklifleri[0].fiyat_kg,
                          teklif_tarihi: firmaTeklifleri[0].teklif_tarihi,
                          tasima_tipi: firmaTeklifleri[0].tasima_tipi,
                      }
                    : null;

                return {
                    ...f,
                    sonTeklif,
                    teklifSayisi: firmaTeklifleri.length,
                };
            });

            setKargoFirmalar(firmalarWithData);

            setTeklifler(
                rawTeklifler.map((t: any) => ({
                    ...t,
                    firma_adi: t.is_ortaklari?.ad ?? 'Bilinmeyen Firma',
                }))
            );

            setIrtibatlar(irtibatRes.data ?? []);
        } catch (e: any) {
            console.error('Fetch error:', e);
            setError('Veriler yüklenirken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    }, [sb]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    // ─── Flash Message & Copy Helper ──────────────────────────────────────────
    const flash = (msg: string, isError = false) => {
        if (isError) {
            setError(msg);
            setTimeout(() => setError(null), 4500);
        } else {
            setSuccess(msg);
            setTimeout(() => setSuccess(null), 3500);
        }
    };

    const handleCopy = (text: string, key: string, label: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        flash(`${label} panoya kopyalandı.`);
        setTimeout(() => setCopiedKey(null), 2000);
    };

    // ─── Modal Openers ────────────────────────────────────────────────────────
    const openAddFirma = () => {
        setFirmaForm({ ...emptyFirma });
        setEditId(null);
        setModal('firma-add');
    };

    const openEditFirma = (f: KargoFirma) => {
        setFirmaForm({
            ad: f.ad || '',
            sirket_adi: f.sirket_adi || '',
            unvan: f.unvan || '',
            telefon: f.telefon || '',
            email: f.email || '',
            sehir: f.sehir || '',
            notlar: f.notlar || '',
            degerlendirme: f.degerlendirme ?? 0,
            durum: f.durum || 'aktif',
        });
        setEditId(f.id);
        setModal('firma-edit');
    };

    const openAddTeklif = (firmaId?: string) => {
        setTeklifForm({
            ...emptyTeklif,
            firma_id: firmaId || (kargoFirmalar.length > 0 ? kargoFirmalar[0].id : ''),
        });
        setEditId(null);
        setModal('teklif-add');
    };

    const openEditTeklif = (t: Teklif) => {
        setTeklifForm({
            firma_id: t.firma_id,
            teklif_tarihi: t.teklif_tarihi || today(),
            gecerlilik_tarihi: t.gecerlilik_tarihi || '',
            fiyat_kg: t.fiyat_kg != null ? String(t.fiyat_kg) : '',
            min_agirlik: t.min_agirlik != null ? String(t.min_agirlik) : '',
            transit_sure: t.transit_sure || '',
            tasima_tipi: t.tasima_tipi || 'donuk',
            notlar: t.notlar || '',
            belge_url: t.belge_url || '',
            aktif: t.aktif ?? true,
        });
        setEditId(t.id);
        setModal('teklif-edit');
    };

    const openAddIrtibat = () => {
        setIrtibatForm({ ...emptyIrtibat });
        setEditId(null);
        setModal('irtibat-add');
    };

    const openEditIrtibat = (irt: Irtibat) => {
        setIrtibatForm({
            ad: irt.ad || '',
            sirket_adi: irt.sirket_adi || '',
            unvan: irt.unvan || '',
            kategori: irt.kategori || 'gumruk_musaviri',
            telefon: irt.telefon || '',
            email: irt.email || '',
            sehir: irt.sehir || '',
            notlar: irt.notlar || '',
            durum: irt.durum || 'aktif',
        });
        setEditId(irt.id);
        setModal('irtibat-edit');
    };

    const closeModal = () => {
        setModal(null);
        setEditId(null);
    };

    // ─── Inline Rating Update ─────────────────────────────────────────────────
    const handleQuickRating = async (firmaId: string, rating: number) => {
        const { error: err } = await sb
            .from('is_ortaklari')
            .update({ degerlendirme: rating })
            .eq('id', firmaId);

        if (err) {
            flash('Puan güncellenirken hata oluştu.', true);
        } else {
            setKargoFirmalar(prev =>
                prev.map(f => (f.id === firmaId ? { ...f, degerlendirme: rating } : f))
            );
            flash('Firma değerlendirmesi güncellendi.');
        }
    };

    // ─── Inline Toggle Teklif Aktif ───────────────────────────────────────────
    const handleToggleTeklifAktif = async (teklif: Teklif) => {
        const newStatus = !teklif.aktif;
        const { error: err } = await sb
            .from('kargo_teklifleri')
            .update({ aktif: newStatus })
            .eq('id', teklif.id);

        if (err) {
            flash('Teklif durumu güncellenirken hata oluştu.', true);
        } else {
            setTeklifler(prev =>
                prev.map(t => (t.id === teklif.id ? { ...t, aktif: newStatus } : t))
            );
            flash(`Teklif ${newStatus ? 'aktif' : 'pasif'} olarak güncellendi.`);
        }
    };

    // ─── Save Firma ───────────────────────────────────────────────────────────
    const saveFirma = async () => {
        const adTrimmed = firmaForm.ad.trim();
        if (!adTrimmed) {
            flash('Lütfen firma adını girin.', true);
            return;
        }

        setSaving(true);
        const payload = {
            tip: 'kargo',
            ad: adTrimmed,
            sirket_adi: firmaForm.sirket_adi.trim() || null,
            unvan: firmaForm.unvan.trim() || null,
            telefon: firmaForm.telefon.trim() || null,
            email: firmaForm.email.trim() || null,
            sehir: firmaForm.sehir.trim() || null,
            notlar: firmaForm.notlar.trim() || null,
            degerlendirme: firmaForm.degerlendirme ? Number(firmaForm.degerlendirme) : null,
            durum: firmaForm.durum || 'aktif',
        };

        const { error: err } = editId
            ? await sb.from('is_ortaklari').update(payload).eq('id', editId)
            : await sb.from('is_ortaklari').insert(payload);

        setSaving(false);
        if (err) {
            flash('Firma kaydedilirken hata: ' + err.message, true);
            return;
        }

        flash(editId ? 'Kargo firması başarıyla güncellendi.' : 'Yeni kargo firması başarıyla eklendi.');
        closeModal();
        fetchAll();
    };

    // ─── Save Teklif ──────────────────────────────────────────────────────────
    const saveTeklif = async () => {
        if (!teklifForm.firma_id) {
            flash('Lütfen bir kargo firması seçin.', true);
            return;
        }
        if (!teklifForm.teklif_tarihi) {
            flash('Teklif tarihi zorunludur.', true);
            return;
        }

        const parsedFiyat = parseDecimal(teklifForm.fiyat_kg);
        const parsedMinAgirlik = parseDecimal(teklifForm.min_agirlik);

        if (teklifForm.fiyat_kg && parsedFiyat === null) {
            flash('Lütfen geçerli bir fiyat girin (örn: 1.85 veya 1,85).', true);
            return;
        }

        setSaving(true);
        const payload = {
            firma_id: teklifForm.firma_id,
            teklif_tarihi: teklifForm.teklif_tarihi,
            gecerlilik_tarihi: teklifForm.gecerlilik_tarihi || null,
            fiyat_kg: parsedFiyat,
            min_agirlik: parsedMinAgirlik,
            transit_sure: teklifForm.transit_sure.trim() || null,
            tasima_tipi: teklifForm.tasima_tipi || 'donuk',
            notlar: teklifForm.notlar.trim() || null,
            belge_url: teklifForm.belge_url.trim() || null,
            aktif: teklifForm.aktif,
        };

        const { error: err } = editId
            ? await sb.from('kargo_teklifleri').update(payload).eq('id', editId)
            : await sb.from('kargo_teklifleri').insert(payload);

        setSaving(false);
        if (err) {
            flash('Teklif kaydedilirken hata: ' + err.message, true);
            return;
        }

        flash(editId ? 'Teklif başarıyla güncellendi.' : 'Yeni teklif başarıyla eklendi.');
        closeModal();
        fetchAll();
    };

    // ─── Save Irtibat ─────────────────────────────────────────────────────────
    const saveIrtibat = async () => {
        const adTrimmed = irtibatForm.ad.trim();
        if (!adTrimmed) {
            flash('Lütfen ad ve soyad girin.', true);
            return;
        }

        setSaving(true);
        const payload = {
            tip: 'irtibat',
            ad: adTrimmed,
            sirket_adi: irtibatForm.sirket_adi.trim() || null,
            unvan: irtibatForm.unvan.trim() || null,
            kategori: irtibatForm.kategori || 'diger',
            telefon: irtibatForm.telefon.trim() || null,
            email: irtibatForm.email.trim() || null,
            sehir: irtibatForm.sehir.trim() || null,
            notlar: irtibatForm.notlar.trim() || null,
            durum: irtibatForm.durum || 'aktif',
        };

        const { error: err } = editId
            ? await sb.from('is_ortaklari').update(payload).eq('id', editId)
            : await sb.from('is_ortaklari').insert(payload);

        setSaving(false);
        if (err) {
            flash('İrtibat kaydedilirken hata: ' + err.message, true);
            return;
        }

        flash(editId ? 'İrtibat başarıyla güncellendi.' : 'Yeni irtibat başarıyla eklendi.');
        closeModal();
        fetchAll();
    };

    // ─── Delete Execution ─────────────────────────────────────────────────────
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);

        let err: any = null;
        if (deleteTarget.type === 'firma' || deleteTarget.type === 'irtibat') {
            const res = await sb.from('is_ortaklari').delete().eq('id', deleteTarget.id);
            err = res.error;
        } else if (deleteTarget.type === 'teklif') {
            const res = await sb.from('kargo_teklifleri').delete().eq('id', deleteTarget.id);
            err = res.error;
        }

        setDeleting(false);
        if (err) {
            flash('Silme işlemi başarısız: ' + err.message, true);
        } else {
            flash(`"${deleteTarget.name}" başarıyla silindi.`);
            setDeleteTarget(null);
            fetchAll();
        }
    };

    // ─── Filtered & Derived Data ──────────────────────────────────────────────
    const query = searchQuery.trim().toLowerCase();

    // 1. Kargo Firmaları filtering
    const filteredFirmalar = useMemo(() => {
        return kargoFirmalar.filter(f => {
            const matchQuery =
                !query ||
                f.ad.toLowerCase().includes(query) ||
                (f.unvan && f.unvan.toLowerCase().includes(query)) ||
                (f.sirket_adi && f.sirket_adi.toLowerCase().includes(query)) ||
                (f.telefon && f.telefon.includes(query)) ||
                (f.email && f.email.toLowerCase().includes(query)) ||
                (f.sehir && f.sehir.toLowerCase().includes(query)) ||
                (f.notlar && f.notlar.toLowerCase().includes(query));

            const matchDurum = kargoDurumFilter === 'tümü' || f.durum === kargoDurumFilter;

            return matchQuery && matchDurum;
        });
    }, [kargoFirmalar, query, kargoDurumFilter]);

    // 2. Teklifler filtering & sorting
    const filteredTeklifler = useMemo(() => {
        return teklifler
            .filter(t => {
                const matchQuery =
                    !query ||
                    (t.firma_adi && t.firma_adi.toLowerCase().includes(query)) ||
                    (t.notlar && t.notlar.toLowerCase().includes(query)) ||
                    (t.transit_sure && t.transit_sure.toLowerCase().includes(query));

                const matchTip = teklifTipFilter === 'tümü' || t.tasima_tipi === teklifTipFilter;

                const expired = isExpired(t.gecerlilik_tarihi);
                const matchDurum =
                    teklifDurumFilter === 'tümü'
                        ? true
                        : teklifDurumFilter === 'gecerli'
                        ? t.aktif && !expired
                        : teklifDurumFilter === 'suresi_dolmus'
                        ? expired
                        : !t.aktif;

                return matchQuery && matchTip && matchDurum;
            })
            .sort((a, b) => {
                if (teklifSort === 'fiyat-asc') {
                    return (a.fiyat_kg ?? Infinity) - (b.fiyat_kg ?? Infinity);
                } else if (teklifSort === 'fiyat-desc') {
                    return (b.fiyat_kg ?? -Infinity) - (a.fiyat_kg ?? -Infinity);
                } else {
                    return new Date(b.teklif_tarihi).getTime() - new Date(a.teklif_tarihi).getTime();
                }
            });
    }, [teklifler, query, teklifTipFilter, teklifDurumFilter, teklifSort]);

    // Best valid offer
    const bestTeklif = useMemo(() => {
        const validOffers = teklifler.filter(
            t => t.aktif && !isExpired(t.gecerlilik_tarihi) && t.fiyat_kg != null
        );
        if (validOffers.length === 0) return null;
        return [...validOffers].sort((a, b) => (a.fiyat_kg ?? Infinity) - (b.fiyat_kg ?? Infinity))[0];
    }, [teklifler]);

    // 3. İrtibatlar filtering
    const filteredIrtibatlar = useMemo(() => {
        return irtibatlar.filter(i => {
            const matchQuery =
                !query ||
                i.ad.toLowerCase().includes(query) ||
                (i.sirket_adi && i.sirket_adi.toLowerCase().includes(query)) ||
                (i.unvan && i.unvan.toLowerCase().includes(query)) ||
                (i.sehir && i.sehir.toLowerCase().includes(query)) ||
                (i.telefon && i.telefon.includes(query)) ||
                (i.email && i.email.toLowerCase().includes(query)) ||
                (i.notlar && i.notlar.toLowerCase().includes(query));

            const matchKategori =
                irtibatKategoriFilter === 'tümü' || (i.kategori || 'diger') === irtibatKategoriFilter;

            const matchDurum = irtibatDurumFilter === 'tümü' || i.durum === irtibatDurumFilter;

            return matchQuery && matchKategori && matchDurum;
        });
    }, [irtibatlar, query, irtibatKategoriFilter, irtibatDurumFilter]);

    // KPI Summary Calculations
    const activeKargoCount = useMemo(
        () => kargoFirmalar.filter(f => f.durum === 'aktif').length,
        [kargoFirmalar]
    );
    const validTeklifCount = useMemo(
        () => teklifler.filter(t => t.aktif && !isExpired(t.gecerlilik_tarihi)).length,
        [teklifler]
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-8 pb-16 max-w-[1400px] mx-auto">
            {/* ══════════════════════════════════════════════════════════════════
                1. HEADER & EXECUTIVE ACTION BAR
            ══════════════════════════════════════════════════════════════════ */}
            <header className="bg-white border border-gray-200/80 rounded-2xl p-6 sm:p-7 shadow-sm transition-all">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="p-2 bg-accent/15 text-accent rounded-xl">
                                <FiBriefcase size={20} />
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-accent">
                                Operasyon & Tedarik Zinciri
                            </span>
                        </div>
                        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-primary">
                            Referanslar & İrtibat Rehberi
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
                            Uluslararası nakliye ve kargo firmaları, güncel navlun teklifleri, gümrük
                            müşavirleri ve kurumsal danışman irtibatlarının merkezi yönetimi.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            onClick={fetchAll}
                            disabled={loading}
                            title="Verileri Yenile"
                            className="p-2.5 bg-gray-50 text-gray-600 hover:text-primary hover:bg-gray-100 border border-gray-200 rounded-xl transition-all disabled:opacity-50"
                        >
                            <FiRefreshCw size={17} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <button
                            onClick={openAddFirma}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-primary text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-primary/90 shadow-sm transition-all active:scale-98"
                        >
                            <FiTruck size={16} /> + Kargo Firması
                        </button>

                        <button
                            onClick={() => openAddTeklif()}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-accent text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-accent/90 shadow-sm transition-all active:scale-98"
                        >
                            <FiFileText size={16} /> + Teklif Ekle
                        </button>

                        <button
                            onClick={openAddIrtibat}
                            className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-900 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-black shadow-sm transition-all active:scale-98"
                        >
                            <FiUser size={16} /> + İrtibat Ekle
                        </button>
                    </div>
                </div>

                {/* Flash Messages */}
                {error && (
                    <div className="mt-5 flex items-center justify-between gap-3 bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs sm:text-sm animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <FiAlertCircle size={17} className="flex-shrink-0 text-rose-600" />
                            <span>{error}</span>
                        </div>
                        <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
                            <FiX size={16} />
                        </button>
                    </div>
                )}
                {success && (
                    <div className="mt-5 flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs sm:text-sm animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                            <FiCheckCircle size={17} className="flex-shrink-0 text-emerald-600" />
                            <span>{success}</span>
                        </div>
                        <button onClick={() => setSuccess(null)} className="text-emerald-500 hover:text-emerald-700">
                            <FiX size={16} />
                        </button>
                    </div>
                )}
            </header>

            {/* ══════════════════════════════════════════════════════════════════
                2. KPI METRICS CARDS
            ══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Kargo Firmaları */}
                <div
                    onClick={() => setActiveTab('kargo')}
                    className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-accent/40 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Kargo Firmaları
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiTruck size={18} />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-primary font-serif">
                            {kargoFirmalar.length}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {activeKargoCount} Aktif
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {kargoFirmalar.filter(f => f.durum === 'gorusuluyor').length} firma görüşme sürecinde
                    </p>
                </div>

                {/* Metric 2: En Uygun Navlun */}
                <div
                    onClick={() => setActiveTab('teklifler')}
                    className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-accent/40 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            En Uygun Aktif Fiyat
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiTrendingDown size={18} />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-serif">
                            {bestTeklif?.fiyat_kg != null ? `€${fmt(bestTeklif.fiyat_kg)}` : '—'}
                        </span>
                        {bestTeklif?.fiyat_kg != null && (
                            <span className="text-xs text-gray-500 font-medium">/ kg</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 truncate">
                        {bestTeklif ? (
                            <>
                                <strong className="text-gray-700">{bestTeklif.firma_adi}</strong> (
                                {bestTeklif.tasima_tipi})
                            </>
                        ) : (
                            'Kayıtlı aktif teklif yok'
                        )}
                    </p>
                </div>

                {/* Metric 3: Toplam Teklifler */}
                <div
                    onClick={() => setActiveTab('teklifler')}
                    className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-accent/40 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Fiyat Teklifleri
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiFileText size={18} />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-primary font-serif">
                            {teklifler.length}
                        </span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {validTeklifCount} Geçerli
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        {teklifler.filter(t => isExpired(t.gecerlilik_tarihi)).length} teklifin süresi dolmuş
                    </p>
                </div>

                {/* Metric 4: Genel İrtibatlar */}
                <div
                    onClick={() => setActiveTab('irtibatlar')}
                    className="bg-white border border-gray-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-accent/40 cursor-pointer transition-all group"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Resmi & Kurumsal İrtibat
                        </span>
                        <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiShield size={18} />
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-extrabold text-primary font-serif">
                            {irtibatlar.length}
                        </span>
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                            Kayıtlı
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Gümrük, muhasebe, noter ve sigortacılar
                    </p>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                3. GLOBAL SEARCH & TAB NAVIGATION
            ══════════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-gray-200/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
                    {/* Unified Search Input */}
                    <div className="relative flex-1">
                        <FiSearch
                            size={18}
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="İsim, şirket, yetkili, telefon, şehir veya notlarda anında arayın..."
                            className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50/70 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-all placeholder:text-gray-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 rounded"
                            >
                                <FiX size={15} />
                            </button>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl overflow-x-auto scrollbar-none">
                        {[
                            { id: 'all', label: 'Tümü', count: kargoFirmalar.length + irtibatlar.length },
                            { id: 'kargo', label: 'Kargo Firmaları', count: filteredFirmalar.length },
                            { id: 'teklifler', label: 'Fiyat Teklifleri', count: filteredTeklifler.length },
                            { id: 'irtibatlar', label: 'Resmi İrtibatlar', count: filteredIrtibatlar.length },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'bg-white text-primary shadow-sm font-bold'
                                        : 'text-gray-500 hover:text-primary hover:bg-white/50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        activeTab === tab.id
                                            ? 'bg-accent/15 text-accent'
                                            : 'bg-gray-200/80 text-gray-600'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active search filter badge info */}
                {searchQuery && (
                    <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                        <span>
                            <strong>&quot;{searchQuery}&quot;</strong> için arama sonuçları gösteriliyor.
                        </span>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="text-accent font-semibold hover:underline"
                        >
                            Filtreyi Temizle
                        </button>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                4. BÖLÜM: KARGO & NAKLİYE FİRMALARI
            ══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'all' || activeTab === 'kargo') && (
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
                                    Kargo & Nakliye Firmaları
                                </h2>
                                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                    {filteredFirmalar.length}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Sevkiyat, soğuk zincir ve kuru navlun tedarikçileri
                            </p>
                        </div>

                        {/* Durum Filtresi */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
                                <FiFilter size={12} /> Durum:
                            </span>
                            {['tümü', 'aktif', 'gorusuluyor', 'pasif'].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setKargoDurumFilter(d)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                                        kargoDurumFilter === d
                                            ? 'bg-primary text-white border-primary shadow-xs'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                    }`}
                                >
                                    {d === 'tümü' ? 'Tümü' : DURUM_CONFIG[d]?.label ?? d}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Kargo Grid */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse space-y-4"
                                >
                                    <div className="flex gap-3">
                                        <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-gray-200 rounded w-3/4" />
                                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                                        </div>
                                    </div>
                                    <div className="h-10 bg-gray-100 rounded-xl" />
                                </div>
                            ))}
                        </div>
                    ) : filteredFirmalar.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                            <FiTruck size={38} className="mx-auto text-gray-300 mb-2.5" />
                            <p className="font-semibold text-gray-600 text-sm">
                                {searchQuery || kargoDurumFilter !== 'tümü'
                                    ? 'Arama kriterine uygun kargo firması bulunamadı'
                                    : 'Henüz kayıtlı kargo firması bulunmuyor'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Nakliye ortaklarınızı ekleyerek teklif ve operasyon süreçlerinizi takip edebilirsiniz.
                            </p>
                            <button
                                onClick={openAddFirma}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all"
                            >
                                <FiPlus size={14} /> Yeni Kargo Firması Ekle
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredFirmalar.map(firma => {
                                const waPhone = cleanPhoneForWhatsApp(firma.telefon);
                                const statusCfg = DURUM_CONFIG[firma.durum] ?? DURUM_CONFIG.aktif;

                                return (
                                    <div
                                        key={firma.id}
                                        className="bg-white border border-gray-200/90 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group"
                                    >
                                        <div className="space-y-3.5">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-gray-700 text-white font-serif font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0">
                                                        {initials(firma.ad)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-primary text-sm sm:text-base leading-tight truncate">
                                                            {firma.ad}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {firma.unvan && (
                                                                <span className="text-xs text-gray-500 truncate">
                                                                    {firma.unvan}
                                                                </span>
                                                            )}
                                                            {firma.sehir && (
                                                                <span className="text-[11px] font-medium text-gray-400 flex items-center gap-0.5">
                                                                    <FiMapPin size={10} /> {firma.sehir}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Durum Rozeti */}
                                                <span
                                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 flex-shrink-0 ${statusCfg.badge}`}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                    {statusCfg.label}
                                                </span>
                                            </div>

                                            {/* Contact Actions Bar */}
                                            <div className="bg-gray-50/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                                                {firma.telefon ? (
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <a
                                                            href={`tel:${firma.telefon}`}
                                                            className="flex items-center gap-1.5 font-medium text-gray-700 hover:text-primary transition-colors truncate"
                                                            title="Telefonu Ara"
                                                        >
                                                            <FiPhone size={13} className="text-gray-400 flex-shrink-0" />
                                                            <span className="truncate">{firma.telefon}</span>
                                                        </a>
                                                        <button
                                                            onClick={() => handleCopy(firma.telefon!, `tel-${firma.id}`, 'Telefon')}
                                                            title="Telefonu Kopyala"
                                                            className="p-1 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-700"
                                                        >
                                                            {copiedKey === `tel-${firma.id}` ? (
                                                                <FiCheck size={12} className="text-emerald-600" />
                                                            ) : (
                                                                <FiCopy size={12} />
                                                            )}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-[11px]">Telefon yok</span>
                                                )}

                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {waPhone && (
                                                        <a
                                                            href={`https://wa.me/${waPhone}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="WhatsApp Mesajı Gönder"
                                                            className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                                                        >
                                                            <FaWhatsapp size={13} />
                                                        </a>
                                                    )}
                                                    {firma.email && (
                                                        <a
                                                            href={`mailto:${firma.email}`}
                                                            title={`E-posta Gönder: ${firma.email}`}
                                                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                                        >
                                                            <FiMail size={13} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Last Quote & Quick Stats */}
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                                                        Son Fiyat Teklifi
                                                    </span>
                                                    <div className="mt-0.5 font-serif font-bold text-primary text-sm">
                                                        {firma.sonTeklif?.fiyat_kg != null ? (
                                                            <span>€{fmt(firma.sonTeklif.fiyat_kg)}/kg</span>
                                                        ) : (
                                                            <span className="text-gray-400 font-sans font-normal text-xs">
                                                                Teklif Yok
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 flex flex-col justify-between">
                                                    <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">
                                                        Değerlendirme
                                                    </span>
                                                    <div className="flex items-center justify-between mt-0.5">
                                                        <StarRating
                                                            value={firma.degerlendirme ?? 0}
                                                            onChange={r => handleQuickRating(firma.id, r)}
                                                        />
                                                        <span className="text-[11px] font-bold text-gray-500">
                                                            {firma.degerlendirme ? `${firma.degerlendirme}/5` : '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notlar */}
                                            {firma.notlar && (
                                                <div className="text-xs text-gray-500 bg-amber-50/50 border border-amber-100/70 p-2.5 rounded-xl line-clamp-2">
                                                    {firma.notlar}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1">
                                            <button
                                                onClick={() => openAddTeklif(firma.id)}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-2.5 bg-accent/10 hover:bg-accent/20 text-accent font-semibold text-xs rounded-xl transition-colors"
                                            >
                                                <FiFileText size={13} /> Teklif Ekle
                                            </button>

                                            <button
                                                onClick={() => openEditFirma(firma)}
                                                className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-xl transition-colors"
                                                title="Firmayı Düzenle"
                                            >
                                                <FiEdit2 size={14} />
                                            </button>

                                            <button
                                                onClick={() =>
                                                    setDeleteTarget({
                                                        type: 'firma',
                                                        id: firma.id,
                                                        name: firma.ad,
                                                    })
                                                }
                                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                                title="Firmayı Sil"
                                            >
                                                <FiTrash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                5. BÖLÜM: NAVLUN & TAŞIMA TEKLİFLERİ
            ══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'all' || activeTab === 'teklifler') && (
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
                                    Navlun Fiyat Teklifleri
                                </h2>
                                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                    {filteredTeklifler.length}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Kargo firmalarının birim taşıma maliyeti (€/kg) ve transit süre karşılaştırması
                            </p>
                        </div>

                        {/* Filter Bar */}
                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Taşıma Tipi */}
                            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                                {[
                                    { id: 'tümü', label: 'Tümü' },
                                    { id: 'donuk', label: 'Donuk' },
                                    { id: 'kuru', label: 'Kuru' },
                                    { id: 'karma', label: 'Karma' },
                                ].map(tip => (
                                    <button
                                        key={tip.id}
                                        onClick={() => setTeklifTipFilter(tip.id)}
                                        className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                                            teklifTipFilter === tip.id
                                                ? 'bg-white text-primary shadow-xs font-bold'
                                                : 'text-gray-500 hover:text-primary'
                                        }`}
                                    >
                                        {tip.label}
                                    </button>
                                ))}
                            </div>

                            {/* Sıralama Seçimi */}
                            <select
                                value={teklifSort}
                                onChange={e => setTeklifSort(e.target.value as any)}
                                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl outline-none font-medium text-gray-700"
                            >
                                <option value="fiyat-asc">Fiyat: En Düşükten</option>
                                <option value="fiyat-desc">Fiyat: En Yüksekten</option>
                                <option value="tarih-desc">Tarih: En Yeniden</option>
                            </select>

                            <button
                                onClick={() => openAddTeklif()}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-xs font-semibold rounded-xl hover:bg-accent/90 transition-all shadow-xs"
                            >
                                <FiPlus size={14} /> Yeni Teklif
                            </button>
                        </div>
                    </div>

                    {/* Teklif Tablosu */}
                    <div className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs">
                        {loading ? (
                            <div className="p-12 text-center">
                                <FiRefreshCw className="animate-spin text-accent mx-auto mb-2" size={24} />
                                <p className="text-xs text-gray-500">Teklifler listeleniyor...</p>
                            </div>
                        ) : filteredTeklifler.length === 0 ? (
                            <div className="p-10 text-center">
                                <FiFileText size={36} className="mx-auto text-gray-300 mb-2" />
                                <p className="text-sm font-semibold text-gray-600">Teklif Bulunamadı</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    Seçili filtrelere uygun fiyat teklifi bulunmuyor.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                            <th className="py-3.5 px-4">Kargo Firması</th>
                                            <th className="py-3.5 px-4">Taşıma Tipi</th>
                                            <th className="py-3.5 px-4">Birim Fiyat (€/kg)</th>
                                            <th className="py-3.5 px-4">Min. Ağırlık</th>
                                            <th className="py-3.5 px-4">Transit Süre</th>
                                            <th className="py-3.5 px-4">Teklif & Geçerlilik</th>
                                            <th className="py-3.5 px-4 text-center">Durum</th>
                                            <th className="py-3.5 px-4 text-right">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-xs">
                                        {filteredTeklifler.map(teklif => {
                                            const isBest = bestTeklif?.id === teklif.id;
                                            const expired = isExpired(teklif.gecerlilik_tarihi);
                                            const tipCfg = TASIMA_CONFIG[teklif.tasima_tipi] ?? TASIMA_CONFIG.donuk;

                                            return (
                                                <tr
                                                    key={teklif.id}
                                                    className={`hover:bg-gray-50/70 transition-colors ${
                                                        isBest ? 'bg-emerald-50/40' : ''
                                                    } ${!teklif.aktif || expired ? 'opacity-65' : ''}`}
                                                >
                                                    {/* Firma Adı */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-bold text-primary text-sm">
                                                                {teklif.firma_adi}
                                                            </div>
                                                            {isBest && (
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    En Avantajlı
                                                                </span>
                                                            )}
                                                        </div>
                                                        {teklif.notlar && (
                                                            <p className="text-[11px] text-gray-400 truncate max-w-xs mt-0.5">
                                                                {teklif.notlar}
                                                            </p>
                                                        )}
                                                    </td>

                                                    {/* Taşıma Tipi */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <span
                                                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${tipCfg.badge}`}
                                                        >
                                                            {tipCfg.label}
                                                        </span>
                                                    </td>

                                                    {/* Birim Fiyat */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <div className="flex items-baseline gap-1">
                                                            <span
                                                                className={`font-serif text-base font-extrabold ${
                                                                    isBest ? 'text-emerald-700' : 'text-primary'
                                                                }`}
                                                            >
                                                                {teklif.fiyat_kg != null
                                                                    ? `€${fmt(teklif.fiyat_kg)}`
                                                                    : '—'}
                                                            </span>
                                                            <span className="text-[11px] text-gray-400">/kg</span>
                                                        </div>
                                                    </td>

                                                    {/* Min Ağırlık */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                                        {teklif.min_agirlik ? `${fmt(teklif.min_agirlik)} kg` : 'Yok'}
                                                    </td>

                                                    {/* Transit Süre */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                                                        {teklif.transit_sure || '—'}
                                                    </td>

                                                    {/* Tarihler */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <span className="text-gray-700 font-medium">
                                                                {new Date(teklif.teklif_tarihi).toLocaleDateString('tr-TR')}
                                                            </span>
                                                            {teklif.gecerlilik_tarihi && (
                                                                <span
                                                                    className={`text-[11px] ${
                                                                        expired
                                                                            ? 'text-rose-600 font-semibold'
                                                                            : 'text-gray-400'
                                                                    }`}
                                                                >
                                                                    Son: {new Date(teklif.gecerlilik_tarihi).toLocaleDateString('tr-TR')}
                                                                    {expired && ' (Süresi Doldu)'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* Durum Toggle */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                                                        <button
                                                            onClick={() => handleToggleTeklifAktif(teklif)}
                                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                                                teklif.aktif
                                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                    : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                                                            }`}
                                                            title="Durumu Değiştirmek İçin Tıklayın"
                                                        >
                                                            <span
                                                                className={`w-1.5 h-1.5 rounded-full ${
                                                                    teklif.aktif ? 'bg-emerald-500' : 'bg-gray-400'
                                                                }`}
                                                            />
                                                            {teklif.aktif ? 'Aktif' : 'Pasif'}
                                                        </button>
                                                    </td>

                                                    {/* İşlemler */}
                                                    <td className="py-3.5 px-4 whitespace-nowrap text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {teklif.belge_url && (
                                                                <a
                                                                    href={teklif.belge_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1.5 text-gray-500 hover:text-accent hover:bg-gray-100 rounded-lg transition-colors"
                                                                    title="Teklif Belgesini Aç"
                                                                >
                                                                    <FiExternalLink size={14} />
                                                                </a>
                                                            )}
                                                            <button
                                                                onClick={() => openEditTeklif(teklif)}
                                                                className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                                                title="Düzenle"
                                                            >
                                                                <FiEdit2 size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setDeleteTarget({
                                                                        type: 'teklif',
                                                                        id: teklif.id,
                                                                        name: `${teklif.firma_adi} (€${fmt(teklif.fiyat_kg)}/kg)`,
                                                                    })
                                                                }
                                                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                title="Sil"
                                                            >
                                                                <FiTrash2 size={14} />
                                                            </button>
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
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                6. BÖLÜM: RESMİ & GENEL İRTİBATLAR REHBERİ
            ══════════════════════════════════════════════════════════════════ */}
            {(activeTab === 'all' || activeTab === 'irtibatlar') && (
                <section className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="font-serif text-xl sm:text-2xl font-bold text-primary">
                                    Resmi & Genel İrtibatlar Rehberi
                                </h2>
                                <span className="text-xs font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">
                                    {filteredIrtibatlar.length}
                                </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Gümrük müşavirleri, noter, avukat, mali müşavir ve iş ortakları rehberi
                            </p>
                        </div>

                        {/* Kategori Filtreleri */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { id: 'tümü', label: 'Tümü' },
                                { id: 'gumruk_musaviri', label: 'Gümrük' },
                                { id: 'muhasebeci', label: 'Muhasebe' },
                                { id: 'avukat', label: 'Hukuk / Noter' },
                                { id: 'sigorta', label: 'Sigorta' },
                                { id: 'diger', label: 'Diğer' },
                            ].map(k => (
                                <button
                                    key={k.id}
                                    onClick={() => setIrtibatKategoriFilter(k.id)}
                                    className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                                        irtibatKategoriFilter === k.id
                                            ? 'bg-primary text-white border-primary shadow-xs'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                                    }`}
                                >
                                    {k.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* İrtibatlar Listesi / Kartları */}
                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse flex gap-4"
                                >
                                    <div className="w-12 h-12 bg-gray-200 rounded-2xl" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                                        <div className="h-3 bg-gray-100 rounded w-1/4" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filteredIrtibatlar.length === 0 ? (
                        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-10 text-center">
                            <FiUser size={38} className="mx-auto text-gray-300 mb-2.5" />
                            <p className="font-semibold text-gray-600 text-sm">
                                {searchQuery || irtibatKategoriFilter !== 'tümü'
                                    ? 'Arama kriterine uygun irtibat kaydı bulunamadı'
                                    : 'Henüz kayıtlı irtibat bulunmuyor'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                                Gümrük müşaviri, muhasebeci ve danışmanlarınızı buraya ekleyebilirsiniz.
                            </p>
                            <button
                                onClick={openAddIrtibat}
                                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-all"
                            >
                                <FiPlus size={14} /> Yeni İrtibat Ekle
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {filteredIrtibatlar.map(irt => {
                                const kat = irt.kategori ?? 'diger';
                                const katCfg = KATEGORI_CONFIG[kat] ?? KATEGORI_CONFIG.diger;
                                const statusCfg = DURUM_CONFIG[irt.durum] ?? DURUM_CONFIG.aktif;
                                const waPhone = cleanPhoneForWhatsApp(irt.telefon);

                                return (
                                    <div
                                        key={irt.id}
                                        className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                                    >
                                        <div className="space-y-2.5">
                                            {/* Top info */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className={`w-11 h-11 rounded-2xl ${katCfg.bg} text-white font-serif font-bold text-base flex items-center justify-center shadow-xs flex-shrink-0`}
                                                    >
                                                        {initials(irt.ad)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-primary text-sm sm:text-base leading-tight truncate">
                                                            {irt.ad}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            {irt.unvan && (
                                                                <span className="text-xs font-medium text-gray-600">
                                                                    {irt.unvan}
                                                                </span>
                                                            )}
                                                            {irt.sirket_adi && (
                                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <FiPackage size={11} /> {irt.sirket_adi}
                                                                </span>
                                                            )}
                                                            {irt.sehir && (
                                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <FiMapPin size={11} /> {irt.sehir}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Kategori Rozeti */}
                                                <span
                                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${katCfg.badge}`}
                                                >
                                                    {katCfg.label}
                                                </span>
                                            </div>

                                            {/* Notlar */}
                                            {irt.notlar && (
                                                <div className="text-xs text-gray-600 bg-gray-50 border border-gray-100 p-2.5 rounded-xl whitespace-pre-line leading-relaxed">
                                                    {irt.notlar}
                                                </div>
                                            )}
                                        </div>

                                        {/* Contact Bar & Actions */}
                                        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap text-xs">
                                            {/* Quick Communication links */}
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {irt.telefon && (
                                                    <div className="flex items-center gap-1">
                                                        <a
                                                            href={`tel:${irt.telefon}`}
                                                            className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                                                        >
                                                            <FiPhone size={12} className="text-gray-500" />
                                                            <span>{irt.telefon}</span>
                                                        </a>
                                                        <button
                                                            onClick={() =>
                                                                handleCopy(irt.telefon!, `irt-tel-${irt.id}`, 'Telefon')
                                                            }
                                                            title="Kopyala"
                                                            className="p-1 text-gray-400 hover:text-gray-600"
                                                        >
                                                            {copiedKey === `irt-tel-${irt.id}` ? (
                                                                <FiCheck size={12} className="text-emerald-600" />
                                                            ) : (
                                                                <FiCopy size={12} />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {waPhone && (
                                                    <a
                                                        href={`https://wa.me/${waPhone}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="WhatsApp Mesajı"
                                                        className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"
                                                    >
                                                        <FaWhatsapp size={13} />
                                                    </a>
                                                )}

                                                {irt.email && (
                                                    <a
                                                        href={`mailto:${irt.email}`}
                                                        title={`E-posta: ${irt.email}`}
                                                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors font-medium truncate max-w-[180px]"
                                                    >
                                                        <FiMail size={12} />
                                                        <span className="truncate">{irt.email}</span>
                                                    </a>
                                                )}
                                            </div>

                                            {/* Edit & Delete buttons */}
                                            <div className="flex items-center gap-1 ml-auto">
                                                <button
                                                    onClick={() => openEditIrtibat(irt)}
                                                    className="p-1.5 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
                                                    title="İrtibatı Düzenle"
                                                >
                                                    <FiEdit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setDeleteTarget({
                                                            type: 'irtibat',
                                                            id: irt.id,
                                                            name: irt.ad,
                                                        })
                                                    }
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="İrtibatı Sil"
                                                >
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                7. MODALLER
            ══════════════════════════════════════════════════════════════════ */}

            {/* Modal: Kargo Firma Ekle / Düzenle */}
            {(modal === 'firma-add' || modal === 'firma-edit') && (
                <Modal
                    title={modal === 'firma-add' ? 'Yeni Kargo Firması Ekle' : 'Kargo Firmasını Düzenle'}
                    subtitle="Nakliye ve lojistik iş ortağınızın iletişim bilgilerini belirleyin."
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <Field label="Firma Adı" required>
                            <Input
                                value={firmaForm.ad}
                                onChange={e => setFirmaForm(f => ({ ...f, ad: e.target.value }))}
                                placeholder="Örn: Ays Lojistik, Inter Kombi..."
                                autoFocus
                            />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Yetkili / Sorumlu Kişi">
                                <Input
                                    value={firmaForm.unvan}
                                    onChange={e => setFirmaForm(f => ({ ...f, unvan: e.target.value }))}
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </Field>
                            <Field label="Şehir / Bölge">
                                <Input
                                    value={firmaForm.sehir}
                                    onChange={e => setFirmaForm(f => ({ ...f, sehir: e.target.value }))}
                                    placeholder="Örn: Istanbul, Hamburg, Dortmund..."
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Telefon Numarası">
                                <Input
                                    type="tel"
                                    value={firmaForm.telefon}
                                    onChange={e => setFirmaForm(f => ({ ...f, telefon: e.target.value }))}
                                    placeholder="+49 ... veya +90 ..."
                                />
                            </Field>
                            <Field label="E-posta Adresi">
                                <Input
                                    type="email"
                                    value={firmaForm.email}
                                    onChange={e => setFirmaForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="info@lojistik.com"
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Çalışma Durumu">
                                <Select
                                    value={firmaForm.durum}
                                    onChange={e => setFirmaForm(f => ({ ...f, durum: e.target.value }))}
                                >
                                    <option value="aktif">Aktif (Çalışılıyor)</option>
                                    <option value="gorusuluyor">Görüşülüyor / Teklif Sürecinde</option>
                                    <option value="pasif">Pasif</option>
                                </Select>
                            </Field>

                            <Field label="Firma Değerlendirmesi">
                                <div className="py-2 flex items-center gap-3">
                                    <StarRating
                                        value={firmaForm.degerlendirme}
                                        onChange={v => setFirmaForm(f => ({ ...f, degerlendirme: v }))}
                                    />
                                    <span className="text-xs font-bold text-gray-500">
                                        {firmaForm.degerlendirme ? `${firmaForm.degerlendirme} / 5` : 'Puan Verilmedi'}
                                    </span>
                                </div>
                            </Field>
                        </div>

                        <Field label="Operasyonel Notlar">
                            <Textarea
                                value={firmaForm.notlar}
                                onChange={e => setFirmaForm(f => ({ ...f, notlar: e.target.value }))}
                                placeholder="Gümrük kapısı, faturalandırma şartları, depo adresleri veya özel notlar..."
                            />
                        </Field>

                        <div className="flex gap-3 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={saveFirma}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-sm disabled:opacity-60"
                            >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Teklif Ekle / Düzenle */}
            {(modal === 'teklif-add' || modal === 'teklif-edit') && (
                <Modal
                    title={modal === 'teklif-add' ? 'Yeni Navlun Teklifi Ekle' : 'Navlun Teklifini Düzenle'}
                    subtitle="Kargo firmasından alınan birim kg taşıma fiyatı ve transit süresi."
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <Field label="Kargo Firması" required>
                            <Select
                                value={teklifForm.firma_id}
                                onChange={e => setTeklifForm(f => ({ ...f, firma_id: e.target.value }))}
                            >
                                <option value="">-- Firma Seçiniz --</option>
                                {kargoFirmalar.map(k => (
                                    <option key={k.id} value={k.id}>
                                        {k.ad} {k.sehir ? `(${k.sehir})` : ''}
                                    </option>
                                ))}
                            </Select>
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Birim Fiyat (€ / kg)" required hint="Örn: 1.85 veya 1,85">
                                <Input
                                    type="text"
                                    value={teklifForm.fiyat_kg}
                                    onChange={e => setTeklifForm(f => ({ ...f, fiyat_kg: e.target.value }))}
                                    placeholder="1.85"
                                    autoFocus
                                />
                            </Field>
                            <Field label="Taşıma Tipi">
                                <Select
                                    value={teklifForm.tasima_tipi}
                                    onChange={e => setTeklifForm(f => ({ ...f, tasima_tipi: e.target.value }))}
                                >
                                    <option value="donuk">Donuk / Soğuk Zincir (-18°C)</option>
                                    <option value="kuru">Kuru Yük</option>
                                    <option value="karma">Karma / Çift Rejim</option>
                                </Select>
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Min. Ağırlık / Yük (kg)">
                                <Input
                                    type="text"
                                    value={teklifForm.min_agirlik}
                                    onChange={e => setTeklifForm(f => ({ ...f, min_agirlik: e.target.value }))}
                                    placeholder="500"
                                />
                            </Field>
                            <Field label="Tahmini Transit Süre">
                                <Input
                                    value={teklifForm.transit_sure}
                                    onChange={e => setTeklifForm(f => ({ ...f, transit_sure: e.target.value }))}
                                    placeholder="Örn: 2-3 gün, 48 saat..."
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Teklif Tarihi" required>
                                <Input
                                    type="date"
                                    value={teklifForm.teklif_tarihi}
                                    onChange={e => setTeklifForm(f => ({ ...f, teklif_tarihi: e.target.value }))}
                                />
                            </Field>
                            <Field label="Geçerlilik Bitiş Tarihi">
                                <Input
                                    type="date"
                                    value={teklifForm.gecerlilik_tarihi}
                                    onChange={e => setTeklifForm(f => ({ ...f, gecerlilik_tarihi: e.target.value }))}
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Teklif Durumu">
                                <Select
                                    value={teklifForm.aktif ? 'aktif' : 'pasif'}
                                    onChange={e =>
                                        setTeklifForm(f => ({ ...f, aktif: e.target.value === 'aktif' }))
                                    }
                                >
                                    <option value="aktif">Aktif (Karşılaştırmada Kullan)</option>
                                    <option value="pasif">Pasif / Arşiv</option>
                                </Select>
                            </Field>
                            <Field label="Belge / PDF Bağlantısı">
                                <Input
                                    value={teklifForm.belge_url}
                                    onChange={e => setTeklifForm(f => ({ ...f, belge_url: e.target.value }))}
                                    placeholder="https://..."
                                />
                            </Field>
                        </div>

                        <Field label="Teklif Notları">
                            <Textarea
                                value={teklifForm.notlar}
                                onChange={e => setTeklifForm(f => ({ ...f, notlar: e.target.value }))}
                                placeholder="Dizel farkı, sigorta bedeli, palet değişim şartı veya özel koşullar..."
                            />
                        </Field>

                        <div className="flex gap-3 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={saveTeklif}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-all shadow-sm disabled:opacity-60"
                            >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: İrtibat Ekle / Düzenle */}
            {(modal === 'irtibat-add' || modal === 'irtibat-edit') && (
                <Modal
                    title={modal === 'irtibat-add' ? 'Yeni İrtibat Ekle' : 'İrtibatı Düzenle'}
                    subtitle="Gümrük müşaviri, noter, avukat, mali müşavir veya çözüm ortağı."
                    onClose={closeModal}
                >
                    <div className="space-y-4">
                        <Field label="Ad Soyad veya Kurum Yetkilisi" required>
                            <Input
                                value={irtibatForm.ad}
                                onChange={e => setIrtibatForm(f => ({ ...f, ad: e.target.value }))}
                                placeholder="Örn: Fatma As-sped, Ali Karakaya..."
                                autoFocus
                            />
                        </Field>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Kategori" required>
                                <Select
                                    value={irtibatForm.kategori}
                                    onChange={e => setIrtibatForm(f => ({ ...f, kategori: e.target.value }))}
                                >
                                    <option value="gumruk_musaviri">Gümrük Müşaviri</option>
                                    <option value="muhasebeci">Mali Müşavir & Muhasebe</option>
                                    <option value="avukat">Hukuk Müşaviri & Noter</option>
                                    <option value="sigorta">Sigorta & Ekspertiz</option>
                                    <option value="diger">Diğer</option>
                                </Select>
                            </Field>

                            <Field label="Çalışma Durumu">
                                <Select
                                    value={irtibatForm.durum}
                                    onChange={e => setIrtibatForm(f => ({ ...f, durum: e.target.value }))}
                                >
                                    <option value="aktif">Aktif</option>
                                    <option value="gorusuluyor">Görüşülüyor</option>
                                    <option value="pasif">Pasif</option>
                                </Select>
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Şirket / Büro Adı">
                                <Input
                                    value={irtibatForm.sirket_adi}
                                    onChange={e => setIrtibatForm(f => ({ ...f, sirket_adi: e.target.value }))}
                                    placeholder="Örn: Demir Hukuk Bürosu"
                                />
                            </Field>
                            <Field label="Unvan / Görev">
                                <Input
                                    value={irtibatForm.unvan}
                                    onChange={e => setIrtibatForm(f => ({ ...f, unvan: e.target.value }))}
                                    placeholder="Örn: Baş Gümrük Müşaviri"
                                />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Telefon">
                                <Input
                                    type="tel"
                                    value={irtibatForm.telefon}
                                    onChange={e => setIrtibatForm(f => ({ ...f, telefon: e.target.value }))}
                                    placeholder="+49 ... veya 0231 ..."
                                />
                            </Field>
                            <Field label="E-posta">
                                <Input
                                    type="email"
                                    value={irtibatForm.email}
                                    onChange={e => setIrtibatForm(f => ({ ...f, email: e.target.value }))}
                                    placeholder="info@danisman.de"
                                />
                            </Field>
                        </div>

                        <Field label="Şehir / Adres">
                            <Input
                                value={irtibatForm.sehir}
                                onChange={e => setIrtibatForm(f => ({ ...f, sehir: e.target.value }))}
                                placeholder="Örn: Köln, Dortmund, İstanbul..."
                            />
                        </Field>

                        <Field label="Notlar & Hizmet Bedelleri">
                            <Textarea
                                value={irtibatForm.notlar}
                                onChange={e => setIrtibatForm(f => ({ ...f, notlar: e.target.value }))}
                                placeholder="GTİB kodları, hizmet bedeli, çalışma saatleri veya özel notlar..."
                            />
                        </Field>

                        <div className="flex gap-3 pt-3 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="button"
                                onClick={saveIrtibat}
                                disabled={saving}
                                className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-black transition-all shadow-sm disabled:opacity-60"
                            >
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modal: Silme Onayı (Delete Confirmation) */}
            {deleteTarget && (
                <Modal
                    title="Silme Onayı"
                    subtitle="Bu kaydı silmek istediğinizden emin misiniz?"
                    onClose={() => setDeleteTarget(null)}
                    maxWidth="max-w-md"
                >
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs sm:text-sm">
                            <FiAlertCircle size={20} className="text-rose-600 flex-shrink-0" />
                            <div>
                                <span className="font-bold">&quot;{deleteTarget.name}&quot;</span> kalıcı olarak
                                silinecektir.
                                {deleteTarget.type === 'firma' && (
                                    <p className="text-[11px] text-rose-700 mt-1">
                                        Uyarı: Bu kargo firmasına ait tüm navlun fiyat teklifleri de otomatik olarak
                                        silinecektir.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                type="button"
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 transition-all shadow-sm disabled:opacity-60"
                            >
                                {deleting ? 'Siliniyor...' : 'Evet, Sil'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
