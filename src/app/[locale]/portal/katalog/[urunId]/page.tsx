// src/app/[locale]/portal/katalog/[urunId]/page.tsx (Mit "Zurück"-Link)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PortalUrunDetay } from "@/components/portal/katalog/PortalUrunDetay";
import { notFound, redirect } from "next/navigation";
import { NumuneButtonClient } from "@/components/portal/numune-button-client";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/dictionaries";
import { Database, Tables } from "@/lib/supabase/database.types";
import Link from 'next/link'; // <-- NEU: Link importieren
import { FiArrowLeft } from 'react-icons/fi'; // <-- NEU: Icon importieren

export default async function PartnerUrunDetayPage({
    params
}: {
    params: { urunId: string; locale: Locale }
}) {
    const supabase = createSupabaseServerClient();
    const { urunId, locale } = params;
    const dictionary = await getDictionary(locale);
    // Texte für beide Komponenten holen
    const productDetailContent = (dictionary as any).portal?.productDetailPage || {};
    const catalogContent = (dictionary as any).portal?.catalogPage || {}; // NEU

    // 1. Benutzer und Profil
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
        .select('*, kategoriler ( ad )')
        .eq('id', urunId)
        .eq('aktif', true)
        .single();

    if (urunError || !urun) {
        console.error(`Fehler beim Laden des Produkts ${urunId} [Detail]:`, urunError);
        notFound();
    }

    // 3. Korrekten Partnerpreis bestimmen
    let partnerPreis: number | null = null;
    if (userRole === 'Alt Bayi') {
        partnerPreis = urun.satis_fiyati_alt_bayi;
    } else if (userRole === 'Müşteri') {
        partnerPreis = urun.satis_fiyati_musteri;
    }

    // 4. Lagerbestand holen
    const stokMiktari = urun.stok_miktari;

    // 5. Prüfen, ob bereits ein Muster angefragt wurde
    const { count: anfrageCount, error: anfrageError } = await supabase
        .from('numune_talepleri')
        .select('id', { count: 'exact', head: true })
        .eq('urun_id', urunId)
        .eq('firma_id', firmaId);

    if (anfrageError) { console.error("Fehler Musteranfrage-Prüfung:", anfrageError); }
    const hatBereitsAngefragt = anfrageCount !== null && anfrageCount > 0;

    return (
        <div className="space-y-8">
            
            {/* --- NEUER "ZURÜCK"-LINK HINZUGEFÜGT --- */}
            <Link
                href={`/${locale}/portal/katalog`}
                className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors"
            >
                <FiArrowLeft />
                {catalogContent.backToList || "Zurück zum Katalog"}
            </Link>
            {/* ------------------------------------- */}

            <PortalUrunDetay
                urun={urun as any}
                partnerPreis={partnerPreis}
                stokMiktari={stokMiktari}
                locale={locale}
                dictionary={dictionary}
            />

            <div className="max-w-md mx-auto mt-8">
                <NumuneButtonClient
                    urunId={urun.id}
                    firmaId={firmaId}
                    hatBereitsAngefragt={hatBereitsAngefragt}
                    requestText={productDetailContent.sampleRequest || "Muster anfragen"}
                    requestedText={productDetailContent.sampleRequested || "Muster angefragt"}
                />
            </div>
        </div>
    );
}