// src/components/PartnerForm.tsx
"use client";

import React, { useActionState } from 'react';
import { useFormStatus } from 'react-dom'; 
import { PartnerActionState } from '@/app/admin/partners/actions';
import { FaSave, FaSpinner, FaPlus, FaEdit } from 'react-icons/fa'; // FaEdit hinzugefügt

// DEFINITIONEN (Muss mit den Datenbankspalten übereinstimmen)
interface PartnerData {
    company_name: string | null;
    contact_person: string | null;
    address: string | null;
    email: string | null;
    phone_number: string | null;
    sales_status: string | null;
    notes: string | null;
    website: string | null;
    location_link: string | null;
    sub_branch_count: number | null;
    meeting_date: string | null; // Datum als YYYY-MM-DD String
    last_visit: string | null;
    next_visit: string | null;
}

interface PartnerFormProps {
    action: (prevState: PartnerActionState, formData: FormData) => Promise<PartnerActionState>;
    initialState: PartnerActionState;
    // NEUE PROPS FÜR DEN EDIT-MODUS:
    initialData?: Partial<PartnerData>; // Optionale Startdaten
    isEditMode?: boolean; // Flag für den Bearbeitungsmodus
}

const salesStatuses = ['İlk Temas', 'Numune gönderildi', 'Teklif aşamasında', 'Potansiyel', 'Anlaşıldı', 'İlgilenmiyor'];


function SubmitButton({ isEditMode }: { isEditMode?: boolean }) {
    const { pending } = useFormStatus();
    
    // ANPASSUNG DES BUTTON-TEXTES UND ICONS FÜR CREATE/EDIT
    const icon = isEditMode ? <FaSave /> : <FaPlus />;
    const text = isEditMode ? 'Änderungen speichern' : 'Partner speichern';

    // Design-Anpassung: Verwendung der definierten Tailwind-Farben
    return (
        <button
            type="submit"
            aria-disabled={pending}
            className="bg-accent text-primary px-6 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-primary hover:text-secondary transition disabled:bg-bg-subtle"
            disabled={pending}
        >
            {pending ? (
                <>
                    <FaSpinner className="animate-spin" />
                    <span className="font-sans">Speichern...</span>
                </>
            ) : (
                <>
                    {icon}
                    <span className="font-sans">{text}</span>
                </>
            )}
        </button>
    );
}

