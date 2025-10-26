// src/app/[locale]/admin/urun-yonetimi/urunler/[urunId]/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
// KORREKTUR: Korrekten Pfad zur UrunFormu verwenden
import { UrunFormu } from '../urun-formu';
import { Tables, Database } from '@/lib/supabase/database.types'; // Database importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Locale importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten

// Typdefinitionen
type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

// Props-Typ für die Seite
interface UrunBearbeitenSeiteProps {
    params: {
        urunId: string;
        locale: Locale; // Korrekten Typ verwenden
    };
}

export default async function UrunBearbeitenSeite({ params }: UrunBearbeitenSeiteProps) { // Typ verwenden
    noStore(); // Caching deaktivieren
    const { urunId, locale } = params; // urunId und locale aus params extrahieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Sicherheit: Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Daten parallel abrufen: Produkt, Kategorien, Lieferanten, Einheiten
    const [urunRes, kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        // Produkt mit Kategorie-ID abrufen
        supabase.from('urunler').select('*').eq('id', urunId).maybeSingle(),
        // Kategorien nach lokalisiertem Namen sortieren
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        // Einheiten nach lokalisiertem Namen sortieren
        supabase.from('birimler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`)
    ]);

    const mevcutUrun = urunRes.data as Urun | null;

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
            // Fehler anzeigen, aber Seite trotzdem rendern (ohne technische Felder)
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
            {/* Stellen Sie sicher, dass 'UrunFormu' eine Client-Komponente ist
              und die Logik zum Abrufen des Sablons jetzt im Client (useEffect) liegt,
              oder übergeben Sie 'sablon' als serverSablon={sablon}
            */}
            <UrunFormu
                locale={locale} // locale übergeben
                mevcutUrun={mevcutUrun}
                kategoriler={kategorien}
                tedarikciler={tedarikciler}
                birimler={birimler}
                // serverSablon={sablon} // Übergeben, falls UrunFormu dies erwartet
            />
        </div>
    );
}