'use client';

// KORREKTUR 1: React importieren für React.use() und React.useActionState
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Database, Enums } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiUploadCloud, FiLoader, FiX } from 'react-icons/fi';
// KORREKTUR 2: useFormStatus aus react-dom importieren
import { useFormStatus } from 'react-dom';
import { uploadMaterialAction, UploadFormState } from './actions';
import { toast } from 'sonner';

type KategorieOption = Enums<'materyal_kategori'>;
type HedefKitleOption = Enums<'hedef_rol'>;

// Submit Button Komponente (unverändert)
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm disabled:bg-accent/50 disabled:cursor-wait">
            {pending ? <FiLoader className="animate-spin mr-2" /> : <FiSave size={18} />}
            {pending ? 'Speichern...' : 'Material speichern'}
        </button>
    );
}

export default function NeuesMaterialPage({ params }: { params: { locale: string } }) {
    // KORREKTUR 3: params mit React.use() sicher auspacken
    const resolvedParams = React.use(params);
    const locale = resolvedParams.locale;

    const router = useRouter();
    const initialState: UploadFormState = null;
    // KORREKTUR 2: React.useActionState verwenden
    const [state, formAction] = React.useActionState(uploadMaterialAction, initialState);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string>('');

    // Effekt für Toaster-Nachrichten und Weiterleitung (unverändert)
    useEffect(() => {
        if (state?.success === true) {
            toast.success(state.message);
            router.push(`/${locale}/admin/pazarlama/materialien`);
        } else if (state?.success === false) {
            toast.error(state.message);
        }
    }, [state, router, locale]); // locale als Abhängigkeit bleibt korrekt

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setFileName(file.name);
        } else {
            setSelectedFile(null);
            setFileName('');
        }
    };

    const kategorieOptions: KategorieOption[] = ["Broşürler", "Ürün Fotoğrafları", "Sosyal Medya Kitleri", "Fiyat Listeleri", "Diğer"];
    const hedefKitleOptions: HedefKitleOption[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";
    const labelBaseClasses = "block text-sm font-bold text-text-main/80 mb-2";

    return (
        <div className="space-y-8">
            <header className="mb-8">
                {/* KORREKTUR 3: Die sicher extrahierte 'locale' Variable verwenden */}
                <Link href={`/${locale}/admin/pazarlama/materialien`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft />
                    Zurück zur Materialliste
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">Neues Marketingmaterial hochladen</h1>
                <p className="text-text-main/80 mt-1">Laden Sie eine neue Datei für Ihre Partner hoch.</p>
            </header>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                <form action={formAction}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                        {/* --- Formularfelder (unverändert) --- */}
                        <div className="md:col-span-2">
                            <label htmlFor="baslik" className={labelBaseClasses}>Titel <span className="text-red-500">*</span></label>
                            <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} placeholder="z.B. Sommerkatalog 2025 PDF" />
                        </div>
                         <div className="md:col-span-2">
                            <label htmlFor="aciklama" className={labelBaseClasses}>Beschreibung (Optional)</label>
                            <textarea id="aciklama" name="aciklama" rows={3} className={inputBaseClasses} placeholder="Kurze Beschreibung des Inhalts..." />
                        </div>
                        <div>
                            <label htmlFor="kategori" className={labelBaseClasses}>Kategorie <span className="text-red-500">*</span></label>
                            <select id="kategori" name="kategori" required className={inputBaseClasses}>
                                <option value="">-- Kategorie wählen --</option>
                                {kategorieOptions.map(kat => <option key={kat} value={kat}>{kat}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="hedef_kitle" className={labelBaseClasses}>Zielgruppe <span className="text-red-500">*</span></label>
                            <select id="hedef_kitle" name="hedef_kitle" required className={inputBaseClasses}>
                                {hedefKitleOptions.map(kitle => <option key={kitle} value={kitle}>{kitle}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelBaseClasses}>Datei auswählen <span className="text-red-500">*</span></label>
                            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10 bg-secondary">
                                <div className="text-center">
                                    <FiUploadCloud className="mx-auto h-12 w-12 text-gray-400" aria-hidden="true" />
                                    <div className="mt-4 flex text-sm leading-6 text-gray-600">
                                        <label
                                            htmlFor="datei"
                                            className="relative cursor-pointer rounded-md font-semibold text-accent focus-within:outline-none focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-2 hover:text-accent-dark"
                                        >
                                            <span>Datei hochladen</span>
                                            <input id="datei" name="datei" type="file" required className="sr-only" onChange={handleFileChange} />
                                        </label>
                                        <p className="pl-1">oder hierher ziehen</p>
                                    </div>
                                    <p className="text-xs leading-5 text-gray-500">PNG, JPG, PDF etc. bis 10MB</p>
                                    {fileName && (
                                         <div className="mt-2 text-sm font-medium text-gray-700 flex items-center justify-center gap-2">
                                             {fileName}
                                             <button type="button" onClick={() => { setSelectedFile(null); setFileName(''); const input = document.getElementById('datei') as HTMLInputElement; if(input) input.value = ''; }} className="text-red-500 hover:text-red-700">
                                                 <FiX size={16}/>
                                             </button>
                                         </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* --- Ende Formularfelder --- */}

                    </div>

                    {/* Buttons */}
                    <div className="pt-8 mt-6 border-t border-bg-subtle flex justify-end gap-4">
                        {/* KORREKTUR 3: Die sicher extrahierte 'locale' Variable verwenden */}
                        <Link href={`/${locale}/admin/pazarlama/materialien`} className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm transition-colors">
                            Abbrechen
                        </Link>
                        <SubmitButton />
                    </div>
                </form>
            </div>
        </div>
    );
}