// src/app/[locale]/portal/taleplerim/edit/[talepId]/EditTalepForm.tsx (NEUE DATEI)
'use client';

import React, { useEffect, useRef } from 'react';
// KORREKTUR: React.useActionState importieren
import { useFormState, useFormStatus } from 'react-dom';
import { Tables } from '@/lib/supabase/database.types';
import { Dictionary } from '@/dictionaries';
import { FiLoader, FiSave } from 'react-icons/fi';
// KORREKTUR: updateYeniUrunTalepAction importieren
import { updateYeniUrunTalepAction, YeniUrunFormState } from '@/app/actions/yeni-urun-actions';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';

type Talep = Tables<'yeni_urun_talepleri'>;

function SubmitButton({ dictionary }: { dictionary: Dictionary }) {
    const { pending } = useFormStatus();
    // KORREKTUR: Dictionary-Schlüssel anpassen
    const content = (dictionary as any).portal?.requestsPage?.editProduct || {};
    return (
        <button type="submit" disabled={pending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto disabled:bg-accent/50 disabled:cursor-wait">
            {pending ? <FiLoader className="animate-spin" /> : <FiSave />}
            {pending ? (content.submitting || "Wird gespeichert...") : (content.submitButton || "Änderungen speichern")}
        </button>
    );
}

export function EditTalepForm({ talep, dictionary }: { talep: Talep, dictionary: Dictionary }) {
    const router = useRouter();
    const params = useParams();
    const locale = params.locale as string;
    const content = (dictionary as any).portal?.requestsPage?.newProduct || {}; // Verwende dieselben Labels
    
    // Binde die talep.id an die Action
    const updateActionWithId = updateYeniUrunTalepAction.bind(null, talep.id);
    const [formState, formAction] = React.useActionState(updateActionWithId, null);
    
    useEffect(() => {
        if (formState?.success === true) {
            toast.success(formState.message);
            router.push(`/${locale}/portal/taleplerim`);
        } else if (formState?.success === false) {
            toast.error(formState.message);
        }
    }, [formState, router, locale]);

    return (
         <form action={formAction} className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg space-y-6">
            <div>
                <label htmlFor="produkt_name" className="block text-sm font-bold text-text-main/80 mb-2">{content.newProductName || "Produktname"} <span className="text-red-500">*</span></label>
                <input type="text" name="produkt_name" id="produkt_name" required defaultValue={talep.produkt_name} className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
            <div>
                <label htmlFor="kategorie_vorschlag" className="block text-sm font-bold text-text-main/80 mb-2">{content.newProductCategory || "Kategorievorschlag"}</label>
                <input type="text" name="kategorie_vorschlag" id="kategorie_vorschlag" defaultValue={talep.kategorie_vorschlag || ''} placeholder="z.B. Vegane Torten" className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
            <div>
                <label htmlFor="beschreibung" className="block text-sm font-bold text-text-main/80 mb-2">{content.newProductDescription || "Beschreibung"} <span className="text-red-500">*</span></label>
                <textarea name="beschreibung" id="beschreibung" rows={5} required defaultValue={talep.beschreibung || ''} placeholder="Bitte beschreiben Sie..." className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
             <div>
                <label htmlFor="geschaetzte_menge_pro_woche" className="block text-sm font-bold text-text-main/80 mb-2">{content.newProductEstimate || "Geschätzte Abnahme"}</label>
                <input type="number" name="geschaetzte_menge_pro_woche" id="geschaetzte_menge_pro_woche" defaultValue={talep.geschaetzte_menge_pro_woche || ''} placeholder="0" min="0" className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
             <div>
                <label htmlFor="referenz_link_gorsel" className="block text-sm font-bold text-text-main/80 mb-2">{content.newProductLink || "Referenzlink"}</label>
                <input type="url" name="referenz_link_gorsel" id="referenz_link_gorsel" defaultValue={talep.referenz_link_gorsel || ''} placeholder="https://..." className="w-full p-3 border rounded-lg bg-secondary" />
            </div>
            <div className="pt-6 border-t flex justify-end">
                <SubmitButton dictionary={dictionary} />
            </div>
        </form>
    );
}