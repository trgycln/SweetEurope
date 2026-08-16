// src/components/admin/finans/GiderFormModal.tsx
// Vollständiger Code mit useRef Fix

'use client';

import { useState, useEffect, useActionState, useMemo, useRef } from 'react'; // useRef hinzugefügt
import { FiX, FiSave, FiLoader } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables, Enums, Constants, Database } from '@/lib/supabase/database.types';
import { createGiderAction, updateGiderAction, GiderFormState } from '@/app/actions/gider-actions';
import { toast } from 'sonner';

// Typen (props için)
type Gider = Tables<'giderler'> & {
    profiller?: { tam_ad: string | null } | null;
    gider_kalemleri?: {
        id: string;
        ana_kategori_id: string;
    } | null;
    kategori_ad?: string;
    kasa_tipi?: string;
};
type HauptKategorie = Tables<'gider_ana_kategoriler'>;
type GiderKalemi = Tables<'gider_kalemleri'>;


interface GiderFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    giderToEdit?: Gider | null;
    availableCategories: string[]; // Artık sadece string array
    availableHauptCategories?: HauptKategorie[];
    availableFrequencies: readonly Database['public']['Enums']['zahlungshaeufigkeit'][];
    dictionary: Dictionary;
    locale: Locale;
}

const initialState: GiderFormState = null;

