// src/app/admin/partners/PartnerDetailModal.tsx

'use client';

import React from 'react';
import { 
    FaTimes, FaEdit, FaBuilding, FaUser, FaPhone, FaMapMarkerAlt, FaLink, 
    FaCalendarAlt, FaStickyNote, FaUsers, FaRegClock, FaEnvelope 
} from 'react-icons/fa';
import Link from 'next/link'; 

// Platzhalter-Typ (Bitte in Ihrer Anwendung gegen den echten Typ tauschen, z.B. import { Partner } from "./actions";)
type Partner = any; 

interface PartnerDetailModalProps {
    partner: Partner;
    isOpen: boolean;
    onClose: () => void;
}

// HILFSKOMPONENTE FÜR IKONENGESTÜTZTE ZEILEN (MOBILE OPTIMIERT FÜR GLEICHGEWICHT)
const DetailRow: React.FC<{ icon: React.ReactNode, label: string, value: string | number | null }> = ({ icon, label, value }) => (
    // Nutzt justify-between, um Label (links) und Wert (rechts) über die gesamte Breite zu verteilen
    <div className="flex justify-between items-start py-2 border-b border-gray-200 last:border-b-0 px-1">
        
        {/* LINKER BEREICH: IKON & LABEL */}
        <div className="flex items-center space-x-2 flex-shrink-0 min-w-[40%] sm:min-w-0">
            <div className="text-accent flex-shrink-0">{icon}</div>
            <span className="text-xs font-semibold uppercase text-gray-500 block">{label}</span>
        </div>

        {/* RECHTER BEREICH: WERT (rechtsbündig, um Balance zu schaffen) */}
        <div className="flex-grow min-w-0 text-right">
            <span className="text-sm text-gray-900 font-medium whitespace-pre-wrap break-words inline-block">
                {value || 'N/A'}
            </span>
        </div>
    </div>
);


export function PartnerDetailModal({ partner, isOpen, onClose }: PartnerDetailModalProps) {
    if (!isOpen) return null;
    
    const formatDate = (dateString: string | null) => 
        dateString ? new Date(dateString).toLocaleDateString('de-DE') : 'N/A';
        
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Anlaşıldı': return 'bg-green-100 text-green-800';
            case 'Potansiel': return 'bg-blue-100 text-blue-800';
            case 'Numune gönderildi': 
            case 'Teklif aşamasında': return 'bg-yellow-100 text-yellow-800';
            case 'İlk Temas': return 'bg-gray-100 text-gray-800';
            case 'İlgilenmiyor': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };


    return (
        <div 
            // Wrapper für Klicks außerhalb und Scrolling
            className="fixed inset-0 bg-gray-600 bg-opacity-75 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex justify-center items-start pt-10 pb-10 sm:items-center sm:p-4"
            onClick={onClose} 
        >
            <div 
                // Modal Content Container (max-h-95vh für mobiles Scrolling)
                className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-auto sm:m-0 transform transition-all duration-300 max-h-[95vh] flex flex-col"
                onClick={(e) => e.stopPropagation()} 
            >
                {/* HEADER MIT TITEL UND AKTIONEN (FIXIERT) */}
                <div className="p-4 sm:p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl flex-shrink-0">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-primary flex items-center space-x-3">
                            <FaBuilding className="text-accent w-5 h-5 sm:w-6 sm:h-6" />
                            <span className="truncate">{partner.company_name || "Partner Details"}</span>
                        </h2>
                        <span className={`mt-1 inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(partner.sales_status)}`}>
                            {partner.sales_status}
                        </span>
                    </div>
                    
                    {/* AKTIONEN: BEARBEITEN & SCHLIESSEN */}
                    <div className="flex space-x-2 flex-shrink-0">
                        <Link href={`/admin/partners/${partner.id}/edit`} passHref>
                            <button 
                                title="Bearbeiten"
                                className="p-2 sm:p-3 bg-accent text-white rounded-full hover:bg-primary transition shadow-md"
                            >
                                <FaEdit className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </Link>
                        <button onClick={onClose} title="Schließen" className="p-2 sm:p-3 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition shadow-md">
                            <FaTimes className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>

                {/* INHALT GRID (SCROLLABLE AREA) */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                        
                        {/* SPALTE 1 & 2: KONTAKT, STANDORT & PLANUNG (Auf Desktop zwei Spalten, auf Mobile eine große Spalte) */}
                        <div className="md:col-span-2 md:border-r md:pr-6">
                            
                            {/* KONTAKT INFORMATIONEN */}
                            <h3 className="text-lg font-serif font-bold text-primary mb-3 p-1 bg-gray-100 rounded">Kontakt & Standort</h3>
                            <div className="space-y-0.5">
                                <DetailRow icon={<FaUser />} label="Kontaktperson" value={partner.contact_person} />
                                <DetailRow icon={<FaPhone />} label="Telefon" value={partner.phone_number} />
                                <DetailRow icon={<FaEnvelope />} label="E-Mail" value={partner.email} /> 
                                <DetailRow icon={<FaMapMarkerAlt />} label="Adresse" value={partner.address} />
                            </div>
                            
                            {/* LINKS */}
                            {(partner.website || partner.location_link) && (
                                <div className="mt-4 space-y-2 border-t pt-4">
                                    {partner.website && (
                                        <a href={partner.website} target="_blank" className="flex items-center text-accent hover:text-primary transition text-sm">
                                            <FaLink className="mr-2 w-4 h-4" />
                                            Website besuchen
                                        </a>
                                    )}
                                    {partner.location_link && (
                                        <a href={partner.location_link} target="_blank" className="flex items-center text-accent hover:text-primary transition text-sm">
                                            <FaMapMarkerAlt className="mr-2 w-4 h-4" />
                                            Standort in Karte öffnen
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* BESUCHSPLANUNG */}
                            <h3 className="text-lg font-serif font-bold text-primary mb-3 mt-6 p-1 bg-gray-100 rounded">Besuchsplanung</h3>
                            <div className="space-y-0.5">
                                <DetailRow icon={<FaUsers />} label="Filialenanzahl" value={partner.sub_branch_count || 0} />
                                <DetailRow icon={<FaCalendarAlt />} label="Nächstes Treffen" value={formatDate(partner.meeting_date)} />
                                <DetailRow icon={<FaCalendarAlt />} label="Letzter Besuch" value={formatDate(partner.last_visit)} />
                                <DetailRow icon={<FaCalendarAlt />} label="Nächster Besuch" value={formatDate(partner.next_visit)} />
                            </div>
                                    
                            {/* SYSTEM DETAILS */}
                            <h3 className="text-lg font-serif font-bold text-primary mt-6 mb-3 p-1 bg-gray-100 rounded">System Details</h3>
                            <div className="space-y-0.5">
                                <DetailRow icon={<FaRegClock />} label="Erstellt am" value={formatDate(partner.created_at)} />
                                <DetailRow icon={<FaRegClock />} label="Zuletzt geändert" value={formatDate(partner.updated_at)} />
                            </div>
                        </div>

                        {/* SPALTE 3: NOTIZEN (Volle Breite auf Mobilen, 3. Spalte auf Desktop) */}
                        <div className="md:col-span-1">
                            <h3 className="text-lg font-serif font-bold text-primary mb-3 p-1 bg-gray-100 rounded flex items-center">
                                <FaStickyNote className="mr-2 text-accent" />
                                Notizen
                            </h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="whitespace-pre-wrap text-gray-700 leading-relaxed text-sm">{partner.notes || 'Keine Notizen vorhanden.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}