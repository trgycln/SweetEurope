'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
    FiActivity, FiUser, FiClock, FiPlus, FiPhone, FiMessageSquare,
    FiUsers, FiFileText, FiClipboard, FiSearch, FiCheckCircle,
    FiSend, FiCalendar, FiEdit3, FiInfo, FiTag, FiAlertTriangle,
    FiCheckSquare, FiAward, FiArrowRight
} from 'react-icons/fi';
import { toast } from 'sonner';

interface Props {
    etkinlikler: any[];
    kisiler?: any[];
    firmaId: string;
    locale: string;
    isPortal?: boolean;
    onAddEtkinlik?: (formData: FormData) => Promise<any>;
}

// SAP Standardı Temas Tipleri
const ETK_CONFIG: Record<string, { label: string; icon: any; emoji: string; bg: string; text: string; border: string; bar: string; hint: string }> = {
    'Telefon Görüşmesi': {
        label: 'Telefon Görüşmesi',
        icon: FiPhone,
        emoji: '📞',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        bar: 'bg-blue-500',
        hint: 'Gelen veya giden telefon araması, sipariş yoklaması.'
    },
    'Toplantı': {
        label: 'Saha / Ziyaret',
        icon: FiUsers,
        emoji: '🤝',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        bar: 'bg-purple-500',
        hint: 'Mekanda yüz yüze görüşme, vitrin veya dolap kontrolü.'
    },
    'Teklif': {
        label: 'Fiyat Teklifi',
        icon: FiClipboard,
        emoji: '📄',
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        bar: 'bg-emerald-500',
        hint: 'Özel fiyat listesi, iskonto şartları veya sözleşme sunumu.'
    },
    'Not': {
        label: 'Kurum İçi Not',
        icon: FiMessageSquare,
        emoji: '📝',
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        bar: 'bg-amber-500',
        hint: 'Firma hakkında ekibin bilmesi gereken genel gözlem veya not.'
    },
    'E-posta': {
        label: 'E-posta / Yazışma',
        icon: FiFileText,
        emoji: '✉️',
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
        bar: 'bg-cyan-500',
        hint: 'Katalog gönderimi, mutabakat veya resmi e-posta.'
    }
};

// SAP Standardı Görüşme Neticeleri (Outcomes)
const SONUC_OPTIONS = [
    { value: 'Sipariş Niyeti', label: '🟢 Olumlu / Sipariş Niyeti', hint: 'Müşteri ürünü beğendi, sipariş oluşturulacak.' },
    { value: 'Takip Gerekiyor', label: '🟡 Tekrar Aranacak / Takip', hint: 'Karar verilmedi, ileri bir tarihte aranacak.' },
    { value: 'Numune Onaylandı', label: '📦 Numune Beğenildi', hint: 'Bırakılan sos/pasta onay aldı, listeye eklenecek.' },
    { value: 'Fiyat İtirazı', label: '🔴 Fiyat Yüksek Bulundu', hint: 'İskonto veya fiyat engeli var, alternatif sunulmalı.' },
    { value: 'Stok Dolu', label: '⏸️ Stok Dolu / İhtiyaç Yok', hint: 'Mevcut stoğu bitince aranacak.' },
    { value: 'Ulaşılamadı', label: '❌ Ulaşılamadı / Cevap Yok', hint: 'Telefon açılmadı veya yetkili yerinde yoktu.' },
];

