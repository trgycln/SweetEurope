'use client';

// KORREKTUR 3: React importieren, um React.use() verwenden zu können
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Database, Enums } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave } from 'react-icons/fi';
import { useFormStatus } from 'react-dom';
import { createDuyuruAction, FormState } from './actions';
import { toast } from 'sonner';

type HedefKitleOption = Enums<'hedef_rol'>;

// SubmitButton bleibt unverändert
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm disabled:bg-accent/50 disabled:cursor-wait"
        >
            {pending ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Speichern...
                </>
            ) : (
                <>
                    <FiSave size={18} />
                    Ankündigung speichern
                </>
            )}
        </button>
    );
}

export default function NeueDuyuruPage({ params }: { params: { locale: string } }) {
    // KORREKTUR 3: params mit React.use() sicher auspacken
    // Auch wenn params hier nicht direkt ein Promise ist, stellt dieser Hook sicher,
    // dass wir den Wert korrekt handhaben, wie von Next.js empfohlen.
    const resolvedParams = React.use(params);
    const locale = resolvedParams.locale; // Jetzt sicher auf locale zugreifen

    const router = useRouter();
    const initialState: FormState = null;
    const [state, formAction] = React.useActionState(createDuyuruAction, initialState);

    useEffect(() => {
        if (state?.success === true) {
            toast.success(state.message);
            router.push(`/${locale}/admin/pazarlama/duyurular`);
        } else if (state?.success === false) {
            toast.error(state.message);
        }
    }, [state, router, locale]);

    const hedefKitleOptions: HedefKitleOption[] = ["Tüm Partnerler", "Sadece Alt Bayiler"];

    const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";
    const labelBaseClasses = "block text-sm font-bold text-text-main/80 mb-2";
    const today = new Date().toISOString().split('T')[0];

    return (
        <div className="space-y-8">
            <header className="mb-8">
                <Link href={`/${locale}/admin/pazarlama/duyurular`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft />
                    Zurück zur Ankündigungsliste
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">Neue Ankündigung erstellen</h1>
                <p className="text-text-main/80 mt-1">Erstellen Sie eine neue Mitteilung für Ihre Partner.</p>
            </header>

            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg">
                <form action={formAction}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* Formularfelder bleiben unverändert */}
                        <div className="md:col-span-2">
                            <label htmlFor="baslik" className={labelBaseClasses}>Betreff <span className="text-red-500">*</span></label>
                            <input type="text" id="baslik" name="baslik" required className={inputBaseClasses} placeholder="z.B. Neue Sommeraktion" />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="icerik" className={labelBaseClasses}>Inhalt (Optional)</label>
                            <textarea id="icerik" name="icerik" rows={5} className={inputBaseClasses} placeholder="Details zur Ankündigung..." />
                        </div>
                        <div>
                            <label htmlFor="hedef_kitle" className={labelBaseClasses}>Zielgruppe <span className="text-red-500">*</span></label>
                            <select id="hedef_kitle" name="hedef_kitle" required className={inputBaseClasses}>
                                {hedefKitleOptions.map(kitle => <option key={kitle} value={kitle}>{kitle}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center pt-6">
                            <input type="checkbox" id="aktif" name="aktif" defaultChecked className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" />
                            <label htmlFor="aktif" className="ml-2 block text-sm font-bold text-text-main/80">Sofort aktivieren</label>
                        </div>
                        <div>
                            <label htmlFor="yayin_tarihi" className={labelBaseClasses}>Veröffentlichen ab (Optional)</label>
                            <input type="date" id="yayin_tarihi" name="yayin_tarihi" defaultValue={today} className={inputBaseClasses} />
                            <p className="text-xs text-text-main/60 mt-1">Leer lassen für sofortige Veröffentlichung.</p>
                        </div>
                        <div>
                            <label htmlFor="bitis_tarihi" className={labelBaseClasses}>Anzeigen bis (Optional)</label>
                            <input type="date" id="bitis_tarihi" name="bitis_tarihi" className={inputBaseClasses} />
                            <p className="text-xs text-text-main/60 mt-1">Leer lassen, um dauerhaft anzuzeigen.</p>
                        </div>
                    </div>
                    <div className="pt-8 mt-6 border-t border-bg-subtle flex justify-end gap-4">
                        <Link href={`/${locale}/admin/pazarlama/duyurular`} className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm transition-colors">
                            Abbrechen
                        </Link>
                        <SubmitButton />
                    </div>
                </form>
            </div>
        </div>
    );
}