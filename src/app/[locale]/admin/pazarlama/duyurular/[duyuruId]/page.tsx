'use client';

// React importieren für React.use()
import React, { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, notFound } from 'next/navigation';
import { Database, Enums, Tables } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiTrash2, FiLoader } from 'react-icons/fi';
import { useFormStatus } from 'react-dom';
import { updateDuyuruAction, UpdateFormState, deleteDuyuruAction } from './actions';
import { toast } from 'sonner';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';

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

// Delete Button (unverändert)
function DeleteButton({ duyuruId }: { duyuruId: string }) {
    const [isPending, startTransition] = useTransition();
    // useRouter muss hier nicht erneut initialisiert werden, wenn es nicht direkt verwendet wird
    // const router = useRouter(); 

    const handleDelete = () => {
        if (confirm('Sind Sie sicher, dass Sie diese Ankündigung löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.')) {
            startTransition(async () => {
                const result = await deleteDuyuruAction(duyuruId);
                if (result.success) {
                    toast.success(result.message);
                    // Die Weiterleitung erfolgt in der deleteDuyuruAction selbst
                } else {
                    toast.error(result.message);
                }
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


export default function BearbeiteDuyuruPage({ params }: { params: { locale: string; duyuruId: string } }) {
    // KORREKTUR: params mit React.use() sicher auspacken
    const resolvedParams = React.use(params);
    const locale = resolvedParams.locale;
    const duyuruId = resolvedParams.duyuruId; // Jetzt sicher auf duyuruId zugreifen

    const router = useRouter();
    const supabase = createDynamicSupabaseClient(true);

    const [duyuru, setDuyuru] = useState<Duyuru | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorLoading, setErrorLoading] = useState<string | null>(null);

    useEffect(() => {
        const fetchDuyuru = async () => {
            setIsLoading(true);
            setErrorLoading(null);
            const { data, error } = await supabase
                .from('duyurular')
                .select('*')
                .eq('id', duyuruId) // Hier wird die ausgepackte duyuruId verwendet
                .single();

            if (error) {
                console.error("Fehler beim Laden der Ankündigung:", error);
                setErrorLoading("Ankündigung konnte nicht geladen werden.");
                if (error.code === 'PGRST116') {
                    notFound();
                }
            } else {
                setDuyuru(data);
            }
            setIsLoading(false);
        };
        // Nur fetchDuyuru aufrufen, wenn duyuruId vorhanden ist
        if (duyuruId) {
            fetchDuyuru();
        }
    // Abhängigkeiten aktualisiert
    }, [duyuruId, supabase]);

    const initialState: UpdateFormState = null;
    const updateActionWithId = updateDuyuruAction.bind(null, duyuruId);
    const [state, formAction] = React.useActionState(updateActionWithId, initialState);

    useEffect(() => {
        if (state?.success === true) {
            toast.success(state.message);
            // Optional: Nach Erfolg zur Liste zurückkehren
            // router.push(`/${locale}/admin/pazarlama/duyurular`);
        } else if (state?.success === false) {
            toast.error(state.message);
        }
    }, [state, router, locale]);

    const hedefKitleOptions: HedefKitleOption[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];
    const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";
    const labelBaseClasses = "block text-sm font-bold text-text-main/80 mb-2";

    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch (e) {
            return '';
        }
    };

    if (isLoading) {
        return <div className="p-6 text-center">Lade Ankündigung...</div>;
    }
    if (errorLoading) {
        return <div className="p-6 text-red-500">{errorLoading}</div>;
    }
    if (!duyuru) {
        return <div className="p-6 text-red-500">Ankündigung nicht gefunden.</div>;
    }

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <Link href={`/${locale}/admin/pazarlama/duyurular`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft />
                    Zurück zur Ankündigungsliste
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">Ankündigung bearbeiten</h1>
                <p className="text-text-main/80 mt-1">Ändern Sie die Details der Ankündigung "{duyuru.baslik}".</p>
            </header>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                <form action={formAction}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Formularfelder unverändert */}
                         <div className="md:col-span-2">
                            <label htmlFor="baslik" className={labelBaseClasses}>Betreff <span className="text-red-500">*</span></label>
                            <input type="text" id="baslik" name="baslik" required defaultValue={duyuru.baslik} className={inputBaseClasses} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="icerik" className={labelBaseClasses}>Inhalt (Optional)</label>
                            <textarea id="icerik" name="icerik" rows={5} defaultValue={duyuru.icerik ?? ''} className={inputBaseClasses} />
                        </div>
                        <div>
                            <label htmlFor="hedef_kitle" className={labelBaseClasses}>Zielgruppe <span className="text-red-500">*</span></label>
                            <select id="hedef_kitle" name="hedef_kitle" required defaultValue={duyuru.hedef_kitle} className={inputBaseClasses}>
                                {hedefKitleOptions.map(kitle => <option key={kitle} value={kitle}>{kitle}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center pt-6">
                            <input type="checkbox" id="aktif" name="aktif" defaultChecked={duyuru.aktif} className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" />
                            <label htmlFor="aktif" className="ml-2 block text-sm font-bold text-text-main/80">Aktiv</label>
                        </div>
                        <div>
                            <label htmlFor="yayin_tarihi" className={labelBaseClasses}>Veröffentlichen ab</label>
                            <input type="date" id="yayin_tarihi" name="yayin_tarihi" defaultValue={formatDateForInput(duyuru.yayin_tarihi)} className={inputBaseClasses} />
                        </div>
                        <div>
                            <label htmlFor="bitis_tarihi" className={labelBaseClasses}>Anzeigen bis (Optional)</label>
                            <input type="date" id="bitis_tarihi" name="bitis_tarihi" defaultValue={formatDateForInput(duyuru.bitis_tarihi)} className={inputBaseClasses} />
                        </div>
                    </div>
                    <div className="pt-8 mt-6 border-t border-bg-subtle flex flex-col sm:flex-row justify-between items-center gap-4">
                        {/* Die ID wird jetzt sicher über die 'duyuruId' Variable übergeben */}
                        <DeleteButton duyuruId={duyuruId} />
                        <div className="flex gap-4">
                            <Link href={`/${locale}/admin/pazarlama/duyurular`} className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm transition-colors">
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