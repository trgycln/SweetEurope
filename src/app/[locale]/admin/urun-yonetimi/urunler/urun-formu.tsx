// src/app/[locale]/admin/urun-yonetimi/urunler/urun-formu.tsx (Vollständig, Manuelle Action)
'use client';

import React, { useState, useTransition, useEffect, useMemo, ChangeEvent, FormEvent } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiSave, FiX, FiInfo, FiClipboard, FiDollarSign, FiLoader, FiTrash2, FiImage, FiUploadCloud } from 'react-icons/fi';
// Actions importieren
import { createUrunAction, updateUrunAction, deleteUrunAction, uploadUrunImageAction, removeUrunImagesAction, FormState } from './actions';
import { useRouter } from 'next/navigation';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
import { getProductLineLabel, inferProductLineFromCategoryId, type ProductLineKey } from '@/lib/product-lines';
import { dedupeSuppliers, getCanonicalSupplierLabel, normalizeSupplierGroupKey } from '@/lib/supplier-utils';
import type { Locale } from '@/i18n-config';

// Tipler
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
    flavors: {
        schokolade: string;
        kakao: string;
        erdbeere: string;
        vanille: string;
        karamell: string;
        nuss: string;
        walnuss: string;
        badem: string;
        hindistancevizi: string;
        honig: string;
        tereyag: string;
        zitrone: string;
        portakal: string;
        zeytin: string;
        frucht: string;
        waldfrucht: string;
        kaffee: string;
        himbeere: string;
        brombeere: string;
        pistazie: string;
        kirsche: string;
        havuc: string;
        yulaf: string;
        yabanmersini: string;
    };
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
    deleteConfirm: string; // use %{name} placeholder
}

interface UrunFormuProps {
    locale: Locale;
    kategoriler: Kategori[];
    tedarikciler: Tedarikci[];
    birimler: Birim[];
    mevcutUrun?: Urun;
    labels?: UrunFormuLabels;
    isAdmin?: boolean;
}

const diller = [
    { kod: 'de' as const }, { kod: 'en' as const },
    { kod: 'tr' as const }, { kod: 'ar' as const },
];

// Submit Button (benötigt isPending Prop)
function SubmitButton({ mode, isPending, labels }: { mode: 'create' | 'edit', isPending: boolean, labels: UrunFormuLabels['buttons'] }) {
    const pending = isPending;
    return (
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm disabled:bg-accent/50 disabled:cursor-wait">
            {pending ? <FiLoader className="animate-spin" /> : <FiSave />}
            {pending ? labels.saving : (mode === 'create' ? labels.saveCreate : labels.saveEdit)}
        </button>
    );
}

// Separate Delete Button Komponente
function DeleteButtonWrapper({ urun, locale, labels }: { urun: Urun, locale: Locale, labels: UrunFormuLabels }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        const name = urun.ad?.[locale] || urun.ad?.['tr'] || 'Produkt';
        const message = labels.deleteConfirm.replace('%{name}', String(name));
        if (!confirm(message)) return;

        startTransition(async () => {
            // İlk deneme — force=false
            const result = await deleteUrunAction(urun.id, false, locale);

            if (result?.success) {
                // Server action redirected; this branch is a fallback only
                router.push(`/${locale}/admin/urun-yonetimi/urunler`);
                return;
            }

            // Sipariş bağlantısı var, ikinci onay iste
            if (result?.message?.startsWith('FORCE_CONFIRM:')) {
                const count = result.message.split(':')[1];
                const confirmed = confirm(
                    `Bu ürün ${count} geçmiş sipariş kaleminde kullanılmış.\n\n` +
                    `Yine de silinirse:\n` +
                    `• Tüm tutarlar ve fiyatlar sistemde korunur (bozulmaz)\n` +
                    `• İlgili sipariş kalemlerinde ürün adı "Silinmiş Ürün" olarak görünür\n\n` +
                    `Silmeyi onaylıyor musunuz?`
                );
                if (!confirmed) return;

                // force=true ile tekrar çalıştır
                const forceResult = await deleteUrunAction(urun.id, true, locale);
                if (forceResult?.success) {
                    // Server action redirected; this branch is a fallback only
                    router.push(`/${locale}/admin/urun-yonetimi/urunler`);
                } else {
                    toast.error(forceResult?.message || 'Silme işlemi başarısız.');
                }
                return;
            }

            // Diğer hatalar
            toast.error(result?.message || 'Silme işlemi başarısız.');
        });
    };

    return (
        <button type="button" onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-red-500 text-red-500 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
             {isPending ? <FiLoader className="animate-spin" /> : <FiTrash2 />} {labels.buttons.delete}
        </button>
    );
}

// Hauptformular-Komponente
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_SIZE_LABEL = '10MB';

