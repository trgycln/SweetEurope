// src/app/[locale]/admin/crm/firmalar/[firmaId]/siparisler/yeni/YeniSiparisFormu.tsx
'use client';

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { topluSiparisOlusturAction } from "@/app/actions/siparis-actions";
import { toast } from "sonner";
import {
    FiPlus,
    FiMinus,
    FiTrash2,
    FiSend,
    FiLoader,
    FiSearch,
    FiPackage,
    FiStar,
    FiClock,
    FiShoppingBag,
    FiRefreshCw,
    FiX,
    FiGrid,
    FiList,
    FiCalendar,
    FiChevronDown,
    FiChevronUp,
    FiCheckCircle
} from "react-icons/fi";
import { getLocalizedName, formatCurrency } from "@/lib/utils";
import { Locale } from "@/i18n-config";

export type ProductItem = {
    id: string;
    ad: any;
    satis_fiyati_musteri: number | null;
    satis_fiyati_alt_bayi?: number | null;
    satis_fiyati_toptanci?: number | null;
    stok_miktari?: number | null;
    stok_kodu?: string | null;
    ean_gtin?: string | null;
    ana_resim_url?: string | null;
    kategori_id?: string | null;
    koli_ici_adet?: number | null;
};

export type CategoryItem = {
    id: string;
    ad: any;
    ust_kategori_id?: string | null;
};

export type PastOrder = {
    id: string;
    siparis_no?: string | null;
    siparis_tarihi: string | null;
    toplam_tutar_brut: number | null;
    siparis_durumu: string | null;
    siparis_detay?: {
        id: string;
        urun_id: string;
        miktar: number;
        birim_fiyat: number;
        toplam_fiyat: number;
    }[];
};

interface YeniSiparisFormuProps {
    firmaId: string;
    firma?: { id: string; unvan: string; adres: string | null; email?: string | null; telefon?: string | null; sehir?: string | null } | null;
    varsayilanTeslimatAdresi: string;
    urunler: ProductItem[];
    kategoriler: CategoryItem[];
    favoriUrunIdSet: string[];
    sikSiparisUrunIdleri: string[];
    sonSiparisUrunIdleri: string[];
    pastOrders: PastOrder[];
    firmenListe?: any;
    locale?: Locale;
}

type SepetUrunu = {
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
    urun_adi: string;
    stok_kodu?: string | null;
    ana_resim_url?: string | null;
    max_stok?: number | null;
    is_on_siparis: boolean;
};

type TabType = 'all' | 'frequent' | 'recent' | 'favorites';
type CartViewTab = 'all' | 'instock' | 'preorder';

