// app/[locale]/portal/siparisler/yeni/page.tsx (KESİN VE DOĞRU NİHAİ HALİ)

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiparisOlusturmaPartnerClient } from "@/components/portal/siparis-olusturma-partner-client";
import { redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";

type PageProps = {
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
};

// Next.js'in kuralını karşılamak için fonksiyon imzasını bu şekilde yazıyoruz.
export default async function PartnerYeniSiparisPage(props: PageProps) {
    
    // Gerekli değişkenleri fonksiyonun GÖVDESİ İÇİNDE alıyoruz.
    const { params, searchParams } = props;
    const { locale } = params;

    // Bu noktadan sonra tüm asenkron işlemler hatasız çalışacaktır.
    const supabase = createSupabaseServerClient();
    const dictionary = await getDictionary(locale);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();
        
    if (!profile) {
        return redirect('/login?error=unauthorized');
    }

    const [urunlerRes, favorilerRes] = await Promise.all([
        supabase.from('urunler').select('*').eq('aktif', true).order('ad'),
        // 'favori_urunler' tablosunda 'urun_id' kullanılıyor, bu doğru.
        supabase.from('favori_urunler').select('urun_id').eq('kullanici_id', user.id) 
    ]);
    
    const urunlerWithPrice = (urunlerRes.data || []).map(urun => {
        const fiyat = profile.rol === 'Alt Bayi' ? urun.satis_fiyati_alt_bayi : urun.satis_fiyati_musteri;
        return { ...urun, fiyat: fiyat || 0 };
    });

    const favoriIdSet = new Set((favorilerRes.data || []).map(f => f.urun_id));
    
    return (
        <SiparisOlusturmaPartnerClient
            urunler={urunlerWithPrice}
            favoriIdSet={favoriIdSet}
            dictionary={dictionary}
            locale={locale}
            searchParams={searchParams}
        />
    );
}