export function UrunFormu({ locale, kategoriler, tedarikciler, birimler, mevcutUrun, labels, isAdmin = true }: UrunFormuProps) {
    // Default labels fallback until dictionaries supply a productsForm section
    const buildDefaultLabels = (loc: Locale): UrunFormuLabels => {
        const languageNames = { de: 'Deutsch', en: 'English', tr: 'Türkçe', ar: 'العربية' } as const;
        return {
            backButtonAria: 'Back to list',
            createTitle: 'Create Product',
            editTitle: 'Edit Product',
            createSubtitle: 'Fill in details to add a new product.',
            editSubtitle: 'Update product information and save your changes.',
            imageSection: {
                title: 'Images',
                mainImage: 'Main image',
                change: 'Change',
                upload: 'Upload',
                formatsHint: `PNG, JPG or WEBP up to ${MAX_IMAGE_SIZE_LABEL}.`,
                galleryImages: 'Gallery images',
                addImages: 'Add images',
            },
            basicsSection: {
                title: 'Basic information',
                mainCategory: 'Main category',
                subCategory: 'Subcategory',
                pleaseSelect: 'Please select…',
                selectMainFirst: 'Select a main category first',
                noSubcategories: 'No subcategories',
                unnamedCategory: 'Unnamed category',
                changeCategoryWarning: 'Changing the category may alter technical fields and attributes.',
            },
            supplierSection: {
                supplier: 'Supplier',
                none: 'None',
            },
            i18nSection: {
                title: 'Multilingual content',
                productName: 'Product name',
                description: 'Description',
                languageNames: { de: 'Deutsch', en: 'English', tr: 'Türkçe', ar: 'العربية' },
            },
            operationsSection: {
                title: 'Operations',
                sku: 'SKU / Stock code',
                slug: 'Slug',
                unit: 'Sales unit',
                pleaseSelect: 'Please select…',
                activeQuestion: 'Active and visible?',
            },
            pricingStockSection: {
                title: 'Pricing & Stock',
                stockQty: 'Stock quantity',
                stockThreshold: 'Low stock threshold',
                customerPrice: 'Customer price',
                resellerPrice: 'Reseller price',
                distributorCost: 'Distributor cost',
            },
            attributesSection: {
                title: 'Attributes',
                info: 'Choose applicable attributes and flavors for filtering and display.',
                features: 'Features',
                vegan: 'Vegan',
                vegetarian: 'Vegetarian',
                glutenFree: 'Gluten-free',
                lactoseFree: 'Lactose-free',
                organic: 'Organic',
                sugarFree: 'Sugar-free',
                naturalIngredients: 'Natural ingredients',
                additiveFree: 'No additives',
                preservativeFree: 'Preservative-free',
                pumpCompatible: 'Pump-compatible',
            },
            flavorsSection: {
                label: 'Flavors',
                extraLabel: 'Extra flavors (comma-separated)',
                extraPlaceholder: 'e.g. banana, caramelized fig',
            },
            flavors: {
                schokolade: 'Chocolate',
                kakao: 'Cocoa',
                erdbeere: 'Strawberry',
                vanille: 'Vanilla',
                karamell: 'Caramel',
                nuss: 'Hazelnut',
                walnuss: 'Walnut',
                badem: 'Almond',
                hindistancevizi: 'Coconut',
                honig: 'Honey',
                tereyag: 'Butter',
                zitrone: 'Lemon',
                portakal: 'Orange',
                zeytin: 'Olive',
                frucht: 'Fruit',
                waldfrucht: 'Forest Fruit',
                kaffee: 'Coffee',
                himbeere: 'Raspberry',
                brombeere: 'Blackberry',
                pistazie: 'Pistachio',
                kirsche: 'Cherry',
                havuc: 'Carrot',
                yulaf: 'Oat',
                yabanmersini: 'Blueberry'
            },
            technicalSection: {
                title: 'Technical details',
            },
            buttons: {
                cancel: 'Cancel',
                saveCreate: 'Create product',
                saveEdit: 'Save changes',
                saving: 'Saving…',
                delete: 'Delete',
            },
            deleteConfirm: 'Delete "%{name}"? This cannot be undone.',
        };
    };
    const L: UrunFormuLabels = labels ?? buildDefaultLabels(locale);
    // Helper: flavor label fallback (handles missing or empty dictionary entries)
    const defaultFlavorLabels = buildDefaultLabels(locale).flavors;
    const flavorLabel = (key: keyof typeof defaultFlavorLabels): string => {
        const val = L.flavors[key];
        if (val && val.trim() !== '') return val;
        return defaultFlavorLabels[key] || key;
    };
    const router = useRouter();
    const supabase = createDynamicSupabaseClient(true);
    const [isPending, startTransition] = useTransition(); // Für den Submit
    const [formResult, setFormResult] = useState<FormState>(null);

    // Andere States
    const [aktifDil, setAktifDil] = useState<Locale>(locale);
    
    // Kategori states - single hierarchical select
    const mevcutKategori = kategoriler.find(k => k.id === mevcutUrun?.kategori_id);
    const [altKategoriId, setAltKategoriId] = useState<string | null>(mevcutUrun?.kategori_id || null);

    const supplierOptions = useMemo(() => dedupeSuppliers(tedarikciler), [tedarikciler]);
    const normalizedSupplierValue = useMemo(() => {
        if (!mevcutUrun?.tedarikci_id) return '';

        const representativeById = Object.fromEntries(
            tedarikciler.map((supplier) => {
                const groupKey = normalizeSupplierGroupKey(supplier.unvan) || supplier.id;
                const representative = supplierOptions.find((option) => (normalizeSupplierGroupKey(option.unvan) || option.id) === groupKey);
                return [supplier.id, representative?.id || supplier.id];
            })
        ) as Record<string, string>;

        return representativeById[mevcutUrun.tedarikci_id] || mevcutUrun.tedarikci_id;
    }, [mevcutUrun?.tedarikci_id, tedarikciler, supplierOptions]);
    
    // Actual kategori_id for form submission
    const seciliKategoriId = altKategoriId;
    const kategoriBazliUrunGami = inferProductLineFromCategoryId(kategoriler as any, seciliKategoriId);
    const [manuelUrunGami, setManuelUrunGami] = useState<ProductLineKey | 'auto'>(
        mevcutUrun?.urun_gami === 'frozen-desserts' || mevcutUrun?.urun_gami === 'barista-bakery-essentials'
            ? mevcutUrun.urun_gami
            : 'auto'
    );
    const seciliUrunGami = manuelUrunGami === 'auto' ? kategoriBazliUrunGami : manuelUrunGami;
    
    const [aktifSablon, setAktifSablon] = useState<Sablon[]>([]);
    const [isLoadingSablon, setIsLoadingSablon] = useState(false);
    // If a subcategory has no own template we fall back to its parent's template.
    // Track which category id actually provided the template for UI hinting.
    const [sablonKaynakKategoriId, setSablonKaynakKategoriId] = useState<string | null>(null);
    const [slug, setSlug] = useState(mevcutUrun?.slug || '');
    const [anaResimDosyasi, setAnaResimDosyasi] = useState<File | null>(null);
    const [anaResimOnizleme, setAnaResimOnizleme] = useState<string | null>(mevcutUrun?.ana_resim_url || null);
    const [galeriOnizlemeler, setGaleriOnizlemeler] = useState<Array<{ id: string | number, url: string, file?: File }>>(
        (mevcutUrun?.galeri_resim_urls || []).map((url) => ({ id: url, url }))
    );
    const [markierteGeloeschteUrls, setMarkierteGeloeschteUrls] = useState<string[]>([]);
    const isEditMode = !!mevcutUrun;
    
    // Geschmack states - now supports multiple flavors
    const standardGeschmackWerte = ['schokolade', 'kakao', 'erdbeere', 'vanille', 'karamell', 'nuss', 'walnuss', 'badem', 'hindistancevizi', 'honig', 'tereyag', 'zitrone', 'portakal', 'zeytin', 'frucht', 'kaffee', 'himbeere', 'brombeere', 'kirsche', 'waldfrucht', 'pistazie', 'havuc', 'yulaf', 'yabanmersini'];
    const mevcutGeschmack = (mevcutUrun?.teknik_ozellikler as any)?.geschmack || [];
    const mevcutGeschmackArray = Array.isArray(mevcutGeschmack) ? mevcutGeschmack : (mevcutGeschmack ? [mevcutGeschmack] : []);
    const customFlavors = mevcutGeschmackArray.filter((g: string) => !standardGeschmackWerte.includes(g));
    
    // State for selected flavors (checkboxes)
    const [selectedGeschmack, setSelectedGeschmack] = useState<string[]>(
        mevcutGeschmackArray.filter((g: string) => standardGeschmackWerte.includes(g))
    );
    const [customGeschmack, setCustomGeschmack] = useState<string>(
        customFlavors.join(', ')
    );


    // Sablon laden (mit Vererbung: falls Unterkategorie kein eigenes Template hat → Elternkategorie verwenden)
    useEffect(() => {
        const fetchSablon = async () => {
            if (!seciliKategoriId) { 
                setAktifSablon([]); 
                setSablonKaynakKategoriId(null);
                return; 
            }
            setIsLoadingSablon(true);

            // 1. Versuche Template der ausgewählten Kategorie zu holen
            const { data: direktTemplate, error: direktError } = await supabase
                .from('kategori_ozellik_sablonlari')
                .select('*')
                .eq('kategori_id', seciliKategoriId)
                .order('sira');

            if (direktError) {
                console.warn('Template fetch error (direct):', direktError.message);
            }

            if (direktTemplate && direktTemplate.length > 0) {
                setAktifSablon(direktTemplate);
                setSablonKaynakKategoriId(seciliKategoriId);
                setIsLoadingSablon(false);
                return;
            }

            // 2. Falls keine Einträge und wir sind in einer Unterkategorie → Elternkategorie finden
            const altKategoriObj = altKategoriId ? kategoriler.find(k => k.id === altKategoriId) : null;
            const parentId = altKategoriObj?.ust_kategori_id || null;

            if (altKategoriId && parentId) {
                const { data: parentTemplate, error: parentError } = await supabase
                    .from('kategori_ozellik_sablonlari')
                    .select('*')
                    .eq('kategori_id', parentId)
                    .order('sira');

                if (parentError) {
                    console.warn('Template fetch error (parent fallback):', parentError.message);
                }

                if (parentTemplate && parentTemplate.length > 0) {
                    setAktifSablon(parentTemplate);
                    setSablonKaynakKategoriId(parentId);
                    setIsLoadingSablon(false);
                    return;
                }
            }

            // 3. Letzter Ausweg: gar kein Template → leer
            setAktifSablon([]);
            setSablonKaynakKategoriId(null);
            setIsLoadingSablon(false);
        };
        fetchSablon();
    }, [seciliKategoriId, kategoriler, supabase]);

    // Effekt für Toast/Weiterleitung
    useEffect(() => {
        if (formResult?.success === true && locale) {
            toast.success(formResult.message);
            router.push(`/${locale}/admin/urun-yonetimi/urunler`);
        } else if (formResult?.success === false) {
            toast.error(formResult.message);
        }
    }, [formResult, router, locale]);

    const handleAdChange = (event: React.ChangeEvent<HTMLInputElement>, dil: string) => {
        if (!isEditMode && dil === locale) { setSlug(slugify(event.target.value)); }
    };

    // Bild-Handler
    const handleAnaResimChange = (e: ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(f){if(f.size>MAX_IMAGE_SIZE_BYTES){toast.error(`Max ${MAX_IMAGE_SIZE_LABEL}.`);e.target.value='';return;}setAnaResimDosyasi(f);const r=new FileReader();r.onloadend=()=>{setAnaResimOnizleme(r.result as string);};r.readAsDataURL(f);}else{setAnaResimDosyasi(null);setAnaResimOnizleme(mevcutUrun?.ana_resim_url||null);} };
    const handleGaleriResimleriChange = (e: ChangeEvent<HTMLInputElement>) => { const fs=e.target.files;if(fs){const nf=Array.from(fs);let err=false;nf.forEach(f=>{if(f.size>MAX_IMAGE_SIZE_BYTES){toast.error(`${f.name} > ${MAX_IMAGE_SIZE_LABEL}.`);err=true;}});if(err){e.target.value='';return;}nf.forEach((f,i)=>{const r=new FileReader();r.onloadend=()=>{setGaleriOnizlemeler(p=>[...p,{id:`${i}-${Date.now()}`,url:r.result as string,file:f}]);};r.readAsDataURL(f);});e.target.value='';} };
    const handleGaleriResimLoeschen = (id: string | number) => { const z=galeriOnizlemeler.find(b=>b.id===id);if(!z)return;if(typeof id==='string'&&mevcutUrun?.galeri_resim_urls?.includes(id)){setMarkierteGeloeschteUrls(p=>[...p,id]);}setGaleriOnizlemeler(p=>p.filter(b=>b.id!==id)); };

    // Formularübermittlung
    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // Ensure kategori_id always reflects the current selection (handles async option loading edge cases)
        formData.set('kategori_id', (seciliKategoriId ?? ''));
        setFormResult(null);

        startTransition(async () => {
            toast.info((labels ?? L).buttons.saving, { id: 'upload-toast' });
            let anaResimUrl = mevcutUrun?.ana_resim_url || null;
            let finalGaleriUrls = [...(mevcutUrun?.galeri_resim_urls || [])];

            try {
                // 1. Alte Bilder löschen
                if (markierteGeloeschteUrls.length > 0) {
                     const pathsToRemove: string[] = [];
                     markierteGeloeschteUrls.forEach(url => { try { const u=new URL(url);const p=u.pathname.split('/');if(p.length>2)pathsToRemove.push(p.slice(2).join('/'));}catch(e){} });
                     if (pathsToRemove.length > 0) {
                         const deleteResult = await removeUrunImagesAction(pathsToRemove);
                         if (!deleteResult?.success) toast.warning(deleteResult?.message || 'Failed to delete old images.');
                         else finalGaleriUrls = finalGaleriUrls.filter(url => !markierteGeloeschteUrls.includes(url));
                     }
                }
                // 2. Hauptbild hochladen
                if (anaResimDosyasi) {
                    const uploadForm = new FormData();
                    uploadForm.append('file', anaResimDosyasi);
                    uploadForm.append('folder', 'main');
                    uploadForm.append('upsert', String(Boolean(isEditMode)));
                    const uploadResult = await uploadUrunImageAction(uploadForm);
                    if (!uploadResult?.success || !uploadResult.url) {
                        throw new Error(uploadResult?.message || 'Main image upload failed.');
                    }
                    anaResimUrl = uploadResult.url;
                }
                formData.set('ana_resim_url', anaResimUrl || '');

                // 3. Galeriebilder hochladen
                const neueDateien = galeriOnizlemeler.filter(b => b.file).map(b => b.file as File); const neueUrls: string[] = [];
                for (const f of neueDateien) {
                    const uploadForm = new FormData();
                    uploadForm.append('file', f);
                    uploadForm.append('folder', 'gallery');
                    const uploadResult = await uploadUrunImageAction(uploadForm);
                    if (!uploadResult?.success || !uploadResult.url) {
                        toast.warning(uploadResult?.message || `Upload ${f.name} fehlgeschlagen.`);
                        continue;
                    }
                    neueUrls.push(uploadResult.url);
                }

                // 4. URLs in FormData
                const finaleGalerieListe = [...finalGaleriUrls, ...neueUrls]; formData.delete('galeri_resim_urls[]'); finaleGalerieListe.forEach(url => formData.append('galeri_resim_urls[]', url));

                toast.dismiss('upload-toast');

                // 5. Server Action aufrufen
                const action = isEditMode ? updateUrunAction.bind(null, mevcutUrun.id) : createUrunAction;
                const result = await action(formData);
                setFormResult(result);

            } catch (error: any) {
                toast.dismiss('upload-toast');
                const uploadMessage = error?.message || 'Image upload error.';
                toast.error(uploadMessage);
                setFormResult({ success: false, message: uploadMessage });
            }
        });
    };

    // --- JSX ---
    const labelClasses = "block text-sm font-bold text-gray-600 mb-1";
    return (
        <form onSubmit={handleFormSubmit} className="space-y-8">
            <fieldset disabled={!isAdmin}>
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/admin/urun-yonetimi/urunler`} className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 transition-colors">
                        <FiArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-primary">
                            {isEditMode ? L.editTitle : L.createTitle}
                        </h1>
                        <p className="text-text-main/80 mt-1">
                            {isEditMode ? L.editSubtitle : L.createSubtitle}
                        </p>
                    </div>
                </div>
                {isEditMode && isAdmin && (<DeleteButtonWrapper urun={mevcutUrun} locale={locale} labels={L} />)}
            </header>

            {/* Bild Upload Abschnitt */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiImage />{L.imageSection.title}</h2>
                 <div className='space-y-8'>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">{L.imageSection.mainImage}</label>
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden">
                                {anaResimOnizleme ? (
                                    <Image src={anaResimOnizleme} alt="Preview" width={128} height={128} className="object-cover w-full h-full" />
                                ) : ( <FiImage className="text-gray-300 text-4xl" />)}
                            </div>
                            <div>
                                <input type="file" id="ana-resim-input" className="hidden" onChange={handleAnaResimChange} accept="image/png, image/jpeg, image/webp" />
                                <label htmlFor="ana-resim-input" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm"><FiUploadCloud /> {anaResimOnizleme ? L.imageSection.change : L.imageSection.upload}</label>
                                <p className="text-xs text-gray-500 mt-2">{L.imageSection.formatsHint}</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">{L.imageSection.galleryImages}</label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                            {galeriOnizlemeler.map((bild, index) => (
                                <div key={bild.id} className="relative aspect-square group">
                                    <Image src={bild.url} alt={`Gallery ${index+1}`} fill sizes="150px" className="object-cover rounded-lg border" />
                                    <button type="button" onClick={() => handleGaleriResimLoeschen(bild.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"><FiX size={12} strokeWidth={3} /></button>
                                </div>
                            ))}
                            <div>
                                <input type="file" id="galeri-resim-input" className="hidden" onChange={handleGaleriResimleriChange} accept="image/png, image/jpeg, image/webp" multiple />
                                <label htmlFor="galeri-resim-input" className="cursor-pointer aspect-square w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-accent transition-colors"><FiUploadCloud className="text-gray-400 text-3xl" /><span className="text-xs text-center text-gray-500 mt-2">{L.imageSection.addImages}</span></label>
                            </div>
                        </div>
                    </div>
                 </div>
             </div>
            

            {/* Grundlegende Definitionen */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-6">{L.basicsSection.title}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Kategori - hierarchical selection */}
                     <div className="md:col-span-2">
                         <label htmlFor="kategori_id" className={labelClasses}>
                             {L.basicsSection.mainCategory} <span className="text-red-500">*</span>
                         </label>
                         <select
                             id="kategori_id"
                             name="kategori_id"
                             value={seciliKategoriId || ""}
                             onChange={(e) => setAltKategoriId(e.target.value || null)}
                             className="w-full p-2 border rounded-md bg-gray-50"
                             required
                         >
                             <option value="" disabled>{L.basicsSection.pleaseSelect}</option>
                             {kategoriler.map(k => {
                                 const path: string[] = [k.ad?.[locale] || Object.values(k.ad ?? {})[0] || L.basicsSection.unnamedCategory];
                                 let cur = k;
                                 let guard = 0;
                                 while (cur.ust_kategori_id && guard++ < 10) {
                                     const parent = kategoriler.find(c => c.id === cur.ust_kategori_id);
                                     if (!parent) break;
                                     path.unshift(parent.ad?.[locale] || Object.values(parent.ad ?? {})[0] || '?');
                                     cur = parent;
                                 }
                                 const depth = path.length - 1;
                                 const indent = '  '.repeat(depth * 2);
                                 const prefix = depth > 0 ? '└ ' : '';
                                 return (
                                     <option key={k.id} value={k.id} title={path.join(' → ')}>
                                         {indent}{prefix}{path[path.length - 1]}
                                     </option>
                                 );
                             })}
                         </select>
                         {(() => {
                             const kat = seciliKategoriId ? kategoriler.find(k => k.id === seciliKategoriId) : null;
                             if (!kat) return null;
                             const path: string[] = [kat.ad?.[locale] || Object.values(kat.ad ?? {})[0] || '?'];
                             let cur = kat;
                             let guard = 0;
                             while (cur.ust_kategori_id && guard++ < 10) {
                                 const parent = kategoriler.find(c => c.id === cur.ust_kategori_id);
                                 if (!parent) break;
                                 path.unshift(parent.ad?.[locale] || Object.values(parent.ad ?? {})[0] || '?');
                                 cur = parent;
                             }
                             return (
                                 <p className="text-xs text-gray-500 mt-1">
                                     Yol: <span className="font-medium text-gray-700">{path.join(' / ')}</span>
                                 </p>
                             );
                         })()}
                         {isEditMode && <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1"><span>⚠️</span> {L.basicsSection.changeCategoryWarning}</p>}
                     </div>

                     <input type="hidden" name="urun_gami" value={seciliUrunGami || ''} />

                     <div>
                         <label htmlFor="tedarikci_id" className={labelClasses}>{L.supplierSection.supplier}</label>
                         <select id="tedarikci_id" name="tedarikci_id" defaultValue={normalizedSupplierValue} className="w-full p-2 border rounded-md bg-gray-50">
                             <option value="">{L.supplierSection.none}</option>
                             {supplierOptions.map(t => <option key={t.id} value={t.id}>{getCanonicalSupplierLabel(t.unvan)}</option>)}
                         </select>
                     </div>

                     <div className="md:col-span-2 rounded-lg border border-dashed border-amber-200 bg-amber-50/70 p-4 space-y-3">
                         <div>
                             <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Hizli fiyatlandirma tipi</p>
                             <p className="mt-1 text-sm text-gray-700">
                                 Bu urunun donuk mu donuk olmayan mi oldugunu buradan net secin. Fiyatlandirma merkezindeki liste de ayni secimi kullanir.
                             </p>
                         </div>

                         <select
                             value={manuelUrunGami}
                             onChange={(e) => setManuelUrunGami(e.target.value as ProductLineKey | 'auto')}
                             className="w-full p-2 border rounded-md bg-white"
                         >
                             <option value="auto">Kategoriye gore otomatik sec</option>
                             <option value="frozen-desserts">Donuk urun</option>
                             <option value="barista-bakery-essentials">Donuk olmayan urun</option>
                         </select>

                         <div className="flex flex-wrap items-center gap-2">
                             <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                 seciliUrunGami === 'frozen-desserts'
                                     ? 'bg-rose-100 text-rose-700'
                                     : seciliUrunGami === 'barista-bakery-essentials'
                                       ? 'bg-emerald-100 text-emerald-700'
                                       : 'bg-gray-100 text-gray-600'
                             }`}>
                                 {seciliUrunGami
                                     ? getProductLineLabel(seciliUrunGami, locale)
                                     : 'Kategori secildiginde otomatik belirlenir'}
                             </span>
                             <span className="text-xs text-gray-600">
                                 {manuelUrunGami === 'auto'
                                     ? 'Otomatik secimde kategori esas alinir.'
                                     : 'Manuel secim bu urunu dogru fiyat listesine tasir.'}
                             </span>
                         </div>
                     </div>
                 </div>
             </div>

            {/* Produktinformationen (Mehrsprachig) */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-2 flex items-center gap-3"><FiInfo />{L.i18nSection.title}</h2>
                 <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                        {diller.map((dil) => (
                            <button
                                key={dil.kod}
                                type="button"
                                onClick={() => setAktifDil(dil.kod)}
                                className={`${ aktifDil === dil.kod ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                            >
                                {L.i18nSection.languageNames[dil.kod]}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="space-y-6">
                    {diller.map((dil) => (
                        <div key={dil.kod} className={aktifDil === dil.kod ? 'space-y-4' : 'hidden'}>
                            <div>
                                <label htmlFor={`ad_${dil.kod}`} className={labelClasses}>{L.i18nSection.productName} ({dil.kod.toUpperCase()})</label>
                                <input type="text" name={`ad_${dil.kod}`} id={`ad_${dil.kod}`} defaultValue={mevcutUrun?.ad?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" onChange={(e) => handleAdChange(e, dil.kod)} />
                            </div>
                            <div>
                                <label htmlFor={`aciklamalar_${dil.kod}`} className={labelClasses}>{L.i18nSection.description} ({dil.kod.toUpperCase()})</label>
                                <textarea name={`aciklamalar_${dil.kod}`} id={`aciklamalar_${dil.kod}`} rows={4} defaultValue={mevcutUrun?.aciklamalar?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                            </div>
                        </div>
                    ))}
                </div>
             </div>

            {/* Operative Informationen */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiClipboard />{L.operationsSection.title}</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="stok_kodu" className={labelClasses}>{L.operationsSection.sku}</label>
                        <input type="text" name="stok_kodu" id="stok_kodu" defaultValue={mevcutUrun?.stok_kodu || ''} className="w-full p-2 border rounded-md bg-gray-50 font-mono" />
                    </div>
                    <div>
                        <label htmlFor="ean_gtin" className={labelClasses}>
                          EAN / Barkod (GTIN-13){!isEditMode && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          name="ean_gtin"
                          id="ean_gtin"
                          defaultValue={(mevcutUrun as any)?.ean_gtin || ''}
                          maxLength={14}
                          placeholder="örn. 8690123456789"
                          required={!isEditMode}
                          className="w-full p-2 border rounded-md bg-gray-50 font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-400">
                          {isEditMode ? 'İsteğe bağlı. Mevcut değeri korumak için boş bırakın.' : 'EAN-13 barkod numarası — yeni ürünler için zorunlu'}
                        </p>
                    </div>
                    <div>
                        <label htmlFor="slug" className={labelClasses}>{L.operationsSection.slug} <span className="text-red-500">*</span></label>
                        <input type="text" name="slug" id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 font-mono" required />
                    </div>
                    <div>
                        <label htmlFor="ana_satis_birimi_id" className={labelClasses}>{L.operationsSection.unit} <span className="text-red-500">*</span></label>
                        <select id="ana_satis_birimi_id" name="ana_satis_birimi_id" defaultValue={mevcutUrun?.ana_satis_birimi_id || ""} className="w-full p-2 border rounded-md bg-gray-50" required>
                            <option value="" disabled>{L.operationsSection.pleaseSelect}</option>
                            {birimler.map(b => (
                                <option key={b.id} value={b.id}>{b.ad?.[locale] || Object.values(b.ad ?? {})[0] || 'Unnamed Unit'}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center pt-5 md:pt-8">
                        <input type="checkbox" id="aktif" name="aktif" defaultChecked={mevcutUrun?.aktif ?? true} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                        <label htmlFor="aktif" className="ml-3 block text-sm font-bold text-gray-600">{L.operationsSection.activeQuestion}</label>
                    </div>
                 </div>
             </div>

            {/* Preis & Lager */}
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiDollarSign />{L.pricingStockSection.title}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Elysion fiyat motoru</p>
                        <p className="mt-1 text-sm text-blue-900">
                            Sistem artik net inis maliyetini baz alir ve 3 tier saklar: Alt bayi %+15, toptanci / otel %+35, perakende / kafe %+60. Gerekirse bu urune ozel maliyet verilerini asagidan girebilirsiniz.
                        </p>
                    </div>

                    <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Ambalaj / toptanci hiyerarsisi</p>
                            <p className="mt-1 text-sm text-slate-700">
                                Bir kolide kac adet oldugu ve bir palette toplam kac adet bulundugu burada saklanir.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="alis_fiyat_seviyesi" className={labelClasses}>Alis fiyat seviyesi</label>
                                <select
                                    id="alis_fiyat_seviyesi"
                                    name="alis_fiyat_seviyesi"
                                    defaultValue={mevcutUrun?.alis_fiyat_seviyesi || (mevcutUrun?.teknik_ozellikler as any)?.alis_fiyat_seviyesi || 'adet'}
                                    className="w-full p-2 border rounded-md bg-white"
                                >
                                    <option value="adet">Tekil / adet</option>
                                    <option value="koli">Koli</option>
                                    <option value="palet">Palet</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="koli_ici_adet" className={labelClasses}>1 kolide kac adet? <span className="text-red-500">*</span></label>
                                <input type="number" min="1" step="1" name="koli_ici_adet" id="koli_ici_adet" defaultValue={mevcutUrun?.koli_ici_adet ?? ''} required className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="palet_ici_adet" className={labelClasses}>1 palette toplam kac adet? <span className="text-red-500">*</span></label>
                                <input type="number" min="1" step="1" name="palet_ici_adet" id="palet_ici_adet" defaultValue={mevcutUrun?.palet_ici_adet ?? ''} required className="w-full p-2 border rounded-md bg-white" />
                            </div>
                        </div>

                        <p className="text-xs text-slate-600">
                            Sistem palet toplamlarini siparis hesaplarinda kullanir. Ornek: 1 kolide 6 adet, 1 palette 125 adet.
                        </p>
                    </div>

                    <div className="md:col-span-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-4">
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Maliyet master verisi</p>
                            <p className="mt-1 text-sm text-emerald-900">
                                Parti maliyeti, kg bazli gumruk/lojistik ve karlilik alarmi icin gereken alanlar burada saklanir.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label htmlFor="birim_agirlik_kg" className={labelClasses}>Birim agirlik (kg)</label>
                                <input type="number" step="0.001" name="birim_agirlik_kg" id="birim_agirlik_kg" defaultValue={mevcutUrun?.birim_agirlik_kg ?? (mevcutUrun?.teknik_ozellikler as any)?.birim_agirlik_kg ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="lojistik_sinifi" className={labelClasses}>Lojistik sinifi</label>
                                <select name="lojistik_sinifi" id="lojistik_sinifi" defaultValue={mevcutUrun?.lojistik_sinifi ?? (mevcutUrun?.teknik_ozellikler as any)?.lojistik_sinifi ?? 'cold-chain'} className="w-full p-2 border rounded-md bg-white">
                                    <option value="cold-chain">Cold chain / donuk</option>
                                    <option value="dry-load">Dry load / ambient</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="gumruk_vergi_orani_yuzde" className={labelClasses}>Gumruk vergi %</label>
                                <input type="number" step="0.01" name="gumruk_vergi_orani_yuzde" id="gumruk_vergi_orani_yuzde" defaultValue={mevcutUrun?.gumruk_vergi_orani_yuzde ?? (mevcutUrun?.teknik_ozellikler as any)?.gumruk_vergi_orani_yuzde ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="almanya_kdv_orani" className={labelClasses}>Almanya KDV %</label>
                                <input type="number" step="0.01" name="almanya_kdv_orani" id="almanya_kdv_orani" defaultValue={mevcutUrun?.almanya_kdv_orani ?? (mevcutUrun?.teknik_ozellikler as any)?.almanya_kdv_orani ?? '7'} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="gunluk_depolama_maliyeti_eur" className={labelClasses}>Gunluk depolama (€)</label>
                                <input type="number" step="0.0001" name="gunluk_depolama_maliyeti_eur" id="gunluk_depolama_maliyeti_eur" defaultValue={mevcutUrun?.gunluk_depolama_maliyeti_eur ?? (mevcutUrun?.teknik_ozellikler as any)?.gunluk_depolama_maliyeti_eur ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="ortalama_stokta_kalma_suresi" className={labelClasses}>Ortalama stokta kalma (gun)</label>
                                <input type="number" min="0" step="1" name="ortalama_stokta_kalma_suresi" id="ortalama_stokta_kalma_suresi" defaultValue={mevcutUrun?.ortalama_stokta_kalma_suresi ?? (mevcutUrun?.teknik_ozellikler as any)?.ortalama_stokta_kalma_suresi ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="fire_zayiat_orani_yuzde" className={labelClasses}>Fire / zayiat %</label>
                                <input type="number" step="0.01" name="fire_zayiat_orani_yuzde" id="fire_zayiat_orani_yuzde" defaultValue={mevcutUrun?.fire_zayiat_orani_yuzde ?? (mevcutUrun?.teknik_ozellikler as any)?.fire_zayiat_orani_yuzde ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="standart_inis_maliyeti_net" className={labelClasses}>Standart inis maliyeti net (€)</label>
                                <input type="number" step="0.01" name="standart_inis_maliyeti_net" id="standart_inis_maliyeti_net" defaultValue={mevcutUrun?.standart_inis_maliyeti_net ?? (mevcutUrun?.teknik_ozellikler as any)?.standart_inis_maliyeti_net ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div>
                                <label htmlFor="son_gercek_inis_maliyeti_net" className={labelClasses}>Son gercek inis maliyeti (€)</label>
                                <input type="number" step="0.01" name="son_gercek_inis_maliyeti_net" id="son_gercek_inis_maliyeti_net" defaultValue={mevcutUrun?.son_gercek_inis_maliyeti_net ?? (mevcutUrun?.teknik_ozellikler as any)?.son_gercek_inis_maliyeti_net ?? ''} className="w-full p-2 border rounded-md bg-white" />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input type="checkbox" id="karlilik_alarm_aktif" name="karlilik_alarm_aktif" defaultChecked={mevcutUrun?.karlilik_alarm_aktif ?? false} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" />
                                <label htmlFor="karlilik_alarm_aktif" className="text-sm font-medium text-gray-700">Karlilik alarmi aktif</label>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="stok_miktari" className={labelClasses}>{L.pricingStockSection.stockQty}</label>
                        <input type="number" name="stok_miktari" id="stok_miktari" defaultValue={mevcutUrun?.stok_miktari ?? 0} className="w-full p-2 border rounded-md bg-gray-50" />
                    </div>
                    <div>
                        <label htmlFor="stok_esigi" className={labelClasses}>{L.pricingStockSection.stockThreshold}</label>
                        <input type="number" name="stok_esigi" id="stok_esigi" defaultValue={mevcutUrun?.stok_esigi ?? 0} className="w-full p-2 border rounded-md bg-gray-50" />
                    </div>
                    <div>
                        <label htmlFor="satis_fiyati_musteri" className={labelClasses}>Perakende / {L.pricingStockSection.customerPrice}</label>
                        <input type="number" step="0.01" name="satis_fiyati_musteri" id="satis_fiyati_musteri" defaultValue={mevcutUrun?.satis_fiyati_musteri ?? 0} className="w-full p-2 border rounded-md bg-gray-50" />
                    </div>
                    <div>
                        <label htmlFor="satis_fiyati_alt_bayi" className={labelClasses}>Alt bayi / {L.pricingStockSection.resellerPrice}</label>
                        <input type="number" step="0.01" name="satis_fiyati_alt_bayi" id="satis_fiyati_alt_bayi" defaultValue={mevcutUrun?.satis_fiyati_alt_bayi ?? 0} className="w-full p-2 border rounded-md bg-gray-50" />
                    </div>
                    <div>
                        <label htmlFor="satis_fiyati_toptanci" className={labelClasses}>Toptanci fiyati</label>
                        <input type="number" step="0.01" name="satis_fiyati_toptanci" id="satis_fiyati_toptanci" defaultValue={mevcutUrun?.satis_fiyati_toptanci ?? 0} className="w-full p-2 border rounded-md bg-gray-50" />
                    </div>
                    <div>
                        <label htmlFor="distributor_alis_fiyati" className={labelClasses}>{L.pricingStockSection.distributorCost}</label>
                        <input type="number" step="0.01" name="distributor_alis_fiyati" id="distributor_alis_fiyati" defaultValue={mevcutUrun?.distributor_alis_fiyati ?? 0} className="w-full p-2 border rounded-md bg-gray-50" />
                    </div>
                </div>
             </div>

            {/* Produkteigenschaften (Filter) */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-2">{L.attributesSection.title}</h2>
                <p className="text-sm text-gray-500 mb-6">{L.attributesSection.info}</p>
                
                <div className="space-y-6">
                    {/* Eigenschaften - Checkboxen */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-3">{L.attributesSection.features}</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_vegan" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.vegan === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.vegan}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_vegetarisch" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.vegetarisch === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.vegetarian}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_glutenfrei" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.glutenfrei === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.glutenFree}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_laktosefrei" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.laktosefrei === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.lactoseFree}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_bio" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.bio === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.organic}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_ohne_zucker" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.ohne_zucker === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.sugarFree || 'Şekersiz / Sugar-Free'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_dogal_icerik" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.dogal_icerik === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.naturalIngredients || 'Doğal içerik / Natural ingredients'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_katkisiz" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.katkisiz === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.additiveFree || 'Katkısız / No additives'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_koruyucusuz" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.koruyucusuz === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.preservativeFree || 'Koruyucusuz / Preservative-free'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_pompa_uyumlu" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.pompa_uyumlu === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{L.attributesSection.pumpCompatible || 'Pompa uyumlu / Pump-compatible'}</span>
                            </label>
                        </div>
                    </div>

                    {/* Geschmack - Multiple Checkboxes + Custom Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">{L.flavorsSection.label}</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Schokolade */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('schokolade')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'schokolade']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'schokolade'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('schokolade')}</span>
                            </label>

                            {/* Kakao */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('kakao')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'kakao']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'kakao'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('kakao')}</span>
                            </label>
                            
                            {/* Erdbeere */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('erdbeere')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'erdbeere']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'erdbeere'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('erdbeere')}</span>
                            </label>

                            {/* Vanille */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('vanille')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'vanille']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'vanille'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('vanille')}</span>
                            </label>

                            {/* Karamell */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('karamell')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'karamell']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'karamell'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('karamell')}</span>
                            </label>

                            {/* Nuss */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('nuss')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'nuss']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'nuss'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('nuss')}</span>
                            </label>

                            {/* Walnuss */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('walnuss')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'walnuss']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'walnuss'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('walnuss')}</span>
                            </label>

                            {/* Badem */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('badem')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'badem']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'badem'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('badem')}</span>
                            </label>

                            {/* Hindistan Cevizi */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('hindistancevizi')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'hindistancevizi']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'hindistancevizi'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('hindistancevizi')}</span>
                            </label>

                            {/* Honig */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('honig')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'honig']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'honig'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('honig')}</span>
                            </label>

                            {/* Tereyag */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('tereyag')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'tereyag']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'tereyag'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('tereyag')}</span>
                            </label>

                            {/* Zitrone */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('zitrone')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'zitrone']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'zitrone'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('zitrone')}</span>
                            </label>

                            {/* Portakal / Orange */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('portakal')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'portakal']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'portakal'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('portakal')}</span>
                            </label>

                            {/* Zeytin */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('zeytin')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'zeytin']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'zeytin'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('zeytin')}</span>
                            </label>

                            {/* Frucht */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('frucht')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'frucht']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'frucht'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('frucht')}</span>
                            </label>

                            {/* Waldfrucht */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('waldfrucht')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'waldfrucht']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'waldfrucht'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('waldfrucht')}</span>
                            </label>

                            {/* Kaffee */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('kaffee')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'kaffee']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'kaffee'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('kaffee')}</span>
                            </label>

                            {/* Himbeere */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('himbeere')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'himbeere']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'himbeere'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('himbeere')}</span>
                            </label>

                            {/* Brombeere (Ahududu) */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('brombeere')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'brombeere']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'brombeere'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('brombeere')}</span>
                            </label>

                            {/* Pistazie */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('pistazie')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'pistazie']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'pistazie'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('pistazie')}</span>
                            </label>

                            {/* Kirsche */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('kirsche')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'kirsche']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'kirsche'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('kirsche')}</span>
                            </label>

                            {/* Havuc */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('havuc')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'havuc']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'havuc'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('havuc')}</span>
                            </label>

                            {/* Yulaf */}
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedGeschmack.includes('yulaf')}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedGeschmack([...selectedGeschmack, 'yulaf']);
                                        } else {
                                            setSelectedGeschmack(selectedGeschmack.filter(g => g !== 'yulaf'));
                                        }
                                    }}
                                    className="w-4 h-4 text-primary rounded"
                                />
                                <span className="text-sm">{flavorLabel('yulaf')}</span>
                            </label>
                        </div>

                        {/* Custom Input for additional flavors */}
                        <div className="mt-3">
                            <label className="block text-xs text-gray-600 mb-1">{L.flavorsSection.extraLabel}</label>
                            <input
                                type="text"
                                placeholder={L.flavorsSection.extraPlaceholder}
                                value={customGeschmack}
                                onChange={(e) => setCustomGeschmack(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>

                        {/* Hidden inputs to submit all flavors */}
                        {selectedGeschmack.map((flavor, idx) => (
                            <input key={idx} type="hidden" name={`geschmack_${idx}`} value={flavor} />
                        ))}
                        {customGeschmack && (
                            <input type="hidden" name="geschmack_custom" value={customGeschmack} />
                        )}
                    </div>
                </div>
            </div>

            {/* Technische Details */}
             {isLoadingSablon ? ( <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center"><FiLoader className="animate-spin inline-block text-gray-400 text-2xl" /></div> ) : aktifSablon.length > 0 && ( <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h2 className="font-serif text-2xl font-bold text-primary mb-6">{L.technicalSection.title}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{aktifSablon.map(alan => (<div key={alan.id}><label htmlFor={`teknik_${alan.alan_adi}`} className={labelClasses}>{alan.gosterim_adi?.[locale] || alan.gosterim_adi?.['tr']}</label><input type={alan.alan_tipi === 'sayı' ? 'number' : 'text'} name={`teknik_${alan.alan_adi}`} id={`teknik_${alan.alan_adi}`} /* @ts-ignore */ defaultValue={mevcutUrun?.teknik_ozellikler?.[alan.alan_adi] || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>))}</div></div> )}

            {/* Produktspezifikation */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
              <h2 className="font-serif text-2xl font-bold text-primary mb-6">Produktspezifikation</h2>

              {/* 8a. Hersteller & Herkunft */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Hersteller & Herkunft</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="hersteller_name" className={labelClasses}>Hersteller</label>
                    <input type="text" name="hersteller_name" id="hersteller_name" defaultValue={mevcutUrun?.hersteller_name || 'OZMER PASTACILIK A.Ş.'} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="hersteller_land" className={labelClasses}>Land</label>
                    <input type="text" name="hersteller_land" id="hersteller_land" defaultValue={mevcutUrun?.hersteller_land || 'Türkiye'} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="herkunftsland_de" className={labelClasses}>Herkunftsland (DE)</label>
                    <input type="text" name="herkunftsland_de" id="herkunftsland_de" defaultValue={mevcutUrun?.herkunftsland?.de || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="herkunftsland_en" className={labelClasses}>Herkunftsland (EN)</label>
                    <input type="text" name="herkunftsland_en" id="herkunftsland_en" defaultValue={mevcutUrun?.herkunftsland?.en || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                </div>
              </div>

              {/* 8b. Haltbarkeit & Lagerung */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Haltbarkeit & Lagerung</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="haltbarkeit_monate" className={labelClasses}>
                      Haltbarkeit (Monate)
                      {seciliUrunGami === 'barista-bakery-essentials' && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="number"
                      name="haltbarkeit_monate"
                      id="haltbarkeit_monate"
                      defaultValue={mevcutUrun?.haltbarkeit_monate || ''}
                      required={seciliUrunGami === 'barista-bakery-essentials'}
                      className="w-full p-2 border rounded-md bg-gray-50"
                    />
                  </div>
                  <div>
                    <label htmlFor="haltbarkeit_nach_oeffnen_tage" className={labelClasses}>Nach Öffnen (Tage)</label>
                    <input type="number" name="haltbarkeit_nach_oeffnen_tage" id="haltbarkeit_nach_oeffnen_tage" defaultValue={mevcutUrun?.haltbarkeit_nach_oeffnen_tage || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="lagertemperatur_min_celsius" className={labelClasses}>Lagertemp. min (°C)</label>
                    <input type="number" name="lagertemperatur_min_celsius" id="lagertemperatur_min_celsius" step="0.1" defaultValue={mevcutUrun?.lagertemperatur_min_celsius || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="lagertemperatur_max_celsius" className={labelClasses}>Lagertemp. max (°C)</label>
                    <input type="number" name="lagertemperatur_max_celsius" id="lagertemperatur_max_celsius" step="0.1" defaultValue={mevcutUrun?.lagertemperatur_max_celsius || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                </div>
              </div>

              {/* 8c. Bestellung & Lieferung */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Bestellung & Lieferung</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label htmlFor="mindest_bestellmenge" className={labelClasses}>MOQ</label>
                    <input type="number" name="mindest_bestellmenge" id="mindest_bestellmenge" defaultValue={mevcutUrun?.mindest_bestellmenge || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="mindest_bestellmenge_einheit" className={labelClasses}>MOQ-Einheit</label>
                    <select name="mindest_bestellmenge_einheit" id="mindest_bestellmenge_einheit" defaultValue={mevcutUrun?.mindest_bestellmenge_einheit || 'Karton'} className="w-full p-2 border rounded-md bg-gray-50">
                      <option value="Karton">Karton</option>
                      <option value="Pallet">Pallet</option>
                      <option value="Stück">Stück</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="lieferzeit_werktage" className={labelClasses}>Lieferzeit (Tage)</label>
                    <input type="number" name="lieferzeit_werktage" id="lieferzeit_werktage" defaultValue={mevcutUrun?.lieferzeit_werktage || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                </div>
              </div>

              {/* 8d. Zertifikate */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Zertifikate</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {['BRC', 'Halal', 'IFS', 'Kosher', 'Bio', 'Vegan_Zert', 'HACCP', 'Rainforest'].map(cert => (
                    <label key={cert} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" name={`zertifikat_${cert}`} defaultChecked={(mevcutUrun?.zertifikate || []).includes(cert)} />
                      <span className="text-sm text-gray-700">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 8e. Inhaltsstoffe */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Inhaltsstoffe</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="inhaltsstoffe_de" className={labelClasses}>DE</label>
                    <textarea name="inhaltsstoffe_de" id="inhaltsstoffe_de" rows={4} defaultValue={mevcutUrun?.inhaltsstoffe?.de || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label htmlFor="inhaltsstoffe_en" className={labelClasses}>EN</label>
                    <textarea name="inhaltsstoffe_en" id="inhaltsstoffe_en" rows={4} defaultValue={mevcutUrun?.inhaltsstoffe?.en || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                </div>
              </div>

              {/* 8f. Allergene (EU 14) */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Allergene (EU 14)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Enthält</p>
                    {['gluten', 'krebstiere', 'eier', 'fisch', 'erdnuesse', 'soja', 'milch', 'schalen', 'sellerie', 'senf', 'sesam', 'sulfite', 'lupinen', 'weichtiere'].map(allergen => (
                      <label key={`${allergen}-enth`} className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" name={`allergen_${allergen}`} defaultChecked={mevcutUrun?.allergene?.[allergen] || false} />
                        <span className="text-sm text-gray-700 capitalize">{allergen}</span>
                      </label>
                    ))}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-3">Kann Spuren enthalten</p>
                    {['gluten', 'krebstiere', 'eier', 'fisch', 'erdnuesse', 'soja', 'milch', 'schalen', 'sellerie', 'senf', 'sesam', 'sulfite', 'lupinen', 'weichtiere'].map(allergen => (
                      <label key={`${allergen}-spuren`} className="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" name={`allergen_${allergen}_spuren`} defaultChecked={mevcutUrun?.allergene?.[`${allergen}_spuren`] || false} />
                        <span className="text-sm text-gray-700 capitalize">{allergen}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* 8g. Nährwerte pro 100g */}
              <div className="mb-8 pb-6 border-b border-gray-200">
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Nährwerte pro 100 g</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label htmlFor="naehrwert_energie_kj" className={labelClasses}>Energie (kJ)</label><input type="number" name="naehrwert_energie_kj" id="naehrwert_energie_kj" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.energie_kj || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_energie_kcal" className={labelClasses}>Energie (kcal)</label><input type="number" name="naehrwert_energie_kcal" id="naehrwert_energie_kcal" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.energie_kcal || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_fett" className={labelClasses}>Fett (g)</label><input type="number" name="naehrwert_fett" id="naehrwert_fett" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.fett || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_davon_gesaettigt" className={labelClasses}>Davon gesättigt (g)</label><input type="number" name="naehrwert_davon_gesaettigt" id="naehrwert_davon_gesaettigt" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.davon_gesaettigt || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_kohlenhydrate" className={labelClasses}>Kohlenhydrate (g)</label><input type="number" name="naehrwert_kohlenhydrate" id="naehrwert_kohlenhydrate" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.kohlenhydrate || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_davon_zucker" className={labelClasses}>Davon Zucker (g)</label><input type="number" name="naehrwert_davon_zucker" id="naehrwert_davon_zucker" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.davon_zucker || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_ballaststoffe" className={labelClasses}>Ballaststoffe (g)</label><input type="number" name="naehrwert_ballaststoffe" id="naehrwert_ballaststoffe" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.ballaststoffe || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_eiweiss" className={labelClasses}>Eiweiß (g)</label><input type="number" name="naehrwert_eiweiss" id="naehrwert_eiweiss" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.eiweiss || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="naehrwert_salz" className={labelClasses}>Salz (g)</label><input type="number" name="naehrwert_salz" id="naehrwert_salz" step="0.1" defaultValue={mevcutUrun?.naehrwerte?.pro_100g?.salz || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                </div>
              </div>

              {/* 8h. Technische Spez. + Datenblatt */}
              <div>
                <h3 className="font-semibold text-lg text-slate-800 mb-4">Technische Spezifikation & Datenblatt</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                  <div><label htmlFor="teknik_ph" className={labelClasses}>pH</label><input type="number" name="teknik_ph" id="teknik_ph" step="0.1" defaultValue={mevcutUrun?.teknik_ozellikler?.ph || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div><label htmlFor="teknik_brix" className={labelClasses}>Brix</label><input type="number" name="teknik_brix" id="teknik_brix" step="0.1" defaultValue={mevcutUrun?.teknik_ozellikler?.brix || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                  <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" name="teknik_gmo_free" defaultChecked={mevcutUrun?.teknik_ozellikler?.gmo_free || false} /><span className="text-sm text-gray-700">GMO-frei</span></label></div>
                </div>
                <div>
                  <label htmlFor="produktdatenblatt_url" className={labelClasses}>Produktdatenblatt (PDF-URL)</label>
                  <input type="text" name="produktdatenblatt_url" id="produktdatenblatt_url" placeholder="https://..." defaultValue={mevcutUrun?.produktdatenblatt_url || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                </div>
              </div>
            </div>

            {/* Buttons am Ende */}
            <div className="flex justify-end gap-4 pt-6 border-t mt-8">
                <Link href={`/${locale}/admin/urun-yonetimi/urunler`} passHref>
                    <button type="button" className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm">{L.buttons.cancel}</button>
                </Link>
                {/* Pending Status übergeben */}
                {isAdmin && <SubmitButton mode={isEditMode ? 'edit' : 'create'} isPending={isPending} labels={L.buttons} />}
                {isAdmin && isEditMode && mevcutUrun && <DeleteButtonWrapper urun={mevcutUrun} locale={locale} labels={L} />}
            </div>
            </fieldset>
        </form>
    );
}