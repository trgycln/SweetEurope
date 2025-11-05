// src/app/[locale]/portal/siparisler/[siparisId]/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { SiparisDetayClient, SiparisDetay } from "@/components/portal/siparisler/SiparisDetayClient";
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

export const dynamic = 'force-dynamic'; // Sicherstellen, dass die Seite dynamisch ist

export default async function PartnerSiparisDetayPage({ 
    params 
}: { 
    params: { siparisId: string, locale: Locale } 
}) {
    noStore(); // Caching deaktivieren
    const { locale, siparisId } = params;
    
    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    const dictionary = await getDictionary(locale);

    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id')
        .eq('id', user.id)
        .single();
        
    // Profil oder Firma-ID-Prüfung
    if (!profile || !profile.firma_id) {
        console.error(`Profil oder Firma-ID nicht gefunden für Benutzer ${user.id} auf Portal-Bestelldetailseite.`);
        return notFound();
    }

    // Bestellung abrufen
    // Stellt sicher, dass die Bestellung existiert UND zur Firma des Benutzers gehört
    const { data: siparis, error } = await supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            toplam_tutar_net,
            toplam_tutar_brut,
            kdv_orani,
            siparis_durumu,
            teslimat_adresi,
            firmalar ( unvan, adres ), 
            siparis_detay (
                id,
                urun_id, 
                miktar, 
                birim_fiyat,
                toplam_fiyat,
                urunler ( ad, stok_kodu, ana_resim_url )
            )
        `)
        .eq('id', siparisId)
        .eq('firma_id', profile.firma_id) // WICHTIGE Sicherheitsprüfung (RLS sollte dies auch tun)
        .single(); // Erwartet genau ein Ergebnis
    
    if (error || !siparis) {
        console.error(`Fehler beim Laden der Bestelldetails ${siparisId} für Firma ${profile.firma_id}:`, error);
        return notFound(); // Zeigt 404, wenn Bestellung nicht gefunden oder nicht zur Firma gehört
    }
    
    return (
        <SiparisDetayClient
            // Verwende den korrekten Typ aus der Client-Komponente
            siparis={siparis as unknown as SiparisDetay} 
            dictionary={dictionary}
            locale={locale}
        />
    );
}