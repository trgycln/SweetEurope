// src/app/[locale]/portal/taleplerim/page.tsx (Korrigierter Import)

import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables } from "@/lib/supabase/database.types";
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/dictionaries';
import { Locale } from '@/i18n-config'; // Pfad ggf. anpassen
// KORREKTUR: Import aus demselben Ordner
import { TaleplerimClient, NumuneTalepWithUrun, YeniUrunTalepWithProfil } from './TaleplerimClient';

export default async function PartnerTaleplerimPage({ params }: { params: { locale: Locale } }) {
    const supabase = createSupabaseServerClient();
    const locale = params.locale;
    const dictionary = await getDictionary(locale);

    // Benutzer und Profil holen
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }
    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id')
        .eq('id', user.id)
        .single();
        
    if (!profile) {
        return redirect(`/${locale}/login?error=unauthorized`);
    }
    
    // Daten für beide Tabs parallel abrufen
    const [numuneRes, urunTalepRes] = await Promise.all([
        supabase
            .from('numune_talepleri')
            .select('*, urunler(ad, stok_kodu, id)')
            .order('created_at', { ascending: false }),
        supabase
            .from('yeni_urun_talepleri')
            .select('*, profiller(tam_ad)')
            .order('created_at', { ascending: false })
    ]);

    if (numuneRes.error) {
         console.error("Fehler beim Laden der Musteranfragen:", numuneRes.error);
    }
    if (urunTalepRes.error) {
         console.error("Fehler beim Laden der Produktanfragen:", urunTalepRes.error);
    }
    
    const numuneTalepleri = (numuneRes.data || []) as NumuneTalepWithUrun[];
    const urunTalepleri = (urunTalepRes.data || []) as YeniUrunTalepWithProfil[];

    return (
        <TaleplerimClient
            initialNumuneTalepleri={numuneTalepleri}
            initialUrunTalepleri={urunTalepleri}
            locale={locale}
            dictionary={dictionary}
        />
    );
}