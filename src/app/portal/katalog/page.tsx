// src/app/portal/katalog/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { KatalogClient } from "@/components/portal/katalog-client";
import { notFound } from "next/navigation";

export default async function KatalogPage() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    const [firmaRes, urunlerRes, favoritenRes] = await Promise.all([
        supabase.from('firmalar').select('firmalar_finansal(*)').eq('portal_kullanicisi_id', user.id).single(),
        supabase.from('urunler').select('*').order('urun_adi'),
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id)
    ]);

    const indirimOrani = firmaRes.data?.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0;
    const urunler = urunlerRes.data || [];
    const favoritenIds = new Set((favoritenRes.data || []).map(f => f.urun_id));

    // Preise für den Partner personalisieren
    const personalisierteUrunler = urunler.map(urun => ({
        ...urun,
        personalisierter_preis: urun.temel_satis_fiyati * (1 - indirimOrani / 100)
    }));

    return (
        <KatalogClient 
            urunler={personalisierteUrunler} 
            favoritenIds={favoritenIds} 
        />
    );
}