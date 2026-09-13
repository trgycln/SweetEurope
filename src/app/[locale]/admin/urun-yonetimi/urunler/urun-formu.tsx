// src/app/[locale]/admin/urun-yonetimi/urunler/urun-formu.tsx
// Professional ERP / PIM-Style Dense Product Management Workspace
'use client';

import React, { useState, useTransition, useEffect, useMemo, ChangeEvent, FormEvent, useRef } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import Image from 'next/image';
import { 
    FiArrowLeft, FiSave, FiX, FiInfo, FiDollarSign, FiLoader, FiTrash2, 
    FiImage, FiUploadCloud, FiSearch, FiChevronRight, FiChevronDown, FiChevronUp, FiArrowRight,
    FiExternalLink, FiPackage, FiTruck, FiLayers, FiThermometer, 
    FiActivity, FiCheck, FiAlertTriangle, FiCalendar, FiClock, FiFileText, FiTag
} from 'react-icons/fi';
import { createUrunAction, updateUrunAction, deleteUrunAction, uploadUrunImageAction, removeUrunImagesAction, FormState } from './actions';
import { useRouter } from 'next/navigation';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { getProductLineLabel, inferProductLineFromCategoryId, type ProductLineKey } from '@/lib/product-lines';
import { dedupeSuppliers, normalizeSupplierGroupKey } from '@/lib/supplier-utils';
import { CategoryFilterSelect } from '@/components/categories/CategoryFilterSelect';
import type { Locale } from '@/i18n-config';

type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

interface UrunFormuLabels {
    backButtonAria: string;
    createTitle: string;
    editTitle: string;
    createSubtitle: string;
    editSubtitle: string;
    imageSection: {
        title: string;
        mainImage: string;
        change: string;
        upload: string;
        formatsHint: string;
        galleryImages: string;
        addImages: string;
    };
    basicsSection: {
        title: string;
        mainCategory: string;
        subCategory: string;
        pleaseSelect: string;
        selectMainFirst: string;
        noSubcategories: string;
        unnamedCategory: string;
        changeCategoryWarning: string;
    };
    supplierSection: {
        supplier: string;
        none: string;
    };
    i18nSection: {
        title: string;
        productName: string;
        description: string;
        languageNames: { de: string; en: string; tr: string; ar: string };
    };
    operationsSection: {
        title: string;
        sku: string;
        slug: string;
        unit: string;
        pleaseSelect: string;
        activeQuestion: string;
    };
    pricingStockSection: {
        title: string;
        stockQty: string;
        stockThreshold: string;
        customerPrice: string;
        resellerPrice: string;
        distributorCost: string;
    };
    attributesSection: {
        title: string;
        info: string;
        features: string;
        vegan: string;
        vegetarian: string;
        glutenFree: string;
        lactoseFree: string;
        organic: string;
        sugarFree?: string;
        naturalIngredients?: string;
        additiveFree?: string;
        preservativeFree?: string;
        pumpCompatible?: string;
    };
    flavorsSection: {
        label: string;
        extraLabel: string;
        extraPlaceholder: string;
    };
    flavors: Record<string, string>;
    technicalSection: {
        title: string;
    };
    buttons: {
        cancel: string;
        saveCreate: string;
        saveEdit: string;
        saving: string;
        delete: string;
    };
    deleteConfirm: string;
}

interface StockLogItem {
    id: string;
    created_at: string;
    hareket_tipi: string;
    kaynak: string;
    miktar: number;
    birim?: string;
    birim_miktar?: number;
    onceki_stok?: number;
    sonraki_stok?: number;
    yapan_user_adi?: string;
    yapan_user_email?: string;
    aciklama?: string;
    islem_turu?: string;
    birim_maliyet?: number;
    fatura_belge_no?: string;
    profiles?: { ad?: string | null; soyad?: string | null; email?: string | null } | null;
}

interface UrunFormuProps {
    locale: Locale;
    kategoriler: Kategori[];
    tedarikciler: Tedarikci[];
    birimler: Birim[];
    mevcutUrun?: Urun;
    labels?: UrunFormuLabels;
    isAdmin?: boolean;
    stockLogs?: StockLogItem[];
    stockFilterParams?: { from?: string; to?: string; tip?: string; kaynak?: string };
}

const diller = [
    { kod: 'de' as const, label: 'Deutsch' },
    { kod: 'tr' as const, label: 'Türkçe' },
    { kod: 'en' as const, label: 'English' },
    { kod: 'ar' as const, label: 'العربية' },
];

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE_LABEL = '10MB';

type TabKey = 'genel' | 'fiyat-stok' | 'lojistik' | 'saklama-spekt' | 'besin-alerjen' | 'medya' | 'gecmis';

