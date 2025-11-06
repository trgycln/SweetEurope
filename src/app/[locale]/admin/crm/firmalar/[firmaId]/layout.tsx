// src/app/[locale]/admin/crm/firmalar/[firmaId]/layout.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import React from 'react';
import FirmaTabs from './FirmaTabs';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale, falls benötigt
import { getDictionary } from '@/dictionaries';

// Layout-Komponente
export default async function FirmaDetailLayout({
    children,
    // params enthält jetzt auch locale (wird vom übergeordneten Layout bereitgestellt)
    params: { firmaId, locale },
}: {
    children: React.ReactNode;
    params: { firmaId: string; locale: Locale }; // locale zum Typ hinzufügen
}) {
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung hier wiederholen, falls nötig
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { /* redirect */ }

    // Firma abrufen
    const { data: firma, error: firmaError } = await supabase
        .from('firmalar')
        .select('unvan') // Nur den Titel für das Layout holen
        .eq('id', firmaId)
        .single();

    // Fehlerbehandlung für Firma-Abruf
    if (firmaError || !firma) {
        console.error(`Firma nicht gefunden oder Fehler bei Abruf für ID ${firmaId}:`, firmaError);
        notFound(); // Zeigt die 404-Seite an
    }

    // Dictionary laden
    const dict = await getDictionary(locale);
    const crmDict = dict.adminDashboard?.crmPage || {};
    const tabsLabels = crmDict.tabs || {};

    return (
        <div className="space-y-8">
            {/* Header mit Firmennamen */}
            <header>
                <h1 className="font-serif text-4xl font-bold text-primary">{firma.unvan}</h1>
                {/* Optional: Untertitel anpassen */}
                <p className="text-text-main/80 mt-1">{crmDict.detailSubtitle || 'Firmaya Ait Detaylar & Yönetim'}</p>
            </header>

            {/* Hauptinhalt mit Tabs und Kind-Seite */}
            <main>
                {/* Tabs benötigen firmaId und locale für Links */}
                <FirmaTabs 
                    firmaId={firmaId} 
                    locale={locale} 
                    labels={{
                        generalInfo: tabsLabels.generalInfo || 'Genel Bilgiler',
                        activities: tabsLabels.activities || 'Etkinlik Akışı',
                        contacts: tabsLabels.contacts || 'İlgili Kişiler',
                        orders: tabsLabels.orders || 'Siparişler',
                        tasks: tabsLabels.tasks || 'Görevler',
                    }}
                />

                {/* Container für den Inhalt der Kind-Seite (page.tsx) */}
                <div className="mt-6 bg-white p-6 sm:p-8 rounded-b-lg shadow-lg border border-gray-200"> {/* Styling leicht angepasst */}
                    {children}
                </div>
            </main>
        </div>
    );
}