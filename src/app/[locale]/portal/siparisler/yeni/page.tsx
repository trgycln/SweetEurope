// app/[locale]/portal/siparisler/yeni/page.tsx

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiparisOlusturmaPartnerClient } from "@/components/portal/siparis-olusturma-partner-client";
import { redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { Locale } from "@/i18n-config";

// DÜZELTME: 'searchParams' artık props'un bir parçası olsa da,
// onu Client Component'e geçirmeyeceğimiz için tip tanımından kaldırabiliriz.
// Ancak Next.js'in yapısı gereği burada kalması sorun yaratmaz.
type PageProps = {
    params: { locale: Locale };
    searchParams: { [key: string]: string | string[] | undefined };
};

export default async function PartnerYeniSiparisPage(props: PageProps) {
    const { params } = props;
    const { locale } = params;

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
            // DÜZELTME: `searchParams` prop'unu artık Client Component'e göndermiyoruz.
            // Client Component veriyi kendisi `useSearchParams` ile alacak.
        />
    );
}
