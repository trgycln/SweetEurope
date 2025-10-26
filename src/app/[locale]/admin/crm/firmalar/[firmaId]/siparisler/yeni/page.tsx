// src/app/[locale]/admin/operasyon/siparisler/yeni/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import YeniSiparisFormu from "./YeniSiparisFormu"; // Client Komponente für das Formular
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { Tables } from "@/lib/supabase/database.types"; // Import für Typisierung

// Typ für die Produktliste im Formular definieren
type ProductOption = Pick<Tables<'urunler'>, 'id' | 'ad' | 'satis_fiyati_musteri'>;

// Props-Typ für die Seite
interface YeniSiparisPageProps {
    params: {
        locale: Locale; // Locale wird vom Layout bereitgestellt
        // firmaId kommt jetzt optional über searchParams
    };
    searchParams?: {
        firmaId?: string; // firmaId ist optional über URL-Parameter
    };
}

export default async function YeniSiparisPage({ params, searchParams }: YeniSiparisPageProps) {
    const locale = params.locale;
    const firmaId = searchParams?.firmaId; // firmaId aus searchParams holen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Benutzerprüfung (wichtig, wer darf Bestellungen anlegen?)
    const { data: { user }, error: userError } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        // Redirect zum Login mit Rückkehr-URL
        const redirectUrl = `/admin/operasyon/siparisler/yeni${firmaId ? `?firmaId=${firmaId}` : ''}`;
        return redirect(`/${locale}/login?next=${encodeURIComponent(redirectUrl)}`);
    }
    // Optional: Rollenprüfung (z.B. nur Admin/Teammitglied)
    // const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') { return redirect(`/${locale}/dashboard`); }

    // Parallele Abfragen: Firmenliste (falls keine firmaId übergeben wurde) ODER spezifische Firma + Produktliste
    const promises = [];
    let firma: { unvan: string, adres: string | null } | null = null;
    let firmenListe: Pick<Tables<'firmalar'>, 'id' | 'unvan'>[] | null = null; // Nur ID und Name für Dropdown

    if (firmaId) {
        // Wenn firmaId vorhanden ist, nur diese Firma holen
        promises.push(
            supabase.from('firmalar').select('unvan, adres').eq('id', firmaId).single()
        );
    } else {
        // Wenn keine firmaId vorhanden ist, alle aktiven Firmen für ein Dropdown holen
        promises.push(
            supabase.from('firmalar')
                .select('id, unvan') // Nur ID und Name für Dropdown
                .not('status', 'eq', 'Pasif') // Beispiel: Keine passiven Firmen
                .order('unvan')
                .then(res => ({ data: res.data, error: res.error })) // Struktur anpassen
        );
    }

    // Immer die Produktliste holen
    promises.push(
        supabase.from('urunler')
            // ad ist JSON, wir müssen den spezifischen Sprachschlüssel verwenden
            // Passen Sie 'de' an Ihre JSON-Struktur und die aktuelle locale an
            .select('id, ad, satis_fiyati_musteri') // Nur benötigte Felder
            .eq('aktif', true)
            // Sortieren nach dem Namen in der aktuellen Sprache (oder einem Fallback)
            .order(`ad->>${locale}`, { referencedTable: 'urunler', foreignKey: undefined, ascending: true, nullsFirst: false })
            .order(`ad->>de`, { referencedTable: 'urunler', foreignKey: undefined, ascending: true, nullsFirst: false }) // Fallback Sortierung
    );

    // Promises ausführen
    const [firmaResult, urunlerRes] = await Promise.all(promises);

    // Typ-sichere Zuweisung und Fehlerbehandlung
    let firmaData: { unvan: string, adres: string | null } | null | Pick<Tables<'firmalar'>, 'id' | 'unvan'>[] = null;
    const firmaError = firmaResult.error;
    if (!firmaError) {
        firmaData = firmaResult.data;
    }

    const { data: urunlerData, error: urunlerError } = urunlerRes;

    // Fehlerbehandlung
    if (firmaError || urunlerError) {
        console.error("Fehler beim Laden der Daten für neue Bestellung:", firmaError || urunlerError);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der benötigten Daten.</div>;
    }

    if (firmaId && !firmaData) {
        console.error(`Firma mit ID ${firmaId} nicht gefunden.`);
        notFound(); // Firma muss existieren, wenn ID übergeben wird
    }

    // Daten zuweisen basierend auf firmaId
    if (firmaId && firmaData) {
        firma = firmaData as { unvan: string, adres: string | null }; // Typ-Zuweisung, wenn firmaId vorhanden
    } else if (!firmaId && firmaData) {
        firmenListe = firmaData as Pick<Tables<'firmalar'>, 'id' | 'unvan'>[]; // Typ-Zuweisung für Liste
    }
    const urunler: ProductOption[] = urunlerData || [];


    return (
        <div className="space-y-6">
            <div>
                {/* Zurück-Link */}
                <Link
                    href={firmaId ? `/${locale}/admin/crm/firmalar/${firmaId}/siparisler` : `/${locale}/admin/operasyon/siparisler`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors"
                >
                    <FiArrowLeft />
                    {firmaId ? 'Zurück zur Bestellliste der Firma' : 'Zurück zur Bestellübersicht'}
                </Link>
                {/* Seitentitel */}
                <h1 className="font-serif text-4xl font-bold text-primary mt-2">Neue Bestellung erstellen</h1>
                {/* Untertitel basierend auf firmaId */}
                {firma && (
                    <p className="text-gray-600 mt-1">Erstelle eine neue Bestellung für <span className="font-bold text-accent">{firma.unvan}</span>.</p>
                )}
                 {!firmaId && (
                     <p className="text-gray-600 mt-1">Wählen Sie eine Firma aus und fügen Sie Produkte hinzu.</p>
                 )}
            </div>

            {/* Client-Komponente für das interaktive Formular */}
            <YeniSiparisFormu
                firmaId={firmaId} // Kann undefined sein
                firmenListe={firmenListe} // Kann null sein
                varsayilanTeslimatAdresi={firma?.adres || ''}
                urunler={urunler}
                locale={locale} // Locale übergeben
            />
        </div>
    );
}