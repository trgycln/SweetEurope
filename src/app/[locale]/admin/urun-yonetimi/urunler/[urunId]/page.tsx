// src/app/[locale]/admin/urun-yonetimi/urunler/[urunId]/page.tsx (Korrigiert)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
// KORREKTUR: Korrekten Pfad zur UrunFormu verwenden
import { UrunFormu } from '../urun-formu';
import { Tables } from '@/lib/supabase/database.types'; // Tables importieren

// Typdefinition für Klarheit
type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;


export default async function UrunBearbeitenSeite({ params }: { params: { urunId: string; locale: string } }) { // locale zu params hinzufügen
    const supabase = createSupabaseServerClient();
    const urunId = params.urunId;
    const locale = params.locale; // locale holen

    // Sicherheit: Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Daten parallel abrufen: Produkt, Kategorien, Lieferanten, Einheiten
    const [urunRes, kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        // Produkt mit Kategorie-ID abrufen
        supabase.from('urunler').select('*').eq('id', urunId).maybeSingle(), // maybeSingle statt single
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order(`ad->>${locale}`)
    ]);

    const mevcutUrun = urunRes.data as Urun | null; // Typ casten

    // Fehlerbehandlung: Produkt nicht gefunden
    if (urunRes.error || !mevcutUrun) {
        console.error("Fehler beim Laden des Produkts:", urunRes.error);
        return notFound(); // Standard 404 Seite anzeigen
    }

    // Kategorie-ID extrahieren (wichtig für Sablon-Abruf)
    const kategorieId = mevcutUrun.kategori_id;
    let sablon: Sablon[] = []; // Initialisiere als leeres Array

    if (kategorieId) {
        // Sablon nur abrufen, wenn eine Kategorie-ID vorhanden ist
        const { data: sablonData, error: sablonError } = await supabase
            .from('kategori_ozellik_sablonlari')
            .select('*')
            .eq('kategori_id', kategorieId)
            .order('sira', { ascending: true });

        if (sablonError) {
             console.error("Fehler beim Laden des Sablons:", sablonError);
            // Fehler anzeigen, aber Seite trotzdem rendern
             // Optional: return <div className="p-6 text-red-500">Fehler beim Laden der technischen Felder.</div>;
        } else {
             sablon = sablonData || [];
        }
    } else {
         console.warn(`Produkt ${urunId} hat keine Kategorie-ID.`);
    }

    // Daten für das Formular vorbereiten
    const kategorien = kategorilerRes.data || [];
    const tedarikciler = tedarikcilerRes.data || [];
    const birimler = birimlerRes.data || [];

    // UrunFormu aufrufen und alle Daten übergeben
    return (
        <div className="max-w-5xl mx-auto">
            <UrunFormu
                locale={locale} // locale übergeben
                mevcutUrun={mevcutUrun}
                kategoriler={kategorien}
                tedarikciler={tedarikciler}
                birimler={birimler}
                // serverSablon={sablon} // Sablon wird jetzt im Client geladen
            />
        </div>
    );
}