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
    const [seciliKategoriId, setSeciliKategoriId] = useState<string | null>(mevcutUrun?.kategori_id || null);
    const [aktifSablon, setAktifSablon] = useState<Sablon[]>([]);
    const [isLoadingSablon, setIsLoadingSablon] = useState(false);
    const [slug, setSlug] = useState(mevcutUrun?.slug || '');
    const [anaResimDosyasi, setAnaResimDosyasi] = useState<File | null>(null);
    const [anaResimOnizleme, setAnaResimOnizleme] = useState<string | null>(mevcutUrun?.ana_resim_url || null);
    const [galeriOnizlemeler, setGaleriOnizlemeler] = useState<Array<{ id: string | number, url: string, file?: File }>>(
        (mevcutUrun?.galeri_resim_urls || []).map((url) => ({ id: url, url }))
    );
    const [markierteGeloeschteUrls, setMarkierteGeloeschteUrls] = useState<string[]>([]);
    const isEditMode = !!mevcutUrun;

    // Sablon laden
    useEffect(() => {
        const fetchSablon = async () => {
            if (!seciliKategoriId) { setAktifSablon([]); return; }
            setIsLoadingSablon(true);
            const { data } = await supabase
                                    .from('kategori_ozellik_sablonlari')
                                    .select('*')
                                    .eq('kategori_id', seciliKategoriId)
                                    .order('sira');
            setAktifSablon(data || []);
            setIsLoadingSablon(false);
        };
        fetchSablon();
    }, [seciliKategoriId, supabase]);

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
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label htmlFor="kategori_id" className={labelClasses}>Kategorie <span className="text-red-500">*</span></label><select id="kategori_id" name="kategori_id" value={seciliKategoriId || ""} onChange={(e) => setSeciliKategoriId(e.target.value)} disabled={isEditMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed" required><option value="" disabled>Bitte wählen...</option>{kategoriler.map(k => (<option key={k.id} value={k.id}>{k.ad?.[locale] || Object.values(k.ad ?? {})[0] || 'Unbenannte Kategorie'}</option>))}</select>{isEditMode && <p className="text-xs text-gray-500 mt-1">Kategorie kann nicht geändert werden.</p>}</div><div><label htmlFor="tedarikci_id" className={labelClasses}>Lieferant</label><select id="tedarikci_id" name="tedarikci_id" defaultValue={mevcutUrun?.tedarikci_id || ""} className="w-full p-2 border rounded-md bg-gray-50"><option value="">Kein Lieferant</option>{tedarikciler.map(t => <option key={t.id} value={t.id}>{t.unvan}</option>)}</select></div></div>
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