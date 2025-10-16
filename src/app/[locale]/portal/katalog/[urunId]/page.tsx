import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UrunDetayGorunumu } from "@/components/urun-detay-gorunumu";
import { notFound } from "next/navigation";
import { NumuneButtonClient } from "@/components/portal/numune-button-client";

export default async function PartnerUrunDetayPage({ params }: { params: { urunId: string } }) {
    const supabase = createSupabaseServerClient();
    const { urunId } = params;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    const [urunRes, firmaRes, anfrageRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('id', urunId).single(),
        supabase.from('firmalar').select('firmalar_finansal(*)').eq('portal_kullanicisi_id', user.id).single(),
        supabase.from('numune_talepleri').select('id', { count: 'exact' }).match({ urun_id: urunId, firma_id: (await supabase.from('firmalar').select('id').eq('portal_kullanicisi_id', user.id).single()).data?.id })
    ]);
    
    if (!urunRes.data) notFound();
    const urun = urunRes.data;
    
    // Partner'a özel indirimli fiyatı hesapla
    const indirimOrani = firmaRes.data?.firmalar_finansal?.[0]?.ozel_indirim_orani ?? 0;
    const personalisierterPreis = urun.temel_satis_fiyati * (1 - indirimOrani / 100);
    const hatBereitsAngefragt = (anfrageRes as any).count > 0;

    return (
        <div className="space-y-8">
             <UrunDetayGorunumu urun={urun} price={personalisierterPreis} />
             <div className="max-w-md mx-auto mt-8">
                <NumuneButtonClient urunId={urun.id} hatBereitsAngefragt={hatBereitsAngefragt} />
             </div>
        </div>
    );
}