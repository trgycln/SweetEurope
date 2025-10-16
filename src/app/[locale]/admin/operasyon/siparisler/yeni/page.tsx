import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiparisOlusturmaClient } from "@/components/siparis-olusturma-client";
import { notFound } from "next/navigation";
import { FiSlash } from "react-icons/fi";

export default async function YeniSiparisPage({ searchParams }: { searchParams: { firmaId?: string } }) {
    const firmaId = searchParams.firmaId;
    if (!firmaId) notFound();

    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) notFound();

    const [firmaRes, urunlerRes, profilRes] = await Promise.all([
        supabase.from('firmalar').select('*, firmalar_finansal(*)').eq('id', firmaId).single(),
        supabase.from('urunler').select('*').gt('stok_adeti', 0).order('urun_adi'),
        supabase.from('profiller').select('id, rol').eq('id', user.id).single()
    ]);

    if (firmaRes.error || !firmaRes.data) notFound();
    
    const userRole = profilRes.data?.rol;
    const firmaSorumlusuId = firmaRes.data.sorumlu_ekip_uyesi_id;
    
    if (userRole !== 'Yönetici' && user.id !== firmaSorumlusuId) {
        return (
            <div className="p-8 text-center">
                <FiSlash className="mx-auto text-5xl text-red-500 mb-4" />
                <h1 className="font-serif text-2xl text-red-600">Yetkisiz Erişim</h1>
                <p className="text-text-main mt-2">Sadece size atanmış müşteriler için sipariş oluşturabilirsiniz.</p>
            </div>
        );
    }

    return (
        <SiparisOlusturmaClient
            firma={firmaRes.data as any}
            urunler={urunlerRes.data || []}
        />
    );
}