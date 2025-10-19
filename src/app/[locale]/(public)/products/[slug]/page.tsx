import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary } from '@/dictionaries';
import { notFound } from 'next/navigation';
// Korrekte Komponente importieren
import { UrunDetayGorunumu } from '@/components/urun-detay-gorunumu';
import { Locale } from '@/lib/utils'; // Locale aus utils holen
import { Tables } from '@/lib/supabase/database.types';

// Typ für die Sablon-Daten
type Sablon = Pick<Tables<'kategori_ozellik_sablonlari'>, 'alan_adi' | 'gosterim_adi'>;
// Typ für Urun mit Kategorie
type UrunWithKategorie = Tables<'urunler'> & {
    kategoriler?: Pick<Tables<'kategoriler'>, 'id' | 'ad'> | null;
};

export default async function PublicUrunDetayPage({ params }: { params: { locale: Locale; slug: string } }) {
    const supabase = createSupabaseServerClient();
    const { locale, slug } = params;

    // Dictionary und Produkt parallel abrufen
    const [dictionary, { data: urunData }] = await Promise.all([
        getDictionary(locale),
        supabase
            .from('urunler')
            // Kategorie-Daten für Anzeige mit abrufen
            .select(`*, kategoriler (id, ad)`)
            .eq('slug', slug)
            // KORREKTUR: 'aktif' = true entfernt, um alle Produkte anzuzeigen
            // .eq('aktif', true) 
            .single()
    ]);
    
    const urun = urunData as UrunWithKategorie | null;

    if (!urun) {
        return notFound();
    }

    const kategoriId = urun.kategoriler?.id;
    let ozellikSablonu: Sablon[] = [];

    if (kategoriId) {
        // Die Namen der technischen Eigenschaften für die Anzeige abrufen
        const { data } = await supabase
            .from('kategori_ozellik_sablonlari')
            .select('alan_adi, gosterim_adi') // Nur die benötigten Felder
            .eq('kategori_id', kategoriId)
            .eq('public_gorunur', true) // Nur öffentliche anzeigen
            .order('sira');
        ozellikSablonu = data || [];
    }

    // KORREKTUR: 'price'-Prop wird nicht mehr übergeben
    return (
        <UrunDetayGorunumu
            urun={urun}
            ozellikSablonu={ozellikSablonu}
            locale={locale}
        />
    );
}