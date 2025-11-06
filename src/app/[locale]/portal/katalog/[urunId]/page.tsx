// src/app/[locale]/portal/katalog/[urunId]/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PortalUrunDetay } from "@/components/portal/katalog/PortalUrunDetay";
import { notFound, redirect } from "next/navigation";
import { NumuneButtonClient } from "@/components/portal/numune-button-client";
import { Locale } from "@/i18n-config";
import { getDictionary } from "@/dictionaries";
import { Database, Tables, Enums } from "@/lib/supabase/database.types"; // Enums hinzugefügt
import { resolvePartnerPreis } from '@/lib/pricing';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import { UrunReviewSection } from '@/components/UrunReviewSection';

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

// Typ für Produkt mit Kategorie (angepasst)
type UrunWithKategori = Tables<'urunler'> & {
    kategoriler: Pick<Tables<'kategoriler'>, 'ad'> | null;
    ortalama_puan?: number | null;
    degerlendirme_sayisi?: number | null;
};

// Props-Typ für die Seite
interface PartnerUrunDetayPageProps { // Props-Typ hinzugefügt
    params: Promise<{ urunId: string; locale: Locale }>;
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PartnerUrunDetayPage({
    params,
    searchParams // searchParams hinzugefügt, falls benötigt
}: PartnerUrunDetayPageProps) { // Props-Typ verwenden
    noStore(); // Caching deaktivieren
    const { urunId, locale } = await params;

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);
    // Texte für beide Komponenten holen
    const productDetailContent = (dictionary as any).portal?.productDetailPage || {};
    const catalogContent = (dictionary as any).portal?.catalogPage || {};

    // 1. Benutzer und Profil
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.rol || !profile.firma_id) {
        console.error(`Profil, Rolle oder Firma-ID nicht gefunden für Benutzer ${user.id} auf Produktdetailseite.`);
        notFound();
    }
    const userRole = profile.rol as Enums<'user_role'>; // Typ-Zuweisung
    const firmaId = profile.firma_id;

    // 2. Produkt abrufen
    const { data: urun, error: urunError } = await supabase
        .from('urunler')
        .select('*, kategoriler ( ad )') // kategorie(ad) -> kategoriler(ad) (gemäß Ihrem Schema)
        .eq('id', urunId)
        .eq('aktif', true) // Nur aktive Produkte
        .single();

    if (urunError || !urun) {
        console.error(`Fehler beim Laden des Produkts ${urunId} [Detail]:`, urunError);
        notFound();
    }
    
    // Typ-Zuweisung für das Produkt
    const urunData = urun as UrunWithKategori;

    // 3. Partnerpreis: Önce müşteri istisnası, sonra kural, yoksa baz fiyat
    const partnerPreis = await resolvePartnerPreis({
        supabase,
        urun: urunData as Tables<'urunler'>,
        userRole,
        firmaId,
        qty: 1,
    });

    // 4. Lagerbestand holen
    const stokMiktari = urunData.stok_miktari;

    // 5. Prüfen, ob bereits ein Muster angefragt wurde
    const { count: anfrageCount, error: anfrageError } = await supabase
        .from('numune_talepleri')
        .select('id', { count: 'exact', head: true })
        .eq('urun_id', urunId)
        .eq('firma_id', firmaId);

    if (anfrageError) {
         console.error("Fehler Musteranfrage-Prüfung:", anfrageError);
         // Fehler ist nicht kritisch, fahre fort
    }
    const hatBereitsAngefragt = anfrageCount !== null && anfrageCount > 0;

    return (
        <div className="space-y-8 max-w-5xl mx-auto px-4"> {/* Max Breite und Padding hinzugefügt */}
            
            {/* --- "Zurück"-Link --- */}
            <Link
                href={`/${locale}/portal/katalog`}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors" // Styling angepasst
            >
                <FiArrowLeft />
                {catalogContent.backToList || "Zurück zum Katalog"}
            </Link>
            {/* -------------------- */}

            {/* Produktdetail-Komponente */}
            <PortalUrunDetay
                urun={urunData} // Korrekten Typ übergeben
                partnerPreis={partnerPreis}
                stokMiktari={stokMiktari}
                locale={locale}
                dictionary={dictionary}
            />

            {/* Muster-Button in einem Container */}
            <div className="max-w-md mx-auto mt-8">
                <NumuneButtonClient
                    urunId={urunData.id}
                    firmaId={firmaId}
                    hatBereitsAngefragt={hatBereitsAngefragt}
                    requestText={productDetailContent.sampleRequest || "Muster anfragen"}
                    requestedText={productDetailContent.sampleRequested || "Muster angefragt"}
                />
            </div>

            {/* Review Section (Portal) */}
            <UrunReviewSection
                urunId={urunData.id}
                ortalamaPuan={(urunData as any).ortalama_puan}
                degerlendirmeSayisi={(urunData as any).degerlendirme_sayisi}
            />
        </div>
    );
}