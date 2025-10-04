// src/components/PartnerForm.tsx (FINALER, PREMIUM-DESIGN KORRIGIERTER CODE)

'use client'; 

import React from 'react';
import { useFormState, useFormStatus } from 'react-dom'; 
import { 
    FaSave, FaTimes, FaSpinner, 
    FaBuilding, FaUser, FaPhone, FaEnvelope, FaMapMarkerAlt, FaLink, 
    FaCalendarAlt, FaStickyNote, FaUsers, FaGlobe, FaCheckCircle, FaClipboardCheck 
} from 'react-icons/fa';

// --------------------------------------------------------------------------
// TYP-DEFINITION FÜR FEHLERBEHEBUNG (PartnerProfile)
// --------------------------------------------------------------------------
export type PartnerProfile = {
    id?: string;
    email: string;
    company_name: string;
    contact_person: string;
    address: string;
    sub_branch_count: number;
    contract_start_date: string | null;
    contract_end_date: string | null;
    phone_number?: string;
    website?: string;
    location_link?: string;
    notes?: string;
    sales_status?: string; 
    next_visit?: string;
};

// --------------------------------------------------------------------------
// HELPER KOMPONENTEN
// --------------------------------------------------------------------------

// 1. INPUT MIT ICON
const InputWithIcon: React.FC<any> = ({ icon, label, name, defaultValue, type = "text", placeholder, isRequired = false, ...props }) => (
    <div className="flex flex-col space-y-1">
        <label htmlFor={name} className="text-sm font-semibold text-gray-700 flex items-center space-x-2">
            <span className="text-accent">{icon}</span>
            <span>{label} {isRequired && <span className="text-red-500">*</span>}</span>
        </label>
        <input
            id={name}
            name={name}
            type={type}
            defaultValue={defaultValue || ''}
            required={isRequired}
            placeholder={placeholder}
            // Saubere, dezente Ränder und Shadow-sm
            className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition duration-150"
            {...props}
        />
    </div>
);

// 2. DATUM FORMATIERUNG
const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
        return new Date(dateString).toISOString().split('T')[0];
    } catch {
        return dateString || '';
    }
};

// 3. SUBMIT BUTTON STATUS
const SubmitButton = ({ isEditing }: { isEditing: boolean }) => {
    const { pending } = useFormStatus(); 
    
    return (
        <button 
            type="submit" 
            // Stärkerer Akzent und Shadow-lg
            className="flex items-center gap-2 px-8 py-3 bg-primary text-secondary rounded-lg hover:bg-accent transition-colors font-bold tracking-wide shadow-lg hover:shadow-xl"
            disabled={pending} 
        >
            {pending ? <FaSpinner className="animate-spin" /> : <FaSave />}
            {isEditing ? 'Änderungen speichern' : 'Partner erstellen'}
        </button>
    );
};


// --------------------------------------------------------------------------
// HAUPTKOMPONENTE: PARTNER FORM
// --------------------------------------------------------------------------
interface FormState {
    success: boolean;
    message: string;
}

interface PartnerFormProps {
    action: (prevState: FormState, formData: FormData) => Promise<FormState>;
    initialState: FormState;
    partner?: PartnerProfile | null;
    salesStatuses?: string[]; 
}