export function UrunFormu({
    locale,
    kategoriler,
    tedarikciler,
    birimler,
    mevcutUrun,
    labels,
    isAdmin = true,
    stockLogs = [],
    stockFilterParams = {}
}: UrunFormuProps) {
    const router = useRouter();
    const supabase = createDynamicSupabaseClient(true);
    const formRef = useRef<HTMLFormElement>(null);

    const isEditMode = !!mevcutUrun;
    const mu = (mevcutUrun as any) || {};
    const herkunft = (mu.herkunftsland as any) || {};
    const inhalts = (mu.inhaltsstoffe as any) || {};
    const allerg = (mu.allergene as any) || {};
    const naehr = (mu.naehrwerte as any)?.pro_100g || (mu.naehrwerte as any)?.pro_100ml || {};
    const naehrEinheit = (mu.naehrwerte as any)?.pro_100ml ? '100ml' : '100g';
    const tech = (mu.teknik_ozellikler as any) || {};

    const [activeTab, setActiveTab] = useState<TabKey>('genel');
    const [showTopHistory, setShowTopHistory] = useState(false);
    const [aktifDil, setAktifDil] = useState<Locale>(locale);
    const [isPending, startTransition] = useTransition();
    const [formResult, setFormResult] = useState<FormState>(null);

    // Kategori & Ağaç
    const [altKategoriId, setAltKategoriId] = useState<string | null>(mevcutUrun?.kategori_id || null);
    const [kategoriBul, setKategoriBul] = useState('');
    const mevcutKategori = kategoriler.find(k => k.id === mevcutUrun?.kategori_id);

    const initialExpanded = useMemo(() => {
        const ids = new Set<string>();
        let cur = mevcutKategori;
        while (cur?.ust_kategori_id) {
            ids.add(cur.ust_kategori_id);
            cur = kategoriler.find(k => k.id === cur!.ust_kategori_id);
        }
        return ids;
    }, [mevcutKategori, kategoriler]);
    const [expandedKategoriIds, setExpandedKategoriIds] = useState<Set<string>>(initialExpanded);

    const supplierOptions = useMemo(() => dedupeSuppliers(tedarikciler), [tedarikciler]);
    const normalizedSupplierValue = useMemo(() => {
        if (!mevcutUrun?.tedarikci_id) return '';
        const representativeById = Object.fromEntries(
            tedarikciler.map((s) => {
                const groupKey = normalizeSupplierGroupKey(s.unvan) || s.id;
                const representative = supplierOptions.find((opt) => (normalizeSupplierGroupKey(opt.unvan) || opt.id) === groupKey);
                return [s.id, representative?.id || s.id];
            })
        ) as Record<string, string>;
        return representativeById[mevcutUrun.tedarikci_id] || mevcutUrun.tedarikci_id;
    }, [mevcutUrun?.tedarikci_id, tedarikciler, supplierOptions]);

    const seciliKategoriId = altKategoriId;
    const kategoriBazliUrunGami = inferProductLineFromCategoryId(kategoriler as any, seciliKategoriId);
    const [manuelUrunGami, setManuelUrunGami] = useState<ProductLineKey | 'auto'>(
        Array.isArray(mevcutUrun?.urun_gami) && (mevcutUrun.urun_gami.includes('frozen-desserts') || mevcutUrun.urun_gami.includes('barista-bakery-essentials'))
            ? mevcutUrun.urun_gami.find(g => g === 'frozen-desserts' || g === 'barista-bakery-essentials') as ProductLineKey
            : 'auto'
    );
    const seciliUrunGami = manuelUrunGami === 'auto' ? kategoriBazliUrunGami : manuelUrunGami;

    // Şablon
    const [aktifSablon, setAktifSablon] = useState<Sablon[]>([]);
    const [isLoadingSablon, setIsLoadingSablon] = useState(false);

    // Slug & İsim
    const [slug, setSlug] = useState(mevcutUrun?.slug || '');
    const [anaUrunAdi, setAnaUrunAdi] = useState<string>(
        mevcutUrun?.ad?.[locale] || mevcutUrun?.ad?.['tr'] || mevcutUrun?.ad?.['de'] || mevcutUrun?.ad?.['en'] || ''
    );
    const [aktifDurum, setAktifDurum] = useState<boolean>(mevcutUrun?.aktif ?? true);
    const [isFeaturedDurum, setIsFeaturedDurum] = useState<boolean>((mevcutUrun as any)?.is_featured ?? false);
    const [isBestsellerDurum, setIsBestsellerDurum] = useState<boolean>((mevcutUrun as any)?.is_bestseller ?? false);
    const [featuredSira, setFeaturedSira] = useState<number>((mevcutUrun as any)?.featured_sira ?? 0);

    // Fiyatlar & KDV Dinamik Hesaplama
    const [alisFiyati, setAlisFiyati] = useState<number>(Number(mevcutUrun?.distributor_alis_fiyati ?? 0));
    const [toptanFiyat, setToptanFiyat] = useState<number>(Number(mevcutUrun?.satis_fiyati_toptanci ?? 0));
    const [musteriFiyat, setMusteriFiyat] = useState<number>(Number(mevcutUrun?.satis_fiyati_musteri ?? 0));
    const [altBayiFiyat, setAltBayiFiyat] = useState<number>(Number(mevcutUrun?.satis_fiyati_alt_bayi ?? 0));
    const [paletFiyat, setPaletFiyat] = useState<number>(Number(mevcutUrun?.satis_fiyati_palet ?? 0));
    const [kdvOrani, setKdvOrani] = useState<number>(Number(mevcutUrun?.almanya_kdv_orani ?? 7));

    // Görseller
    const [anaResimDosyasi, setAnaResimDosyasi] = useState<File | null>(null);
    const [anaResimOnizleme, setAnaResimOnizleme] = useState<string | null>(mevcutUrun?.ana_resim_url || null);
    const [galeriOnizlemeler, setGaleriOnizlemeler] = useState<Array<{ id: string | number, url: string, file?: File }>>(
        (mevcutUrun?.galeri_resim_urls || []).map((url) => ({ id: url, url }))
    );
    const [markierteGeloeschteUrls, setMarkierteGeloeschteUrls] = useState<string[]>([]);

    // Aromalar (Flavors)
    const standardGeschmackWerte = ['schokolade', 'kakao', 'erdbeere', 'vanille', 'karamell', 'nuss', 'walnuss', 'badem', 'hindistancevizi', 'honig', 'tereyag', 'zitrone', 'portakal', 'zeytin', 'frucht', 'kaffee', 'himbeere', 'brombeere', 'kirsche', 'waldfrucht', 'pistazie', 'havuc', 'yulaf', 'yabanmersini'];
    const mevcutGeschmack = tech.geschmack || [];
    const mevcutGeschmackArray = Array.isArray(mevcutGeschmack) ? mevcutGeschmack : (mevcutGeschmack ? [mevcutGeschmack] : []);
    const customFlavors = mevcutGeschmackArray.filter((g: string) => !standardGeschmackWerte.includes(g));
    const [selectedGeschmack, setSelectedGeschmack] = useState<string[]>(
        mevcutGeschmackArray.filter((g: string) => standardGeschmackWerte.includes(g))
    );
    const [customGeschmack, setCustomGeschmack] = useState<string>(customFlavors.join(', '));

    // Sablon Fetch
    useEffect(() => {
        const fetchSablon = async () => {
            if (!seciliKategoriId) { setAktifSablon([]); return; }
            setIsLoadingSablon(true);
            const { data } = await supabase.from('kategori_ozellik_sablonlari').select('*').eq('kategori_id', seciliKategoriId).order('sira');
            if (data && data.length > 0) {
                setAktifSablon(data);
                setIsLoadingSablon(false);
                return;
            }
            const altKat = altKategoriId ? kategoriler.find(k => k.id === altKategoriId) : null;
            if (altKat?.ust_kategori_id) {
                const { data: parentData } = await supabase.from('kategori_ozellik_sablonlari').select('*').eq('kategori_id', altKat.ust_kategori_id).order('sira');
                setAktifSablon(parentData || []);
            } else {
                setAktifSablon([]);
            }
            setIsLoadingSablon(false);
        };
        fetchSablon();
    }, [seciliKategoriId, altKategoriId, kategoriler, supabase]);

    // Ctrl+S / Cmd+S Kısayolu ile Kaydetme
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                if (formRef.current) {
                    formRef.current.requestSubmit();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Form Toast & Redirection
    useEffect(() => {
        if (formResult?.success === true && locale) {
            toast.success(formResult.message || 'Başarıyla kaydedildi.');
            router.push(`/${locale}/admin/urun-yonetimi/urunler`);
        } else if (formResult?.success === false) {
            toast.error(formResult.message || 'Kayıt sırasında hata oluştu.');
        }
    }, [formResult, router, locale]);

    const handleAdChange = (event: React.ChangeEvent<HTMLInputElement>, dil: string) => {
        if (dil === locale || dil === 'tr') {
            setAnaUrunAdi(event.target.value);
        }
        if (!isEditMode && dil === locale) {
            setSlug(slugify(event.target.value));
        }
    };

    const handleAnaResimChange = (e: ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            if (f.size > MAX_IMAGE_SIZE_BYTES) { toast.error(`Maksimum dosya boyutu ${MAX_IMAGE_SIZE_LABEL}.`); e.target.value = ''; return; }
            setAnaResimDosyasi(f);
            const r = new FileReader();
            r.onloadend = () => { setAnaResimOnizleme(r.result as string); };
            r.readAsDataURL(f);
        }
    };

    const handleGaleriResimleriChange = (e: ChangeEvent<HTMLInputElement>) => {
        const fs = e.target.files;
        if (fs) {
            const nf = Array.from(fs);
            let err = false;
            nf.forEach(f => {
                if (f.size > MAX_IMAGE_SIZE_BYTES) { toast.error(`${f.name} > ${MAX_IMAGE_SIZE_LABEL}.`); err = true; }
            });
            if (err) { e.target.value = ''; return; }
            nf.forEach((f, i) => {
                const r = new FileReader();
                r.onloadend = () => { setGaleriOnizlemeler(p => [...p, { id: `${i}-${Date.now()}`, url: r.result as string, file: f }]); };
                r.readAsDataURL(f);
            });
            e.target.value = '';
        }
    };

    const handleGaleriResimLoeschen = (id: string | number) => {
        const z = galeriOnizlemeler.find(b => b.id === id);
        if (!z) return;
        if (typeof id === 'string' && mevcutUrun?.galeri_resim_urls?.includes(id)) {
            setMarkierteGeloeschteUrls(p => [...p, id]);
        }
        setGaleriOnizlemeler(p => p.filter(b => b.id !== id));
    };

    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set('kategori_id', (seciliKategoriId ?? ''));
        formData.set('aktif', aktifDurum ? 'on' : 'off');
        formData.set('is_featured', isFeaturedDurum ? 'on' : 'off');
        formData.set('is_bestseller', isBestsellerDurum ? 'on' : 'off');
        formData.set('featured_sira', String(featuredSira));
        setFormResult(null);

        startTransition(async () => {
            toast.info('Değişiklikler kaydediliyor...', { id: 'upload-toast' });
            let anaResimUrl = mevcutUrun?.ana_resim_url || null;
            let finalGaleriUrls = [...(mevcutUrun?.galeri_resim_urls || [])];

            try {
                if (markierteGeloeschteUrls.length > 0) {
                    const pathsToRemove: string[] = [];
                    markierteGeloeschteUrls.forEach(url => {
                        try {
                            const u = new URL(url);
                            const p = u.pathname.split('/');
                            if (p.length > 2) pathsToRemove.push(p.slice(2).join('/'));
                        } catch(e) {}
                    });
                    if (pathsToRemove.length > 0) {
                        await removeUrunImagesAction(pathsToRemove);
                        finalGaleriUrls = finalGaleriUrls.filter(url => !markierteGeloeschteUrls.includes(url));
                    }
                }

                if (anaResimDosyasi) {
                    const uploadForm = new FormData();
                    uploadForm.append('file', anaResimDosyasi);
                    uploadForm.append('folder', 'main');
                    uploadForm.append('upsert', String(Boolean(isEditMode)));
                    const uploadResult = await uploadUrunImageAction(uploadForm);
                    if (!uploadResult?.success || !uploadResult.url) {
                        throw new Error(uploadResult?.message || 'Ana resim yükleme hatası.');
                    }
                    anaResimUrl = uploadResult.url;
                }
                formData.set('ana_resim_url', anaResimUrl || '');

                const neueDateien = galeriOnizlemeler.filter(b => b.file).map(b => b.file as File);
                const neueUrls: string[] = [];
                for (const f of neueDateien) {
                    const uploadForm = new FormData();
                    uploadForm.append('file', f);
                    uploadForm.append('folder', 'gallery');
                    const uploadResult = await uploadUrunImageAction(uploadForm);
                    if (uploadResult?.success && uploadResult.url) {
                        neueUrls.push(uploadResult.url);
                    }
                }

                const finaleGalerieListe = [...finalGaleriUrls, ...neueUrls];
                formData.delete('galeri_resim_urls[]');
                finaleGalerieListe.forEach(url => formData.append('galeri_resim_urls[]', url));

                toast.dismiss('upload-toast');
                const action = isEditMode ? updateUrunAction.bind(null, mevcutUrun.id) : createUrunAction;
                const result = await action(formData);
                setFormResult(result);
            } catch (error: any) {
                toast.dismiss('upload-toast');
                const msg = error?.message || 'İşlem sırasında bir hata oluştu.';
                toast.error(msg);
                setFormResult({ success: false, message: msg });
            }
        });
    };

    // Marj ve Kâr Hesaplamaları
    const calcMargin = (price: number) => {
        if (!price || !alisFiyati) return null;
        const profit = price - alisFiyati;
        const marginPct = (profit / price) * 100;
        return { profit, marginPct };
    };

    const toptanMargin = calcMargin(toptanFiyat);
    const musteriMargin = calcMargin(musteriFiyat);
    const altBayiMargin = calcMargin(altBayiFiyat);

    // Kategori Breadcrumb
    const getKategoriHierarchy = (id: string | null) => {
        if (!id) return null;
        const parts: string[] = [];
        let cur = kategoriler.find(k => k.id === id);
        while (cur) {
            parts.unshift((cur.ad as any)?.[locale] || (cur.ad as any)?.['tr'] || (cur.ad as any)?.['de'] || cur.id);
            cur = cur.ust_kategori_id ? kategoriler.find(k => k.id === cur!.ust_kategori_id) : undefined;
        }
        return parts.join(' › ');
    };

    const inputClasses = "w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all";
    const denseInputClasses = "w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500";
    const labelClasses = "block text-xs font-semibold text-slate-600 mb-1";

    return (
        <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4 pb-20">
            <fieldset disabled={!isAdmin} className="space-y-4">

            {/* ========================================================================= */}
            {/* 1. STICKY TOP CONTROL BAR (Always accessible & Space Optimized)          */}
            {/* ========================================================================= */}
            <div className="sticky top-0 z-40 w-full px-3 py-2 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-xs flex items-center justify-between gap-2.5">
                {/* Left: Back Arrow, Image, Title & SKU */}
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Link
                        href={`/${locale}/admin/urun-yonetimi/urunler`}
                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
                        title="Ürün Listesine Dön"
                    >
                        <FiArrowLeft size={18} />
                    </Link>

                    {/* Thumbnail */}
                    <div className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {anaResimOnizleme ? (
                            <Image src={anaResimOnizleme} alt="Thumb" width={32} height={32} className="object-contain w-full h-full p-0.5" />
                        ) : (
                            <FiPackage className="text-slate-300 text-sm" />
                        )}
                    </div>

                    {/* Title & SKU & Live Link */}
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[140px] sm:max-w-xs md:max-w-sm">
                                {anaUrunAdi || (isEditMode ? 'İsimsiz Ürün' : 'Yeni Ürün Oluştur')}
                            </h1>
                            {mevcutUrun?.stok_kodu && (
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 font-semibold flex-shrink-0">
                                    {mevcutUrun.stok_kodu}
                                </span>
                            )}
                            {isEditMode && mevcutUrun?.slug && (
                                <Link
                                    href={`/${locale}/products/${mevcutUrun.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-amber-600 hover:text-amber-700 inline-flex items-center gap-0.5 font-medium hover:underline flex-shrink-0"
                                    title="Sitede Canlı Önizle"
                                >
                                    <FiExternalLink size={11} />
                                    <span>Görüntüle</span>
                                </Link>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate hidden md:block">
                            {getKategoriHierarchy(seciliKategoriId) || 'Kategori seçilmedi'}
                        </p>
                    </div>
                </div>

                {/* Right: Actions (PINNED, flex-shrink-0, NEVER hidden or pushed off) */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Active Switch */}
                    <button
                        type="button"
                        onClick={() => setAktifDurum(!aktifDurum)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            aktifDurum 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${aktifDurum ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{aktifDurum ? 'Aktif' : 'Pasif'}</span>
                    </button>

                    {/* Featured (Önerilen) Switch */}
                    <button
                        type="button"
                        onClick={() => setIsFeaturedDurum(!isFeaturedDurum)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isFeaturedDurum 
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 shadow-2xs' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title="Önerilen Ürün (ElysonSweets Vitrin / Empfohlen)"
                    >
                        <span>⭐</span>
                        <span>{isFeaturedDurum ? 'Önerilen' : 'Önerilen Değil'}</span>
                    </button>

                    {/* Bestseller Switch */}
                    <button
                        type="button"
                        onClick={() => setIsBestsellerDurum(!isBestsellerDurum)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            isBestsellerDurum 
                                ? 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100 shadow-2xs' 
                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        title="Bestseller (Çok Satanlar)"
                    >
                        <span>🏆</span>
                        <span>{isBestsellerDurum ? 'Bestseller' : 'Standart'}</span>
                    </button>

                    {/* Delete Button */}
                    {isEditMode && isAdmin && mevcutUrun && (
                        <button
                            type="button"
                            onClick={async () => {
                                const name = mevcutUrun.ad?.[locale] || mevcutUrun.ad?.['tr'] || 'Ürün';
                                if (!confirm(`"${name}" ürününü silmek istediğinize emin misiniz?`)) return;
                                startTransition(async () => {
                                    const res = await deleteUrunAction(mevcutUrun.id, false, locale);
                                    if (res?.success) router.push(`/${locale}/admin/urun-yonetimi/urunler`);
                                    else toast.error(res?.message || 'Silme işlemi başarısız.');
                                });
                            }}
                            disabled={isPending}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                            title="Ürünü Sil"
                        >
                            <FiTrash2 size={15} />
                        </button>
                    )}

                    {/* Quick Save Button - Always front & center */}
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs font-bold text-xs sm:text-sm transition-all disabled:opacity-50 flex-shrink-0"
                        title="Kısayol: Ctrl + S"
                    >
                        {isPending ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                        <span>{isPending ? 'Kaydediliyor...' : 'Kaydet'}</span>
                        <span className="hidden sm:inline-block text-[9px] opacity-75 font-mono bg-amber-800/50 px-1 py-0.5 rounded">Ctrl+S</span>
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* 2. TOP KPI & BUSINESS SUMMARY (En Üstteki Kıymetli Özet Veri Barı)       */}
            {/* ========================================================================= */}
            {isEditMode && (
                <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 p-2 rounded-xl border border-slate-200 bg-slate-50/80 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-tight">Mevcut Stok</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-bold font-mono text-slate-900">{mevcutUrun.stok_miktari ?? 0}</span>
                            <span className="text-[10px] text-slate-500 truncate">{birimler.find(b => b.id === mevcutUrun.ana_satis_birimi_id)?.ad?.[locale] || 'Adet'}</span>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-tight">Kritik Eşik</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-bold font-mono text-slate-700">{mevcutUrun.stok_esigi ?? 0}</span>
                            <span className="text-[10px] text-slate-500">Min limit</span>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-tight">Alış Maliyeti</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-bold font-mono text-slate-900">€{Number(alisFiyati).toFixed(2)}</span>
                            <span className="text-[9px] text-slate-500">Net</span>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-tight">Toptancı</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-bold font-mono text-blue-700">€{Number(toptanFiyat).toFixed(2)}</span>
                            {toptanMargin && (
                                <span className={`text-[9px] font-bold ${toptanMargin.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    (%{toptanMargin.marginPct.toFixed(0)})
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                        <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-tight">Müşteri (B2C)</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-bold font-mono text-emerald-700">€{Number(musteriFiyat).toFixed(2)}</span>
                            {musteriMargin && (
                                <span className={`text-[9px] font-bold ${musteriMargin.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                    (%{musteriMargin.marginPct.toFixed(0)})
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs flex flex-col justify-between">
                        <span className="text-slate-500 block text-[9px] font-semibold uppercase tracking-tight">Son Hareket</span>
                        {stockLogs.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setShowTopHistory(!showTopHistory)}
                                className="text-left group cursor-pointer"
                                title="Hızlı özet tablosunu aç/kapat"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-emerald-600 font-mono text-xs block">
                                        +{stockLogs[0].miktar} {stockLogs[0].birim || ''}
                                    </span>
                                    <span className="text-[9px] text-amber-600 font-medium">
                                        {showTopHistory ? '▲' : '▼'}
                                    </span>
                                </div>
                                <span className="text-[9px] text-slate-500 group-hover:text-amber-600 transition-colors block truncate">
                                    {new Date(stockLogs[0].created_at).toLocaleDateString('tr-TR')}
                                </span>
                            </button>
                        ) : (
                            <span className="text-slate-400 text-xs">-</span>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 2.1 EXPANDABLE TOP STOCK & COST QUICK AUDIT LOG (Üst Hızlı Hareket Paneli)*/}
            {/* ========================================================================= */}
            {isEditMode && stockLogs.length > 0 && showTopHistory && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-3 shadow-xs animate-fadeIn">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-600 text-white rounded-md">
                                <FiClock size={14} />
                            </span>
                            <div>
                                <h4 className="text-xs font-bold text-slate-900">Son Stok ve Maliyet Hareketleri (Hızlı İnceleme)</h4>
                                <p className="text-[11px] text-slate-500">Bu ürün için sisteme işlenen son hareketlerin ve alış maliyetlerinin hızlı özeti</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('gecmis')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
                            >
                                <span>Tüm Detaylı Geçmiş Tablosuna Git ({stockLogs.length})</span>
                                <FiArrowRight size={12} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowTopHistory(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-white transition-colors"
                                title="Kapat"
                            >
                                <FiX size={15} />
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto custom-scrollbar rounded-lg border border-slate-200 bg-white">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-semibold">
                                <tr>
                                    <th className="px-3 py-2 text-left">Tarih</th>
                                    <th className="px-3 py-2 text-left">İşlem Türü</th>
                                    <th className="px-3 py-2 text-right">Miktar</th>
                                    <th className="px-3 py-2 text-center">Önceki → Yeni</th>
                                    <th className="px-3 py-2 text-right">Birim Maliyet</th>
                                    <th className="px-3 py-2 text-left">Belge No</th>
                                    <th className="px-3 py-2 text-left">Açıklama</th>
                                    <th className="px-3 py-2 text-left">İşlem Yapan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                                {stockLogs.slice(0, 5).map((log) => {
                                    const isPositive = log.miktar > 0;
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/80">
                                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-semibold ${
                                                    (log.hareket_tipi === 'Giris' || log.islem_turu === 'giris') ? 'bg-emerald-100 text-emerald-800' :
                                                    (log.hareket_tipi === 'Cikis' || log.islem_turu === 'cikis') ? 'bg-rose-100 text-rose-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {log.hareket_tipi || log.islem_turu || 'Hareket'}
                                                </span>
                                            </td>
                                            <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {isPositive ? `+${log.miktar}` : log.miktar} {log.birim || ''}
                                            </td>
                                            <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">
                                                {log.onceki_stok ?? '-'} → <span className="font-semibold text-slate-800">{log.sonraki_stok ?? '-'}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                                                {log.birim_maliyet ? `€${Number(log.birim_maliyet).toFixed(2)}` : (log.kaynak ? log.kaynak : '-')}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 font-sans whitespace-nowrap">
                                                {log.fatura_belge_no || log.kaynak || '-'}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 font-sans max-w-[200px] truncate">
                                                {log.aciklama || '-'}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600 font-sans text-[11px] whitespace-nowrap">
                                                {log.yapan_user_adi || log.yapan_user_email || (log.profiles ? `${log.profiles.ad || ''} ${log.profiles.soyad || ''}`.trim() : '-')}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* 3. ERP TAB NAVIGATION BAR (Wrap Pills - 100% visible on all screens)     */}
            {/* ========================================================================= */}
            <div className="bg-slate-100/90 p-1.5 rounded-xl border border-slate-200">
                <nav className="flex flex-wrap items-center gap-1.5" aria-label="Tabs">
                    {[
                        { key: 'genel' as TabKey, label: 'Genel Bilgiler', shortLabel: 'Genel', icon: FiLayers },
                        { key: 'fiyat-stok' as TabKey, label: 'Fiyat & KDV Matrisi', shortLabel: 'Fiyat & KDV', icon: FiDollarSign },
                        ...(isEditMode ? [{ key: 'gecmis' as TabKey, label: `Stok Geçmişi (${stockLogs.length})`, shortLabel: `Stok (${stockLogs.length})`, icon: FiClock }] : []),
                        { key: 'lojistik' as TabKey, label: 'Lojistik & Koli', shortLabel: 'Lojistik', icon: FiPackage },
                        { key: 'saklama-spekt' as TabKey, label: 'Saklama & Spekt', shortLabel: 'Saklama', icon: FiThermometer },
                        { key: 'besin-alerjen' as TabKey, label: 'Besin & Alerjen', shortLabel: 'Besin', icon: FiActivity },
                        { key: 'medya' as TabKey, label: `Görseller (${galeriOnizlemeler.length + (anaResimOnizleme ? 1 : 0)})`, shortLabel: `Görseller (${galeriOnizlemeler.length + (anaResimOnizleme ? 1 : 0)})`, icon: FiImage },
                    ].map(tab => {
                        const Icon = tab.icon;
                        const isCurrent = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                                    isCurrent 
                                        ? 'bg-amber-600 text-white shadow-xs font-bold' 
                                        : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-slate-200/90 shadow-2xs'
                                }`}
                            >
                                <Icon size={14} className={isCurrent ? 'text-white' : 'text-slate-400'} />
                                <span className="hidden xl:inline">{tab.label}</span>
                                <span className="xl:hidden">{tab.shortLabel}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ========================================================================= */}
            {/* 4. TAB CONTENTS                                                          */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs">

                {/* --------------------------------------------------------------------- */}
                {/* TAB 1: GENEL & DİLLER                                                 */}
                {/* --------------------------------------------------------------------- */}
                <div className={activeTab === 'genel' ? 'space-y-6' : 'hidden'}>
                    {/* Basic Meta Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
                        {/* Kategori Tree Picker */}
                        <div className="md:col-span-2">
                            <label className={labelClasses}>Kategori <span className="text-red-500">*</span></label>
                            <input type="hidden" name="kategori_id" value={seciliKategoriId || ''} />
                            {!seciliKategoriId && (
                                <input aria-hidden tabIndex={-1} required readOnly value="" style={{ opacity: 0, height: 0, position: 'absolute' }} />
                            )}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 p-2 border border-slate-300 rounded-md bg-slate-50 text-xs font-semibold text-slate-800 truncate">
                                    {getKategoriHierarchy(seciliKategoriId) || 'Kategori Seçilmedi'}
                                </div>
                            </div>
                            {/* Fast Kategori Dropdown / Select */}
                            <CategoryFilterSelect
                                categories={kategoriler}
                                value={seciliKategoriId || ''}
                                onChange={(val) => setAltKategoriId(val || null)}
                                locale={locale}
                                showCounts={false}
                                allCategoriesLabel="-- Kategori Seçin --"
                                className={`${inputClasses} mt-1.5`}
                            />
                        </div>

                        {/* Ürün Gamı */}
                        <div>
                            <label className={labelClasses}>Ürün Gamı (Sıcaklık / Donuk)</label>
                            <select
                                value={manuelUrunGami}
                                onChange={(e) => setManuelUrunGami(e.target.value as ProductLineKey | 'auto')}
                                className={inputClasses}
                            >
                                <option value="auto">Otomatik (Kategoriye Göre)</option>
                                <option value="frozen-desserts">Donuk Ürün (-18°C)</option>
                                <option value="barista-bakery-essentials">Donuk Olmayan (Ambient / Şurup / Sos)</option>
                            </select>
                            <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                                seciliUrunGami === 'frozen-desserts' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {seciliUrunGami ? getProductLineLabel(seciliUrunGami, locale) : 'Belirlenmedi'}
                            </span>
                        </div>

                        {/* Tedarikçi */}
                        <div>
                            <label className={labelClasses}>Tedarikçi</label>
                            <select
                                name="tedarikci_id"
                                id="tedarikci_id"
                                defaultValue={normalizedSupplierValue || ''}
                                className={inputClasses}
                            >
                                <option value="">Tedarikçi Yok</option>
                                {supplierOptions.map((t) => (
                                    <option key={t.id} value={t.id}>{t.unvan}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Operational Codes (SKU, EAN, Slug, Unit) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-slate-200">
                        <div>
                            <label htmlFor="stok_kodu" className={labelClasses}>SKU / Stok Kodu</label>
                            <input
                                type="text"
                                name="stok_kodu"
                                id="stok_kodu"
                                defaultValue={mevcutUrun?.stok_kodu || ''}
                                className={`${inputClasses} font-mono`}
                                placeholder="örn: FO-SYR-001"
                            />
                        </div>

                        <div>
                            <label htmlFor="ean_gtin" className={labelClasses}>EAN / Barkod (GTIN-13)</label>
                            <input
                                type="text"
                                name="ean_gtin"
                                id="ean_gtin"
                                defaultValue={mevcutUrun?.ean_gtin || ''}
                                className={`${inputClasses} font-mono`}
                                placeholder="örn: 8697412345678"
                            />
                        </div>

                        <div>
                            <label htmlFor="slug" className={labelClasses}>URL Slug</label>
                            <input
                                type="text"
                                name="slug"
                                id="slug"
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                className={`${inputClasses} font-mono text-xs`}
                                placeholder="fo-karamel-surup-700ml"
                            />
                        </div>

                        <div>
                            <label htmlFor="ana_satis_birimi_id" className={labelClasses}>Satış Birimi</label>
                            <select
                                name="ana_satis_birimi_id"
                                id="ana_satis_birimi_id"
                                defaultValue={mevcutUrun?.ana_satis_birimi_id || ''}
                                className={inputClasses}
                            >
                                <option value="">Birim Seçin</option>
                                {birimler.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {(b.ad as any)?.[locale] || (b.ad as any)?.['tr'] || (b.ad as any)?.['de'] || b.id}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Multilingual Text Editor (DE, TR, EN, AR) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiFileText /> Çok Dilli İçerik (Ürün Adı ve Açıklama)
                            </h3>
                            {/* Language Pills */}
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                                {diller.map(d => (
                                    <button
                                        key={d.kod}
                                        type="button"
                                        onClick={() => setAktifDil(d.kod)}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                                            aktifDil === d.kod ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        {d.label} ({d.kod.toUpperCase()})
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                            {diller.map(d => (
                                <div key={d.kod} className={aktifDil === d.kod ? 'space-y-4' : 'hidden'}>
                                    <div>
                                        <label htmlFor={`ad_${d.kod}`} className={labelClasses}>
                                            Ürün Adı ({d.label})
                                        </label>
                                        <input
                                            type="text"
                                            name={`ad_${d.kod}`}
                                            id={`ad_${d.kod}`}
                                            defaultValue={mevcutUrun?.ad?.[d.kod] || ''}
                                            onChange={(e) => handleAdChange(e, d.kod)}
                                            className={inputClasses}
                                            placeholder={`Ürünün ${d.label} adı`}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor={`aciklamalar_${d.kod}`} className={labelClasses}>
                                            Ürün Açıklaması & Kullanım Alanları ({d.label})
                                        </label>
                                        <textarea
                                            name={`aciklamalar_${d.kod}`}
                                            id={`aciklamalar_${d.kod}`}
                                            rows={5}
                                            defaultValue={mevcutUrun?.aciklamalar?.[d.kod] || ''}
                                            className={inputClasses}
                                            placeholder={`Ürünün ${d.label} detaylı açıklaması`}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Vitrin ve Öne Çıkarma Yönetimi */}
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-2xs space-y-3">
                        <div>
                            <h4 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                                <span>⭐</span> ElysonSweets Vitrin &amp; Öne Çıkarma Ayarları
                            </h4>
                            <p className="text-xs text-amber-850">
                                Bu ürünün web sitesi ana sayfasında, B2B portalında ve katalogda özel vitrinde gösterilmesini buradan yönetebilirsiniz.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                            {/* Önerilen Ürün (Empfohlen) */}
                            <label className="flex items-start gap-3 p-3 bg-white border border-amber-200 rounded-lg cursor-pointer hover:bg-amber-50/50 transition">
                                <input
                                    type="checkbox"
                                    name="is_featured"
                                    checked={isFeaturedDurum}
                                    onChange={(e) => setIsFeaturedDurum(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-slate-800 flex items-center gap-1">
                                        ⭐ Önerilen Ürün (Empfohlen)
                                    </span>
                                    <p className="text-slate-500 mt-0.5">
                                        Web sitesi ana sayfasında ve portal önerilenler vitrininde listelenir.
                                    </p>
                                </div>
                            </label>

                            {/* Bestseller (Çok Satan) */}
                            <label className="flex items-start gap-3 p-3 bg-white border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50/50 transition">
                                <input
                                    type="checkbox"
                                    name="is_bestseller"
                                    checked={isBestsellerDurum}
                                    onChange={(e) => setIsBestsellerDurum(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-slate-800 flex items-center gap-1">
                                        🏆 Bestseller (Çok Satanlar)
                                    </span>
                                    <p className="text-slate-500 mt-0.5">
                                        Bestseller etiketi alır ve çok satanlar reyonunda öncelikli gösterilir.
                                    </p>
                                </div>
                            </label>

                            {/* Vitrin Sıralaması */}
                            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1">
                                <label className="text-xs font-bold text-slate-800 block">
                                    Vitrin Sıralama Önceliği
                                </label>
                                <input
                                    type="number"
                                    name="featured_sira"
                                    value={featuredSira}
                                    onChange={(e) => setFeaturedSira(Number(e.target.value) || 0)}
                                    className="w-full px-2.5 py-1 text-sm border border-slate-300 rounded font-mono"
                                    placeholder="0"
                                />
                                <p className="text-[11px] text-slate-400">
                                    Küçük numaralar (1, 2, 3...) önce gösterilir.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------------------- */}
                {/* TAB 2: FİYATLANDIRMA & KÂRLILIK (EXCEL MATRİSİ)                       */}
                {/* --------------------------------------------------------------------- */}
                <div className={activeTab === 'fiyat-stok' ? 'space-y-6' : 'hidden'}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiDollarSign className="text-emerald-600" /> B2B Fiyatlandırma & Kârlılık Matrisi
                            </h3>
                            <p className="text-xs text-slate-500">Tüm satış kanalları için net fiyatları, KDV oranını ve otomatik hesaplanan brüt tutarları yönetin.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">KDV Oranı:</label>
                            <select
                                name="almanya_kdv_orani"
                                value={kdvOrani}
                                onChange={(e) => setKdvOrani(Number(e.target.value))}
                                className="px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold bg-white"
                            >
                                <option value={7}>%7 (İndirimli / Gıda)</option>
                                <option value={19}>%19 (Standart / Almanya)</option>
                                <option value={0}>%0 (İstisna / Muaf)</option>
                            </select>
                        </div>
                    </div>

                    {/* Excel-like Pricing Matrix Table */}
                    <div className="overflow-x-auto custom-scrollbar border border-slate-300 rounded-lg shadow-2xs">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                                    <th className="px-3 py-2 font-bold w-1/4">Kanal / Kademe</th>
                                    <th className="px-3 py-2 font-bold w-1/4">Net Satış Fiyatı (€)</th>
                                    <th className="px-3 py-2 font-bold w-1/6">Brüt Tutar (KDV Dahil)</th>
                                    <th className="px-3 py-2 font-bold w-1/6">Birim Kâr (€)</th>
                                    <th className="px-3 py-2 font-bold w-1/6">Kâr Marjı (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {/* Alış Maliyeti */}
                                <tr className="bg-amber-50/40">
                                    <td className="px-3 py-2.5 font-bold text-slate-800">
                                        Distributor Alış Maliyeti (Cost)
                                        <span className="block text-[10px] text-slate-500 font-normal">Üreticiden geliş net maliyeti</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="distributor_alis_fiyati"
                                                value={alisFiyati}
                                                onChange={(e) => setAlisFiyati(Number(e.target.value))}
                                                className={`${denseInputClasses} pl-6 bg-amber-50/60 font-bold`}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-600">
                                        €{(alisFiyati * (1 + kdvOrani / 100)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-400">-</td>
                                    <td className="px-3 py-2 font-mono text-slate-400">Baz Maliyet</td>
                                </tr>

                                {/* Toptancı Fiyatı */}
                                <tr>
                                    <td className="px-3 py-2.5 font-bold text-blue-900">
                                        Toptancı Satış Fiyatı (Wholesale)
                                        <span className="block text-[10px] text-slate-500 font-normal">Büyük toptan alıcılar</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="satis_fiyati_toptanci"
                                                value={toptanFiyat}
                                                onChange={(e) => setToptanFiyat(Number(e.target.value))}
                                                className={`${denseInputClasses} pl-6 font-bold text-blue-800`}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-700">
                                        €{(toptanFiyat * (1 + kdvOrani / 100)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                                        {toptanMargin ? `€${toptanMargin.profit.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                        {toptanMargin && (
                                            <span className={`px-2 py-0.5 rounded font-bold ${
                                                toptanMargin.marginPct >= 20 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                %{toptanMargin.marginPct.toFixed(1)}
                                            </span>
                                        )}
                                    </td>
                                </tr>

                                {/* Alt Bayi Fiyatı */}
                                <tr>
                                    <td className="px-3 py-2.5 font-bold text-slate-800">
                                        Alt Bayi Satış Fiyatı (Reseller)
                                        <span className="block text-[10px] text-slate-500 font-normal">B2B Alt bayiler / Partnerler</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="satis_fiyati_alt_bayi"
                                                value={altBayiFiyat}
                                                onChange={(e) => setAltBayiFiyat(Number(e.target.value))}
                                                className={`${denseInputClasses} pl-6 font-bold`}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-700">
                                        €{(altBayiFiyat * (1 + kdvOrani / 100)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                                        {altBayiMargin ? `€${altBayiMargin.profit.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                        {altBayiMargin && (
                                            <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                                                %{altBayiMargin.marginPct.toFixed(1)}
                                            </span>
                                        )}
                                    </td>
                                </tr>

                                {/* Müşteri Satış (B2C / Katalog) */}
                                <tr>
                                    <td className="px-3 py-2.5 font-bold text-emerald-900">
                                        Müşteri Satış Fiyatı (B2C / Liste)
                                        <span className="block text-[10px] text-slate-500 font-normal">Web sitesi / Son kullanıcı fiyatı</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="satis_fiyati_musteri"
                                                value={musteriFiyat}
                                                onChange={(e) => setMusteriFiyat(Number(e.target.value))}
                                                className={`${denseInputClasses} pl-6 font-bold text-emerald-800`}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-700">
                                        €{(musteriFiyat * (1 + kdvOrani / 100)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                                        {musteriMargin ? `€${musteriMargin.profit.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                        {musteriMargin && (
                                            <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                                                %{musteriMargin.marginPct.toFixed(1)}
                                            </span>
                                        )}
                                    </td>
                                </tr>

                                {/* Palet Satış Fiyatı */}
                                <tr>
                                    <td className="px-3 py-2.5 font-bold text-slate-800">
                                        Palet Satış Fiyatı
                                        <span className="block text-[10px] text-slate-500 font-normal">Tam palet alımlarında geçerli birim fiyat</span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="relative">
                                            <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">€</span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="satis_fiyati_palet"
                                                value={paletFiyat}
                                                onChange={(e) => setPaletFiyat(Number(e.target.value))}
                                                className={`${denseInputClasses} pl-6 font-bold`}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 font-mono text-slate-700">
                                        €{(paletFiyat * (1 + kdvOrani / 100)).toFixed(2)}
                                    </td>
                                    <td className="px-3 py-2 font-mono font-semibold text-slate-800">
                                        {calcMargin(paletFiyat) ? `€${calcMargin(paletFiyat)!.profit.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="px-3 py-2 font-mono">
                                        {calcMargin(paletFiyat) && (
                                            <span className="px-2 py-0.5 rounded font-bold bg-blue-100 text-blue-800">
                                                %{calcMargin(paletFiyat)!.marginPct.toFixed(1)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Stock & Operational Indicators */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                        <div>
                            <label htmlFor="stok_miktari" className={labelClasses}>Mevcut Depo Stok Miktarı</label>
                            <input
                                type="number"
                                name="stok_miktari"
                                id="stok_miktari"
                                defaultValue={mevcutUrun?.stok_miktari ?? 0}
                                className={`${inputClasses} font-mono font-bold`}
                            />
                        </div>
                        <div>
                            <label htmlFor="stok_esigi" className={labelClasses}>Kritik Stok Uyarı Eşiği</label>
                            <input
                                type="number"
                                name="stok_esigi"
                                id="stok_esigi"
                                defaultValue={mevcutUrun?.stok_esigi ?? 10}
                                className={`${inputClasses} font-mono`}
                            />
                        </div>
                        <div className="flex items-center pt-6">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                                <input
                                    type="checkbox"
                                    name="karlilik_alarm_aktif"
                                    defaultChecked={mevcutUrun?.karlilik_alarm_aktif ?? true}
                                    className="w-4 h-4 text-amber-600 rounded"
                                />
                                <span>Kârlılık Alarmı Aktif (Maliyet sapmasında uyar)</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------------------- */}
                {/* TAB 3: AMBALAJ & LOJİSTİK (LOJİSTİK KARTI)                            */}
                {/* --------------------------------------------------------------------- */}
                <div className={activeTab === 'lojistik' ? 'space-y-6' : 'hidden'}>
                    <div className="pb-2 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FiPackage className="text-blue-600" /> Ambalaj Hiyerarşisi & Nakliye Verileri
                        </h3>
                        <p className="text-xs text-slate-500">Birim, koli ve palet lojistik parametreleri paletleme optimizasyonunda kullanılır.</p>
                    </div>

                    {/* 3-Tier Packaging Hierarchy Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* 1. Birim Ürün */}
                        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase pb-2 border-b border-slate-200">
                                <span>1. Birim Ürün</span>
                            </div>
                            <div>
                                <label htmlFor="birim_agirlik_kg" className={labelClasses}>Birim Ağırlık (kg)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    name="birim_agirlik_kg"
                                    id="birim_agirlik_kg"
                                    defaultValue={mevcutUrun?.birim_agirlik_kg ?? ''}
                                    className={`${denseInputClasses} font-bold`}
                                    placeholder="örn: 1.000 veya 0.700"
                                />
                            </div>
                            <div>
                                <label htmlFor="teknik_hacim_ml" className={labelClasses}>Hacim (ml)</label>
                                <input
                                    type="number"
                                    name="teknik_hacim_ml"
                                    id="teknik_hacim_ml"
                                    defaultValue={tech.hacim_ml || ''}
                                    className={denseInputClasses}
                                    placeholder="örn: 700 veya 1000"
                                />
                            </div>
                        </div>

                        {/* 2. Koli Bilgileri */}
                        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-blue-900 uppercase pb-2 border-b border-blue-200">
                                <FiPackage /> 2. Koli Ambalajı
                            </div>
                            <div>
                                <label htmlFor="koli_ici_adet" className={labelClasses}>Koli İçi Adet (Flaschen/Stück)</label>
                                <input
                                    type="number"
                                    name="koli_ici_adet"
                                    id="koli_ici_adet"
                                    defaultValue={mevcutUrun?.koli_ici_adet ?? ''}
                                    className={`${denseInputClasses} font-bold text-blue-900`}
                                    placeholder="örn: 6 veya 12"
                                />
                            </div>
                            <div>
                                <label htmlFor="koli_ici_kutu_adet" className={labelClasses}>Koli İçi Kutu / Paket</label>
                                <input
                                    type="number"
                                    name="koli_ici_kutu_adet"
                                    id="koli_ici_kutu_adet"
                                    defaultValue={mevcutUrun?.koli_ici_kutu_adet ?? ''}
                                    className={denseInputClasses}
                                    placeholder="örn: 1"
                                />
                            </div>
                        </div>

                        {/* 3. Palet Bilgileri */}
                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase pb-2 border-b border-emerald-200">
                                <FiTruck /> 3. Palet Bilgileri
                            </div>
                            <div>
                                <label htmlFor="palet_ici_koli_adet" className={labelClasses}>Palet İçi Koli Sayısı</label>
                                <input
                                    type="number"
                                    name="palet_ici_koli_adet"
                                    id="palet_ici_koli_adet"
                                    defaultValue={mevcutUrun?.palet_ici_koli_adet ?? ''}
                                    className={`${denseInputClasses} font-bold text-emerald-900`}
                                    placeholder="örn: 80 veya 100"
                                />
                            </div>
                            <div>
                                <label htmlFor="palet_ici_adet" className={labelClasses}>Palet İçi Toplam Adet</label>
                                <input
                                    type="number"
                                    name="palet_ici_adet"
                                    id="palet_ici_adet"
                                    defaultValue={mevcutUrun?.palet_ici_adet ?? ''}
                                    className={denseInputClasses}
                                    placeholder="örn: 480 veya 960"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logistics, MOQ & Delivery Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                        <div>
                            <label htmlFor="lojistik_sinifi" className={labelClasses}>Lojistik Sınıfı</label>
                            <select
                                name="lojistik_sinifi"
                                id="lojistik_sinifi"
                                defaultValue={mevcutUrun?.lojistik_sinifi || 'dry-load'}
                                className={inputClasses}
                            >
                                <option value="dry-load">Trockenware / Ambient (Oda Sıcaklığı / Kuru Yük)</option>
                                <option value="cold-chain">Kühlware / Tiefkühl (Soğuk Zincir / Donuk)</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="lieferzeit_werktage" className={labelClasses}>Teslimat Süresi (İş Günü)</label>
                            <input
                                type="number"
                                name="lieferzeit_werktage"
                                id="lieferzeit_werktage"
                                defaultValue={mevcutUrun?.lieferzeit_werktage ?? mu.lieferzeit_tage ?? 3}
                                className={inputClasses}
                                placeholder="örn: 2-3"
                            />
                        </div>

                        <div>
                            <label htmlFor="mindest_bestellmenge" className={labelClasses}>Minimum Sipariş (MOQ)</label>
                            <input
                                type="number"
                                name="mindest_bestellmenge"
                                id="mindest_bestellmenge"
                                defaultValue={mevcutUrun?.mindest_bestellmenge ?? mu.mindestbestellmenge ?? 1}
                                className={inputClasses}
                            />
                        </div>

                        <div>
                            <label htmlFor="mindest_bestellmenge_einheit" className={labelClasses}>MOQ Birimi</label>
                            <input
                                type="text"
                                name="mindest_bestellmenge_einheit"
                                id="mindest_bestellmenge_einheit"
                                defaultValue={mevcutUrun?.mindest_bestellmenge_einheit || 'Koli'}
                                className={inputClasses}
                            />
                        </div>
                    </div>

                    {/* Menşei ve Üretici */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                        <div>
                            <label htmlFor="hersteller_name" className={labelClasses}>Üretici Firma</label>
                            <input
                                type="text"
                                name="hersteller_name"
                                id="hersteller_name"
                                defaultValue={mevcutUrun?.hersteller_name || 'ÖZMER PASTACILIK A.Ş.'}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label htmlFor="hersteller_land" className={labelClasses}>Üretici Ülke</label>
                            <input
                                type="text"
                                name="hersteller_land"
                                id="hersteller_land"
                                defaultValue={mevcutUrun?.hersteller_land || 'Türkiye'}
                                className={inputClasses}
                            />
                        </div>
                        <div>
                            <label htmlFor="herkunftsland_de" className={labelClasses}>Menşei Ülke (DE/TR)</label>
                            <input
                                type="text"
                                name="herkunftsland_de"
                                id="herkunftsland_de"
                                defaultValue={herkunft.de || 'Türkei'}
                                className={inputClasses}
                            />
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------------------- */}
                {/* TAB 4: SAKLAMA & ŞARTNAME (SPEKTLER)                                   */}
                {/* --------------------------------------------------------------------- */}
                <div className={activeTab === 'saklama-spekt' ? 'space-y-6' : 'hidden'}>
                    <div className="pb-2 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FiThermometer className="text-rose-600" /> Saklama Koşulları, Sıcaklık Dereceleri & Şartnameler
                        </h3>
                        <p className="text-xs text-slate-500">Üretici fabrika spesifikasyonlarından teyit edilen sıcaklık aralıkları ve raf ömrü parametreleri.</p>
                    </div>

                    {/* Storage & Shelf Life Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                        <div>
                            <label htmlFor="lagertemperatur_min_celsius" className={labelClasses}>
                                Min. Saklama Sıcaklığı (°C) <span className="text-amber-600 font-bold">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    name="lagertemperatur_min_celsius"
                                    id="lagertemperatur_min_celsius"
                                    defaultValue={mevcutUrun?.lagertemperatur_min_celsius ?? 20}
                                    className={`${inputClasses} font-mono font-bold text-blue-700`}
                                />
                                <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">°C</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block">Fabrika Spekti: 20°C</span>
                        </div>

                        <div>
                            <label htmlFor="lagertemperatur_max_celsius" className={labelClasses}>
                                Max. Saklama Sıcaklığı (°C) <span className="text-amber-600 font-bold">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    name="lagertemperatur_max_celsius"
                                    id="lagertemperatur_max_celsius"
                                    defaultValue={mevcutUrun?.lagertemperatur_max_celsius ?? 22}
                                    className={`${inputClasses} font-mono font-bold text-red-700`}
                                />
                                <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">°C</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block">Fabrika Spekti: 22°C</span>
                        </div>

                        <div>
                            <label htmlFor="haltbarkeit_monate" className={labelClasses}>
                                Kapalı Ambalaj Raf Ömrü (Ay) <span className="text-amber-600 font-bold">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="haltbarkeit_monate"
                                    id="haltbarkeit_monate"
                                    defaultValue={mevcutUrun?.haltbarkeit_monate ?? 24}
                                    className={`${inputClasses} font-mono font-bold text-slate-800`}
                                />
                                <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">Ay</span>
                            </div>
                            <span className="text-[11px] text-slate-500 mt-1 block">24 ay (2 yıl) veya 36 ay (3 yıl)</span>
                        </div>
                    </div>

                    {/* PDF Specification URL */}
                    <div>
                        <label htmlFor="produktdatenblatt_url" className={labelClasses}>Produktdatenblatt / Spekt PDF Dosya URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                name="produktdatenblatt_url"
                                id="produktdatenblatt_url"
                                defaultValue={mevcutUrun?.produktdatenblatt_url || ''}
                                className={`${inputClasses} font-mono text-xs`}
                                placeholder="https://..."
                            />
                            {mevcutUrun?.produktdatenblatt_url && (
                                <a
                                    href={mevcutUrun.produktdatenblatt_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-md border border-slate-300 text-xs font-bold flex items-center gap-1.5"
                                >
                                    <FiExternalLink /> Aç
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Sertifikalar */}
                    <div>
                        <label className={labelClasses}>Uluslararası Kalite Sertifikaları</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-1">
                            {['Halal', 'Kosher', 'ISO 22000', 'BRCGS', 'IFS Food', 'Vegan'].map(cert => {
                                const isChecked = mevcutUrun?.zertifikate?.includes(cert) ?? false;
                                return (
                                    <label
                                        key={cert}
                                        className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                                    >
                                        <input
                                            type="checkbox"
                                            name={`cert_${cert}`}
                                            defaultChecked={isChecked}
                                            className="w-4 h-4 text-amber-600 rounded"
                                        />
                                        <span className="text-xs font-semibold text-slate-700">{cert}</span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------------------- */}
                {/* TAB 5: BESİN DEĞERLERİ & ALERJENLER (EXCEL BESİN TABLOSU)             */}
                {/* --------------------------------------------------------------------- */}
                <div className={activeTab === 'besin-alerjen' ? 'space-y-6' : 'hidden'}>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FiActivity className="text-emerald-600" /> Besin Değerleri Tablosu (Nährwerttabelle)
                            </h3>
                            <p className="text-xs text-slate-500">Excel düzeninde hızlı veri girişi (Tab tuşu ile sonraki hücreye geçebilirsiniz).</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs font-semibold text-slate-700">Porsiyon Bazı:</label>
                            <select
                                name="naehrwerte_pro"
                                defaultValue={naehrEinheit}
                                className="px-2 py-1 text-xs border border-slate-300 rounded font-semibold bg-white"
                            >
                                <option value="100g">100 g için</option>
                                <option value="100ml">100 ml için</option>
                            </select>
                        </div>
                    </div>

                    {/* Excel-like 2-Column Nutrition Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 max-w-4xl p-4 bg-slate-50/60 rounded-xl border border-slate-200">
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Enerji (kJ)</span>
                            <input type="number" step="0.1" name="naehrwert_energie_kj" defaultValue={naehr.energie_kj || ''} className={`${denseInputClasses} w-32 font-bold`} placeholder="kJ" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Enerji (kcal)</span>
                            <input type="number" step="0.1" name="naehrwert_energie_kcal" defaultValue={naehr.energie_kcal || ''} className={`${denseInputClasses} w-32 font-bold text-amber-700`} placeholder="kcal" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Toplam Yağ (g)</span>
                            <input type="number" step="0.1" name="naehrwert_fett" defaultValue={naehr.fett || ''} className={`${denseInputClasses} w-32`} placeholder="g" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Doymuş Yağ (g)</span>
                            <input type="number" step="0.1" name="naehrwert_davon_gesaettigt" defaultValue={naehr.davon_gesaettigt || ''} className={`${denseInputClasses} w-32`} placeholder="g" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Karbonhidrat (g)</span>
                            <input type="number" step="0.1" name="naehrwert_kohlenhydrate" defaultValue={naehr.kohlenhydrate || ''} className={`${denseInputClasses} w-32`} placeholder="g" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Şeker (g)</span>
                            <input type="number" step="0.1" name="naehrwert_davon_zucker" defaultValue={naehr.davon_zucker || ''} className={`${denseInputClasses} w-32 font-bold text-amber-700`} placeholder="g" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Protein (g)</span>
                            <input type="number" step="0.1" name="naehrwert_eiweiss" defaultValue={naehr.eiweiss || ''} className={`${denseInputClasses} w-32`} placeholder="g" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200">
                            <span className="text-xs font-semibold text-slate-700">Tuz (g)</span>
                            <input type="number" step="0.01" name="naehrwert_salz" defaultValue={naehr.salz || ''} className={`${denseInputClasses} w-32`} placeholder="g" />
                        </div>
                        <div className="flex items-center justify-between gap-4 p-1.5 bg-white rounded border border-slate-200 md:col-span-2">
                            <span className="text-xs font-semibold text-slate-700">Diyet Lifi (g)</span>
                            <input type="number" step="0.1" name="naehrwert_ballaststoffe" defaultValue={naehr.ballaststoffe || ''} className={`${denseInputClasses} w-32`} placeholder="g" />
                        </div>
                    </div>

                    {/* Inhaltsstoffe (4 Sprachen) */}
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">İçindekiler Listesi (Inhaltsstoffe)</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="inhaltsstoffe_de" className={labelClasses}>Almanca (DE)</label>
                                <textarea name="inhaltsstoffe_de" id="inhaltsstoffe_de" rows={3} defaultValue={inhalts.de || ''} className={inputClasses} placeholder="Zutaten: ..." />
                            </div>
                            <div>
                                <label htmlFor="inhaltsstoffe_tr" className={labelClasses}>Türkçe (TR)</label>
                                <textarea name="inhaltsstoffe_tr" id="inhaltsstoffe_tr" rows={3} defaultValue={inhalts.tr || ''} className={inputClasses} placeholder="İçindekiler: ..." />
                            </div>
                            <div>
                                <label htmlFor="inhaltsstoffe_en" className={labelClasses}>İngilizce (EN)</label>
                                <textarea name="inhaltsstoffe_en" id="inhaltsstoffe_en" rows={3} defaultValue={inhalts.en || ''} className={inputClasses} placeholder="Ingredients: ..." />
                            </div>
                            <div>
                                <label htmlFor="inhaltsstoffe_ar" className={labelClasses}>Arapça (AR)</label>
                                <textarea name="inhaltsstoffe_ar" id="inhaltsstoffe_ar" rows={3} defaultValue={inhalts.ar || ''} className={inputClasses} placeholder="المكونات: ..." />
                            </div>
                        </div>
                    </div>

                    {/* Allergene (EU 14) */}
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Alerjen Matrisi (EU 14)</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                            {['gluten', 'krebstiere', 'eier', 'fisch', 'erdnuesse', 'soja', 'milch', 'schalen', 'sellerie', 'senf', 'sesam', 'sulfite', 'lupinen', 'weichtiere'].map(allergen => (
                                <div key={allergen} className="p-2 rounded border border-slate-200 bg-white space-y-1 shadow-2xs">
                                    <span className="text-[11px] font-bold text-slate-800 block capitalize truncate">{allergen}</span>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-600">
                                        <input type="checkbox" name={`allergen_${allergen}`} defaultChecked={allerg[allergen] || false} className="rounded text-red-600" />
                                        <span>İçerir</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-slate-500">
                                        <input type="checkbox" name={`allergen_${allergen}_spuren`} defaultChecked={allerg[`${allergen}_spuren`] || false} className="rounded text-amber-500" />
                                        <span>İz miktarda</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Features / Badges & Flavors */}
                    <div className="pt-4 border-t border-slate-200">
                        <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Diyet Rozetleri & Özellikler</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                            {[
                                { key: 'vegan', label: 'Vegan' },
                                { key: 'vegetarisch', label: 'Vejetaryen' },
                                { key: 'glutenfrei', label: 'Glutensiz' },
                                { key: 'laktosefrei', label: 'Laktozsuz' },
                                { key: 'bio', label: 'Bio / Organik' },
                                { key: 'ohne_zucker', label: 'Şekersiz' },
                                { key: 'dogal_icerik', label: 'Doğal İçerik' },
                                { key: 'katkisiz', label: 'Katkısız' },
                                { key: 'koruyucusuz', label: 'Koruyucusuz' },
                                { key: 'pompa_uyumlu', label: 'Pompa Uyumlu' },
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer shadow-2xs">
                                    <input
                                        type="checkbox"
                                        name={`eigenschaft_${item.key}`}
                                        defaultChecked={tech[item.key] === true}
                                        className="w-4 h-4 text-emerald-600 rounded"
                                    />
                                    <span className="text-xs font-medium text-slate-700">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------------------- */}
                {/* TAB 6: MEDYA & GÖRSELLER                                              */}
                {/* --------------------------------------------------------------------- */}
                <div className={activeTab === 'medya' ? 'space-y-6' : 'hidden'}>
                    <div className="pb-2 border-b border-slate-200">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <FiImage className="text-purple-600" /> Ürün Görsel Yönetimi
                        </h3>
                        <p className="text-xs text-slate-500">Ana ürün görseli ve katalog çoklu galeri resimlerini yükleyin.</p>
                    </div>

                    {/* Ana Resim */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-6">
                        <div className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-white overflow-hidden shadow-2xs flex-shrink-0">
                            {anaResimOnizleme ? (
                                <Image src={anaResimOnizleme} alt="Preview" width={112} height={112} className="object-contain w-full h-full p-1" />
                            ) : (
                                <FiImage className="text-slate-300 text-3xl" />
                            )}
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-slate-800 block">Ana Ürün Görseli (Kapak)</span>
                            <input type="file" id="ana-resim-input" className="hidden" onChange={handleAnaResimChange} accept="image/png, image/jpeg, image/webp" />
                            <label htmlFor="ana-resim-input" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all shadow-xs">
                                <FiUploadCloud /> {anaResimOnizleme ? 'Görseli Değiştir' : 'Yeni Görsel Yükle'}
                            </label>
                            <p className="text-[11px] text-slate-500">Önerilen: 800x800 veya 1000x1000 PNG, WEBP, JPG (Maks {MAX_IMAGE_SIZE_LABEL})</p>
                        </div>
                    </div>

                    {/* Galeri Resimleri */}
                    <div>
                        <span className="text-xs font-bold text-slate-800 block mb-3">Çoklu Galeri Görselleri</span>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                            {galeriOnizlemeler.map((bild, index) => (
                                <div key={bild.id} className="relative aspect-square rounded-xl border border-slate-200 bg-white overflow-hidden group shadow-2xs">
                                    <Image src={bild.url} alt={`Gallery ${index+1}`} fill sizes="150px" className="object-contain p-1" />
                                    <button
                                        type="button"
                                        onClick={() => handleGaleriResimLoeschen(bild.id)}
                                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Görseli Kaldır"
                                    >
                                        <FiX size={12} strokeWidth={3} />
                                    </button>
                                </div>
                            ))}

                            <div>
                                <input type="file" id="galeri-resim-input" className="hidden" onChange={handleGaleriResimleriChange} accept="image/png, image/jpeg, image/webp" multiple />
                                <label
                                    htmlFor="galeri-resim-input"
                                    className="cursor-pointer aspect-square w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-amber-500 flex flex-col items-center justify-center bg-slate-50 hover:bg-amber-50/40 transition-colors"
                                >
                                    <FiUploadCloud className="text-slate-400 text-2xl" />
                                    <span className="text-[11px] font-semibold text-slate-600 mt-1.5">Görsel Ekle</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --------------------------------------------------------------------- */}
                {/* TAB 7: STOK & MALİYET GEÇMİŞİ (KULLANICININ ÖZEL İSTEDİĞİ BÖLÜM)       */}
                {/* --------------------------------------------------------------------- */}
                {isEditMode && (
                    <div className={activeTab === 'gecmis' ? 'space-y-4' : 'hidden'}>
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <FiClock className="text-blue-600" /> Ürün Stok & Maliyet Hareket Geçmişi
                                </h3>
                                <p className="text-xs text-slate-500">Bu ürünün tüm giriş/çıkış, tedarikçi sipariş kabulleri ve maliyet değişim kayıtları.</p>
                            </div>
                            <span className="text-xs font-mono font-semibold bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                                Toplam Kayıt: {stockLogs.length}
                            </span>
                        </div>

                        {stockLogs.length === 0 ? (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                                <FiPackage className="text-slate-300 text-3xl mx-auto mb-2" />
                                <p className="text-sm text-slate-600 font-medium">Bu ürün için henüz kaydedilmiş bir stok hareketi bulunmuyor.</p>
                                <p className="text-xs text-slate-400 mt-1">Sipariş teslimatları veya manuel stok düzeltmeleri yapıldıkça burada listelenecektir.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-lg shadow-2xs">
                                <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                            <th className="px-3 py-2.5 font-bold">Tarih</th>
                                            <th className="px-3 py-2.5 font-bold">Hareket / Kaynak</th>
                                            <th className="px-3 py-2.5 font-bold text-right">Miktar</th>
                                            <th className="px-3 py-2.5 font-bold text-right">Önceki Stok</th>
                                            <th className="px-3 py-2.5 font-bold text-right">Sonraki Stok</th>
                                            <th className="px-3 py-2.5 font-bold">İşlemi Yapan</th>
                                            <th className="px-3 py-2.5 font-bold">Açıklama</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white font-mono">
                                        {stockLogs.map((log) => {
                                            const isIncrease = Number(log.miktar) > 0;
                                            return (
                                                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                                                        {new Date(log.created_at).toLocaleString('tr-TR', {
                                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                            isIncrease ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                        }`}>
                                                            {log.hareket_tipi}
                                                        </span>
                                                        <span className="text-slate-400 ml-1.5 text-[11px] font-sans">
                                                            {log.kaynak}
                                                        </span>
                                                    </td>
                                                    <td className={`px-3 py-2 text-right font-bold whitespace-nowrap ${
                                                        isIncrease ? 'text-emerald-700' : 'text-rose-700'
                                                    }`}>
                                                        {isIncrease ? '+' : ''}{Number(log.miktar || 0).toLocaleString('tr-TR')} {log.birim || ''}
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-slate-500 whitespace-nowrap">
                                                        {Number(log.onceki_stok || 0).toLocaleString('tr-TR')}
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-900 whitespace-nowrap">
                                                        {Number(log.sonraki_stok || 0).toLocaleString('tr-TR')}
                                                    </td>
                                                    <td className="px-3 py-2 whitespace-nowrap font-sans text-slate-700">
                                                        <div className="font-semibold">{log.yapan_user_adi || '-'}</div>
                                                        <div className="text-[10px] text-slate-400">{log.yapan_user_email || ''}</div>
                                                    </td>
                                                    <td className="px-3 py-2 font-sans text-slate-600 max-w-xs truncate" title={log.aciklama || ''}>
                                                        {log.aciklama || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

            </div>

            {/* ========================================================================= */}
            {/* 5. BOTTOM ACTION FOOTER                                                  */}
            {/* ========================================================================= */}
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Değişiklikleri hızlı kaydetmek için istediğiniz an <strong>Ctrl + S</strong> yapabilirsiniz.</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        href={`/${locale}/admin/urun-yonetimi/urunler`}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-bold transition-colors border border-slate-300"
                    >
                        Vazgeç
                    </Link>
                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm font-bold text-xs transition-all disabled:opacity-50"
                    >
                        {isPending ? <FiLoader className="animate-spin" size={14} /> : <FiSave size={14} />}
                        <span>{isPending ? 'Kaydediliyor...' : (isEditMode ? 'Değişiklikleri Kaydet' : 'Ürünü Oluştur')}</span>
                    </button>
                </div>
            </div>

            </fieldset>
        </form>
    );
}