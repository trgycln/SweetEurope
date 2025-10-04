// src/app/admin/partners/[partnerId]/edit/page.tsx
import React from 'react';
import { dictionary } from '@/dictionaries/de';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';
import { getPartnerById, updatePartnerProfile } from '../../actions'; // Neue Imports
import { PartnerForm } from '@/components/PartnerForm';
import { notFound } from 'next/navigation';

interface EditPartnerPageProps {
    params: {
        partnerId: string;
    }
}

export default async function EditPartnerPage({ params }: EditPartnerPageProps) {
    const dict = dictionary;
    const content = dict.adminPartners || {};
    const emptyState = { success: false, message: '' };

    // 1. DATEN DES BESTEHENDEN PARTNERS LADEN
    const partner = await getPartnerById(params.partnerId);

    if (!partner) {
        notFound();
    }
    
    // 2. SERVER ACTION BINDEN
    // Muss gebunden werden, um die Partner-ID an die Server Action zu übergeben.
    const updateActionWithId = updatePartnerProfile.bind(null, params.partnerId);

    // Hilfsfunktion zum Konvertieren von Datum/Zeitstempel in YYYY-MM-DD (für HTML-Input)
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        return new Date(dateString).toISOString().split('T')[0];
    };

    // Vorgefüllter Initialzustand für das Formular
    const initialPartnerData = {
        company_name: partner.company_name,
        contact_person: partner.contact_person,
        address: partner.address,
        email: partner.email,
        phone_number: partner.phone_number,
        sales_status: partner.sales_status,
        notes: partner.notes,
        website: partner.website,
        location_link: partner.location_link,
        sub_branch_count: partner.sub_branch_count,
        meeting_date: formatDate(partner.meeting_date),
        last_visit: formatDate(partner.last_visit),
        next_visit: formatDate(partner.next_visit),
    };


    return (
        <div className="p-8 bg-secondary min-h-screen">
            <header className="mb-6">
                <Link href="/admin/partners" className="text-accent hover:text-primary flex items-center space-x-2 mb-4 font-sans">
                    <FaArrowLeft />
                    <span>Zurück zur Partnerliste</span>
                </Link>
            </header>

            <div className="bg-white p-6 shadow-xl sm:rounded-lg max-w-4xl">
                {/* Das Formular im EDIT-Modus rendern */}
                <PartnerForm 
                    action={updateActionWithId}
                    initialState={emptyState}
                    initialData={initialPartnerData} // ÜBERGIBT DIE DATEN
                    isEditMode={true} // NEUES PROP FÜR DEN EDIT-MODUS
                />
            </div>
        </div>
    );
}