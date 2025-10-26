// src/app/[locale]/admin/crm/firmalar/[firmaId]/kisiler/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { FiUserPlus } from 'react-icons/fi';
// Annahme: actions.ts liegt im selben Verzeichnis
import { yeniKisiEkleAction } from './actions';
import KisiKarti from './KisiKarti'; // Client Komponente für die Darstellung
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Importiere Locale
import { redirect } from 'next/navigation'; // Import für Redirect
import { Tables } from '@/lib/supabase/database.types'; // Import Tables für Typisierung

// Typ für Props definieren
interface IlgiliKisilerPageProps {
    params: {
        locale: Locale; // Locale wird vom Layout bereitgestellt
        firmaId: string;
    };
    // searchParams könnten hier auch hinzugefügt werden, falls benötigt
}

// Typ für eine Kontaktperson
type Kisi = Tables<'dis_kontaklar'>;

export default async function IlgiliKisilerPage({ params }: IlgiliKisilerPageProps) {
    const { firmaId, locale } = params; // Locale extrahieren

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Optional: Benutzerprüfung, falls nur eingeloggte Admins/Teammitglieder zugreifen dürfen
    // const { data: { user } } = await supabase.auth.getUser();
    // if (!user) { return redirect(`/${locale}/login`); }
    // const { data: profile } = await supabase.from('profiller')...
    // if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Ekip Üyesi') { /* redirect */ }

    // Kontakte für die Firma abrufen
    const { data: kisilerData, error } = await supabase
        .from('dis_kontaklar')
        .select('*')
        .eq('firma_id', firmaId) // params.firmaId verwenden
        .order('created_at', { ascending: true });

    // Fehlerbehandlung
    if (error) {
        console.error("Fehler beim Laden der Kontakte:", error);
        return <div className="p-4 bg-red-100 text-red-700 rounded border border-red-300">Fehler beim Laden der Kontakte. Details: {error.message}</div>;
    }

    // Typ-Zuweisung
    const kisiler: Kisi[] = kisilerData || [];

    // Server Action mit firmaId vorbereiten
    const formActionWithId = yeniKisiEkleAction.bind(null, firmaId);
    // Styling für Inputs
    const inputBaseClasses = "w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"; // Angepasst

    return (
        // Layout mit zwei Spalten
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Linke Spalte: Formular zum Hinzufügen */}
            <div className="lg:col-span-1">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Neuen Kontakt hinzufügen</h2> {/* Text angepasst */}
                <form action={formActionWithId} className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200"> {/* Styling angepasst */}
                    {/* Name */}
                    <div>
                        <label htmlFor="ad_soyad" className="block text-sm font-bold text-gray-700 mb-1">Name <span className="text-red-500">*</span></label> {/* Text angepasst */}
                        <input type="text" id="ad_soyad" name="ad_soyad" required className={inputBaseClasses} />
                    </div>
                    {/* Titel/Position */}
                    <div>
                        <label htmlFor="unvan" className="block text-sm font-bold text-gray-700 mb-1">Position</label> {/* Text angepasst */}
                        <input type="text" id="unvan" name="unvan" placeholder="z.B. Einkaufsleiter" className={inputBaseClasses} /> {/* Text angepasst */}
                    </div>
                    {/* E-Mail */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-1">E-Mail</label>
                        <input type="email" id="email" name="email" className={inputBaseClasses} />
                    </div>
                    {/* Telefon */}
                    <div>
                        <label htmlFor="telefon" className="block text-sm font-bold text-gray-700 mb-1">Telefon</label>
                        <input type="tel" id="telefon" name="telefon" className={inputBaseClasses} />
                    </div>
                    {/* Senden Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            // Optional: Pending-Status von useFormStatus
                            className="flex items-center justify-center gap-2 px-6 py-2 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm transition disabled:opacity-50"
                        >
                            <FiUserPlus size={16} /> Kontakt hinzufügen {/* Text angepasst */}
                        </button>
                    </div>
                </form>
            </div>

            {/* Rechte Spalte: Kontaktliste */}
            <div className="lg:col-span-2">
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">Kontakte</h2> {/* Text angepasst */}
                <div className="space-y-4">
                    {/* Prüfen, ob Kontakte vorhanden sind */}
                    {kisiler.length > 0 ? (
                        // KisiKarti Komponente für jeden Kontakt rendern
                        kisiler.map(kisi => (
                            <KisiKarti key={kisi.id} kisi={kisi} locale={locale} /> // locale übergeben, falls in KisiKarti benötigt
                        ))
                    ) : (
                        // Nachricht, wenn keine Kontakte vorhanden sind
                        <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-lg bg-white">
                            <p className="text-gray-500">Für diese Firma wurden noch keine Kontakte erfasst.</p> {/* Text angepasst */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}