export function PartnerForm({ action, initialState, partner = null, salesStatuses = ['İlk Temas', 'Potansiyel', 'Anlaşıldı', 'İlgilenmiyor'] }: PartnerFormProps) {
    const [state, formAction] = useFormState(action, initialState);
    const isEditing = !!partner;

    return (
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-10 border border-gray-100">
            <header className="mb-8 pb-4 border-b border-gray-200">
                <h1 className="text-3xl sm:text-4xl font-serif font-extrabold text-gray-800 flex items-center space-x-4">
                    <FaClipboardCheck className="text-accent w-7 h-7" />
                    <span>{isEditing ? `Partner bearbeiten: ${partner?.company_name}` : 'Neuen Geschäftspartner erstellen'}</span>
                </h1>
                {/* Status-Nachricht */}
                {state.message && (
                    <p className={`mt-4 p-4 rounded-lg text-sm font-medium ${state.success ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-red-50 text-red-700 border border-red-300'}`}>
                        {state.message}
                    </p>
                )}
            </header>

            <form action={formAction} className="space-y-8">
                
                {/* 1. BASISINFORMATIONEN & ZENTRALE DATEN */}
                <div className="p-5 sm:p-6 bg-gray-50 rounded-xl shadow-md">
                    <h2 className="text-xl font-serif font-bold text-primary mb-5 pb-2 border-b border-accent/50 flex items-center space-x-3">
                        <FaBuilding className="text-accent" />
                        <span>Basisdaten & Identifikation</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        
                        <div className="col-span-1 md:col-span-2">
                            <InputWithIcon 
                                icon={<FaBuilding />} 
                                label="İşletme Adı" 
                                name="company_name"
                                defaultValue={partner?.company_name}
                                isRequired={true}
                                placeholder="Firma GmbH & Co. KG"
                            />
                        </div>

                        {/* E-Mail (nur bei Erstellung) */}
                        {!isEditing && (
                            <InputWithIcon 
                                icon={<FaEnvelope />} 
                                label="E-Mail (Auth Daveti İçin)" 
                                name="email"
                                type="email"
                                isRequired={true}
                                placeholder="info@partner.de"
                            />
                        )}
                        
                        <InputWithIcon 
                            icon={<FaUser />} 
                            label="Ana İletişim Kişisi" 
                            name="contact_person"
                            defaultValue={partner?.contact_person}
                            isRequired={true}
                            placeholder="Max Mustermann"
                        />
                        
                        <InputWithIcon 
                            icon={<FaPhone />} 
                            label="Telefon Numarası" 
                            name="phone_number"
                            defaultValue={partner?.phone_number}
                            type="tel"
                            placeholder="+49 17x xxx xx xx"
                        />

                        {/* Vertriebsstatus (Select Input) */}
                        <div className="col-span-1">
                            <label htmlFor="sales_status" className="block text-sm font-semibold text-gray-700 flex items-center space-x-2 mb-1">
                                <span className="text-accent"><FaCheckCircle /></span>
                                <span>Vertriebsstatus</span>
                            </label>
                            <select 
                                name="sales_status"
                                id="sales_status"
                                defaultValue={partner?.sales_status || salesStatuses[0]}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary sm:text-sm transition duration-150"
                            >
                                {salesStatuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Şube Sayısı */}
                        <InputWithIcon 
                            icon={<FaUsers />} 
                            label="Alt Şube Sayısı" 
                            name="sub_branch_count"
                            defaultValue={partner?.sub_branch_count || 0}
                            type="number"
                            min="0"
                            placeholder="1"
                        />
                    </div>
                </div>

                {/* 2. ADRESSE & LINKS */}
                <div className="p-5 sm:p-6 bg-gray-50 rounded-xl shadow-md">
                    <h2 className="text-xl font-serif font-bold text-primary mb-5 pb-2 border-b border-accent/50 flex items-center space-x-3">
                        <FaMapMarkerAlt className="text-accent" />
                        <span>Standort & Digitale Präsenz</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                        
                        {/* Adresse (Volle Breite) */}
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="block text-sm font-semibold text-gray-700 flex items-center space-x-2 mb-1">
                                <span className="text-accent"><FaMapMarkerAlt /></span>
                                <span>Vollständige Adresse</span>
                            </label>
                            <textarea 
                                id="address" 
                                name="address" 
                                defaultValue={partner?.address || ''}
                                rows={2}
                                className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition duration-150"
                                placeholder="Musterstraße 1, 50667 Köln"
                            />
                        </div>

                        {/* Website */}
                        <InputWithIcon 
                            icon={<FaGlobe />} 
                            label="Website URL" 
                            name="website"
                            defaultValue={partner?.website}
                            type="url"
                            placeholder="https://www.partnerseite.de"
                        />

                        {/* Location Link */}
                        <InputWithIcon 
                            icon={<FaLink />} 
                            label="Standort Link (Maps)" 
                            name="location_link"
                            defaultValue={partner?.location_link}
                            type="url"
                            placeholder="https://maps.app.goo.gl/..."
                        />
                    </div>
                </div>


                {/* 3. VERTRAGS- & BESUCHSPLANUNG */}
                <div className="p-5 sm:p-6 bg-gray-50 rounded-xl shadow-md">
                    <h2 className="text-xl font-serif font-bold text-primary mb-5 pb-2 border-b border-accent/50 flex items-center space-x-3">
                        <FaCalendarAlt className="text-accent" />
                        <span>Vertrags- & Besuchsplanung</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        
                        {/* Nächster Besuch */}
                        <InputWithIcon 
                            icon={<FaCalendarAlt />} 
                            label="Nächster Besuch" 
                            name="next_visit"
                            defaultValue={formatDateForInput(partner?.next_visit)}
                            type="date"
                        />

                        {/* Vertrag Start */}
                        <InputWithIcon 
                            icon={<FaCalendarAlt />} 
                            label="Sözleşme Başlangıç" 
                            name="contract_start_date"
                            defaultValue={formatDateForInput(partner?.contract_start_date)}
                            type="date"
                        />
                        
                        {/* Vertrag Ende */}
                        <InputWithIcon 
                            icon={<FaCalendarAlt />} 
                            label="Sözleşme Bitiş" 
                            name="contract_end_date"
                            defaultValue={formatDateForInput(partner?.contract_end_date)}
                            type="date"
                        />
                        
                    </div>
                </div>

                {/* 4. NOTIZEN */}
                <div className="p-5 sm:p-6 bg-gray-50 rounded-xl shadow-md">
                    <h2 className="text-xl font-serif font-bold text-primary mb-5 pb-2 border-b border-accent/50 flex items-center space-x-3">
                        <FaStickyNote className="text-accent" />
                        <span>Wichtige Notizen</span>
                    </h2>
                    <label htmlFor="notes" className="sr-only">Notizen</label>
                    <textarea
                        id="notes"
                        name="notes"
                        rows={4}
                        defaultValue={partner?.notes || ''}
                        className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm transition duration-150"
                        placeholder="Zusammenfassung der Vereinbarungen, besondere Anforderungen oder nächste Schritte..."
                    />
                </div>
                
                {/* AKTIONEN BUTTONS */}
                <div className="pt-6 flex justify-end space-x-4 border-t border-gray-200">
                    <button 
                        type="button" 
                        onClick={() => window.history.back()} 
                        className="flex items-center gap-2 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                        <FaTimes /> Abbrechen
                    </button>
                    <SubmitButton isEditing={isEditing} />
                </div>
            </form>
        </div>
    );
}