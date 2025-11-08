// src/app/[locale]/admin/urun-yonetimi/urunler/urun-formu.tsx (Vollständig, Manuelle Action)
'use client';

import React, { useState, useTransition, useEffect, ChangeEvent, FormEvent } from 'react';
import { Tables, Enums } from '@/lib/supabase/database.types';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiSave, FiX, FiInfo, FiClipboard, FiDollarSign, FiLoader, FiTrash2, FiImage, FiUploadCloud } from 'react-icons/fi';
// Actions importieren
import { createUrunAction, updateUrunAction, deleteUrunAction, FormState } from './actions';
import { useRouter } from 'next/navigation';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';
// Nur useFormStatus importieren
import { useFormStatus } from 'react-dom';

// Tipler
type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

interface UrunFormuProps {
    locale: string;
    kategoriler: Kategori[];
    tedarikciler: Tedarikci[];
    birimler: Birim[];
    mevcutUrun?: Urun;
}

const diller = [
    { kod: 'de', ad: 'Almanca' }, { kod: 'en', ad: 'Englisch' },
    { kod: 'tr', ad: 'Türkisch' }, { kod: 'ar', ad: 'Arabisch' },
];

// Submit Button (benötigt isPending Prop)
function SubmitButton({ mode, isPending }: { mode: 'create' | 'edit', isPending: boolean }) {
    const pending = isPending;
    return (
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm disabled:bg-accent/50 disabled:cursor-wait">
            {pending ? <FiLoader className="animate-spin" /> : <FiSave />}
            {pending ? 'Speichern...' : (mode === 'create' ? 'Produkt erstellen' : 'Änderungen speichern')}
        </button>
    );
}

// Separate Delete Button Komponente
function DeleteButtonWrapper({ urun, locale }: { urun: Urun, locale: string }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const handleDelete = () => {
        if (confirm(`Sind Sie sicher, dass Sie "${urun.ad?.[locale] || urun.ad?.['tr'] || 'Produkt'}" löschen möchten?`)) {
            startTransition(async () => {
                const result = await deleteUrunAction(urun.id);
                if (result?.success) {
                    toast.success(result.message);
                    // Weiterleitung nach Erfolg
         
                } else if (result) {
                    toast.error(result.message);
                }
            });
        }
    };

    return (
        <button type="button" onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-red-500 text-red-500 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
             {isPending ? <FiLoader className="animate-spin" /> : <FiTrash2 />} Sil
        </button>
    );
}

