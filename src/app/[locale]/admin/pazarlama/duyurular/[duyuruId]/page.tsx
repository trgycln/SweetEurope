// src/app/[locale]/admin/pazarlama/duyurular/[duyuruId]/page.tsx
// KORRIGIERTE VERSION (useParams statt React.use, locale an DeleteButton übergeben)

'use client';

import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
// useRouter und useParams von 'next/navigation' verwenden
import { useRouter, notFound, useParams } from 'next/navigation';
import { Database, Enums, Tables } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiTrash2, FiLoader } from 'react-icons/fi';
import { useFormStatus } from 'react-dom';
import { updateDuyuruAction, UpdateFormState, deleteDuyuruAction } from './actions';
import { toast } from 'sonner';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { Locale } from '@/i18n-config'; // Locale importieren

type HedefKitleOption = Enums<'hedef_rol'>;
type Duyuru = Tables<'duyurular'>;

// Submit Button (unverändert)
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm disabled:bg-accent/50 disabled:cursor-wait">
            {pending ? <FiLoader className="animate-spin mr-2" /> : <FiSave size={18} />}
            {pending ? 'Speichern...' : 'Änderungen speichern'}
        </button>
    );
}

// --- KORREKTUR: DeleteButton benötigt jetzt locale ---
function DeleteButton({ duyuruId, locale }: { duyuruId: string, locale: Locale }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter(); // Router für Fallback-Redirect

    const handleDelete = () => {
        if (confirm('Sind Sie sicher, dass Sie diese Ankündigung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            startTransition(async () => {
                // --- KORREKTUR: locale an Action übergeben ---
                const result = await deleteDuyuruAction(duyuruId, locale);

                // Normalerweise wird die Action 'redirect' auslösen.
                // Falls nicht (z.B. bei Fehler), zeigen wir einen Toast.
                if (result?.success === false) { // Nur Fehler abfangen
                    toast.error(result.message);
                }
                // (Erfolgs-Toast wird nicht benötigt, da redirect erfolgt)
            });
        }
    };

    return (
        <button type="button" onClick={handleDelete} disabled={isPending} className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg shadow-md hover:bg-red-700 transition-all duration-200 font-bold text-sm disabled:bg-red-400 disabled:cursor-wait">
            {isPending ? <FiLoader className="animate-spin mr-2" /> : <FiTrash2 size={18} />}
            Löschen
        </button>
    );
}