export function GiderFormModal({
    isOpen,
    onClose,
    giderToEdit,
    availableCategories,
    availableHauptCategories,
    availableFrequencies,
    dictionary,
    locale
}: GiderFormModalProps) {

    // Modus bestimmen
    const isEditing = !!(giderToEdit && giderToEdit.id);
    const isDuplicating = !!(giderToEdit && !giderToEdit.id);

    // Keine geschachtelten Kategorien mehr, nur flacher Text
    const [selectedKategori, setSelectedKategori] = useState<string>(giderToEdit?.kategori_ad || '');

    // Server Action auswählen
    const actionToUse = isEditing
        ? updateGiderAction.bind(null, giderToEdit!.id)
        : createGiderAction;

    // Formularstatus von der Server Action
    const [formState, formAction, isPending] = useActionState(actionToUse, initialState);

    // Ref, um doppelten Toast zu verhindern
    const toastShownRef = useRef(false);

    // Dictionary-Texte extrahieren
    const content = (dictionary as any).admin?.finans?.giderlerForm || {
        modalTitleNew: "Neue Ausgabe erfassen",
        modalTitleEdit: "Ausgabe bearbeiten",
        modalTitleDuplicate: "Ausgabe duplizieren",
        date: "Datum",
        hauptCategory: "Hauptkategorie",
        category: "Ausgabenposten (Detail)",
        description: "Beschreibung",
        amount: "Betrag (€)",
        frequency: "Zahlungshäufigkeit",
        receiptUrl: "Beleg-URL (Optional)",
        save: "Speichern",
        saving: "Speichert...",
        cancel: "Abbrechen",
        requiredField: "Dieses Feld ist erforderlich.",
        pleaseSelect: "Bitte wählen...",
        selectHauptCategoryFirst: "Zuerst Hauptkategorie wählen..."
    };

    // Effekt für Toast-Nachrichten (mit Ref-Schutz)
    useEffect(() => {
        if (formState) {
            if (formState.success) {
                if (!toastShownRef.current) {
                    toast.success(formState.message);
                    toastShownRef.current = true; // Markieren
                    onClose(); // Schließen
                }
            } else {
                toastShownRef.current = false; // Zurücksetzen bei Fehler
                if (typeof formState.error === 'string') {
                    toast.error(`Fehler: ${formState.message || formState.error}`);
                }
            }
        }
        // Beim Schließen des Modals Ref zurücksetzen
        if (!isOpen) {
             toastShownRef.current = false;
        }
    }, [formState, onClose, isOpen]); // isOpen hinzugefügt

    // Effekt, um Ref beim Öffnen zurückzusetzen
    useEffect(() => {
        if (isOpen) {
            toastShownRef.current = false; // Zurücksetzen
            if (!giderToEdit) {
                 setSelectedKategori('');
            } else {
                 setSelectedKategori(giderToEdit.kategori_ad || '');
            }
        }
    }, [isOpen, giderToEdit]);


    // Nichts rendern, wenn nicht offen
    if (!isOpen) return null;

    // Datumsformatierung für Input
    const formatDateForInput = (dateString?: string | null) => {
        if (!dateString || isDuplicating) return new Date().toISOString().split('T')[0]; // Bei Duplizieren aktuelles Datum
        try {
            // Nur Datumsteil verwenden, Zeitzone ignorieren
            const datePart = dateString.split('T')[0];
            // Prüfen ob Datum gültig ist, sonst aktuelles Datum
            if (isNaN(Date.parse(datePart))) {
                 return new Date().toISOString().split('T')[0];
            }
            return datePart;
        }
        catch { return new Date().toISOString().split('T')[0]; }
    };

    // Zod-Fehler extrahieren
    const zodErrors = (formState?.error && typeof formState.error !== 'string') ? formState.error.fieldErrors : null;
    // Modaltitel bestimmen
    const modalTitle = isEditing ? content.modalTitleEdit : (isDuplicating ? content.modalTitleDuplicate : content.modalTitleNew);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-semibold text-primary">{modalTitle}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-600"><FiX size={24} /></button>
                </div>

                {/* Formular */}
                <form action={formAction} id="gider-form" className="p-6 space-y-4 overflow-y-auto">
                    {/* Generelle Fehlermeldung */}
                    {formState && !formState.success && typeof formState.error === 'string' && (
                        <div className="p-3 bg-red-100 text-red-700 rounded border border-red-300 text-sm">
                             {formState.message || formState.error}
                        </div>
                    )}

                    {/* Datum */}
                    <div>
                        <label htmlFor="tarih" className="block text-sm font-medium text-gray-700 mb-1">{content.date}*</label>
                        <input
                            type="date"
                            id="tarih"
                            name="tarih"
                            defaultValue={formatDateForInput(giderToEdit?.tarih)}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"
                        />
                        {zodErrors?.tarih && <p className="text-xs text-red-600 mt-1">{zodErrors.tarih[0]}</p>}
                    </div>

                    {/* Kategori */}
                    <div>
                        <label htmlFor="kategori_ad" className="block text-sm font-medium text-gray-700 mb-1">Kategori*</label>
                        <input
                            type="text"
                            id="kategori_ad"
                            name="kategori_ad"
                            list="kategori-list"
                            value={selectedKategori}
                            onChange={(e) => setSelectedKategori(e.target.value)}
                            required
                            placeholder="Örn: Araç Bakım, Yemek, Ofis..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"
                        />
                        <datalist id="kategori-list">
                            {availableCategories.map(cat => (
                                <option key={cat} value={cat} />
                            ))}
                        </datalist>
                        {zodErrors?.kategori_ad && <p className="text-xs text-red-600 mt-1">{zodErrors.kategori_ad[0]}</p>}
                    </div>

                    {/* Kasa Tipi */}
                    <div>
                        <label htmlFor="kasa_tipi" className="block text-sm font-medium text-gray-700 mb-1">Ödeme Yöntemi / Kasa*</label>
                        <select
                            id="kasa_tipi"
                            name="kasa_tipi"
                            defaultValue={giderToEdit?.kasa_tipi || 'Banka'}
                            required
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent bg-white"
                        >
                            <option value="Banka">Banka Hesabı</option>
                            <option value="Nakit">Nakit Kasa</option>
                        </select>
                        {zodErrors?.kasa_tipi && <p className="text-xs text-red-600 mt-1">{zodErrors.kasa_tipi[0]}</p>}
                    </div>

                    {/* Beschreibung */}
                    <div>
                        <label htmlFor="aciklama" className="block text-sm font-medium text-gray-700 mb-1">{content.description}*</label>
                        <textarea
                            id="aciklama"
                            name="aciklama"
                            defaultValue={giderToEdit?.aciklama || ''}
                            required
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"
                         />
                         {zodErrors?.aciklama && <p className="text-xs text-red-600 mt-1">{zodErrors.aciklama[0]}</p>}
                    </div>

                    {/* Betrag */}
                    <div>
                        <label htmlFor="tutar" className="block text-sm font-medium text-gray-700 mb-1">{content.amount}*</label>
                        <input
                            type="number"
                            id="tutar"
                            name="tutar"
                            defaultValue={giderToEdit?.tutar || ''}
                            required
                            step="0.01"
                            min="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent [appearance:textfield]" // Verhindert Pfeile in manchen Browsern
                        />
                        {zodErrors?.tutar && <p className="text-xs text-red-600 mt-1">{zodErrors.tutar[0]}</p>}
                    </div>

                    {/* Zahlungshäufigkeit */}
                    <div>
                        <label htmlFor="odeme_sikligi" className="block text-sm font-medium text-gray-700 mb-1">{content.frequency}</label>
                        <select
                            id="odeme_sikligi"
                            name="odeme_sikligi"
                            defaultValue={giderToEdit?.odeme_sikligi || ''}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent bg-white"
                        >
                            <option value="">Nicht festgelegt</option>
                            {availableFrequencies.map(freq => (
                                <option key={freq} value={freq}>{freq}</option> // Annahme: Enum-Werte sind direkt darstellbar
                            ))}
                        </select>
                        {zodErrors?.odeme_sikligi && <p className="text-xs text-red-600 mt-1">{zodErrors.odeme_sikligi[0]}</p>}
                    </div>

                    {/* Beleg-URL */}
                    <div>
                        <label htmlFor="belge_url" className="block text-sm font-medium text-gray-700 mb-1">{content.receiptUrl}</label>
                        <input
                            type="url"
                            id="belge_url"
                            name="belge_url"
                            defaultValue={giderToEdit?.belge_url || ''}
                            placeholder="https://"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent focus:border-accent"
                        />
                        {zodErrors?.belge_url && <p className="text-xs text-red-600 mt-1">{zodErrors.belge_url[0]}</p>}
                    </div>

                </form>

                {/* Modal Footer */}
                <div className="flex justify-end items-center p-4 border-t bg-gray-50 rounded-b-lg">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 mr-3"
                    >
                        {content.cancel}
                    </button>
                    <button
                        type="submit"
                        form="gider-form" // Verweist auf die Formular-ID
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent border border-transparent rounded-md shadow-sm hover:bg-opacity-90 disabled:bg-opacity-50 disabled:cursor-wait"
                    >
                        {isPending ? <FiLoader className="animate-spin" /> : <FiSave />}
                        {isPending ? content.saving : content.save}
                    </button>
                </div>
            </div>
        </div>
    );
}
