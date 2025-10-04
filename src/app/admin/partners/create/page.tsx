// src/app/admin/partners/create/page.tsx (FINAL KORRIGIERT FÜR KLARE EINBINDUNG)
import React from 'react';
import { dictionary } from '@/dictionaries/de';
import { FaArrowLeft } from 'react-icons/fa';
import Link from 'next/link';

// WICHTIG: Korrigierte und saubere Imports
import { createPartnerProfile } from '../actions'; 
import { PartnerForm } from '@/components/PartnerForm'; 
// Stellen Sie sicher, dass dieser Pfad korrekt zu Ihrer PartnerForm-Datei ist!

// Diese Seite bleibt Server Component
export default function CreatePartnerPage() {
    // Dictionary wird beibehalten, falls es später für Texte benötigt wird
    const dict = dictionary;
    const content = dict.adminPartners || {};

    const emptyState = { success: false, message: '' };

    return (
        // Sicherstellen, dass der Container den benötigten Platz bietet
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
            
            <header className="mb-6 max-w-4xl mx-auto">
                <Link 
                    href="/admin/partners" 
                    // Dezenter Link, der die Formular-Seite nicht dominiert
                    className="text-primary hover:text-accent flex items-center space-x-2 mb-6 font-semibold transition-colors text-lg"
                >
                    <FaArrowLeft className="w-5 h-5" />
                    <span>Zurück zur Partnerliste</span>
                </Link>
            </header>

            {/* FORMULAR CONTAINER: Die Form wird zentral in den Content gerendert. */}
            <div className="mx-auto max-w-4xl">
                {/* Die PartnerForm (Ihre Client Component) wird hier aufgerufen */}
                <PartnerForm 
                    action={createPartnerProfile} 
                    initialState={emptyState}
                />
            </div>
        </div>
    );
}