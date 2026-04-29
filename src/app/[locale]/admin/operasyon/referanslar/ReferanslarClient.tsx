'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    FiPlus, FiEdit2, FiPhone, FiMail, FiMapPin, FiTruck,
    FiX, FiStar, FiPackage, FiUser, FiFileText, FiChevronDown,
    FiAlertCircle, FiCheckCircle, FiClock, FiFilter, FiExternalLink
} from 'react-icons/fi';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

// ─── Types ───────────────────────────────────────────────────────────────────

type KargoFirma = {
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
    sonTeklif?: { fiyat_kg: number | null; teklif_tarihi: string } | null;
    tirSayisi?: number;
};

type Teklif = {
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
};

type Irtibat = {
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
};

type ModalType = 'firma-add' | 'firma-edit' | 'teklif-add' | 'teklif-edit' | 'irtibat-add' | 'irtibat-edit' | null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined) =>
    v == null ? '—' : new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);

const today = () => new Date().toISOString().split('T')[0];

const isExpired = (date: string | null) =>
    date ? new Date(date) < new Date(today()) : false;

const initials = (name: string) =>
    name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

const KATEGORI_COLORS: Record<string, string> = {
    gumruk_musaviri: 'bg-blue-100 text-blue-700',
    muhasebeci:      'bg-emerald-100 text-emerald-700',
    avukat:          'bg-violet-100 text-violet-700',
    sigorta:         'bg-orange-100 text-orange-700',
    diger:           'bg-gray-100 text-gray-600',
};
const KATEGORI_AVATAR: Record<string, string> = {
    gumruk_musaviri: 'bg-blue-600',
    muhasebeci:      'bg-emerald-600',
    avukat:          'bg-violet-600',
    sigorta:         'bg-orange-500',
    diger:           'bg-gray-500',
};
const KATEGORI_LABELS: Record<string, string> = {
    gumruk_musaviri: 'Gümrük Müşaviri',
    muhasebeci:      'Muhasebeci',
    avukat:          'Avukat',
    sigorta:         'Sigorta',
    diger:           'Diğer',
};
const DURUM_STYLES: Record<string, string> = {
    aktif:        'bg-emerald-100 text-emerald-700',
    gorusuluyor:  'bg-amber-100 text-amber-700',
    pasif:        'bg-gray-100 text-gray-500',
};
const DURUM_LABELS: Record<string, string> = {
    aktif: 'Aktif', gorusuluyor: 'Görüşülüyor', pasif: 'Pasif',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
    <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
            <button key={i} type="button"
                onClick={() => onChange?.(i)}
                className={`text-lg transition-colors ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} ${i <= (value || 0) ? 'text-amber-400' : 'text-gray-200'}`}>
                ★
            </button>
        ))}
    </div>
);

const SkeletonCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
        <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
        </div>
        <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded" />
            <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
    </div>
);

const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
             onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="font-serif text-lg font-bold text-primary">{title}</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                    <FiX size={18} />
                </button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    </div>
);