export default function YeniSiparisFormu({
    firmaId,
    firma,
    varsayilanTeslimatAdresi,
    urunler,
    kategoriler = [],
    favoriUrunIdSet = [],
    sikSiparisUrunIdleri = [],
    sonSiparisUrunIdleri = [],
    pastOrders = [],
    firmenListe,
    locale = 'tr',
}: YeniSiparisFormuProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // Sepet ve form durumları
    const [sepet, setSepet] = useState<SepetUrunu[]>([]);
    const [teslimatAdresi, setTeslimatAdresi] = useState(varsayilanTeslimatAdresi);
    const [seciliFirmaId, setSeciliFirmaId] = useState<string>(firmaId);
    const [cartViewTab, setCartViewTab] = useState<CartViewTab>('all');

    // Filtreleme ve arama durumları
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [onlyInStock, setOnlyInStock] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

    // Geçmiş siparişler paneli
    const [showPastOrders, setShowPastOrders] = useState(false);

    // Ürün kartı için geçici adet durumu { [urunId]: number }
    const [eklemeAdetleri, setEklemeAdetleri] = useState<Record<string, number>>({});

    // Kategori isim haritası
    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        kategoriler.forEach(k => {
            map.set(k.id, getLocalizedName(k.ad, locale));
        });
        return map;
    }, [kategoriler, locale]);

    // Ürün listesini tab'a göre filtreleme
    const tabFilteredUrunler = useMemo(() => {
        switch (activeTab) {
            case 'frequent':
                return urunler.filter(u => sikSiparisUrunIdleri.includes(u.id));
            case 'recent':
                return urunler.filter(u => sonSiparisUrunIdleri.includes(u.id));
            case 'favorites':
                return urunler.filter(u => favoriUrunIdSet.includes(u.id));
            case 'all':
            default:
                return urunler;
        }
    }, [activeTab, urunler, sikSiparisUrunIdleri, sonSiparisUrunIdleri, favoriUrunIdSet]);

    // Arama, kategori ve stok filtreleri
    const filtrelenmisUrunler = useMemo(() => {
        return tabFilteredUrunler.filter(urun => {
            // Kategori filtresi
            if (selectedCategory !== 'all' && urun.kategori_id !== selectedCategory) {
                return false;
            }

            // Sadece stokta olanlar
            if (onlyInStock && (urun.stok_miktari === null || urun.stok_miktari === undefined || urun.stok_miktari <= 0)) {
                return false;
            }

            // Arama filtresi
            if (searchTerm.trim() !== '') {
                const term = searchTerm.toLowerCase().trim();
                const trName = (urun.ad?.tr || '').toLowerCase();
                const deName = (urun.ad?.de || '').toLowerCase();
                const enName = (urun.ad?.en || '').toLowerCase();
                const sku = (urun.stok_kodu || '').toLowerCase();
                const barcode = (urun.ean_gtin || '').toLowerCase();

                const matchesName = trName.includes(term) || deName.includes(term) || enName.includes(term);
                const matchesSku = sku.includes(term);
                const matchesBarcode = barcode.includes(term);

                if (!matchesName && !matchesSku && !matchesBarcode) {
                    return false;
                }
            }

            return true;
        });
    }, [tabFilteredUrunler, selectedCategory, onlyInStock, searchTerm]);

    // Sepet ayrışımları
    const hazirUrunler = useMemo(() => sepet.filter(i => !i.is_on_siparis), [sepet]);
    const onSiparisUrunler = useMemo(() => sepet.filter(i => i.is_on_siparis), [sepet]);

    const goruntulenenSepetUrunleri = useMemo(() => {
        if (cartViewTab === 'instock') return hazirUrunler;
        if (cartViewTab === 'preorder') return onSiparisUrunler;
        return sepet;
    }, [cartViewTab, hazirUrunler, onSiparisUrunler, sepet]);

    // Sepet işlemleri
    const getCartItemQuantity = (urunId: string) => {
        const item = sepet.find(i => i.urun_id === urunId);
        return item ? item.adet : 0;
    };

    const handleAdetInput = (urunId: string, miktar: number) => {
        setEklemeAdetleri(prev => ({
            ...prev,
            [urunId]: Math.max(1, miktar)
        }));
    };

    const handleSepeteEkle = (urun: ProductItem, eklenecekAdet: number = 1) => {
        if (urun.satis_fiyati_musteri === null || urun.satis_fiyati_musteri === undefined) {
            toast.error("Bu ürünün fiyatı tanımlanmamış, eklenemiyor.");
            return;
        }

        const urunAdi = getLocalizedName(urun.ad, locale);
        const isOnSiparis = urun.stok_miktari !== null && urun.stok_miktari !== undefined && urun.stok_miktari <= 0;
        const mevcutIndex = sepet.findIndex(item => item.urun_id === urun.id);

        if (isOnSiparis) {
            toast.info(`⏳ "${urunAdi}" Ön Sipariş / Talep sepetine eklendi.`, { duration: 3500 });
        } else {
            toast.success(`📦 "${urunAdi}" Hazır Stok sepetine eklendi.`);
        }

        if (mevcutIndex !== -1) {
            const yeniSepet = [...sepet];
            yeniSepet[mevcutIndex].adet += eklenecekAdet;
            setSepet(yeniSepet);
        } else {
            setSepet(prev => [
                ...prev,
                {
                    urun_id: urun.id,
                    adet: eklenecekAdet,
                    o_anki_satis_fiyati: urun.satis_fiyati_musteri!,
                    urun_adi: urunAdi,
                    stok_kodu: urun.stok_kodu,
                    ana_resim_url: urun.ana_resim_url,
                    max_stok: urun.stok_miktari,
                    is_on_siparis: isOnSiparis
                }
            ]);
        }

        // Adet inputunu sıfırla
        setEklemeAdetleri(prev => ({ ...prev, [urun.id]: 1 }));
    };

    const handleSepetAdetDegistir = (urunId: string, yeniAdet: number) => {
        if (yeniAdet < 1) {
            handleSepettenCikar(urunId);
            return;
        }
        setSepet(sepet.map(item => item.urun_id === urunId ? { ...item, adet: yeniAdet } : item));
    };

    const handleSepettenCikar = (urunId: string) => {
        setSepet(sepet.filter(item => item.urun_id !== urunId));
    };

    const handleSepetiTemizle = () => {
        if (sepet.length === 0) return;
        if (confirm("Sepetteki tüm ürünleri temizlemek istediğinize emin misiniz?")) {
            setSepet([]);
            toast.info("Sepet temizlendi.");
        }
    };

    // Geçmiş siparişi sepete aktar
    const handleGecmisSiparisiYukle = (order: PastOrder) => {
        if (!order.siparis_detay || order.siparis_detay.length === 0) {
            toast.error("Bu siparişin detay bilgisi bulunamadı.");
            return;
        }

        let eklenenSayi = 0;
        let onSiparisEklenenSayisi = 0;
        const yeniSepet = [...sepet];

        order.siparis_detay.forEach(detay => {
            const urun = urunler.find(u => u.id === detay.urun_id);
            if (urun && urun.satis_fiyati_musteri !== null) {
                const urunAdi = getLocalizedName(urun.ad, locale);
                const isOnSiparis = urun.stok_miktari !== null && urun.stok_miktari !== undefined && urun.stok_miktari <= 0;
                const existingIndex = yeniSepet.findIndex(item => item.urun_id === urun.id);

                if (isOnSiparis) {
                    onSiparisEklenenSayisi++;
                }

                if (existingIndex !== -1) {
                    yeniSepet[existingIndex].adet += detay.miktar;
                } else {
                    yeniSepet.push({
                        urun_id: urun.id,
                        adet: detay.miktar,
                        o_anki_satis_fiyati: urun.satis_fiyati_musteri,
                        urun_adi: urunAdi,
                        stok_kodu: urun.stok_kodu,
                        ana_resim_url: urun.ana_resim_url,
                        max_stok: urun.stok_miktari,
                        is_on_siparis: isOnSiparis
                    });
                }
                eklenenSayi++;
            }
        });

        setSepet(yeniSepet);
        if (onSiparisEklenenSayisi > 0) {
            toast.warning(`Geçmiş siparişten ${eklenenSayi} ürün aktarıldı (${onSiparisEklenenSayisi} ürün stoğu olmadığı için Ön Sipariş sepetine alındı).`, {
                duration: 6000
            });
        } else {
            toast.success(`Geçmiş siparişten ${eklenenSayi} ürün sepete aktarıldı!`);
        }
        setShowPastOrders(false);
    };

    // Sipariş gönderme (Dual Split Order)
    const handleSubmit = () => {
        const hedefFirmaId = seciliFirmaId || firmaId;
        if (!hedefFirmaId) {
            toast.error("Lütfen bir firma seçin.");
            return;
        }
        if (sepet.length === 0) {
            toast.error("Sipariş oluşturmak için önce sepete ürün eklemelisiniz.");
            return;
        }
        if (!teslimatAdresi.trim()) {
            toast.error("Teslimat adresi boş olamaz.");
            return;
        }

        const normalPayload = hazirUrunler.map(({ urun_id, adet, o_anki_satis_fiyati }) => ({
            urun_id,
            adet,
            o_anki_satis_fiyati
        }));

        const onSiparisPayload = onSiparisUrunler.map(({ urun_id, adet, o_anki_satis_fiyati }) => ({
            urun_id,
            adet,
            o_anki_satis_fiyati
        }));

        startTransition(async () => {
            const result = await topluSiparisOlusturAction({
                firmaId: hedefFirmaId,
                teslimatAdresi: teslimatAdresi,
                normalItems: normalPayload,
                onSiparisItems: onSiparisPayload,
                kaynak: 'Admin Paneli'
            });

            if (result?.success) {
                toast.success(result.message || "Sipariş başarıyla oluşturuldu!");
                router.push(`/${locale}/admin/crm/firmalar/${hedefFirmaId}/siparisler`);
            } else if (result?.error) {
                toast.error(result.error);
            }
        });
    };

    // Hesaplamalar
    const toplamTutar = useMemo(() => {
        return sepet.reduce((acc, item) => acc + (item.adet * item.o_anki_satis_fiyati), 0);
    }, [sepet]);

    const hazirToplamTutar = useMemo(() => {
        return hazirUrunler.reduce((acc, item) => acc + (item.adet * item.o_anki_satis_fiyati), 0);
    }, [hazirUrunler]);

    const onSiparisToplamTutar = useMemo(() => {
        return onSiparisUrunler.reduce((acc, item) => acc + (item.adet * item.o_anki_satis_fiyati), 0);
    }, [onSiparisUrunler]);

    const toplamAdet = useMemo(() => {
        return sepet.reduce((acc, item) => acc + item.adet, 0);
    }, [sepet]);

    const renderStockBadge = (stok: number | null | undefined) => {
        if (stok === null || stok === undefined) {
            return <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">Stok: -</span>;
        }
        if (stok <= 0) {
            return <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full font-bold">⏳ Ön Sipariş (0)</span>;
        }
        if (stok <= 5) {
            return <span className="text-[11px] text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full font-semibold">Kritik Stok: {stok}</span>;
        }
        return <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">Stok: {stok}</span>;
    };

    return (
        <div className="space-y-4">
            {/* Firma Seçici (Eğer URL'de firmaId yoksa) */}
            {!firmaId && firmenListe && firmenListe.length > 0 && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">Sipariş Verilecek Firma</label>
                    <select
                        value={seciliFirmaId}
                        onChange={(e) => setSeciliFirmaId(e.target.value)}
                        className="w-full bg-secondary border border-bg-subtle rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-accent outline-none"
                    >
                        <option value="">-- Firma Seçin --</option>
                        {firmenListe.map((f: any) => (
                            <option key={f.id} value={f.id}>{f.unvan}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Geçmiş Siparişler Hızlı Tekrarlama Kartı (Varsa) */}
            {pastOrders.length > 0 && (
                <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/80 rounded-2xl p-3.5 transition-all">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm flex-shrink-0">
                                <FiRefreshCw className="text-base" />
                            </div>
                            <div>
                                <h2 className="text-xs font-bold text-gray-800">Müşterinin Geçmiş Siparişleri ({pastOrders.length})</h2>
                                <p className="text-[11px] text-gray-600">
                                    Önceki siparişlerden tek tıkla ürünleri sepete aktarabilirsiniz (stokta olmayanlar otomatik ön siparişe ayrılır).
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowPastOrders(!showPastOrders)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-900 rounded-xl font-bold text-xs hover:bg-amber-50 shadow-sm transition-all"
                        >
                            {showPastOrders ? <FiChevronUp /> : <FiChevronDown />}
                            {showPastOrders ? 'Gizle' : 'İncele'}
                        </button>
                    </div>

                    {showPastOrders && (
                        <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 animate-in fade-in duration-200">
                            {pastOrders.slice(0, 6).map((order) => {
                                const itemCount = (order.siparis_detay || []).reduce((acc, d) => acc + (d.miktar || 1), 0);
                                const orderDate = order.siparis_tarihi
                                    ? new Date(order.siparis_tarihi).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'de-DE')
                                    : '-';

                                return (
                                    <div key={order.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between gap-2.5 hover:border-amber-400 transition-all">
                                        <div>
                                            <div className="flex items-center justify-between text-[11px] text-gray-500 mb-0.5">
                                                <span className="flex items-center gap-1"><FiCalendar /> {orderDate}</span>
                                                <span className="font-semibold text-gray-700">#{order.id.substring(0, 8).toUpperCase()}</span>
                                            </div>
                                            <div className="text-xs font-bold text-gray-900 mb-0.5">
                                                {formatCurrency(order.toplam_tutar_brut, locale)}
                                            </div>
                                            <p className="text-[11px] text-gray-600">
                                                {order.siparis_detay?.length || 0} Çeşit • Toplam {itemCount} Adet
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleGecmisSiparisiYukle(order)}
                                            className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                                        >
                                            <FiPlus /> Bu Siparişi Sepete Aktar
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Ana 2 Sütunlu Sipariş Ekranı */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* SOL SÜTUN: ÜRÜN SEÇİCİ VE KATALOG (7/12 veya 8/12) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-3.5">
                    
                    {/* Filtre ve Arama Kartı */}
                    <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
                        
                        {/* Tab Butonları */}
                        <div className="flex flex-wrap items-center gap-2 pb-2.5 border-b border-gray-100">
                            <button
                                type="button"
                                onClick={() => setActiveTab('all')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === 'all'
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <FiPackage />
                                Tüm Ürünler
                                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {urunler.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('frequent')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === 'frequent'
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                🔥 Sık Sipariş Edilenler
                                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'frequent' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {sikSiparisUrunIdleri.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('recent')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === 'recent'
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <FiClock />
                                Son Siparişler
                                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'recent' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {sonSiparisUrunIdleri.length}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('favorites')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                                    activeTab === 'favorites'
                                        ? 'bg-rose-500 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <FiStar />
                                Favoriler
                                <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${activeTab === 'favorites' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                                    {favoriUrunIdSet.length}
                                </span>
                            </button>
                        </div>

                        {/* Arama Çubuğu ve Kategori Filtresi */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                            <div className="sm:col-span-7 relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Ürün adı, barkod veya stok kodu ara..."
                                    className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-gray-400"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                    >
                                        <FiX size={12} />
                                    </button>
                                )}
                            </div>

                            <div className="sm:col-span-5 flex items-center gap-2">
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full py-2 px-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-accent outline-none transition-all text-gray-700"
                                >
                                    <option value="all">Tüm Kategoriler ({urunler.length})</option>
                                    {kategoriler
                                        .map(cat => ({
                                            ...cat,
                                            count: urunler.filter(u => u.kategori_id === cat.id).length
                                        }))
                                        .filter(cat => cat.count > 0)
                                        .map(cat => (
                                            <option key={cat.id} value={cat.id}>
                                                {getLocalizedName(cat.ad, locale)} ({cat.count})
                                            </option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Ek Filtre ve Görünüm Seçenekleri */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs text-gray-600 pt-0.5">
                            <div className="flex items-center gap-3">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={onlyInStock}
                                        onChange={(e) => setOnlyInStock(e.target.checked)}
                                        className="rounded border-gray-300 text-accent focus:ring-accent h-3.5 w-3.5"
                                    />
                                    <span className="font-medium text-[11px] text-gray-700">Sadece Stokta Olanlar</span>
                                </label>

                                {(searchTerm || selectedCategory !== 'all' || onlyInStock) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedCategory('all');
                                            setOnlyInStock(false);
                                        }}
                                        className="text-rose-600 hover:text-rose-800 font-bold text-[11px] underline transition-colors"
                                    >
                                        Filtreleri Temizle
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-500 font-medium">
                                    {filtrelenmisUrunler.length} ürün listeleniyor
                                </span>
                                <div className="border-l border-gray-200 pl-2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        className={`p-1 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                                        title="Liste Görünümü"
                                    >
                                        <FiList size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                                        title="Kart Görünümü"
                                    >
                                        <FiGrid size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Ürün Listesi */}
                    {filtrelenmisUrunler.length === 0 ? (
                        <div className="bg-white p-8 rounded-2xl border border-dashed border-gray-200 text-center space-y-2">
                            <div className="w-10 h-10 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto">
                                <FiSearch className="text-lg" />
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm">Aradığınız kriterlere uygun ürün bulunamadı</h3>
                            <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                Farklı bir arama terimi deneyebilir veya filtreleri sıfırlayabilirsiniz.
                            </p>
                        </div>
                    ) : viewMode === 'list' ? (
                        /* LİSTE GÖRÜNÜMÜ */
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100 overflow-hidden">
                            {filtrelenmisUrunler.map((urun) => {
                                const inCartQty = getCartItemQuantity(urun.id);
                                const currentInputQty = eklemeAdetleri[urun.id] || 1;
                                const categoryName = urun.kategori_id ? categoryMap.get(urun.kategori_id) : null;
                                const urunAdi = getLocalizedName(urun.ad, locale);
                                const isOutOfStock = urun.stok_miktari !== null && urun.stok_miktari !== undefined && urun.stok_miktari <= 0;

                                return (
                                    <div
                                        key={urun.id}
                                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/70 transition-colors ${
                                            inCartQty > 0 ? (isOutOfStock ? 'bg-amber-50/20 border-l-4 border-l-amber-500' : 'bg-accent/5 border-l-4 border-l-accent') : ''
                                        }`}
                                    >
                                        {/* Ürün Bilgisi */}
                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                            <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-100 relative">
                                                {urun.ana_resim_url ? (
                                                    <Image
                                                        src={urun.ana_resim_url}
                                                        alt={urunAdi}
                                                        width={48}
                                                        height={48}
                                                        className="object-contain w-full h-full p-0.5"
                                                    />
                                                ) : (
                                                    <FiPackage className="text-gray-300 text-xl" />
                                                )}
                                                {inCartQty > 0 && (
                                                    <span className={`absolute -top-1 -right-1 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-xs ${isOutOfStock ? 'bg-amber-600' : 'bg-accent'}`}>
                                                        {inCartQty}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="min-w-0 space-y-0.5">
                                                <h4 className="font-bold text-gray-900 text-xs sm:text-sm leading-snug line-clamp-2">
                                                    {urunAdi}
                                                </h4>
                                                
                                                <div className="flex flex-wrap items-center gap-1 text-[11px] text-gray-500">
                                                    {categoryName && (
                                                        <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded-md font-medium text-[10px]">
                                                            {categoryName}
                                                        </span>
                                                    )}
                                                    {urun.stok_kodu && (
                                                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded-md font-mono text-[10px]">
                                                            SKU: {urun.stok_kodu}
                                                        </span>
                                                    )}
                                                    {renderStockBadge(urun.stok_miktari)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Fiyat ve Ekleme Alanı */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                                            <div className="text-left sm:text-right">
                                                <div className="text-sm sm:text-base font-black text-gray-900">
                                                    {formatCurrency(urun.satis_fiyati_musteri, locale)}
                                                </div>
                                                {urun.koli_ici_adet && (
                                                    <div className="text-[10px] text-gray-400">
                                                        Koli: {urun.koli_ici_adet} adet
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdetInput(urun.id, currentInputQty - 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                                                    >
                                                        <FiMinus size={10} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={currentInputQty}
                                                        onChange={(e) => handleAdetInput(urun.id, parseInt(e.target.value) || 1)}
                                                        className="w-8 text-center bg-transparent text-xs font-bold text-gray-800 focus:outline-none"
                                                        min="1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdetInput(urun.id, currentInputQty + 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                                                    >
                                                        <FiPlus size={10} />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSepeteEkle(urun, currentInputQty)}
                                                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                                                        isOutOfStock
                                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                            : 'bg-accent text-white hover:bg-accent/90'
                                                    }`}
                                                >
                                                    <FiPlus /> {isOutOfStock ? 'Ön Sipariş' : 'Ekle'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* KART (GRID) GÖRÜNÜMÜ */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {filtrelenmisUrunler.map((urun) => {
                                const inCartQty = getCartItemQuantity(urun.id);
                                const currentInputQty = eklemeAdetleri[urun.id] || 1;
                                const categoryName = urun.kategori_id ? categoryMap.get(urun.kategori_id) : null;
                                const urunAdi = getLocalizedName(urun.ad, locale);
                                const isOutOfStock = urun.stok_miktari !== null && urun.stok_miktari !== undefined && urun.stok_miktari <= 0;

                                return (
                                    <div
                                        key={urun.id}
                                        className={`bg-white rounded-2xl p-3 border transition-all flex flex-col justify-between gap-2.5 shadow-xs hover:shadow-sm ${
                                            inCartQty > 0
                                                ? (isOutOfStock ? 'border-amber-400 ring-1 ring-amber-300 bg-amber-50/10' : 'border-accent ring-1 ring-accent/20 bg-accent/5')
                                                : 'border-gray-100 hover:border-gray-300'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="w-full h-28 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center border border-gray-100 relative">
                                                {urun.ana_resim_url ? (
                                                    <Image
                                                        src={urun.ana_resim_url}
                                                        alt={urunAdi}
                                                        width={100}
                                                        height={100}
                                                        className="object-contain w-full h-full p-1.5"
                                                    />
                                                ) : (
                                                    <FiPackage className="text-gray-300 text-2xl" />
                                                )}
                                                {inCartQty > 0 && (
                                                    <span className={`absolute top-1.5 right-1.5 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full shadow-xs ${isOutOfStock ? 'bg-amber-600' : 'bg-accent'}`}>
                                                        Sepette: {inCartQty}
                                                    </span>
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    {categoryName && (
                                                        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider line-clamp-1">
                                                            {categoryName}
                                                        </span>
                                                    )}
                                                    {renderStockBadge(urun.stok_miktari)}
                                                </div>
                                                <h4 className="font-bold text-gray-900 text-xs leading-snug line-clamp-2 min-h-[2rem]">
                                                    {urunAdi}
                                                </h4>
                                            </div>
                                        </div>

                                        <div className="pt-1.5 border-t border-gray-100 space-y-1.5">
                                            <div className="text-sm font-black text-gray-900">
                                                {formatCurrency(urun.satis_fiyati_musteri, locale)}
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 p-0.5 flex-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdetInput(urun.id, currentInputQty - 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                                                    >
                                                        <FiMinus size={10} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        value={currentInputQty}
                                                        onChange={(e) => handleAdetInput(urun.id, parseInt(e.target.value) || 1)}
                                                        className="w-full text-center bg-transparent text-xs font-bold text-gray-800 focus:outline-none"
                                                        min="1"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdetInput(urun.id, currentInputQty + 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition-colors"
                                                    >
                                                        <FiPlus size={10} />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSepeteEkle(urun, currentInputQty)}
                                                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all ${
                                                        isOutOfStock
                                                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                                            : 'bg-accent text-white hover:bg-accent/90'
                                                    }`}
                                                >
                                                    <FiPlus /> {isOutOfStock ? 'Ön Sipariş' : 'Ekle'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SAĞ SÜTUN: AKILLI ÇİFT BÖLMELİ SEPET (5/12 veya 4/12) */}
                <div className="order-first lg:order-none lg:col-span-5 xl:col-span-4 sticky top-4 self-start space-y-3 z-10">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">
                        
                        {/* Sepet Başlığı */}
                        <div className="px-3.5 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 text-white flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white text-sm">
                                    <FiShoppingBag />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xs sm:text-sm text-white leading-tight">Sipariş Sepeti</h3>
                                    <p className="text-[10px] text-gray-300">
                                        {hazirUrunler.length} Stoklu • {onSiparisUrunler.length} Ön Sipariş
                                    </p>
                                </div>
                            </div>

                            {sepet.length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleSepetiTemizle}
                                    className="text-[11px] text-rose-300 hover:text-rose-100 flex items-center gap-1 font-medium transition-colors"
                                >
                                    <FiTrash2 size={11} /> Temizle
                                </button>
                            )}
                        </div>

                        {/* Sepet Sekmeleri (Hazır Stok vs Ön Sipariş) */}
                        {sepet.length > 0 && (
                            <div className="grid grid-cols-3 bg-gray-100 p-1 border-b border-gray-200 text-center text-xs font-bold">
                                <button
                                    type="button"
                                    onClick={() => setCartViewTab('all')}
                                    className={`py-1 rounded-lg transition-all ${cartViewTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Tümü ({sepet.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCartViewTab('instock')}
                                    className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${cartViewTab === 'instock' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-800 hover:text-emerald-950'}`}
                                >
                                    🟢 Stoklu ({hazirUrunler.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCartViewTab('preorder')}
                                    className={`py-1 rounded-lg transition-all flex items-center justify-center gap-1 ${cartViewTab === 'preorder' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-800 hover:text-amber-950'}`}
                                >
                                    ⏳ Ön Sipariş ({onSiparisUrunler.length})
                                </button>
                            </div>
                        )}

                        {/* Sepetteki Ürünler */}
                        <div className="px-3 py-2 space-y-2 flex-1 overflow-y-auto max-h-[220px]">
                            {goruntulenenSepetUrunleri.length === 0 ? (
                                <div className="text-center py-3.5 px-2 space-y-1 bg-gray-50/60 rounded-xl my-1 border border-dashed border-gray-200">
                                    <p className="text-xs font-bold text-gray-700">
                                        {cartViewTab === 'instock' ? 'Hazır Stok Sepeti Boş' : cartViewTab === 'preorder' ? 'Ön Sipariş Sepeti Boş' : 'Sepetiniz Boş'}
                                    </p>
                                    <p className="text-[11px] text-gray-500">
                                        Ürün listesinden ekleyerek doldurabilirsiniz.
                                    </p>
                                </div>
                            ) : (
                                goruntulenenSepetUrunleri.map((item) => {
                                    return (
                                        <div
                                            key={item.urun_id}
                                            className={`p-2 rounded-xl transition-all border ${
                                                item.is_on_siparis
                                                    ? 'bg-amber-50/50 border-amber-200/80'
                                                    : 'bg-emerald-50/30 border-emerald-100'
                                            }`}
                                        >
                                            {/* Üst Satır: Resim + İsim + Badge + Sil Butonu */}
                                            <div className="flex items-start justify-between gap-1.5">
                                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                                    <div className="w-7 h-7 bg-white rounded-md overflow-hidden flex items-center justify-center flex-shrink-0 border border-gray-200">
                                                        {item.ana_resim_url ? (
                                                            <Image
                                                                src={item.ana_resim_url}
                                                                alt={item.urun_adi}
                                                                width={28}
                                                                height={28}
                                                                className="object-contain w-full h-full p-0.5"
                                                            />
                                                        ) : (
                                                            <FiPackage className="text-gray-400 text-xs" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-bold text-gray-900 leading-tight" title={item.urun_adi}>
                                                            {item.urun_adi}
                                                        </p>
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => handleSepettenCikar(item.urun_id)}
                                                    className="text-gray-400 hover:text-rose-600 p-0.5 transition-colors flex-shrink-0"
                                                    title="Ürünü Sepetten Çıkar"
                                                >
                                                    <FiTrash2 size={12} />
                                                </button>
                                            </div>

                                            {/* Alt Satır: Birim Fiyat + Tür Rozeti + Adet + Toplam */}
                                            <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-gray-200/50">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="text-[11px] text-gray-500 font-medium whitespace-nowrap">
                                                        {formatCurrency(item.o_anki_satis_fiyati, locale)}
                                                    </span>
                                                    {item.is_on_siparis ? (
                                                        <span className="text-[9px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded leading-none whitespace-nowrap border border-amber-200">
                                                            ⏳ Ön Sipariş
                                                        </span>
                                                    ) : (
                                                        <span className="text-[9px] bg-emerald-100 text-emerald-900 font-bold px-1.5 py-0.2 rounded leading-none whitespace-nowrap border border-emerald-200">
                                                            📦 Hazır Stok
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    <div className="flex items-center border border-gray-200 rounded-lg bg-white shadow-2xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSepetAdetDegistir(item.urun_id, item.adet - 1)}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-l transition-colors"
                                                        >
                                                            <FiMinus size={9} />
                                                        </button>
                                                        <span className="w-5 text-center text-xs font-bold text-gray-800">
                                                            {item.adet}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSepetAdetDegistir(item.urun_id, item.adet + 1)}
                                                            className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-r transition-colors"
                                                        >
                                                            <FiPlus size={9} />
                                                        </button>
                                                    </div>

                                                    <span className="text-xs font-black text-gray-900 min-w-[48px] text-right">
                                                        {formatCurrency(item.adet * item.o_anki_satis_fiyati, locale)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Toplam ve Teslimat Bilgisi */}
                        <div className="p-3 bg-gray-50/80 border-t border-gray-100 space-y-2 flex-shrink-0">
                            
                            {/* Ayrıştırılmış Özet Bilgisi */}
                            <div className="space-y-1 text-xs">
                                {hazirUrunler.length > 0 && (
                                    <div className="flex items-center justify-between text-emerald-800 font-medium">
                                        <span>📦 Hazır Stok ({hazirUrunler.length} çeşit):</span>
                                        <span className="font-bold">{formatCurrency(hazirToplamTutar, locale)}</span>
                                    </div>
                                )}
                                {onSiparisUrunler.length > 0 && (
                                    <div className="flex items-center justify-between text-amber-800 font-medium">
                                        <span>⏳ Ön Sipariş ({onSiparisUrunler.length} çeşit):</span>
                                        <span className="font-bold">{formatCurrency(onSiparisToplamTutar, locale)}</span>
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-gray-200 text-gray-900 font-bold">
                                    <span>Genel Toplam (Net):</span>
                                    <span className="text-sm font-black text-accent">{formatCurrency(toplamTutar, locale)}</span>
                                </div>
                            </div>

                            {/* Teslimat Adresi */}
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label htmlFor="teslimatAdresi" className="block text-[11px] font-bold text-gray-700">
                                        Teslimat Adresi
                                    </label>
                                    {varsayilanTeslimatAdresi && teslimatAdresi !== varsayilanTeslimatAdresi && (
                                        <button
                                            type="button"
                                            onClick={() => setTeslimatAdresi(varsayilanTeslimatAdresi)}
                                            className="text-[10px] text-accent hover:underline font-medium"
                                        >
                                            Varsayılana Sıfırla
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    id="teslimatAdresi"
                                    value={teslimatAdresi}
                                    onChange={(e) => setTeslimatAdresi(e.target.value)}
                                    placeholder="Teslimat adresi giriniz..."
                                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none transition-all placeholder:text-gray-400"
                                />
                            </div>

                            {/* Siparişi Tamamla Butonu */}
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isPending || sepet.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow font-bold text-xs sm:text-sm disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none transition-all cursor-pointer"
                            >
                                {isPending ? (
                                    <>
                                        <FiLoader className="animate-spin text-base" />
                                        Sipariş Oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        <FiSend className="text-sm" />
                                        {hazirUrunler.length > 0 && onSiparisUrunler.length > 0
                                            ? 'Normal ve Ön Siparişi Birlikte Onayla (2 Ayrı Fiş)'
                                            : onSiparisUrunler.length > 0
                                            ? 'Ön Sipariş Talebini Onayla'
                                            : 'Siparişi Onayla ve Oluştur'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
