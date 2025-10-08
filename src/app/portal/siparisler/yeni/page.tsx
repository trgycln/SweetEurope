import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiparisOlusturmaPartnerClient } from "@/components/portal/siparis-olusturma-partner-client";
import { notFound } from "next/navigation";

export default async function PartnerYeniSiparisPage() {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return notFound();

    // Wir laden jetzt alle drei Datenpunkte parallel: Firma, Produkte und Favoriten
    const [firmaRes, urunlerRes, favoritenRes] = await Promise.all([
        supabase.from('firmalar').select('*, firmalar_finansal(*)').eq('portal_kullanicisi_id', user.id).single(),
        supabase.from('urunler').select('*').gt('stok_adeti', 0).order('urun_adi'),
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id)
    ]);

    if (firmaRes.error || !firmaRes.data) {
        console.error("Partner-Firma konnte nicht gefunden werden:", firmaRes.error);
        return notFound();
    }

    // Wir erstellen ein Set mit den IDs der Favoriten für eine schnelle Überprüfung
    const favoritenIds = new Set((favoritenRes.data || []).map(f => f.urun_id));
    
    return (
        <SiparisOlusturmaPartnerClient
            firma={firmaRes.data as any}
            urunler={urunlerRes.data || []}
            favoritenIds={favoritenIds} // Favoriten-IDs als Prop übergeben
        />
    );
}