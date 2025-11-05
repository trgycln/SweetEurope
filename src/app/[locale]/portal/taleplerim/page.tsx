// src/app/[locale]/portal/taleplerim/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables } from "@/lib/supabase/database.types";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config';
// Import aus demselben Ordner
import { TaleplerimClient, NumuneTalepWithUrun, YeniUrunTalepWithProfil } from './TaleplerimClient';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Props-Typ für die Seite
interface PartnerTaleplerimPageProps { // Props-Typ hinzugefügt
    params: { locale: Locale };
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function PartnerTaleplerimPage({ params }: PartnerTaleplerimPageProps) {
    noStore(); // Caching deaktivieren
    const locale = params.locale;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);

    // Benutzer und Profil holen
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login?next=/portal/taleplerim`); // Redirect mit Rückkehr-URL
    }
    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol') // Rolle auch abrufen für RLS-Prüfung
        .eq('id', user.id)
        .single();
        
    if (!profile || !profile.firma_id) {
         console.error(`Profil oder Firma-ID nicht gefunden für Benutzer ${user.id} auf Taleplerim-Seite.`);
         // Redirect, wenn Profil unvollständig ist
        return redirect(`/${locale}/login?error=unauthorized`);
    }
    // Sicherstellen, dass nur Portal-Benutzer zugreifen
    if (profile.rol !== 'Müşteri' && profile.rol !== 'Alt Bayi') {
         console.warn(`Unberechtigter Zugriff auf Taleplerim durch Rolle: ${profile.rol}`);
         return redirect(`/${locale}/admin/dashboard`); // Admin zum Admin-Dashboard schicken
    }

    // Daten für beide Tabs parallel abrufen
    // RLS sollte automatisch nach 'firma_id' filtern
    const [numuneRes, urunTalepRes] = await Promise.all([
        supabase
            .from('numune_talepleri')
            .select('*, urunler!inner(ad, stok_kodu, id)') // !inner Join für Produkte
            .eq('firma_id', profile.firma_id) // Explizite Filterung (gut für Sicherheit)
            .order('created_at', { ascending: false }),
        supabase
            .from('yeni_urun_talepleri')
            .select('*, profiller!olusturan_kullanici_id(tam_ad)') // Profil des Erstellers (Partner-Mitarbeiter)
            .eq('firma_id', profile.firma_id) // Explizite Filterung
            .order('created_at', { ascending: false })
    ]);

    // Fehlerbehandlung
    if (numuneRes.error) {
         console.error("Fehler beim Laden der Musteranfragen:", numuneRes.error);
         // Bei Fehler leeres Array anzeigen, anstatt die Seite abstürzen zu lassen
    }
    if (urunTalepRes.error) {
         console.error("Fehler beim Laden der Produktanfragen:", urunTalepRes.error);
    }
    
    // Typ-Zuweisung
    const numuneTalepleri = (numuneRes.data || []) as NumuneTalepWithUrun[];
    const urunTalepleri = (urunTalepRes.data || []) as YeniUrunTalepWithProfil[];

    return (
        <TaleplerimClient
            initialNumuneTalepleri={numuneTalepleri}
            initialUrunTalepleri={urunTalepleri}
            locale={locale}
            dictionary={dictionary}
            // userRole={profile.rol} // Optional übergeben, falls Client Logik dafür hat
        />
    );
}