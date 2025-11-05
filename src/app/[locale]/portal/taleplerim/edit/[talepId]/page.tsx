// src/app/[locale]/portal/taleplerim/edit/[talepId]/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
import { Tables } from '@/lib/supabase/database.types';
import { FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
// Wir erstellen gleich ein separates Formular für die Bearbeitung
import { EditTalepForm } from './EditTalepForm';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Props-Typ für die Seite
interface EditTalepPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale; talepId: string };
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function EditTalepPage({ params }: EditTalepPageProps) {
    noStore(); // Caching deaktivieren
    const { locale, talepId } = params;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);
    const content = (dictionary as any).portal?.requestsPage?.editProduct || {
        title: "Produktanfrage bearbeiten",
        description: "Aktualisieren Sie die Details Ihrer Anfrage."
    };

    // Benutzer holen
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return redirect(`/${locale}/login`);

    // Die spezifische Anfrage laden
    // RLS (Row Level Security) sollte sicherstellen, dass der Benutzer
    // nur seine eigenen Anfragen laden kann.
    const { data: talep, error } = await supabase
        .from('yeni_urun_talepleri')
        .select('*')
        .eq('id', talepId)
        .eq('olusturan_kullanici_id', user.id) // Doppelte Sicherheit: Nur eigene Anfragen
        .eq('status', 'Yeni') // Nur bearbeiten, wenn Status 'Yeni' ist
        .single();

    if (error || !talep) {
        // Entweder nicht gefunden oder keine Berechtigung (oder Status nicht mehr 'Yeni')
        console.error("Fehler beim Laden der Produktanfrage zum Bearbeiten:", error);
        // Zurück zur Liste statt 404
        return redirect(`/${locale}/portal/taleplerim?error=not_found_or_not_editable`);
        // notFound(); // Alternative
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
             <header className="mb-8">
                 <Link href={`/${locale}/portal/taleplerim`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors mb-4"> {/* Styling angepasst */}
                     <FiArrowLeft />
                     Zurück zur Anfragenübersicht
                 </Link>
                 <h1 className="font-serif text-4xl font-bold text-primary">{content.title}</h1>
                 <p className="text-text-main/80 mt-1">{content.description}</p>
             </header>
             
             {/* Client-Komponente für das Formular */}
             <EditTalepForm
                 talep={talep}
                 dictionary={dictionary}
                 locale={locale} // Locale übergeben
             />
        </div>
    );
}