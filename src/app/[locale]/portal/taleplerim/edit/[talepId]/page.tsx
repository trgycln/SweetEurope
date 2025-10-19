// src/app/[locale]/portal/taleplerim/edit/[talepId]/page.tsx (NEUE DATEI)
import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config'; // Pfad ggf. anpassen
import { Tables } from '@/lib/supabase/database.types';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
// Wir erstellen gleich ein separates Formular für die Bearbeitung
import { EditTalepForm } from './EditTalepForm';

export default async function EditTalepPage({ params }: { params: { locale: Locale; talepId: string } }) {
    const { locale, talepId } = params;
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary(locale);
    const content = (dictionary as any).portal?.requestsPage?.editProduct || { // TODO: Dictionary
        title: "Produktanfrage bearbeiten",
        description: "Aktualisieren Sie die Details Ihrer Anfrage."
    };

    // Benutzer holen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    // Die spezifische Anfrage laden
    // RLS stellt sicher, dass der Benutzer nur seine eigenen Anfragen im Status 'Yeni' laden kann
    const { data: talep, error } = await supabase
        .from('yeni_urun_talepleri')
        .select('*')
        .eq('id', talepId)
        .eq('olusturan_kullanici_id', user.id) // Doppelte Sicherheit
        .eq('status', 'Yeni') // Nur bearbeiten, wenn Status 'Yeni' ist
        .single();

    if (error || !talep) {
        // Entweder nicht gefunden oder keine Berechtigung (oder Status nicht mehr 'Yeni')
        console.error("Fehler beim Laden der Produktanfrage zum Bearbeiten:", error);
        return notFound();
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
             <header className="mb-8">
                <Link href={`/${locale}/portal/taleplerim`} className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                    <FiArrowLeft />
                    Zurück zur Anfragenübersicht
                </Link>
                <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                <p className="text-text-main/80 mt-1">{content.description}</p>
            </header>
            
            <EditTalepForm
                talep={talep}
                dictionary={dictionary}
            />
        </div>
    );
}