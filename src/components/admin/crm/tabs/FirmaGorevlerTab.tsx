'use client';

import React, { useState, useTransition, useMemo } from 'react';
import {
    FiCheckSquare, FiPlus, FiCalendar, FiAlertCircle, FiCheck,
    FiSearch, FiClock, FiAlertTriangle, FiFlag, FiTrash2,
    FiSend, FiUser, FiInfo
} from 'react-icons/fi';
import { toast } from 'sonner';

interface Props {
    gorevler: any[];
    firmaId: string;
    locale: string;
    isPortal?: boolean;
    onAddGorev?: (formData: FormData) => Promise<any>;
    onToggleGorev?: (gorevId: string, currentStatus: boolean) => Promise<any>;
    onDeleteGorev?: (gorevId: string) => Promise<any>;
}

const ONCELIK_OPTIONS = [
    { value: 'Yüksek', label: '🔴 Yüksek Öncelik / Acil', color: 'bg-red-100 text-red-700 border-red-200' },
    { value: 'Orta', label: '🟡 Normal / Orta Öncelik', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { value: 'Düşük', label: '🟢 Düşük Öncelik / Rutin', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const HAZIR_GOREVLER = [
    { baslik: 'Numune Sonrası Arama', oncelik: 'Yüksek', aciklama: 'Bırakılan numune setinin tadım sonucunu sormak için ara.' },
    { baslik: 'Fiyat Teklifi Takibi', oncelik: 'Orta', aciklama: 'İletilen özel iskonto ve fiyat listesi hakkında kararını sor.' },
    { baslik: 'Sözleşme & Evrak Teslimi', oncelik: 'Orta', aciklama: 'Islak imzalı bayilik/satış sözleşmesini teslim al.' },
    { baslik: 'Tahsilat / Fatura Hatırlatması', oncelik: 'Yüksek', aciklama: 'Vadesi gelen bakiye için muhasebe ile görüş.' },
    { baslik: 'Aylık Rutin Ziyaret', oncelik: 'Düşük', aciklama: 'Mekanı ziyaret et, vitrin ve stok durumunu kontrol et.' }
];

export function FirmaGorevlerTab({
    gorevler,
    firmaId,
    locale,
    isPortal = false,
    onAddGorev,
    onToggleGorev,
    onDeleteGorev
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('pending');
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [baslik, setBaslik] = useState('');
    const [aciklama, setAciklama] = useState('');
    const [sonTarih, setSonTarih] = useState('');
    const [oncelik, setOncelik] = useState('Orta');

    const acikGorevler = useMemo(() => gorevler.filter(g => !g.tamamlandi), [gorevler]);
    const tamamlananGorevler = useMemo(() => gorevler.filter(g => g.tamamlandi), [gorevler]);

    // Gecikmiş Görevler (Bugünden önce son tarihi olan ve tamamlanmamış)
    const bugunStr = new Date().toISOString().split('T')[0];
    const gecikmisSayisi = useMemo(() => {
        return acikGorevler.filter(g => g.son_tarih && g.son_tarih < bugunStr).length;
    }, [acikGorevler, bugunStr]);

    const filtrelenmisGorevler = useMemo(() => {
        return gorevler.filter(g => {
            const matchesStatus =
                filterStatus === 'all' ||
                (filterStatus === 'pending' && !g.tamamlandi) ||
                (filterStatus === 'completed' && g.tamamlandi);

            const matchesSearch = !searchTerm.trim() ||
                (g.baslik || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (g.aciklama || '').toLowerCase().includes(searchTerm.toLowerCase());

            return matchesStatus && matchesSearch;
        });
    }, [gorevler, filterStatus, searchTerm]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!baslik.trim()) {
            toast.error('Lütfen görev başlığı yazın.');
            return;
        }

        const formData = new FormData();
        formData.append('baslik', baslik.trim());
        formData.append('aciklama', aciklama.trim());
        formData.append('son_tarih', sonTarih);
        formData.append('oncelik', oncelik);

        startTransition(async () => {
            if (onAddGorev) {
                try {
                    await onAddGorev(formData);
                    setBaslik('');
                    setAciklama('');
                    setSonTarih('');
                    setOncelik('Orta');
                    toast.success('Yeni görev başarıyla oluşturuldu!');
                } catch (err: any) {
                    toast.error(err.message || 'Görev oluşturulamadı.');
                }
            }
        });
    };

    const handleToggle = (id: string, currentStatus: boolean) => {
        startTransition(async () => {
            if (onToggleGorev) {
                try {
                    await onToggleGorev(id, currentStatus);
                    toast.success(currentStatus ? 'Görev tekrar açıldı.' : '✓ Görev tamamlandı!');
                } catch (err: any) {
                    toast.error(err.message || 'Durum güncellenemedi.');
                }
            }
        });
    };

    const handleDelete = (id: string, gorevBaslik: string) => {
        if (!confirm(`"${gorevBaslik}" görevini silmek istediğinizden emin misiniz?`)) return;
        startTransition(async () => {
            if (onDeleteGorev) {
                try {
                    await onDeleteGorev(id);
                    toast.success('Görev silindi.');
                } catch (err: any) {
                    toast.error(err.message || 'Silme başarısız oldu.');
                }
            }
        });
    };

    const handleSablonSec = (sablon: typeof HAZIR_GOREVLER[0]) => {
        setBaslik(sablon.baslik);
        setOncelik(sablon.oncelik);
        setAciklama(sablon.aciklama);
        toast.info(`"${sablon.baslik}" şablonu yüklendi.`);
    };

    return (
        <div className="space-y-6">
            {/* ── 1. ÜST İSTATİSTİK & KPI BAR ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Açık Görevler</span>
                        <FiClock className="text-teal-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-teal-900">{acikGorevler.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Bekleyen aksiyon</p>
                </div>

                <div className="bg-white border border-red-200/80 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-red-50/40 to-white">
                    <div className="flex items-center justify-between text-red-700 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Gecikmiş Takipler</span>
                        <FiAlertTriangle className="text-red-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-red-900">{gecikmisSayisi}</p>
                    <p className="text-xs text-red-700 mt-1">Süresi geçen</p>
                </div>

                <div className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-emerald-50/40 to-white">
                    <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
                        <span>Tamamlananlar</span>
                        <FiCheck className="text-emerald-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">{tamamlananGorevler.length}</p>
                    <p className="text-xs text-emerald-700 mt-1">Bitirilen iş</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-center">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Görev veya açıklama ara..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                        />
                    </div>
                </div>
            </div>

            {/* ── 2. ANA DÜZEN: SOLDA YENİ GÖREV FORMU | SAĞDA GÖREV LİSTESİ ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── SOL (5 Kolon): YENİ GÖREV FORMU & DOLDURMA YARDIMCILARI ── */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiCheckSquare className="text-teal-600" /> Yeni Görev & Hatırlatma Oluştur
                            </h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                                Aksiyon
                            </span>
                        </div>

                        {/* Hızlı Şablonlar */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                ⚡ Hızlı Görev Şablonu
                                <span className="text-slate-400 font-normal cursor-help" title="Sık kullanılan CRM görevlerini tek tıkla forma aktarır.">ℹ️</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {HAZIR_GOREVLER.map((s, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleSablonSec(s)}
                                        className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition border border-slate-200"
                                    >
                                        + {s.baslik}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 border-t border-slate-100">
                            {/* Görev Başlığı */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    Görev Başlığı *
                                    <span className="text-slate-400 font-normal cursor-help" title="Yapılacak aksiyonun kısa ve net tanımı.">ℹ️</span>
                                </label>
                                <input
                                    type="text"
                                    value={baslik}
                                    onChange={(e) => setBaslik(e.target.value)}
                                    placeholder="örn: Numune tadım sonucu için Ahmet Bey'i ara"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                                    required
                                />
                            </div>

                            {/* Öncelik & Son Tarih */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        Öncelik Seviyesi
                                        <span className="text-slate-400 font-normal cursor-help" title="Görevin aciliyet durumu.">ℹ️</span>
                                    </label>
                                    <select
                                        value={oncelik}
                                        onChange={(e) => setOncelik(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                                    >
                                        {ONCELIK_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        Son Tarih (Termin)
                                        <span className="text-slate-400 font-normal cursor-help" title="Görevin en geç hangi tarihe kadar tamamlanması gerektiği.">ℹ️</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={sonTarih}
                                        onChange={(e) => setSonTarih(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                                    />
                                </div>
                            </div>

                            {/* Açıklama / Not */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                    Detaylı Not / Açıklama
                                    <span className="text-slate-400 font-normal cursor-help" title="Görüşülecek maddeler veya hatırlanması gereken ek detaylar.">ℹ️</span>
                                </label>
                                <textarea
                                    value={aciklama}
                                    onChange={(e) => setAciklama(e.target.value)}
                                    rows={3}
                                    placeholder="Gerekli detayları veya hazırlıkları buraya yazın..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white focus:outline-none transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPending || !baslik.trim()}
                                className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                {isPending ? (
                                    <span>Kaydediliyor...</span>
                                ) : (
                                    <>
                                        <FiPlus size={14} /> Görevi Kaydet
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── SAĞ (7 Kolon): GÖREV LİSTESİ & CHECKBOX AKSİYONLARI ── */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Filtre Sekmeleri */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-xs flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setFilterStatus('pending')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    filterStatus === 'pending'
                                        ? 'bg-teal-700 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Açık Görevler ({acikGorevler.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('completed')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    filterStatus === 'completed'
                                        ? 'bg-emerald-700 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Tamamlananlar ({tamamlananGorevler.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilterStatus('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    filterStatus === 'all'
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Tümü ({gorevler.length})
                            </button>
                        </div>
                    </div>

                    {/* Görev Kartları */}
                    {filtrelenmisGorevler.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto text-xl">
                                <FiCheckSquare />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Görev Bulunamadı</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                {searchTerm
                                    ? 'Arama kriterinize uygun görev bulunamadı.'
                                    : 'Bu listede bekleyen görev bulunmuyor. Soldaki panelden yeni bir görev veya takip oluşturabilirsiniz.'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtrelenmisGorevler.map((g: any) => {
                                const isGecikmis = !g.tamamlandi && g.son_tarih && g.son_tarih < bugunStr;
                                return (
                                    <div
                                        key={g.id}
                                        className={`bg-white rounded-2xl p-4 border transition-all shadow-2xs hover:shadow-xs flex items-start gap-3.5 ${
                                            g.tamamlandi
                                                ? 'opacity-60 bg-slate-50/60 border-slate-200'
                                                : isGecikmis
                                                ? 'border-red-300 ring-2 ring-red-500/10'
                                                : 'border-slate-200'
                                        }`}
                                    >
                                        {/* Checkbox (Tamamla) */}
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(g.id, g.tamamlandi)}
                                            className={`w-6 h-6 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 transition ${
                                                g.tamamlandi
                                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                                    : 'border-slate-300 hover:border-teal-500 bg-slate-50'
                                            }`}
                                            title={g.tamamlandi ? 'Tekrar aç' : 'Görevi tamamla'}
                                        >
                                            {g.tamamlandi && <FiCheck size={14} />}
                                        </button>

                                        {/* Görev İçeriği */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <h4 className={`text-sm font-bold text-slate-900 ${g.tamamlandi ? 'line-through text-slate-500' : ''}`}>
                                                    {g.baslik}
                                                </h4>

                                                <div className="flex items-center gap-1.5">
                                                    {g.oncelik && (
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                            g.oncelik === 'Yüksek' || g.oncelik === 'Acil'
                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                : g.oncelik === 'Orta'
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                : 'bg-slate-50 text-slate-700 border-slate-200'
                                                        }`}>
                                                            {g.oncelik}
                                                        </span>
                                                    )}

                                                    {onDeleteGorev && (
                                                        <button
                                                            onClick={() => handleDelete(g.id, g.baslik)}
                                                            className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition"
                                                            title="Görevi Sil"
                                                        >
                                                            <FiTrash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {g.aciklama && (
                                                <p className="text-xs text-slate-600 leading-relaxed pt-0.5">
                                                    {g.aciklama}
                                                </p>
                                            )}

                                            {/* Son Tarih & Durum */}
                                            <div className="flex items-center gap-3 pt-1.5 text-xs text-slate-500">
                                                {g.son_tarih ? (
                                                    <span className={`flex items-center gap-1 font-semibold ${isGecikmis ? 'text-red-600' : 'text-slate-600'}`}>
                                                        <FiCalendar size={12} />
                                                        {new Date(g.son_tarih).toLocaleDateString('tr-TR')}
                                                        {isGecikmis && ' (Gecikti!)'}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px]">Tarih belirtilmedi</span>
                                                )}

                                                {g.atanan_kullanici?.tam_ad && (
                                                    <span className="flex items-center gap-1 text-slate-500">
                                                        <FiUser size={11} /> Sorumlu: {g.atanan_kullanici.tam_ad}
                                                    </span>
                                                )}
                                            </div>
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
