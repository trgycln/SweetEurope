// src/app/admin/partners/PartnerTableWrapper.tsx

'use client';

import React, { useState } from "react";
import { FaPlus, FaEdit } from "react-icons/fa";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import { StatusDropdown } from "@/components/StatusDropdown";

// HINWEIS: Typen (Partner, PartnerSalesStatus) und Server Actions müssen aus './actions' 
// importiert oder als Props übergeben werden, um hier verfügbar zu sein. 
// Ich verwende Platzhalter für die Typen.
type Partner = any; // Ersetzen Sie dies durch Ihren tatsächlichen Typ
type Content = any; // Ersetzen Sie dies durch Ihren tatsächlichen Typ

// Hier wird die neue Modal-Komponente importiert (muss noch erstellt werden)
import { PartnerDetailModal } from "./PartnerDetailModal"; 

interface PartnerTableWrapperProps {
    partners: Partner[];
    content: Content;
}

export function PartnerTableWrapper({ partners, content }: PartnerTableWrapperProps) {
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

    // Filtert die anzuzeigenden Spalten
    const displayPartners = partners.map(p => ({
        id: p.id,
        company_name: p.company_name,
        contact_person: p.contact_person,
        phone_number: p.phone_number,
        sub_branch_count: p.sub_branch_count,
        next_visit: p.next_visit,
        sales_status: p.sales_status,
        // Fügen Sie hier die gesamte Partner-Objektstruktur hinzu, um es im Modal zu verwenden
        fullData: p, 
    }));

    const openModal = (partner: Partner) => {
        setSelectedPartner(partner);
        setIsModalOpen(true);
    };

    // Definiere handleUpdateStatus und handleDeletePartner hier, um die Server Actions zu nutzen
    // HINWEIS: Da dies eine Client Component ist, benötigen Sie Server Actions, die korrekt importiert wurden.
    // Fügen Sie hier die tatsächlichen Imports und Funktionen hinzu.
    const handleUpdateStatus = () => { /* ... */ }; 
    const handleDeletePartner = () => { /* ... */ }; 
    const salesStatuses = [ /* ... */ ];

    return (
        <>
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-serif font-bold text-primary">
                    {content.title || "Partner Yönetimi"}
                </h1>
                <Link href="/admin/partners/create">
                    <button className="bg-accent text-secondary px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-primary hover:text-secondary transition shadow-md">
                        <FaPlus />
                        <span>{content.createPartnerButton || "Neuen Partner erstellen"}</span>
                    </button>
                </Link>
            </header>

            <div className="bg-white shadow overflow-x-auto sm:rounded-lg">
                {partners.length === 0 ? (
                    <p className="p-6 text-gray-500">
                        {content.noPartners || "Es sind keine aktiven Partner vorhanden."}
                    </p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                {/* Reduzierte und übersichtlichere Spalten */}
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontaktperson</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Filialen</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nächster Besuch</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vertriebsstatus</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {displayPartners.map((partner) => (
                                <tr 
                                    key={partner.id} 
                                    className="hover:bg-gray-100 cursor-pointer transition duration-150 ease-in-out"
                                    // KRITISCH: Bei Klick auf die Zeile öffnet sich das Modal
                                    onClick={() => openModal(partner.fullData)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{partner.company_name || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.contact_person || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.phone_number || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.sub_branch_count || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{partner.next_visit ? new Date(partner.next_visit).toLocaleDateString('de-DE') : 'N/A'}</td>
                                    
                                    {/* STATUS DROPDOWN ALS TEXT */}
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {/* OPTIONAL: Farbe basierend auf Status anzeigen */}
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${partner.sales_status === 'Anlaşıldı' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {partner.sales_status}
                                        </span>
                                    </td>
                                    
                                    {/* AKTIONEN-SPALTE WURDE ENTFERNT */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* MODAL-KOMPONENTE FÜR DETAILS */}
            {selectedPartner && (
                <PartnerDetailModal
                    partner={selectedPartner}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    // Hier könnten Sie auch handleDeletePartner und handleUpdateStatus übergeben
                />
            )}
        </>
    );
}