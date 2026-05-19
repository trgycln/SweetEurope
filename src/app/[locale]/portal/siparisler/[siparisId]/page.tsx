import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";
import { SiparisDetayClient, SiparisDetay } from "@/components/portal/siparisler/SiparisDetayClient";
import { cookies } from 'next/headers';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

export default async function PartnerSiparisDetayPage({
    params
}: {
    params: Promise<{ siparisId: string; locale: Locale }>
}) {
    noStore();
    const { locale, siparisId } = await params;

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const dictionary = await getDictionary(locale);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return redirect(`/${locale}/login`);

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .single();

    if (!profile?.firma_id) {
        console.error(`Profil bulunamadı: ${user.id}`);
        return notFound();
    }

    // Siparişi getir (firma_id kontrolü olmadan)
    const { data: siparis, error } = await supabase
        .from('siparisler')
        .select(`
            id,
            firma_id,
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
        .single();

    if (error || !siparis) {
        console.error(`Sipariş bulunamadı: ${siparisId}`, error);
        return notFound();
    }

    // Güvenlik kontrolü
    const kendiSiparisi = siparis.firma_id === profile.firma_id;

    let yetkili = kendiSiparisi;

    // Alt bayi kendi müşterisinin siparişini görebilir
    if (!yetkili && profile.rol === 'Alt Bayi') {
        const { data: musteriData } = await (supabase as any)
            .from('firmalar')
            .select('ust_bayi_firma_id')
            .eq('id', siparis.firma_id)
            .single();

        yetkili = (musteriData as any)?.ust_bayi_firma_id === profile.firma_id;
    }

    if (!yetkili) {
        console.error(`Yetkisiz erişim: ${user.id} → ${siparisId}`);
        return notFound();
    }

    return (
        <SiparisDetayClient
            siparis={siparis as unknown as SiparisDetay}
            dictionary={dictionary}
            locale={locale}
            userRole={profile.rol}
            bayiSiparisi={profile.rol === 'Alt Bayi' && siparis.firma_id !== profile.firma_id}
        />
    );
}
