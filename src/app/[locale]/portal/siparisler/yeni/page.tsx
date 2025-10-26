import React from 'react';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SiparisOlusturmaPartnerClient } from "@/components/portal/siparis-olusturma-partner-client";
import { redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { ProduktImWarenkorb } from '@/contexts/PortalContext'; // Sicherstellen, dass dieser Typ ana_resim_url etc. kennt

type PageProps = {
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
};

type Kategori = { id: string; ad: any; ust_kategori_id: string | null };

export default async function PartnerYeniSiparisPage({ params, searchParams }: PageProps) {
    const locale = params.locale;
    const cookieStore = cookies();

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) { return cookieStore.get(name)?.value; },
            },
        }
    );

    const dictionary = await getDictionary(locale);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("Fehler beim Abrufen des Benutzers:", userError);
        return redirect(`/${locale}/login`);
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiller')
        .select('rol, firma_id')
        .eq('id', user.id)
        .single();

    if (profileError || !profile) {
        console.error("Fehler beim Abrufen des Profils:", profileError);
        return redirect(`/${locale}/login?error=profile_not_found`);
    }
    const userRole = profile.rol;

    // Daten parallel abrufen
    const [urunlerRes, favorilerRes, kategorilerRes] = await Promise.all([
        // ++ KORREKTUR HIER ++: Direkten Select der Bildspalten aus 'urunler'
        supabase.from('urunler')
            .select('*, kategoriler(id, ad)') // Kategorie-Infos direkt mitladen
            .eq('aktif', true)
            .order(`ad->>${locale}`),
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id),
        supabase.from('kategoriler').select('id, ad, ust_kategori_id').order(`ad->>${locale}`)
    ]);

    // Fehlerprüfung bleibt wichtig
    if (urunlerRes.error) console.error("Fehler beim Laden der Produkte:", urunlerRes.error);
    if (favorilerRes.error) console.error("Fehler beim Laden der Favoriten:", favorilerRes.error);
    if (kategorilerRes.error) console.error("Fehler beim Laden der Kategorien:", kategorilerRes.error);

    // Verarbeiten der Produktdaten (stellt sicher, dass ana_resim_url vorhanden ist)
    const urunlerWithPrice: ProduktImWarenkorb[] = (urunlerRes.data || []).map(urun => {
        const preis = userRole === 'Alt Bayi'
            ? urun.satis_fiyati_alt_bayi
            : urun.satis_fiyati_musteri;

        // Sicherstellen, dass das Objekt dem Typ ProduktImWarenkorb entspricht
        // Der Typ sollte ana_resim_url und ggf. galeri_resim_urls bereits enthalten
        return {
            ...urun,
            partnerPreis: preis || 0,
            ana_resim_url: urun.ana_resim_url, // Direkte Übernahme
            galeri_resim_urls: urun.galeri_resim_urls // Direkte Übernahme
        } as ProduktImWarenkorb; // Type Assertion zur Sicherheit
    });

    const favoriIdSet = new Set((favorilerRes.data || []).map(f => f.urun_id));
    const kategoriler: Kategori[] = kategorilerRes.data || [];

    return (
        <SiparisOlusturmaPartnerClient
            urunler={urunlerWithPrice}
            kategoriler={kategoriler}
            favoriIdSet={favoriIdSet}
            dictionary={dictionary}
            locale={locale}
        />
    );
}