// Hauptformular-Komponente
export function UrunFormu({ locale, kategoriler, tedarikciler, birimler, mevcutUrun }: UrunFormuProps) {
    const router = useRouter();
    const supabase = createDynamicSupabaseClient(true);
    const [isPending, startTransition] = useTransition(); // Für den Submit
    const [formResult, setFormResult] = useState<FormState>(null);

    // Andere States
    const [aktifDil, setAktifDil] = useState(locale);
    
    // Kategori states - hierarchical selection
    const anaKategoriler = kategoriler.filter(k => !k.ust_kategori_id);
    const mevcutKategori = kategoriler.find(k => k.id === mevcutUrun?.kategori_id);
    const mevcutAnaKategoriId = mevcutKategori?.ust_kategori_id || (mevcutKategori && !mevcutKategori.ust_kategori_id ? mevcutKategori.id : null);
    
    const [anaKategoriId, setAnaKategoriId] = useState<string | null>(mevcutAnaKategoriId);
    const [altKategoriId, setAltKategoriId] = useState<string | null>(
        mevcutKategori?.ust_kategori_id ? mevcutUrun?.kategori_id || null : null
    );
    // If editing and provided categories do not include the saved subcategory,
    // we fetch and store it locally so the selection appears.
    const [selectedAltKategori, setSelectedAltKategori] = useState<Kategori | null>(
        mevcutKategori?.ust_kategori_id ? mevcutKategori : null
    );
    // In case children of the chosen parent are not provided via props, fetch them.
    const [dinamikAltKategoriler, setDinamikAltKategoriler] = useState<Kategori[]>([]);
    
    // Alt kategorileri filtrele
    const altKategoriler = anaKategoriId 
        ? kategoriler.filter(k => k.ust_kategori_id === anaKategoriId)
        : [];
    const gorunenAltKategoriler: Kategori[] = altKategoriler.length > 0 ? altKategoriler : dinamikAltKategoriler;
    
    // Actual kategori_id for form submission
    const seciliKategoriId = altKategoriId || anaKategoriId;
    
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
    const standardGeschmackWerte = ['schokolade', 'kakao', 'erdbeere', 'vanille', 'karamell', 'nuss', 'walnuss', 'badem', 'hindistancevizi', 'honig', 'tereyag', 'zitrone', 'portakal', 'zeytin', 'frucht', 'kaffee', 'himbeere', 'kirsche', 'waldfrucht', 'pistazie', 'havuc', 'yulaf', 'yabanmersini'];
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

    // Ensure initial selection is restored in edit mode even if subcategory is not in props
    useEffect(() => {
        (async () => {
            if (!isEditMode || !mevcutUrun?.kategori_id) return;

            // Try to resolve selected category from provided list
            let kat: Kategori | undefined = kategoriler.find(k => k.id === mevcutUrun.kategori_id);

            if (!kat) {
                // Fetch missing category (id, ad, ust_kategori_id)
                const { data, error } = await supabase
                    .from('kategoriler')
                    .select('id, ad, ust_kategori_id')
                    .eq('id', mevcutUrun.kategori_id)
                    .maybeSingle();
                if (error) {
                    console.warn('Kategori fetch error:', error.message);
                }
                if (data) {
                    // Infer parent and set states
                    kat = data as unknown as Kategori;
                    if (kat.ust_kategori_id) {
                        setAnaKategoriId(kat.ust_kategori_id);
                        setAltKategoriId(kat.id);
                        setSelectedAltKategori(kat);
                    } else {
                        setAnaKategoriId(kat.id);
                        setAltKategoriId(null);
                        setSelectedAltKategori(null);
                    }
                }
            } else {
                if (kat.ust_kategori_id) {
                    setAnaKategoriId(kat.ust_kategori_id);
                    setAltKategoriId(kat.id);
                    setSelectedAltKategori(kat);
                } else {
                    setAnaKategoriId(kat.id);
                    setAltKategoriId(null);
                    setSelectedAltKategori(null);
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEditMode, mevcutUrun?.kategori_id, JSON.stringify(kategoriler.map(k => k.id))]);

    // When a parent is chosen but no children provided in props, fetch children to populate dropdown
    useEffect(() => {
        (async () => {
            if (!anaKategoriId) { setDinamikAltKategoriler([]); return; }
            // If props already contain children, prefer them
            if (kategoriler.some(k => k.ust_kategori_id === anaKategoriId)) { setDinamikAltKategoriler([]); return; }
            const { data, error } = await supabase
                .from('kategoriler')
                .select('id, ad, ust_kategori_id')
                .eq('ust_kategori_id', anaKategoriId);
            if (error) {
                console.warn('Alt kategori fetch error:', error.message);
                setDinamikAltKategoriler([]);
            } else {
                setDinamikAltKategoriler((data as unknown as Kategori[]) || []);
            }
        })();
    }, [anaKategoriId, kategoriler, supabase]);

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
    }, [seciliKategoriId, altKategoriId, kategoriler, supabase]);

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
    const handleAnaResimChange = (e: ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]; if(f){if(f.size>2*1024*1024){toast.error("Max 2MB.");e.target.value='';return;}setAnaResimDosyasi(f);const r=new FileReader();r.onloadend=()=>{setAnaResimOnizleme(r.result as string);};r.readAsDataURL(f);}else{setAnaResimDosyasi(null);setAnaResimOnizleme(mevcutUrun?.ana_resim_url||null);} };
    const handleGaleriResimleriChange = (e: ChangeEvent<HTMLInputElement>) => { const fs=e.target.files;if(fs){const nf=Array.from(fs);let err=false;nf.forEach(f=>{if(f.size>2*1024*1024){toast.error(`${f.name} > 2MB.`);err=true;}});if(err){e.target.value='';return;}nf.forEach((f,i)=>{const r=new FileReader();r.onloadend=()=>{setGaleriOnizlemeler(p=>[...p,{id:`${i}-${Date.now()}`,url:r.result as string,file:f}]);};r.readAsDataURL(f);});e.target.value='';} };
    const handleGaleriResimLoeschen = (id: string | number) => { const z=galeriOnizlemeler.find(b=>b.id===id);if(!z)return;if(typeof id==='string'&&mevcutUrun?.galeri_resim_urls?.includes(id)){setMarkierteGeloeschteUrls(p=>[...p,id]);}setGaleriOnizlemeler(p=>p.filter(b=>b.id!==id)); };

    // Formularübermittlung
    const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        // Ensure kategori_id always reflects the current selection (handles async option loading edge cases)
        formData.set('kategori_id', (seciliKategoriId ?? ''));
        setFormResult(null);

        startTransition(async () => {
            toast.info("Bilder werden verarbeitet...", { id: 'upload-toast' });
            let anaResimUrl = mevcutUrun?.ana_resim_url || null;
            let finalGaleriUrls = [...(mevcutUrun?.galeri_resim_urls || [])];

            try {
                // 1. Alte Bilder löschen
                if (markierteGeloeschteUrls.length > 0) {
                     const pathsToRemove: string[] = [];
                     markierteGeloeschteUrls.forEach(url => { try { const u=new URL(url);const p=u.pathname.split('/');if(p.length>2)pathsToRemove.push(p.slice(2).join('/'));}catch(e){} });
                     if (pathsToRemove.length > 0) {
                         const { error: deleteError } = await supabase.storage.from('urun-gorselleri').remove(pathsToRemove);
                         if (deleteError) toast.warning("Alte Bilder konnten nicht gelöscht werden.");
                         else finalGaleriUrls = finalGaleriUrls.filter(url => !markierteGeloeschteUrls.includes(url));
                     }
                }
                // 2. Hauptbild hochladen
                if (anaResimDosyasi) {
                    const n=`${Date.now()}-ana-${slugify(anaResimDosyasi.name)}`; const { data: d, error: e } = await supabase.storage.from('urun-gorselleri').upload(n, anaResimDosyasi, { upsert: !!isEditMode }); if (e) throw e; anaResimUrl = supabase.storage.from('urun-gorselleri').getPublicUrl(d.path).data.publicUrl;
                }
                formData.set('ana_resim_url', anaResimUrl || '');

                // 3. Galeriebilder hochladen
                const neueDateien = galeriOnizlemeler.filter(b => b.file).map(b => b.file as File); const neueUrls: string[] = [];
                for (const f of neueDateien) { const n=`${Date.now()}-galeri-${slugify(f.name)}`; const { data: d, error: e } = await supabase.storage.from('urun-gorselleri').upload(n, f); if (e) { toast.warning(`Upload ${f.name} fehlgeschlagen.`); continue; } neueUrls.push(supabase.storage.from('urun-gorselleri').getPublicUrl(d.path).data.publicUrl); }

                // 4. URLs in FormData
                const finaleGalerieListe = [...finalGaleriUrls, ...neueUrls]; formData.delete('galeri_resim_urls[]'); finaleGalerieListe.forEach(url => formData.append('galeri_resim_urls[]', url));

                toast.dismiss('upload-toast');

                // 5. Server Action aufrufen
                const action = isEditMode ? updateUrunAction.bind(null, mevcutUrun.id) : createUrunAction;
                const result = await action(formData);
                setFormResult(result);

            } catch (error: any) {
                toast.dismiss('upload-toast');
                toast.error("Fehler beim Bild-Upload: " + error.message);
                setFormResult({ success: false, message: "Fehler beim Bild-Upload." });
            }
        });
    };

    // --- JSX ---
    const labelClasses = "block text-sm font-bold text-gray-600 mb-1";
    return (
        <form onSubmit={handleFormSubmit} className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Link href={`/${locale}/admin/urun-yonetimi/urunler`} className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 transition-colors">
                        <FiArrowLeft size={24} />
                    </Link>
                    <div>
                        <h1 className="font-serif text-4xl font-bold text-primary">
                            {isEditMode ? (mevcutUrun.ad?.[locale] || 'Produkt bearbeiten') : 'Neues Produkt erstellen'}
                        </h1>
                        <p className="text-text-main/80 mt-1">
                            {isEditMode ? 'Produktdetails aktualisieren' : 'Neues Produkt zum System hinzufügen'}
                        </p>
                    </div>
                </div>
                {isEditMode && (<DeleteButtonWrapper urun={mevcutUrun} locale={locale}/>)}
            </header>

            {/* Bild Upload Abschnitt */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiImage />Produktbilder</h2>
                 <div className='space-y-8'><div><label className="block text-sm font-bold text-gray-600 mb-2">Hauptbild</label><div className="flex items-center gap-6"><div className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden">{anaResimOnizleme ? (<Image src={anaResimOnizleme} alt="Produkt Vorschau" width={128} height={128} className="object-cover w-full h-full" />) : ( <FiImage className="text-gray-300 text-4xl" /> )}</div><div><input type="file" id="ana-resim-input" className="hidden" onChange={handleAnaResimChange} accept="image/png, image/jpeg, image/webp" /><label htmlFor="ana-resim-input" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm"><FiUploadCloud /> {anaResimOnizleme ? 'Ändern' : 'Hochladen'}</label><p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP. Max. 2MB.</p></div></div></div><div><label className="block text-sm font-bold text-gray-600 mb-2">Galeriebilder</label><div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">{galeriOnizlemeler.map((bild, index) => (<div key={bild.id} className="relative aspect-square group"><Image src={bild.url} alt={`Galerie Vorschau ${index+1}`} fill sizes="150px" className="object-cover rounded-lg border" /><button type="button" onClick={() => handleGaleriResimLoeschen(bild.id)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"><FiX size={12} strokeWidth={3} /></button></div>))}<div><input type="file" id="galeri-resim-input" className="hidden" onChange={handleGaleriResimleriChange} accept="image/png, image/jpeg, image/webp" multiple /><label htmlFor="galeri-resim-input" className="cursor-pointer aspect-square w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-accent transition-colors"><FiUploadCloud className="text-gray-400 text-3xl" /><span className="text-xs text-center text-gray-500 mt-2">Bilder hinzufügen</span></label></div></div></div></div>
             </div>

            {/* Grundlegende Definitionen */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-6">Grundlegende Definitionen</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {/* Ana Kategori */}
                     <div>
                         <label htmlFor="ana_kategori_id" className={labelClasses}>
                             Hauptkategorie <span className="text-red-500">*</span>
                         </label>
                         <select 
                             id="ana_kategori_id" 
                             value={anaKategoriId || ""} 
                             onChange={(e) => {
                                 setAnaKategoriId(e.target.value);
                                 setAltKategoriId(null); // Reset alt kategori
                             }}
                             className="w-full p-2 border rounded-md bg-gray-50" 
                             required
                         >
                             <option value="" disabled>Bitte wählen...</option>
                             {anaKategoriler.map(k => (
                                 <option key={k.id} value={k.id}>
                                     {k.ad?.[locale] || Object.values(k.ad ?? {})[0] || 'Unbenannte Kategorie'}
                                 </option>
                             ))}
                         </select>
                     </div>

                     {/* Alt Kategori - nur sichtbar wenn Ana Kategori gewählt */}
                     <div>
                         <label htmlFor="alt_kategori_id" className={labelClasses}>
                             Unterkategorie {altKategoriler.length > 0 && <span className="text-red-500">*</span>}
                         </label>
                         <select 
                             id="alt_kategori_id"
                             name="kategori_id"
                             value={altKategoriId || ""} 
                             onChange={(e) => setAltKategoriId(e.target.value)}
                             className="w-full p-2 border rounded-md bg-gray-50"
                             disabled={!anaKategoriId || gorunenAltKategoriler.length === 0}
                             required={gorunenAltKategoriler.length > 0}
                         >
                             <option value="">
                                 {!anaKategoriId ? 'Zuerst Hauptkategorie wählen' : 
                                  gorunenAltKategoriler.length === 0 ? 'Keine Unterkategorien' : 
                                  'Bitte wählen...'}
                             </option>
                             {gorunenAltKategoriler.map(k => (
                                 <option key={k.id} value={k.id}>
                                     {k.ad?.[locale] || Object.values(k.ad ?? {})[0] || 'Unbenannte Kategorie'}
                                 </option>
                             ))}
                             {/* If selected subcategory is not present in options, inject it */}
                             {altKategoriId && selectedAltKategori && !gorunenAltKategoriler.some(k => k.id === altKategoriId) && (
                                 <option key={selectedAltKategori.id} value={selectedAltKategori.id}>
                                     {selectedAltKategori.ad?.[locale] || Object.values(selectedAltKategori.ad ?? {})[0] || 'Unbenannte Kategorie'}
                                 </option>
                             )}
                         </select>
                         {isEditMode && <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1"><span>⚠️</span> Bei Kategorieänderung werden technische Eigenschaften neu geladen.</p>}
                     </div>

                     {/* Hidden input for form submission when no subcategories */}
                     {gorunenAltKategoriler.length === 0 && anaKategoriId && (
                         <input type="hidden" name="kategori_id" value={anaKategoriId} />
                     )}

                     <div>
                         <label htmlFor="tedarikci_id" className={labelClasses}>Lieferant</label>
                         <select id="tedarikci_id" name="tedarikci_id" defaultValue={mevcutUrun?.tedarikci_id || ""} className="w-full p-2 border rounded-md bg-gray-50">
                             <option value="">Kein Lieferant</option>
                             {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.unvan}</option>)}
                         </select>
                     </div>
                 </div>
             </div>

            {/* Produktinformationen (Mehrsprachig) */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-2 flex items-center gap-3"><FiInfo />Produktinformationen (Mehrsprachig)</h2>
                 <div className="border-b border-gray-200 mb-6"><nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">{diller.map((dil) => (<button key={dil.kod} type="button" onClick={() => setAktifDil(dil.kod)} className={`${ aktifDil === dil.kod ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{dil.ad}</button>))}</nav></div><div className="space-y-6">{diller.map((dil) => (<div key={dil.kod} className={aktifDil === dil.kod ? 'space-y-4' : 'hidden'}><div><label htmlFor={`ad_${dil.kod}`} className={labelClasses}>Produktname ({dil.kod.toUpperCase()})</label><input type="text" name={`ad_${dil.kod}`} id={`ad_${dil.kod}`} defaultValue={mevcutUrun?.ad?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" onChange={(e) => handleAdChange(e, dil.kod)} /></div><div><label htmlFor={`aciklamalar_${dil.kod}`} className={labelClasses}>Beschreibung ({dil.kod.toUpperCase()})</label><textarea name={`aciklamalar_${dil.kod}`} id={`aciklamalar_${dil.kod}`} rows={4} defaultValue={mevcutUrun?.aciklamalar?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div></div>))}</div>
             </div>

            {/* Operative Informationen */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                 <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiClipboard />Operative Informationen</h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"><div><label htmlFor="stok_kodu" className={labelClasses}>Artikelnummer (SKU)</label><input type="text" name="stok_kodu" id="stok_kodu" defaultValue={mevcutUrun?.stok_kodu || ''} className="w-full p-2 border rounded-md bg-gray-50 font-mono" /></div><div><label htmlFor="slug" className={labelClasses}>URL (Slug) <span className="text-red-500">*</span></label><input type="text" name="slug" id="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 font-mono" required /></div><div><label htmlFor="ana_satis_birimi_id" className={labelClasses}>Verkaufseinheit <span className="text-red-500">*</span></label><select id="ana_satis_birimi_id" name="ana_satis_birimi_id" defaultValue={mevcutUrun?.ana_satis_birimi_id || ""} className="w-full p-2 border rounded-md bg-gray-50" required><option value="" disabled>Bitte wählen...</option>{birimler.map(b => (<option key={b.id} value={b.id}>{b.ad?.[locale] || Object.values(b.ad ?? {})[0] || 'Unbenannte Einheit'}</option>))}</select></div><div className="flex items-center pt-5 md:pt-8"><input type="checkbox" id="aktif" name="aktif" defaultChecked={mevcutUrun?.aktif ?? true} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="aktif" className="ml-3 block text-sm font-bold text-gray-600">Produkt aktiv?</label></div></div>
             </div>

            {/* Preis & Lager */}
             <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiDollarSign />Preis & Lager (EUR)</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><div><label htmlFor="stok_miktari" className={labelClasses}>Lagerbestand</label><input type="number" name="stok_miktari" id="stok_miktari" defaultValue={mevcutUrun?.stok_miktari ?? 0} className="w-full p-2 border rounded-md bg-gray-50" /></div><div><label htmlFor="stok_esigi" className={labelClasses}>Bestandswarnung bei</label><input type="number" name="stok_esigi" id="stok_esigi" defaultValue={mevcutUrun?.stok_esigi ?? 0} className="w-full p-2 border rounded-md bg-gray-50" /></div><div><label htmlFor="satis_fiyati_musteri" className={labelClasses}>Preis Kunde (Netto)</label><input type="number" step="0.01" name="satis_fiyati_musteri" id="satis_fiyati_musteri" defaultValue={mevcutUrun?.satis_fiyati_musteri ?? 0} className="w-full p-2 border rounded-md bg-gray-50" /></div><div><label htmlFor="satis_fiyati_alt_bayi" className={labelClasses}>Preis Händler (Netto)</label><input type="number" step="0.01" name="satis_fiyati_alt_bayi" id="satis_fiyati_alt_bayi" defaultValue={mevcutUrun?.satis_fiyati_alt_bayi ?? 0} className="w-full p-2 border rounded-md bg-gray-50" /></div><div><label htmlFor="distributor_alis_fiyati" className={labelClasses}>Einkaufspreis (Netto)</label><input type="number" step="0.01" name="distributor_alis_fiyati" id="distributor_alis_fiyati" defaultValue={mevcutUrun?.distributor_alis_fiyati ?? 0} className="w-full p-2 border rounded-md bg-gray-50" /></div></div>
             </div>

            {/* Produkteigenschaften (Filter) */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-2">Produkteigenschaften (Filter)</h2>
                <p className="text-sm text-gray-500 mb-6">Diese Eigenschaften werden für die Produktfilter auf der öffentlichen Seite verwendet.</p>
                
                <div className="space-y-6">
                    {/* Eigenschaften - Checkboxen */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-3">Eigenschaften</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_vegan" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.vegan === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">Vegan</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_vegetarisch" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.vegetarisch === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">{locale === 'de' ? 'Vegetarisch' : locale === 'tr' ? 'Vejetaryen' : locale === 'ar' ? 'نباتي' : 'Vegetarian'}</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_glutenfrei" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.glutenfrei === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">Glutenfrei</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_laktosefrei" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.laktosefrei === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">Laktosefrei</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    name="eigenschaft_bio" 
                                    defaultChecked={(mevcutUrun?.teknik_ozellikler as any)?.bio === true}
                                    className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" 
                                />
                                <span className="text-sm text-gray-700">Bio</span>
                            </label>
                        </div>
                    </div>

                    {/* Geschmack - Multiple Checkboxes + Custom Input */}
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-2">
                            {locale === 'de' ? 'Geschmack (Mehrfachauswahl möglich)' : locale === 'tr' ? 'Tat (Çoklu seçim mümkün)' : locale === 'ar' ? 'النكهة (يمكن الاختيار المتعدد)' : 'Flavor (Multiple selection possible)'}
                        </label>
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
                                <span className="text-sm">{locale === 'de' ? 'Schokolade' : locale === 'tr' ? 'Çikolata' : locale === 'ar' ? 'شوكولاتة' : 'Chocolate'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Kakao' : locale === 'tr' ? 'Kakao' : locale === 'ar' ? 'كاكاو' : 'Cocoa'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Erdbeere' : locale === 'tr' ? 'Çilek' : locale === 'ar' ? 'فراولة' : 'Strawberry'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Vanille' : locale === 'tr' ? 'Vanilya' : locale === 'ar' ? 'فانيليا' : 'Vanilla'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Karamell' : locale === 'tr' ? 'Karamel' : locale === 'ar' ? 'كراميل' : 'Caramel'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Nuss' : locale === 'tr' ? 'Fındık' : locale === 'ar' ? 'بندق' : 'Hazelnut'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Walnuss' : locale === 'tr' ? 'Ceviz' : locale === 'ar' ? 'جوز' : 'Walnut'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Mandel' : locale === 'tr' ? 'Badem' : locale === 'ar' ? 'لوز' : 'Almond'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Kokosnuss' : locale === 'tr' ? 'Hindistan Cevizi' : locale === 'ar' ? 'جوز الهند' : 'Coconut'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Honig' : locale === 'tr' ? 'Bal' : locale === 'ar' ? 'عسل' : 'Honey'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Butter' : locale === 'tr' ? 'Tereyağ' : locale === 'ar' ? 'زبدة' : 'Butter'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Zitrone' : locale === 'tr' ? 'Limon' : locale === 'ar' ? 'ليمون' : 'Lemon'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Orange' : locale === 'tr' ? 'Portakal' : locale === 'ar' ? 'برتقال' : 'Orange'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Olive' : locale === 'tr' ? 'Zeytin' : locale === 'ar' ? 'زيتون' : 'Olive'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Frucht' : locale === 'tr' ? 'Meyve' : locale === 'ar' ? 'فاكهة' : 'Fruit'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Waldfrucht' : locale === 'tr' ? 'Orman Meyveli' : locale === 'ar' ? 'فاكهة الغابة' : 'Forest Fruit'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Kaffee' : locale === 'tr' ? 'Kahve' : locale === 'ar' ? 'قهوة' : 'Coffee'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Himbeere' : locale === 'tr' ? 'Frambuaz' : locale === 'ar' ? 'توت العليق' : 'Raspberry'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Pistazie' : locale === 'tr' ? 'Fıstık' : locale === 'ar' ? 'فستق' : 'Pistachio'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Kirsche' : locale === 'tr' ? 'Kiraz' : locale === 'ar' ? 'كرز' : 'Cherry'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Karotte' : locale === 'tr' ? 'Havuç' : locale === 'ar' ? 'جزر' : 'Carrot'}</span>
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
                                <span className="text-sm">{locale === 'de' ? 'Hafer' : locale === 'tr' ? 'Yulaf' : locale === 'ar' ? 'شوفان' : 'Oat'}</span>
                            </label>
                        </div>

                        {/* Custom Input for additional flavors */}
                        <div className="mt-3">
                            <label className="block text-xs text-gray-600 mb-1">
                                {locale === 'de' ? '🔸 Zusätzliche Geschmacksrichtungen (kommagetrennt)' : locale === 'tr' ? '🔸 Ek tatlar (virgülle ayırın)' : locale === 'ar' ? '🔸 نكهات إضافية (مفصولة بفواصل)' : '🔸 Additional flavors (comma-separated)'}
                            </label>
                            <input
                                type="text"
                                placeholder={locale === 'de' ? 'Z.B. Lebkuchen, Spekulatius...' : locale === 'tr' ? 'Örn. Zencefilli kurabiye...' : locale === 'ar' ? 'مثال: توابل...' : 'E.g. Gingerbread...'}
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
             {isLoadingSablon ? ( <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 text-center"><FiLoader className="animate-spin inline-block text-gray-400 text-2xl" /></div> ) : aktifSablon.length > 0 && ( <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200"><h2 className="font-serif text-2xl font-bold text-primary mb-6">Technische Details</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{aktifSablon.map(alan => (<div key={alan.id}><label htmlFor={`teknik_${alan.alan_adi}`} className={labelClasses}>{alan.gosterim_adi?.[locale] || alan.gosterim_adi?.['tr']}</label><input type={alan.alan_tipi === 'sayı' ? 'number' : 'text'} name={`teknik_${alan.alan_adi}`} id={`teknik_${alan.alan_adi}`} /* @ts-ignore */ defaultValue={mevcutUrun?.teknik_ozellikler?.[alan.alan_adi] || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>))}</div></div> )}


            {/* Buttons am Ende */}
            <div className="flex justify-end gap-4 pt-6 border-t mt-8">
                <Link href={`/${locale}/admin/urun-yonetimi/urunler`} passHref>
                    <button type="button" className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm">Abbrechen</button>
                </Link>
                {/* Pending Status übergeben */}
                <SubmitButton mode={isEditMode ? 'edit' : 'create'} isPending={isPending} />
            </div>
        </form>
    );
}