// src/app/[locale]/admin/urun-yonetimi/urunler/yeni/page.tsx
// KORRIGIERTE VERSION (await cookies + await createClient)

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
// KORREKTUR: Korrekten Pfad zur UrunFormu verwenden
import { UrunFormu } from '../urun-formu'; // Pfad ist jetzt relativ
import { Tables, Database } from '@/lib/supabase/database.types'; // Database importieren
import { cookies } from 'next/headers'; // <-- WICHTIG: Importieren
import { Locale } from '@/i18n-config'; // Locale importieren
import { unstable_noStore as noStore } from 'next/cache'; // Für dynamische Daten
import { getDictionary } from '@/dictionaries';

// Typdefinitionen
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;

// Props-Typ für die Seite
interface YeniUrunSayfasiProps {
    params: { locale: Locale }; // Korrekten Typ verwenden
}

export default async function YeniUrunSayfasi({ params }: YeniUrunSayfasiProps) {
    noStore(); // Caching deaktivieren
    const locale = params.locale; // locale holen

    // --- KORREKTUR: Supabase Client korrekt initialisieren ---
    const cookieStore = await cookies(); // await hinzufügen
    const supabase = await createSupabaseServerClient(cookieStore); // await hinzufügen + store übergeben
    // --- ENDE KORREKTUR ---

    // Sicherheit: Benutzerprüfung
    const { data: { user } } = await supabase.auth.getUser(); // Funktioniert jetzt
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    // Rollenprüfung: Nur Yönetici kann yeni ürün ekleyebilir
    const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
    const isAdmin = profile?.rol === 'Yönetici';
    // Ekip Üyesi yeni ürün ekleyemez
    if (!isAdmin) {
        return redirect(`/${locale}/admin/urun-yonetimi/urunler`);
    }

    // Daten parallel abrufen
    const [kategorilerRes, tedarikcilerRes, birimlerRes] = await Promise.all([
        supabase.from('kategoriler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`),
        supabase.from('tedarikciler').select('id, unvan').order('unvan'),
        supabase.from('birimler').select('*').order(`ad->>${locale}`, { ascending: true }).order(`ad->>de`)
    ]);

    // Fehlerbehandlung
    if (kategorilerRes.error || tedarikcilerRes.error || birimlerRes.error) {
        console.error("Fehler beim Laden der Daten für das neue Produktformular:", kategorilerRes.error || tedarikcilerRes.error || birimlerRes.error);
        // Hier könnte eine Fehlerseite angezeigt werden
        return <div>Fehler beim Laden der Daten. Details in den Server-Logs.</div>;
    }

    const kategorien = kategorilerRes.data || [];
    const tedarikciler = tedarikcilerRes.data || [];
    const birimler = birimlerRes.data || [];

    const dict = await getDictionary(locale);
    const labels = dict.productsForm;

    return (
        <div className="max-w-5xl mx-auto">
            {/* locale als Prop an das Formular übergeben */}
            <UrunFormu
                locale={locale}
                // 'mevcutUrun' wird nicht übergeben (da es ein neues Produkt ist)
                kategoriler={kategorien}
                tedarikciler={tedarikciler}
                birimler={birimler}
                labels={labels}
                isAdmin={isAdmin}
            />
        </div>
    );
}