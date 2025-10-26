import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { SiparisDetayClient, SiparisDetay } from "@/components/portal/siparisler/SiparisDetayClient";

export default async function PartnerSiparisDetayPage({ params }: { params: { siparisId: string, locale: Locale } }) {
    const { locale, siparisId } = params;
    const dictionary = await getDictionary(locale);
    const supabase = createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect(`/${locale}/login`);
    }

    const { data: profile } = await supabase.from('profiller').select('firma_id').eq('id', user.id).single();
    if (!profile || !profile.firma_id) {
        return notFound();
    }

    // DOĞRU KOLON VE İLİŞKİ İSİMLERİ İLE GÜNCELLENMİŞ SORGUNUN SON HALİ
    const { data: siparis, error } = await supabase
        .from('siparisler')
        .select(`
            id,
            siparis_tarihi,
            toplam_tutar_net,
            toplam_tutar_brut,
            kdv_orani,
            siparis_durumu,
            teslimat_adresi,
            firmalar ( unvan, adres ),
            siparis_detay (
                id,
                urun_id, 
                miktar, 
                birim_fiyat,
                toplam_fiyat,
                urunler ( ad, stok_kodu, ana_resim_url )
            )
        `)
        .eq('id', siparisId)
        .eq('firma_id', profile.firma_id)
        .single();
    
    if (error || !siparis) {
        console.error("Sipariş detayı çekme hatası:", error);
        return notFound();
    }
    
    return (
        <SiparisDetayClient
            siparis={siparis as unknown as SiparisDetay}
            dictionary={dictionary}
            locale={locale}
        />
    );
}