// ─── Form field helper ────────────────────────────────────────────────────────
const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
    <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none transition-colors ${props.className ?? ''}`} />
);
const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
    <select {...props} className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none bg-white ${props.className ?? ''}`} />
);
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} rows={3} className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none resize-none ${props.className ?? ''}`} />
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReferanslarClient({ locale }: { locale: string }) {
    const sb = createDynamicSupabaseClient(false);

    const [loading,      setLoading]      = useState(true);
    const [kargoFirmalar,setKargoFirmalar]= useState<KargoFirma[]>([]);
    const [teklifler,    setTeklifler]    = useState<Teklif[]>([]);
    const [irtibatlar,   setIrtibatlar]   = useState<Irtibat[]>([]);
    const [saving,       setSaving]       = useState(false);
    const [error,        setError]        = useState<string | null>(null);
    const [success,      setSuccess]      = useState<string | null>(null);

    // Filters
    const [teklifFilter, setTeklifFilter] = useState<string>('tümü');
    const [irtibatFilter,setIrtibatFilter]= useState<string>('tümü');

    // Modal state
    const [modal,   setModal]   = useState<ModalType>(null);
    const [editId,  setEditId]  = useState<string | null>(null);

    // Form states
    const emptyFirma = { ad: '', sirket_adi: '', unvan: '', telefon: '', email: '', sehir: '', notlar: '', degerlendirme: 0, durum: 'aktif' };
    const emptyTeklif = { firma_id: '', teklif_tarihi: today(), gecerlilik_tarihi: '', fiyat_kg: '', min_agirlik: '', transit_sure: '', tasima_tipi: 'donuk', notlar: '', belge_url: '' };
    const emptyIrtibat = { ad: '', sirket_adi: '', unvan: '', kategori: 'diger', telefon: '', email: '', sehir: '', notlar: '', durum: 'aktif' };

    const [firmaForm,   setFirmaForm]   = useState({ ...emptyFirma });
    const [teklifForm,  setTeklifForm]  = useState({ ...emptyTeklif });
    const [irtibatForm, setIrtibatForm] = useState({ ...emptyIrtibat });

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [firmaRes, teklifRes, irtibatRes] = await Promise.all([
                sb.from('is_ortaklari').select('*').eq('tip', 'kargo').order('olusturma_tarihi', { ascending: false }),
                sb.from('kargo_teklifleri').select('*, is_ortaklari(ad)').order('fiyat_kg', { ascending: true }),
                sb.from('is_ortaklari').select('*').eq('tip', 'irtibat').order('ad'),
            ]);

            const rawFirmalar = firmaRes.data ?? [];
            const rawTeklifler = teklifRes.data ?? [];

            // Enrich: last offer per firma
            const firmalarWithData: KargoFirma[] = await Promise.all(
                rawFirmalar.map(async (f: any) => {
                    const firmaTeklifleri = rawTeklifler.filter(t => t.firma_id === f.id && t.aktif);
                    const sonTeklif = firmaTeklifleri.length > 0
                        ? { fiyat_kg: firmaTeklifleri[0].fiyat_kg, teklif_tarihi: firmaTeklifleri[0].teklif_tarihi }
                        : null;

                    // TIR count from ithalat_partileri
                    let tirSayisi = 0;
                    try {
                        const { count } = await sb
                            .from('ithalat_partileri')
                            .select('*', { count: 'exact', head: true })
                            .ilike('kargo_firmasi', `%${f.ad}%`);
                        tirSayisi = count ?? 0;
                    } catch { tirSayisi = 0; }

                    return { ...f, sonTeklif, tirSayisi };
                })
            );

            setKargoFirmalar(firmalarWithData);

            // Enrich teklifler with firma name
            setTeklifler(rawTeklifler.map((t: any) => ({
                ...t,
                firma_adi: t.is_ortaklari?.ad ?? '—',
            })));

            setIrtibatlar(irtibatRes.data ?? []);
        } catch (e: any) {
            setError('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Flash message ──────────────────────────────────────────────────────────
    const flash = (msg: string, isError = false) => {
        if (isError) { setError(msg); setTimeout(() => setError(null), 4000); }
        else         { setSuccess(msg); setTimeout(() => setSuccess(null), 3000); }
    };

    // ── Open modal helpers ─────────────────────────────────────────────────────
    const openAddFirma = () => {
        setFirmaForm({ ...emptyFirma });
        setEditId(null);
        setModal('firma-add');
    };
    const openEditFirma = (f: KargoFirma) => {
        setFirmaForm({ ad: f.ad, sirket_adi: f.sirket_adi ?? '', unvan: f.unvan ?? '', telefon: f.telefon ?? '', email: f.email ?? '', sehir: f.sehir ?? '', notlar: f.notlar ?? '', degerlendirme: f.degerlendirme ?? 0, durum: f.durum });
        setEditId(f.id);
        setModal('firma-edit');
    };
    const openAddTeklif = (firmaId?: string) => {
        setTeklifForm({ ...emptyTeklif, firma_id: firmaId ?? '' });
        setEditId(null);
        setModal('teklif-add');
    };
    const openEditTeklif = (t: Teklif) => {
        setTeklifForm({ firma_id: t.firma_id, teklif_tarihi: t.teklif_tarihi, gecerlilik_tarihi: t.gecerlilik_tarihi ?? '', fiyat_kg: String(t.fiyat_kg ?? ''), min_agirlik: String(t.min_agirlik ?? ''), transit_sure: t.transit_sure ?? '', tasima_tipi: t.tasima_tipi, notlar: t.notlar ?? '', belge_url: t.belge_url ?? '' });
        setEditId(t.id);
        setModal('teklif-edit');
    };
    const openAddIrtibat = () => {
        setIrtibatForm({ ...emptyIrtibat });
        setEditId(null);
        setModal('irtibat-add');
    };
    const openEditIrtibat = (irt: Irtibat) => {
        setIrtibatForm({ ad: irt.ad, sirket_adi: irt.sirket_adi ?? '', unvan: irt.unvan ?? '', kategori: irt.kategori ?? 'diger', telefon: irt.telefon ?? '', email: irt.email ?? '', sehir: irt.sehir ?? '', notlar: irt.notlar ?? '', durum: irt.durum });
        setEditId(irt.id);
        setModal('irtibat-edit');
    };
    const closeModal = () => { setModal(null); setEditId(null); };

    // ── Save Firma ─────────────────────────────────────────────────────────────
    const saveFirma = async () => {
        if (!firmaForm.ad.trim()) { flash('Firma adı zorunludur.', true); return; }
        setSaving(true);
        const payload = { tip: 'kargo', ad: firmaForm.ad.trim(), sirket_adi: firmaForm.sirket_adi || null, unvan: firmaForm.unvan || null, telefon: firmaForm.telefon || null, email: firmaForm.email || null, sehir: firmaForm.sehir || null, notlar: firmaForm.notlar || null, degerlendirme: firmaForm.degerlendirme || null, durum: firmaForm.durum };
        const { error: err } = editId
            ? await sb.from('is_ortaklari').update(payload).eq('id', editId)
            : await sb.from('is_ortaklari').insert(payload);
        setSaving(false);
        if (err) { flash('Kayıt sırasında hata: ' + err.message, true); return; }
        flash(editId ? 'Firma güncellendi.' : 'Firma eklendi.');
        closeModal();
        fetchAll();
    };

    // ── Save Teklif ────────────────────────────────────────────────────────────
    const saveTeklif = async () => {
        if (!teklifForm.firma_id) { flash('Firma seçilmeli.', true); return; }
        if (!teklifForm.teklif_tarihi) { flash('Teklif tarihi zorunludur.', true); return; }
        setSaving(true);
        const payload = {
            firma_id: teklifForm.firma_id,
            teklif_tarihi: teklifForm.teklif_tarihi,
            gecerlilik_tarihi: teklifForm.gecerlilik_tarihi || null,
            fiyat_kg: teklifForm.fiyat_kg ? Number(teklifForm.fiyat_kg) : null,
            min_agirlik: teklifForm.min_agirlik ? Number(teklifForm.min_agirlik) : null,
            transit_sure: teklifForm.transit_sure || null,
            tasima_tipi: teklifForm.tasima_tipi,
            notlar: teklifForm.notlar || null,
            belge_url: teklifForm.belge_url || null,
            aktif: true,
        };
        const { error: err } = editId
            ? await sb.from('kargo_teklifleri').update(payload).eq('id', editId)
            : await sb.from('kargo_teklifleri').insert(payload);
        setSaving(false);
        if (err) { flash('Kayıt sırasında hata: ' + err.message, true); return; }
        flash(editId ? 'Teklif güncellendi.' : 'Teklif eklendi.');
        closeModal();
        fetchAll();
    };

    // ── Save Irtibat ───────────────────────────────────────────────────────────
    const saveIrtibat = async () => {
        if (!irtibatForm.ad.trim()) { flash('Ad zorunludur.', true); return; }
        setSaving(true);
        const payload = { tip: 'irtibat', ad: irtibatForm.ad.trim(), sirket_adi: irtibatForm.sirket_adi || null, unvan: irtibatForm.unvan || null, kategori: irtibatForm.kategori || 'diger', telefon: irtibatForm.telefon || null, email: irtibatForm.email || null, sehir: irtibatForm.sehir || null, notlar: irtibatForm.notlar || null, durum: irtibatForm.durum };
        const { error: err } = editId
            ? await sb.from('is_ortaklari').update(payload).eq('id', editId)
            : await sb.from('is_ortaklari').insert(payload);
        setSaving(false);
        if (err) { flash('Kayıt sırasında hata: ' + err.message, true); return; }
        flash(editId ? 'İrtibat güncellendi.' : 'İrtibat eklendi.');
        closeModal();
        fetchAll();
    };

    // ── Derived data ───────────────────────────────────────────────────────────
    const filteredTeklifler = teklifler
        .filter(t => teklifFilter === 'tümü' || t.tasima_tipi === teklifFilter)
        .sort((a, b) => (a.fiyat_kg ?? Infinity) - (b.fiyat_kg ?? Infinity));

    const bestTeklif = filteredTeklifler.find(t => t.aktif && !isExpired(t.gecerlilik_tarihi) && t.fiyat_kg != null);

    const filteredIrtibatlar = irtibatlar.filter(
        i => irtibatFilter === 'tümü' || i.kategori === irtibatFilter
    );

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-10 pb-10">
            {/* Page Header */}
            <header>
                <h1 className="font-serif text-3xl font-bold text-primary">Referanslar & İrtibatlar</h1>
                <p className="text-sm text-gray-500 mt-1">Kargo firmaları, teklif karşılaştırması ve genel irtibat rehberi</p>
            </header>

            {/* Flash Messages */}
            {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    <FiAlertCircle size={16} className="flex-shrink-0" /> {error}
                </div>
            )}
            {success && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm">
                    <FiCheckCircle size={16} className="flex-shrink-0" /> {success}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                BÖLÜM 1: KARGO FİRMALARI
            ══════════════════════════════════════════════════════════════ */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-primary">Kargo & Nakliye Firmaları</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{kargoFirmalar.length} firma kayıtlı</p>
                    </div>
                    <button onClick={openAddFirma}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                        <FiPlus size={15} /> Yeni Kargo Firması
                    </button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : kargoFirmalar.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <FiTruck className="mx-auto text-gray-300 mb-3" size={40} />
                        <p className="font-semibold text-gray-500">Henüz kargo firması eklenmedi</p>
                        <p className="text-xs text-gray-400 mt-1">Nakliye firmalarını ve fiyat tekliflerini buradan takip edin</p>
                        <button onClick={openAddFirma}
                            className="mt-4 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                            <FiPlus className="inline mr-1" size={13} /> Firma Ekle
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {kargoFirmalar.map(firma => (
                            <div key={firma.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow flex flex-col gap-3">
                                {/* Card Header */}
                                <div className="flex items-start gap-3">
                                    <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                        {initials(firma.ad)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="font-bold text-primary text-sm truncate">{firma.ad}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${DURUM_STYLES[firma.durum] ?? 'bg-gray-100 text-gray-500'}`}>
                                                {DURUM_LABELS[firma.durum] ?? firma.durum}
                                            </span>
                                        </div>
                                        {firma.unvan && <p className="text-xs text-gray-500 mt-0.5">{firma.unvan}</p>}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-1.5 text-xs">
                                    {firma.telefon && (
                                        <a href={`tel:${firma.telefon}`} className="flex items-center gap-2 text-gray-600 hover:text-accent transition-colors">
                                            <FiPhone size={12} className="flex-shrink-0" /> {firma.telefon}
                                        </a>
                                    )}
                                    {firma.email && (
                                        <a href={`mailto:${firma.email}`} className="flex items-center gap-2 text-gray-600 hover:text-accent transition-colors">
                                            <FiMail size={12} className="flex-shrink-0" /> {firma.email}
                                        </a>
                                    )}
                                    {firma.sehir && (
                                        <div className="flex items-center gap-2 text-gray-500">
                                            <FiMapPin size={12} className="flex-shrink-0" /> {firma.sehir}
                                        </div>
                                    )}
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <p className="text-gray-400 font-medium">Son Teklif</p>
                                        <p className="font-bold text-primary mt-0.5">
                                            {firma.sonTeklif ? `€${fmt(firma.sonTeklif.fiyat_kg)}/kg` : <span className="text-gray-400">Yok</span>}
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg px-3 py-2">
                                        <p className="text-gray-400 font-medium">TIR Sayısı</p>
                                        <p className="font-bold text-primary mt-0.5">
                                            {firma.tirSayisi != null ? firma.tirSayisi : <span className="text-gray-400">—</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* Star Rating */}
                                <div className="flex items-center justify-between">
                                    <StarRating value={firma.degerlendirme ?? 0} />
                                    {firma.degerlendirme && (
                                        <span className="text-xs text-gray-400">{firma.degerlendirme}/5</span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1 border-t border-gray-100">
                                    <button onClick={() => openEditFirma(firma)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                        <FiEdit2 size={12} /> Düzenle
                                    </button>
                                    <button onClick={() => openAddTeklif(firma.id)}
                                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                        <FiFileText size={12} /> Teklif Ekle
                                    </button>
                                    {firma.telefon && (
                                        <a href={`tel:${firma.telefon}`}
                                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5 rounded-lg transition-colors">
                                            <FiPhone size={12} /> Ara
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ══════════════════════════════════════════════════════════════
                BÖLÜM 2: TEKLİF KARŞILAŞTIRMA TABLOSU
            ══════════════════════════════════════════════════════════════ */}
            <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-primary">Teklif Karşılaştırması</h2>
                        <p className="text-xs text-gray-400 mt-0.5">En ucuz aktif teklif otomatik vurgulanır</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Transport filter */}
                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                            {[
                                { label: 'Tümü',  value: 'tümü'  },
                                { label: 'Donuk', value: 'donuk' },
                                { label: 'Kuru',  value: 'kuru'  },
                                { label: 'Karma', value: 'karma' },
                            ].map(opt => (
                                <button key={opt.value} onClick={() => setTeklifFilter(opt.value)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${teklifFilter === opt.value ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-primary'}`}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <button onClick={() => openAddTeklif()}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors">
                            <FiPlus size={15} /> Teklif Ekle
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto" />
                        </div>
                    ) : filteredTeklifler.length === 0 ? (
                        <div className="p-12 text-center">
                            <FiFileText className="mx-auto text-gray-300 mb-3" size={36} />
                            <p className="text-gray-500 text-sm">Bu kategori için teklif bulunamadı</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {['Firma', 'Teklif Tarihi', 'Fiyat (€/kg)', 'Min. Ağırlık', 'Transit Süre', 'Geçerlilik', 'Taşıma', 'Durum', ''].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredTeklifler.map(t => {
                                        const expired    = isExpired(t.gecerlilik_tarihi);
                                        const isBest     = t.id === bestTeklif?.id;
                                        const isInactive = !t.aktif || expired;
                                        return (
                                            <tr key={t.id} className={`transition-colors ${isBest ? 'bg-emerald-50 hover:bg-emerald-50/80' : isInactive ? 'opacity-50 bg-gray-50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm text-gray-800">{t.firma_adi}</span>
                                                        {isBest && <span className="text-[10px] font-bold bg-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded-full">En Uygun</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                                                    {new Date(t.teklif_tarihi).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`font-bold text-sm ${isBest ? 'text-emerald-700' : 'text-primary'}`}>
                                                        {t.fiyat_kg != null ? `€${fmt(t.fiyat_kg)}` : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">
                                                    {t.min_agirlik ? `${t.min_agirlik} kg` : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 text-xs text-gray-600 whitespace-nowrap">{t.transit_sure || '—'}</td>
                                                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                                                    {t.gecerlilik_tarihi ? (
                                                        <span className={expired ? 'text-red-500' : 'text-gray-600'}>
                                                            {new Date(t.gecerlilik_tarihi).toLocaleDateString('tr-TR')}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.tasima_tipi === 'donuk' ? 'bg-blue-100 text-blue-700' : t.tasima_tipi === 'kuru' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'}`}>
                                                        {t.tasima_tipi === 'donuk' ? 'Donuk' : t.tasima_tipi === 'kuru' ? 'Kuru' : 'Karma'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    {expired ? (
                                                        <span className="text-[10px] font-semibold text-red-400 bg-red-50 px-2 py-0.5 rounded-full">Eski Teklif</span>
                                                    ) : !t.aktif ? (
                                                        <span className="text-[10px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">Pasif</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Geçerli</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3.5 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => openEditTeklif(t)}
                                                            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-primary">
                                                            <FiEdit2 size={13} />
                                                        </button>
                                                        {t.belge_url && (
                                                            <a href={t.belge_url} target="_blank" rel="noopener noreferrer"
                                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-accent">
                                                                <FiExternalLink size={13} />
                                                            </a>
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
            </section>

            {/* ══════════════════════════════════════════════════════════════
                BÖLÜM 3: GENEL İRTİBAT REHBERİ
            ══════════════════════════════════════════════════════════════ */}
            <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                    <div>
                        <h2 className="font-serif text-xl font-bold text-primary">Genel İrtibatlar</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{irtibatlar.length} kişi/kuruluş kayıtlı</p>
                    </div>
                    <button onClick={openAddIrtibat}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                        <FiPlus size={15} /> Yeni İrtibat
                    </button>
                </div>

                {/* Category Chips */}
                <div className="flex items-center gap-2 flex-wrap mb-4">
                    {[
                        { label: 'Tümü',            value: 'tümü'           },
                        { label: 'Gümrük Müşaviri', value: 'gumruk_musaviri'},
                        { label: 'Muhasebeci',       value: 'muhasebeci'     },
                        { label: 'Avukat',           value: 'avukat'         },
                        { label: 'Sigorta',          value: 'sigorta'        },
                        { label: 'Diğer',            value: 'diger'          },
                    ].map(opt => (
                        <button key={opt.value} onClick={() => setIrtibatFilter(opt.value)}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${irtibatFilter === opt.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                            {opt.label}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredIrtibatlar.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-12 text-center">
                        <FiUser className="mx-auto text-gray-300 mb-3" size={36} />
                        <p className="font-semibold text-gray-500">
                            {irtibatFilter === 'tümü' ? 'Henüz irtibat eklenmedi' : 'Bu kategoride irtibat bulunamadı'}
                        </p>
                        <button onClick={openAddIrtibat}
                            className="mt-4 px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                            <FiPlus className="inline mr-1" size={13} /> İrtibat Ekle
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredIrtibatlar.map(irt => {
                            const kat = irt.kategori ?? 'diger';
                            const avatarBg = KATEGORI_AVATAR[kat] ?? 'bg-gray-500';
                            const katColor = KATEGORI_COLORS[kat] ?? 'bg-gray-100 text-gray-600';
                            return (
                                <div key={irt.id} className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
                                    <div className={`w-11 h-11 rounded-full ${avatarBg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5`}>
                                        {initials(irt.ad)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start gap-3 flex-wrap">
                                            <span className="font-bold text-primary text-sm">{irt.ad}</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${katColor}`}>
                                                {KATEGORI_LABELS[kat] ?? kat}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${DURUM_STYLES[irt.durum] ?? 'bg-gray-100 text-gray-500'}`}>
                                                {DURUM_LABELS[irt.durum] ?? irt.durum}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 flex-wrap text-xs text-gray-500">
                                            {irt.sirket_adi && <span className="flex items-center gap-1"><FiPackage size={11} /> {irt.sirket_adi}</span>}
                                            {irt.sehir      && <span className="flex items-center gap-1"><FiMapPin size={11} /> {irt.sehir}</span>}
                                        </div>
                                        {irt.telefon && (
                                            <a href={`tel:${irt.telefon}`} className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-accent mt-1.5 transition-colors">
                                                <FiPhone size={11} /> {irt.telefon}
                                            </a>
                                        )}
                                        {irt.notlar && (
                                            <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{irt.notlar}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0 mt-1">
                                        <button onClick={() => openEditIrtibat(irt)}
                                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-primary" title="Düzenle">
                                            <FiEdit2 size={14} />
                                        </button>
                                        {irt.telefon && (
                                            <a href={`tel:${irt.telefon}`}
                                                className="p-2 hover:bg-primary/5 rounded-lg transition-colors text-primary" title="Ara">
                                                <FiPhone size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ══════════════════════════════════════════════════════════════
                MODALLER
            ══════════════════════════════════════════════════════════════ */}

            {/* Kargo Firma Modal */}
            {(modal === 'firma-add' || modal === 'firma-edit') && (
                <Modal title={modal === 'firma-add' ? 'Yeni Kargo Firması' : 'Firma Düzenle'} onClose={closeModal}>
                    <div className="space-y-4">
                        <Field label="Firma Adı" required>
                            <Input value={firmaForm.ad} onChange={e => setFirmaForm(f => ({ ...f, ad: e.target.value }))} placeholder="Nakliye Firması A.Ş." />
                        </Field>
                        <Field label="Sorumlu Kişi">
                            <Input value={firmaForm.unvan} onChange={e => setFirmaForm(f => ({ ...f, unvan: e.target.value }))} placeholder="Ahmet Yılmaz" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Telefon">
                                <Input type="tel" value={firmaForm.telefon} onChange={e => setFirmaForm(f => ({ ...f, telefon: e.target.value }))} placeholder="+49 ..." />
                            </Field>
                            <Field label="E-posta">
                                <Input type="email" value={firmaForm.email} onChange={e => setFirmaForm(f => ({ ...f, email: e.target.value }))} placeholder="info@firma.de" />
                            </Field>
                        </div>
                        <Field label="Şehir">
                            <Input value={firmaForm.sehir} onChange={e => setFirmaForm(f => ({ ...f, sehir: e.target.value }))} placeholder="Hamburg" />
                        </Field>
                        <Field label="Durum">
                            <Select value={firmaForm.durum} onChange={e => setFirmaForm(f => ({ ...f, durum: e.target.value }))}>
                                <option value="aktif">Aktif</option>
                                <option value="gorusuluyor">Görüşülüyor</option>
                                <option value="pasif">Pasif</option>
                            </Select>
                        </Field>
                        <Field label="Değerlendirme">
                            <StarRating value={firmaForm.degerlendirme} onChange={v => setFirmaForm(f => ({ ...f, degerlendirme: v }))} />
                        </Field>
                        <Field label="Notlar">
                            <Textarea value={firmaForm.notlar} onChange={e => setFirmaForm(f => ({ ...f, notlar: e.target.value }))} placeholder="Bu firma hakkında notlar..." />
                        </Field>
                        <div className="flex gap-3 pt-2">
                            <button onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
                            <button onClick={saveFirma} disabled={saving}
                                className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Teklif Modal */}
            {(modal === 'teklif-add' || modal === 'teklif-edit') && (
                <Modal title={modal === 'teklif-add' ? 'Teklif Ekle' : 'Teklif Düzenle'} onClose={closeModal}>
                    <div className="space-y-4">
                        <Field label="Kargo Firması" required>
                            <Select value={teklifForm.firma_id} onChange={e => setTeklifForm(f => ({ ...f, firma_id: e.target.value }))}>
                                <option value="">-- Firma Seçin --</option>
                                {kargoFirmalar.map(k => <option key={k.id} value={k.id}>{k.ad}</option>)}
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Teklif Tarihi" required>
                                <Input type="date" value={teklifForm.teklif_tarihi} onChange={e => setTeklifForm(f => ({ ...f, teklif_tarihi: e.target.value }))} />
                            </Field>
                            <Field label="Geçerlilik Tarihi">
                                <Input type="date" value={teklifForm.gecerlilik_tarihi} onChange={e => setTeklifForm(f => ({ ...f, gecerlilik_tarihi: e.target.value }))} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Fiyat (€/kg)">
                                <Input type="number" step="0.01" value={teklifForm.fiyat_kg} onChange={e => setTeklifForm(f => ({ ...f, fiyat_kg: e.target.value }))} placeholder="1.85" />
                            </Field>
                            <Field label="Min. Ağırlık (kg)">
                                <Input type="number" value={teklifForm.min_agirlik} onChange={e => setTeklifForm(f => ({ ...f, min_agirlik: e.target.value }))} placeholder="500" />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Transit Süre">
                                <Input value={teklifForm.transit_sure} onChange={e => setTeklifForm(f => ({ ...f, transit_sure: e.target.value }))} placeholder="2-3 gün" />
                            </Field>
                            <Field label="Taşıma Tipi">
                                <Select value={teklifForm.tasima_tipi} onChange={e => setTeklifForm(f => ({ ...f, tasima_tipi: e.target.value }))}>
                                    <option value="donuk">Donuk</option>
                                    <option value="kuru">Kuru</option>
                                    <option value="karma">Karma</option>
                                </Select>
                            </Field>
                        </div>
                        <Field label="Belge URL (PDF)">
                            <Input value={teklifForm.belge_url} onChange={e => setTeklifForm(f => ({ ...f, belge_url: e.target.value }))} placeholder="https://..." />
                        </Field>
                        <Field label="Notlar">
                            <Textarea value={teklifForm.notlar} onChange={e => setTeklifForm(f => ({ ...f, notlar: e.target.value }))} placeholder="Teklif hakkında notlar..." />
                        </Field>
                        <div className="flex gap-3 pt-2">
                            <button onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
                            <button onClick={saveTeklif} disabled={saving}
                                className="flex-1 py-2.5 bg-accent text-white text-sm font-semibold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-60">
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* İrtibat Modal */}
            {(modal === 'irtibat-add' || modal === 'irtibat-edit') && (
                <Modal title={modal === 'irtibat-add' ? 'Yeni İrtibat' : 'İrtibat Düzenle'} onClose={closeModal}>
                    <div className="space-y-4">
                        <Field label="Ad Soyad" required>
                            <Input value={irtibatForm.ad} onChange={e => setIrtibatForm(f => ({ ...f, ad: e.target.value }))} placeholder="Mehmet Demir" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Şirket Adı">
                                <Input value={irtibatForm.sirket_adi} onChange={e => setIrtibatForm(f => ({ ...f, sirket_adi: e.target.value }))} placeholder="Demir Hukuk Bürosu" />
                            </Field>
                            <Field label="Unvan">
                                <Input value={irtibatForm.unvan} onChange={e => setIrtibatForm(f => ({ ...f, unvan: e.target.value }))} placeholder="Gümrük Müşaviri" />
                            </Field>
                        </div>
                        <Field label="Kategori">
                            <Select value={irtibatForm.kategori} onChange={e => setIrtibatForm(f => ({ ...f, kategori: e.target.value }))}>
                                <option value="gumruk_musaviri">Gümrük Müşaviri</option>
                                <option value="muhasebeci">Muhasebeci</option>
                                <option value="avukat">Avukat</option>
                                <option value="sigorta">Sigorta</option>
                                <option value="diger">Diğer</option>
                            </Select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Telefon">
                                <Input type="tel" value={irtibatForm.telefon} onChange={e => setIrtibatForm(f => ({ ...f, telefon: e.target.value }))} placeholder="+49 ..." />
                            </Field>
                            <Field label="E-posta">
                                <Input type="email" value={irtibatForm.email} onChange={e => setIrtibatForm(f => ({ ...f, email: e.target.value }))} placeholder="info@..." />
                            </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Şehir">
                                <Input value={irtibatForm.sehir} onChange={e => setIrtibatForm(f => ({ ...f, sehir: e.target.value }))} placeholder="Hamburg" />
                            </Field>
                            <Field label="Durum">
                                <Select value={irtibatForm.durum} onChange={e => setIrtibatForm(f => ({ ...f, durum: e.target.value }))}>
                                    <option value="aktif">Aktif</option>
                                    <option value="gorusuluyor">Görüşülüyor</option>
                                    <option value="pasif">Pasif</option>
                                </Select>
                            </Field>
                        </div>
                        <Field label="Notlar">
                            <Textarea value={irtibatForm.notlar} onChange={e => setIrtibatForm(f => ({ ...f, notlar: e.target.value }))} placeholder="Bu kişi hakkında kısa not..." />
                        </Field>
                        <div className="flex gap-3 pt-2">
                            <button onClick={closeModal} className="flex-1 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">İptal</button>
                            <button onClick={saveIrtibat} disabled={saving}
                                className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60">
                                {saving ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
