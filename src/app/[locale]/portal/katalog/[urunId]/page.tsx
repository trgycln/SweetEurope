// src/app/[locale]/portal/katalog/[urunId]/page.tsx (Komplett Korrigiert)

import React from 'react'; // React importieren
import { createSupabaseServerClient } from "@/lib/supabase/server";
// Korrekten Pfad zur Shared Component verwenden
import { UrunDetayGorunumu } from "@/components/urun-detay-gorunumu";
import { notFound, redirect } from "next/navigation";
import { NumuneButtonClient } from "@/components/portal/numune-button-client";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/dictionaries";
import { Database, Tables } from "@/lib/supabase/database.types";

export default async function PartnerUrunDetayPage({
    params
}: {
    params: { urunId: string; locale: Locale }
}) {
    const supabase = createSupabaseServerClient();
    const { urunId, locale } = params;
    const dictionary = await getDictionary(locale);
    // Optional: Texte für Numune-Button holen
    const productDetailContent = (dictionary as any).portal?.productDetailPage || {};


    // 1. Benutzer und Profil (inkl. Rolle und firma_id)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.rol || !profile.firma_id) { notFound(); }
    const userRole = profile.rol;
    const firmaId = profile.firma_id;

    // 2. Produkt abrufen
    const { data: urun, error: urunError } = await supabase
        .from('urunler')
        .select('*') // Alle Felder holen
        .eq('id', urunId)
        .eq('aktif', true) // Nur aktive Produkte anzeigen
        .single();

    if (urunError || !urun) {
        console.error(`Fehler beim Laden des Produkts ${urunId}:`, urunError);
        notFound();
    }

    // 3. Korrekten Partnerpreis bestimmen
    let partnerPreis: number | null = null;
    if (userRole === 'Alt Bayi') {
        partnerPreis = urun.satis_fiyati_alt_bayi;
    } else if (userRole === 'Müşteri') {
        partnerPreis = urun.satis_fiyati_musteri;
    }
    // Optional: Was tun, wenn kein Preis definiert ist? Fehler? Standard? Null?
    // if (partnerPreis === null) { console.warn(`Kein passender Preis gefunden für Produkt ${urunId} und Rolle ${userRole}`); }


    // 4. Prüfen, ob bereits ein Muster angefragt wurde (vereinfachte Abfrage)
    const { count: anfrageCount, error: anfrageError } = await supabase
        .from('numune_talepleri')
        .select('id', { count: 'exact', head: true }) // Nur zählen, keine Daten holen
        .eq('urun_id', urunId)
        .eq('firma_id', firmaId); // firmaId direkt verwenden

    if (anfrageError) {
        console.error("Fehler beim Prüfen der Musteranfrage:", anfrageError);
    }
    const hatBereitsAngefragt = anfrageCount !== null && anfrageCount > 0;

    return (
        <div className="space-y-8">
            {/* UrunDetayGorunumu mit korrekten Props aufrufen */}
            <UrunDetayGorunumu
                urun={urun}
                price={partnerPreis} // Korrekten Preis übergeben
                locale={locale}       // Locale übergeben
            />

            {/* Numune Button */}
            <div className="max-w-md mx-auto mt-8">
                <NumuneButtonClient
                    urunId={urun.id}
                    firmaId={firmaId} // Korrekte firmaId übergeben
                    hatBereitsAngefragt={hatBereitsAngefragt}
                    requestText={productDetailContent.sampleRequest || "Muster anfragen"}
                    requestedText={productDetailContent.sampleRequested || "Muster angefragt"}
                />
            </div>
        </div>
    );
}