const HAZIR_SABLONLAR = [
    { baslik: 'Numune Teslimi', tip: 'Toplantı', sonuc: 'Takip Gerekiyor', metin: 'Müşteriye numune ürün seti elden teslim edildi. Tat/lezzet testi sonrası 3 gün içinde aranacak.' },
    { baslik: 'Fiyat Teklifi', tip: 'Teklif', sonuc: 'Takip Gerekiyor', metin: 'Talep ettiği ürün grubu için özel B2B fiyat listesi ve iskonto şartları iletildi.' },
    { baslik: 'Sipariş Teyidi', tip: 'Telefon Görüşmesi', sonuc: 'Sipariş Niyeti', metin: 'Haftalık sipariş ihtiyacı soruldu, yeni parti ürünler hakkında bilgi verildi.' },
    { baslik: 'Geri Arama Randevusu', tip: 'Telefon Görüşmesi', sonuc: 'Takip Gerekiyor', metin: 'Yetkili kişi servisteydi, uygun zamanda tekrar görüşmek üzere not alındı.' },
    { baslik: 'Ödeme Hatırlatması', tip: 'Not', sonuc: 'Takip Gerekiyor', metin: 'Vadesi gelen bakiye hakkında muhasebe yetkilisine bilgi verildi.' }
];

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Az önce';
    if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} gün önce`;
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function FirmaEtkinliklerTab({
    etkinlikler,
    kisiler = [],
    firmaId,
    locale,
    isPortal = false,
    onAddEtkinlik
}: Props) {
    const [isPending, startTransition] = useTransition();
    const [selectedType, setSelectedType] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFormType, setActiveFormType] = useState<string>('Telefon Görüşmesi');
    const [seciliSonuc, setSeciliSonuc] = useState<string>('Sipariş Niyeti');
    const [seciliKisi, setSeciliKisi] = useState<string>('');
    const [takipTarihi, setTakipTarihi] = useState<string>('');
    const [aciklamaText, setAciklamaText] = useState('');

    // Sayım İstatistikleri
    const tipSayilari = useMemo(() => {
        const counts: Record<string, number> = { all: etkinlikler.length };
        etkinlikler.forEach(e => {
            const t = e.etkinlik_tipi || 'Not';
            counts[t] = (counts[t] || 0) + 1;
        });
        return counts;
    }, [etkinlikler]);

    // Filtrelenmiş Etkinlikler
    const filtrelenmisEtkinlikler = useMemo(() => {
        return etkinlikler.filter(e => {
            const matchesType = selectedType === 'all' || e.etkinlik_tipi === selectedType;
            const matchesSearch = !searchTerm.trim() ||
                (e.aciklama || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (e.olusturan_personel?.tam_ad || '').toLowerCase().includes(searchTerm.toLowerCase());
            return matchesType && matchesSearch;
        });
    }, [etkinlikler, selectedType, searchTerm]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!aciklamaText.trim()) {
            toast.error('Lütfen görüşme notu veya açıklama yazın.');
            return;
        }

        // Açıklama metnine görüşülen kişi ve sonucu şık bir şekilde iliştiriyoruz
        let tamAciklama = aciklamaText.trim();
        if (seciliKisi) {
            tamAciklama = `[Yetkili: ${seciliKisi}] ` + tamAciklama;
        }
        if (seciliSonuc) {
            tamAciklama += `\n🎯 Sonuç: ${seciliSonuc}`;
        }
        if (takipTarihi) {
            tamAciklama += ` | 📅 Takip: ${new Date(takipTarihi).toLocaleDateString('tr-TR')}`;
        }

        const formData = new FormData();
        formData.append('etkinlik_tipi', activeFormType);
        formData.append('aciklama', tamAciklama);
        if (takipTarihi) {
            formData.append('takip_tarihi', takipTarihi);
        }

        startTransition(async () => {
            if (onAddEtkinlik) {
                try {
                    await onAddEtkinlik(formData);
                    setAciklamaText('');
                    setTakipTarihi('');
                    toast.success('Etkinlik ve temas kaydı başarıyla oluşturuldu!');
                } catch (err: any) {
                    toast.error(err.message || 'Kayıt başarısız oldu.');
                }
            }
        });
    };

    const handleSablonSec = (sablon: typeof HAZIR_SABLONLAR[0]) => {
        setActiveFormType(sablon.tip);
        setSeciliSonuc(sablon.sonuc);
        setAciklamaText(sablon.metin);
        toast.info(`"${sablon.baslik}" şablonu yüklendi.`);
    };

    return (
        <div className="space-y-6">
            {/* ── 1. ÜST SAP / CRM TEMAS KPI BAR ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1.5">
                        <span>Toplam Temas</span>
                        <FiActivity className="text-blue-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{etkinlikler.length}</p>
                    <p className="text-xs text-slate-500 mt-1">Kayıtlı etkileşim</p>
                </div>

                <div className="bg-white border border-blue-200/90 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-blue-50/40 to-white">
                    <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                        <span>Telefon Aramaları</span>
                        <FiPhone className="text-blue-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{tipSayilari['Telefon Görüşmesi'] || 0}</p>
                    <p className="text-xs text-blue-700 mt-1">Sesli arama & takip</p>
                </div>

                <div className="bg-white border border-purple-200/90 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-purple-50/40 to-white">
                    <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                        <span>Saha Ziyaretleri</span>
                        <FiUsers className="text-purple-600" size={16} />
                    </div>
                    <p className="text-2xl font-bold text-purple-900">{tipSayilari['Toplantı'] || 0}</p>
                    <p className="text-xs text-purple-700 mt-1">Yüz yüze / tadım</p>
                </div>

                <div className="bg-white border border-emerald-200/90 rounded-2xl p-4 shadow-xs bg-gradient-to-br from-emerald-50/40 to-white">
                    <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1.5">
                        <span>Son Temas Zamanı</span>
                        <FiClock className="text-emerald-600" size={16} />
                    </div>
                    <p className="text-base font-bold text-emerald-900 truncate">
                        {etkinlikler.length > 0 ? timeAgo(etkinlikler[0]?.created_at) : 'Kayıt Yok'}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">Hafıza güncelliği</p>
                </div>
            </div>

            {/* ── 2. ANA DÜZEN: SOLDA SAP TEMAS KONSOLU | SAĞDA ZAMAN ÇİZELGESİ ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── SOL (5 Kolon): HIZLI EKLEME KONSOLU & DOLDURMA YARDIMCILARI ── */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiEdit3 className="text-blue-600" /> Yeni Müşteri Teması Kaydet
                            </h3>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Canlı CRM
                            </span>
                        </div>

                        {/* Temas Türü Seçimi */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                Temas Türü
                                <span className="text-slate-400 font-normal cursor-help" title="Müşteriyle nasıl iletişim kurulduğunu seçiniz.">ℹ️</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(ETK_CONFIG).map(([key, cfg]) => {
                                    const isSelected = activeFormType === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setActiveFormType(key)}
                                            title={cfg.hint}
                                            className={`flex items-center justify-start gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left ${
                                                isSelected
                                                    ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-blue-500/20 shadow-2xs`
                                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                            }`}
                                        >
                                            <span className="text-base">{cfg.emoji}</span>
                                            <span className="truncate">{cfg.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Hızlı Şablonlar */}
                        <div className="space-y-1.5 pt-1">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                ⚡ Hızlı Şablon Yükle
                                <span className="text-slate-400 font-normal cursor-help" title="Sık kullanılan temas senaryolarını tek tıkla forma doldurur.">ℹ️</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {HAZIR_SABLONLAR.map((s, idx) => (
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

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-100">
                            {/* Kiminle Görüşüldü? (İlgili Kişiler Entegrasyonu) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    Görüşülen Yetkili Kişi
                                    <span className="text-slate-400 font-normal cursor-help" title="İlgili Kişiler sekmesindeki kayıtlı yetkililerden seçebilir veya boş bırakabilirsiniz.">ℹ️</span>
                                </label>
                                {kisiler.length > 0 ? (
                                    <select
                                        value={seciliKisi}
                                        onChange={(e) => setSeciliKisi(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                                    >
                                        <option value="">-- Firma Yetkilisi Seçin --</option>
                                        {kisiler.map((k: any) => (
                                            <option key={k.id} value={`${k.ad_soyad} (${k.unvan || 'Yetkili'})`}>
                                                👤 {k.ad_soyad} {k.unvan ? `— ${k.unvan}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={seciliKisi}
                                        onChange={(e) => setSeciliKisi(e.target.value)}
                                        placeholder="Yetkili adı veya unvanı (örn: Satın Alma Müdürü)"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                                    />
                                )}
                            </div>

                            {/* Temasın Sonucu (Outcome) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    Görüşmenin Neticesi (Sonuç)
                                    <span className="text-slate-400 font-normal cursor-help" title="SAP CRM Standardı: Temasın müşteride nasıl bir sonuç doğurduğunu seçiniz.">ℹ️</span>
                                </label>
                                <select
                                    value={seciliSonuc}
                                    onChange={(e) => setSeciliSonuc(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                                >
                                    {SONUC_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Açıklama & Not */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    Görüşme Notu / Detaylar *
                                    <span className="text-slate-400 font-normal cursor-help" title="Görüşülen konu, verilen sözler, müşteri reaksiyonu veya sonraki adım notları.">ℹ️</span>
                                </label>
                                <textarea
                                    value={aciklamaText}
                                    onChange={(e) => setAciklamaText(e.target.value)}
                                    rows={4}
                                    placeholder="Örn: Yeni Antep Fıstıklı Dolgu kreması tanıtıldı, fiyat teklifi istendi..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs leading-relaxed text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                                    required
                                />
                            </div>

                            {/* Sonraki Takip Tarihi (Görevler Entegrasyonu) */}
                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5">
                                <label className="block text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <FiCalendar size={13} className="text-amber-600" /> Sonraki Takip Tarihi (Opsiyonel)
                                    <span className="text-amber-700/70 font-normal cursor-help" title="Tarih seçildiğinde Görevler sekmesine otomatik takip görevi eklenir.">ℹ️</span>
                                </label>
                                <input
                                    type="date"
                                    value={takipTarihi}
                                    onChange={(e) => setTakipTarihi(e.target.value)}
                                    className="w-full bg-white border border-amber-200 rounded-lg p-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isPending || !aciklamaText.trim()}
                                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                            >
                                {isPending ? (
                                    <span>Kaydediliyor...</span>
                                ) : (
                                    <>
                                        <FiSend size={14} /> Temas Kaydını Tamamla
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* ── SAĞ (7 Kolon): ZAMAN ÇİZELGESİ & ARAMA ── */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Arama & Tip Filtre Çubuğu */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                        <div className="relative">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Görüşme notu, personel veya yetkili ara..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white focus:outline-none transition"
                            />
                        </div>

                        {/* Filtre Sekmeleri */}
                        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedType('all')}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                    selectedType === 'all'
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                                Tümü ({tipSayilari['all'] || 0})
                            </button>
                            {Object.entries(ETK_CONFIG).map(([key, cfg]) => {
                                const count = tipSayilari[key] || 0;
                                const isSelected = selectedType === key;
                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setSelectedType(key)}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                                            isSelected
                                                ? `${cfg.bg} ${cfg.text} ring-2 ring-blue-500/30 font-bold shadow-2xs`
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                        }`}
                                    >
                                        <span>{cfg.emoji}</span>
                                        <span>{cfg.label}</span>
                                        <span className="text-[11px] opacity-70">({count})</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Akış Listesi */}
                    {filtrelenmisEtkinlikler.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                                <FiActivity />
                            </div>
                            <h4 className="text-sm font-bold text-slate-800">Kayıtlı Temas Bulunamadı</h4>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                                {searchTerm
                                    ? 'Arama kriterinize uygun bir görüşme veya not bulunamadı.'
                                    : 'Bu firmayla henüz bir görüşme veya ziyaret kaydı oluşturulmamış. Soldaki panelden ilk teması hemen kaydedebilirsiniz.'}
                            </p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                            {filtrelenmisEtkinlikler.map((etk: any) => {
                                const cfg = ETK_CONFIG[etk.etkinlik_tipi] || ETK_CONFIG['Not'];
                                return (
                                    <div key={etk.id} className="relative group">
                                        {/* Timeline İkon Noktası */}
                                        <div className={`absolute -left-6 top-3 w-5 h-5 rounded-full border-2 border-white shadow-xs flex items-center justify-center text-[10px] ${cfg.bar}`}>
                                            <span className="text-white text-[9px] font-bold">●</span>
                                        </div>

                                        {/* Kart */}
                                        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-2.5">
                                            {/* Kart Üst Barı */}
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
                                                        <span>{cfg.emoji}</span> {cfg.label}
                                                    </span>

                                                    {etk.olusturan_personel?.tam_ad && (
                                                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                                                            <FiUser size={12} className="text-slate-400" />
                                                            {etk.olusturan_personel.tam_ad}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                                                    <FiClock size={12} />
                                                    <span>{timeAgo(etk.created_at)}</span>
                                                    {etk.created_at && (
                                                        <span className="text-slate-300">
                                                            · {new Date(etk.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Açıklama Metni */}
                                            <p className="text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-wrap pt-0.5">
                                                {etk.aciklama}
                                            </p>
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
