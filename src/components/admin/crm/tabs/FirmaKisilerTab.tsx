'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
    FiUsers, FiUserPlus, FiPhone, FiMail, FiTrash2, FiSearch,
    FiCheckCircle, FiStar, FiSend, FiMessageCircle, FiEdit2,
    FiInfo, FiBriefcase, FiSmartphone
} from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'sonner';

interface Props {
    kisiler: any[];
    firmaId: string;
    locale: string;
    isPortal?: boolean;
    onAddKisi?: (formData: FormData) => Promise<any>;
    onDeleteKisi?: (kisiId: string) => Promise<any>;
}

const UNVAN_SUGGESTIONS = [
    'İşletme Sahibi / Kurucu',
    'Genel Müdür / Şube Müdürü',
    'Satın Alma Sorumlusu',
    'Baş Barista / Barista',
    'Mutfak Şefi / Konditor',
    'Muhasebe / Finans',
    'Servis Müdürü'
];

export function FirmaKisilerTab({
    kisiler,
    firmaId,
    locale,
    isPortal = false,
    onAddKisi,
    onDeleteKisi
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [adSoyad, setAdSoyad] = useState('');
    const [unvan, setUnvan] = useState('');
    const [telefon, setTelefon] = useState('');
    const [email, setEmail] = useState('');
    const [birincilYetkili, setBirincilYetkili] = useState(false);
    const [notlar, setNotlar] = useState('');

    const filtrelenmisKisiler = useMemo(() => {
        return kisiler.filter(k => {
            const matchesSearch = !searchTerm.trim() ||
                (k.ad_soyad || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (k.unvan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (k.telefon || '').includes(searchTerm) ||
                (k.email || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [kisiler, searchTerm]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!adSoyad.trim()) {
            toast.error('Lütfen yetkili kişinin Ad ve Soyadını yazın.');
            return;
        }

        const formData = new FormData();
        formData.append('ad_soyad', adSoyad.trim());
        formData.append('unvan', unvan.trim());
        formData.append('telefon', telefon.trim());
        formData.append('email', email.trim());
        formData.append('birincil_yetkili', birincilYetkili ? 'true' : 'false');
        formData.append('notlar', notlar.trim());

        startTransition(async () => {
            if (onAddKisi) {
                try {
                    await onAddKisi(formData);
                    setAdSoyad('');
                    setUnvan('');
                    setTelefon('');
                    setEmail('');
                    setBirincilYetkili(false);
                    setNotlar('');
                    toast.success('Yeni yetkili kişi başarıyla eklendi!');
                } catch (err: any) {
                    toast.error(err.message || 'Kişi eklenirken hata oluştu.');
                }
            }
        });
    };

    const handleDelete = (id: string, ad: string) => {
        if (!confirm(`"${ad}" kişisini silmek istediğinizden emin misiniz?`)) return;
        startTransition(async () => {
            if (onDeleteKisi) {
                try {
                    await onDeleteKisi(id);
                    toast.success('Yetkili kişi silindi.');
                } catch (err: any) {
                    toast.error(err.message || 'Silme başarısız oldu.');
                }
            }
        });
    };

    return (
        <div className="space-y-6">
            {/* ── 1. ÜST İSTATİSTİK & ARAMA ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Kayıtlı Yetkililer</span>
                        <FiUsers className="text-purple-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{kisiler.length}</p>
                    <p className="text-xs text-slate-500 mt-1">İletişim muhatabı</p>
                </div>

                <div className="bg-white border border-amber-200/80 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-amber-50/40 to-white">
                    <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Karar Verici (Birincil)</span>
                        <FiStar className="text-amber-500" size={16} />
                    </div>
                    <p className="text-lg font-bold text-amber-950 truncate">
                        {kisiler.find(k => k.birincil_yetkili)?.ad_soyad || 'Belirlenmedi'}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">Ana muhatap</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-center">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Yetkili adı, unvan, tel veya e-posta ara..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition"
                        />
                    </div>
                </div>
            </div>

            {/* ── 2. ANA DÜZEN: SOLDA YENİ KİŞİ FORMU | SAĞDA KARTVİZİT LİSTESİ ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── SOL (5 Kolon): YENİ KİŞİ EKLEME FORMU & DOLDURMA YARDIMCILARI ── */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiUserPlus className="text-purple-600" /> Yeni İlgili Kişi & Yetkili Ekle
                            </h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                Kartvizit
                            </span>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3.5">
                            {/* Ad Soyad */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    Ad Soyad *
                                    <span className="text-slate-400 font-normal cursor-help" title="Yetkili kişinin tam adı ve soyadı.">ℹ️</span>
                                </label>
                                <input
                                    type="text"
                                    value={adSoyad}
                                    onChange={(e) => setAdSoyad(e.target.value)}
                                    placeholder="örn: Mehmet Yılmaz"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition"
                                    required
                                />
                            </div>

                            {/* Unvan / Pozisyon */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    Pozisyon / Unvan
                                    <span className="text-slate-400 font-normal cursor-help" title="İşletmedeki görevi veya karar yetkisi alanı.">ℹ️</span>
                                </label>
                                <input
                                    type="text"
                                    value={unvan}
                                    onChange={(e) => setUnvan(e.target.value)}
                                    placeholder="örn: Satın Alma Müdürü, Baş Barista"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition"
                                />
                                {/* Hızlı Unvan Önerileri */}
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                    {UNVAN_SUGGESTIONS.slice(0, 4).map(u => (
                                        <button
                                            key={u}
                                            type="button"
                                            onClick={() => setUnvan(u)}
                                            className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 transition"
                                        >
                                            + {u}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Telefon & E-posta */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        Telefon / Cep
                                        <span className="text-slate-400 font-normal cursor-help" title="WhatsApp veya sesli arama için doğrudan telefon numarası.">ℹ️</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={telefon}
                                        onChange={(e) => setTelefon(e.target.value)}
                                        placeholder="+49 170 1234567"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        E-Posta
                                        <span className="text-slate-400 font-normal cursor-help" title="Teklif ve resmi yazışmalar için e-posta adresi.">ℹ️</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="yetkili@firma.de"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-none transition"
                                    />
                                </div>
                            </div>

                            {/* Birincil Karar Verici Checkbox */}
                            <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200/80 flex items-center gap-2.5">
                                <input
                                    id="birincil_yetkili"
                                    type="checkbox"
                                    checked={birincilYetkili}
                                    onChange={(e) => setBirincilYetkili(e.target.checked)}
                                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300"
                                />
                                <label htmlFor="birincil_yetkili" className="text-xs font-bold text-purple-900 cursor-pointer">
                                    ⭐ Bu kişi firmanın ana karar vericisidir (Birincil Yetkili)
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isPending || !adSoyad.trim()}
                                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                {isPending ? (
                                    <span>Kaydediliyor...</span>
                                ) : (
                                    <>
                                        <FiUserPlus size={14} /> Yetkiliyi Kaydet
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── SAĞ (7 Kolon): KARTVİZİT KARTLARI & HIZLI AKSİYONLAR ── */}
                <div className="lg:col-span-7 space-y-4">
                    {filtrelenmisKisiler.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto text-xl">
                                <FiUsers />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Kayıtlı Yetkili Bulunamadı</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                {searchTerm
                                    ? 'Arama kriterinize uygun yetkili bulunamadı.'
                                    : 'Bu firmaya henüz bir yetkili kişi veya karar verici eklenmemiş. Soldaki panelden hemen ilk yetkiliyi kaydedebilirsiniz.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {filtrelenmisKisiler.map((k: any) => {
                                const cleanPhone = (k.telefon || '').replace(/[^\d+]/g, '');
                                return (
                                    <div
                                        key={k.id}
                                        className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs hover:shadow-sm space-y-3 relative ${
                                            k.birincil_yetkili
                                                ? 'border-purple-300 ring-2 ring-purple-500/10'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        {/* Üst Başlık & Avatar */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
                                                    {(k.ad_soyad || '?')[0].toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h4 className="text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                                                        {k.ad_soyad}
                                                        {k.birincil_yetkili && (
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-0.5" title="Birincil Karar Verici">
                                                                <FiStar size={10} className="fill-amber-500 text-amber-500" /> Ana Yetkili
                                                            </span>
                                                        )}
                                                    </h4>
                                                    <p className="text-xs text-slate-500 font-medium truncate">{k.unvan || 'Firma Yetkilisi'}</p>
                                                </div>
                                            </div>

                                            {/* Sil Butonu */}
                                            {onDeleteKisi && (
                                                <button
                                                    onClick={() => handleDelete(k.id, k.ad_soyad)}
                                                    className="text-slate-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition"
                                                    title="Yetkiliyi Sil"
                                                >
                                                    <FiTrash2 size={13} />
                                                </button>
                                            )}
                                        </div>

                                        {/* İletişim Bilgileri */}
                                        <div className="space-y-1.5 text-xs text-slate-700 pt-1 border-t border-slate-100">
                                            {k.telefon ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 font-medium">Telefon:</span>
                                                    <a href={`tel:${k.telefon}`} className="font-mono font-semibold text-blue-600 hover:underline">
                                                        {k.telefon}
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="text-slate-400 italic text-[11px]">Telefon girilmemiş</div>
                                            )}

                                            {k.email ? (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 font-medium">E-posta:</span>
                                                    <a href={`mailto:${k.email}`} className="text-blue-600 hover:underline truncate max-w-[170px]">
                                                        {k.email}
                                                    </a>
                                                </div>
                                            ) : (
                                                <div className="text-slate-400 italic text-[11px]">E-posta girilmemiş</div>
                                            )}
                                        </div>

                                        {/* Hızlı Aksiyon Butonları (Ara / WhatsApp / Mail) */}
                                        <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                                            {k.telefon ? (
                                                <>
                                                    <a
                                                        href={`tel:${k.telefon}`}
                                                        className="flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition"
                                                        title="Telefonla Ara"
                                                    >
                                                        <FiPhone size={12} /> Ara
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center justify-center gap-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition"
                                                        title="WhatsApp Mesajı Gönder"
                                                    >
                                                        <FaWhatsapp size={13} /> WhatsApp
                                                    </a>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="py-1.5 bg-slate-50 text-slate-300 rounded-lg text-center text-xs">Ara</span>
                                                    <span className="py-1.5 bg-slate-50 text-slate-300 rounded-lg text-center text-xs">WhatsApp</span>
                                                </>
                                            )}

                                            {k.email ? (
                                                <a
                                                    href={`mailto:${k.email}`}
                                                    className="flex items-center justify-center gap-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition"
                                                    title="E-posta Gönder"
                                                >
                                                    <FiMail size={12} /> E-Posta
                                                </a>
                                            ) : (
                                                <span className="py-1.5 bg-slate-50 text-slate-300 rounded-lg text-center text-xs">E-Posta</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