export default function BearbeiteDuyuruPage({ params: paramsProp }: { params: { locale: string; duyuruId: string } }) {
    
    // --- KORREKTUR: useParams verwenden, um locale und duyuruId sicher zu erhalten ---
    const params = useParams();
    const locale = params.locale as Locale;
    const duyuruId = params.duyuruId as string;
    // --- ENDE KORREKTUR ---

    const router = useRouter();
    const supabase = createDynamicSupabaseClient(true); // Client-seitiger Client

    const [duyuru, setDuyuru] = useState<Duyuru | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);

    // Daten beim Laden der Seite abrufen
    useEffect(() => {
        const fetchDuyuru = async () => {
            setIsLoading(true);
            setErrorLoading(null);
            const { data, error } = await supabase
                .from('duyurular')
                .select('*')
                .eq('id', duyuruId)
                .single();

            if (error) {
                console.error("Fehler beim Laden der Ankündigung:", error);
                setErrorLoading("Ankündigung konnte nicht geladen werden.");
                if (error.code === 'PGRST116') { // Not Found
                    notFound();
                }
            } else {
                setDuyuru(data);
            }
            setIsLoading(false);
        };
        
        if (duyuruId) {
            fetchDuyuru();
        }
    }, [duyuruId, supabase]);

    // Action State für das Update-Formular
    const initialState: UpdateFormState = null;
    const updateActionWithId = updateDuyuruAction.bind(null, duyuruId);
    const [state, formAction] = React.useActionState(updateActionWithId, initialState);

    // Effekt für Update-Toast
    useEffect(() => {
        if (state?.success === true) {
            toast.success(state.message);
        } else if (state?.success === false) {
            toast.error(state.message);
        }
    }, [state]);

    // Formular-Optionen
    const hedefKitleOptions: HedefKitleOption[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];
    const inputBaseClasses = "w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-sm text-gray-700 focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-gray-400"; // Styling angepasst
    const labelBaseClasses = "block text-sm font-bold text-gray-700 mb-2"; // Styling angepasst

    // Datumsformatierung für <input type="date">
    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    // Lade- und Fehlerzustände
    if (isLoading) {
        return <div className="p-6 text-center text-gray-500">Lade Ankündigung...</div>;
    }
    if (errorLoading) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">{errorLoading}</div>;
    }
    if (!duyuru) {
        return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Ankündigung nicht gefunden.</div>;
    }

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <Link href={`/${locale}/admin/pazarlama/duyurular`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft />
                    Zurück zur Ankündigungsliste
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">Ankündigung bearbeiten</h1>
                <p className="text-text-main/80 mt-1">Ändern Sie die Details der Ankündigung "{duyuru.baslik}".</p>
            </header>

            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border border-gray-200">
                <form action={formAction}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Betreff */}
                        <div className="md:col-span-2">
                            <label htmlFor="baslik" className={labelBaseClasses}>Betreff <span className="text-red-500">*</span></label>
                            <input type="text" id="baslik" name="baslik" required defaultValue={duyuru.baslik} className={inputBaseClasses} />
                        </div>
                        {/* Inhalt */}
                        <div className="md:col-span-2">
                            <label htmlFor="icerik" className={labelBaseClasses}>Inhalt (Optional)</label>
                            <textarea id="icerik" name="icerik" rows={5} defaultValue={duyuru.icerik ?? ''} className={inputBaseClasses} />
                        </div>
                        {/* Zielgruppe */}
                        <div>
                            <label htmlFor="hedef_kitle" className={labelBaseClasses}>Zielgruppe <span className="text-red-500">*</span></label>
                            <select id="hedef_kitle" name="hedef_kitle" required defaultValue={duyuru.hedef_kitle} className={inputBaseClasses}>
                                {hedefKitleOptions.map(kitle => <option key={kitle} value={kitle}>{kitle}</option>)}
                            </select>
                        </div>
                        {/* Aktiv Checkbox */}
                        <div className="flex items-center pt-6">
                            <input type="checkbox" id="aktif" name="aktif" defaultChecked={duyuru.aktif} className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" />
                            <label htmlFor="aktif" className="ml-2 block text-sm font-bold text-gray-700">Aktiv</label>
                        </div>
                        {/* Veröffentlichen ab */}
                        <div>
                            <label htmlFor="yayin_tarihi" className={labelBaseClasses}>Veröffentlichen ab</label>
                            <input type="date" id="yayin_tarihi" name="yayin_tarihi" defaultValue={formatDateForInput(duyuru.yayin_tarihi)} className={inputBaseClasses} />
                        </div>
                        {/* Anzeigen bis */}
                        <div>
                            <label htmlFor="bitis_tarihi" className={labelBaseClasses}>Anzeigen bis (Optional)</label>
                            <input type="date" id="bitis_tarihi" name="bitis_tarihi" defaultValue={formatDateForInput(duyuru.bitis_tarihi)} className={inputBaseClasses} />
                        </div>
                    </div>
                    {/* Buttons */}
                    <div className="pt-8 mt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                        {/* --- KORREKTUR: locale an DeleteButton übergeben --- */}
                        <DeleteButton duyuruId={duyuruId} locale={locale} />
                        
                        <div className="flex gap-4">
                            <Link href={`/${locale}/admin/pazarlama/duyurular`} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-sm transition-colors">
                                Abbrechen
                            </Link>
                            <SubmitButton />
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}