export function PartnerForm({ action, initialState, initialData = {}, isEditMode = false }: PartnerFormProps) {
    const [state, formAction] = useActionState(action, initialState); 
    
    // Allgemeine Input-Klasse für Konsistenz
    const inputClass = "mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-text-main font-sans focus:border-accent focus:ring-accent";
    const title = isEditMode ? `Partner ${initialData.company_name || ''} bearbeiten` : 'Neuen Partner erstellen';

    return (
        <form action={formAction} className="space-y-6">
            <h1 className="text-3xl font-serif text-primary mb-6">{title}</h1>
            
            <h2 className="text-xl font-serif text-primary mb-4">Basisinformationen</h2>
            
            {/* FIRMENNAME */}
            <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-text-main">İşletme Adı (Firma)</label>
                <input 
                    type="text" 
                    id="company_name" 
                    name="company_name" 
                    required 
                    className={inputClass} 
                    defaultValue={initialData.company_name || ''} // DATEN GELADEN
                />
            </div>

            {/* STATUS DROPDOWN */}
            <div>
                <label htmlFor="sales_status" className="block text-sm font-medium text-text-main">Durum</label>
                <select 
                    id="sales_status" 
                    name="sales_status" 
                    required 
                    className={inputClass}
                    defaultValue={initialData.sales_status || 'İlk Temas'} // DATEN GELADEN
                >
                    {salesStatuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </select>
            </div>
            
            <h2 className="text-xl font-serif text-primary pt-4 mb-4">Kontakt & Ansprechpartner</h2>

            {/* ANA KONTAKTE */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="contact_person" className="block text-sm font-medium text-text-main">İşletme Sorumlusu</label>
                    <input 
                        type="text" 
                        id="contact_person" 
                        name="contact_person" 
                        required 
                        className={inputClass} 
                        defaultValue={initialData.contact_person || ''} // DATEN GELADEN
                    />
                </div>
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-text-main">E-Posta</label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        className={inputClass} 
                        defaultValue={initialData.email || ''} // DATEN GELADEN
                    />
                </div>
            </div>
            
            <div>
                <label htmlFor="phone_number" className="block text-sm font-medium text-text-main">Telefon Numarası</label>
                <input 
                    type="tel" 
                    id="phone_number" 
                    name="phone_number" 
                    className={inputClass} 
                    defaultValue={initialData.phone_number || ''} // DATEN GELADEN
                />
            </div>

            <h2 className="text-xl font-serif text-primary pt-4 mb-4">Adressinformationen & Links</h2>
            
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-text-main">Adresi</label>
                <textarea 
                    id="address" 
                    name="address" 
                    rows={3} 
                    className={inputClass}
                    defaultValue={initialData.address || ''} // DATEN GELADEN
                />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="website" className="block text-sm font-medium text-text-main">Web Adresi</label>
                    <input 
                        type="url" 
                        id="website" 
                        name="website" 
                        className={inputClass}
                        defaultValue={initialData.website || ''} // DATEN GELADEN
                    />
                </div>
                <div>
                    <label htmlFor="location_link" className="block text-sm font-medium text-text-main">Lokasyon Linki</label>
                    <input 
                        type="url" 
                        id="location_link" 
                        name="location_link" 
                        className={inputClass}
                        defaultValue={initialData.location_link || ''} // DATEN GELADEN
                    />
                </div>
            </div>
            
            <div>
                <label htmlFor="sub_branch_count" className="block text-sm font-medium text-text-main">Alt Şube Sayısı</label>
                <input 
                    type="number" 
                    id="sub_branch_count" 
                    name="sub_branch_count" 
                    defaultValue={initialData.sub_branch_count || 0} // DATEN GELADEN
                    min={0} 
                    className={inputClass} 
                />
            </div>

            <h2 className="text-xl font-serif text-primary pt-4 mb-4">Termine & Notizen</h2>
            
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label htmlFor="meeting_date" className="block text-sm font-medium text-text-main">Görüşme Tarihi</label>
                    <input 
                        type="date" 
                        id="meeting_date" 
                        name="meeting_date" 
                        className={inputClass} 
                        defaultValue={initialData.meeting_date || ''} // DATEN GELADEN
                    />
                </div>
                <div>
                    <label htmlFor="last_visit" className="block text-sm font-medium text-text-main">Son Ziyaret</label>
                    <input 
                        type="date" 
                        id="last_visit" 
                        name="last_visit" 
                        className={inputClass}
                        defaultValue={initialData.last_visit || ''} // DATEN GELADEN
                    />
                </div>
                <div>
                    <label htmlFor="next_visit" className="block text-sm font-medium text-text-main">Sıradaki Ziyaret</label>
                    <input 
                        type="date" 
                        id="next_visit" 
                        name="next_visit" 
                        className={inputClass}
                        defaultValue={initialData.next_visit || ''} // DATEN GELADEN
                    />
                </div>
            </div>
            
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-text-main">Notlar</label>
                <textarea 
                    id="notes" 
                    name="notes" 
                    rows={5} 
                    className={inputClass}
                    defaultValue={initialData.notes || ''} // DATEN GELADEN
                />
            </div>


            {/* FEEDBACK BEREICH */}
            {state.message && (
                <div className={`p-3 rounded-md text-sm ${state.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {state.message}
                </div>
            )}

            <SubmitButton isEditMode={isEditMode} />
        </form>
    );
}