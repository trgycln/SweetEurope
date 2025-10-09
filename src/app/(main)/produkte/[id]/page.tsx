import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UrunDetayGorunumu } from "@/components/urun-detay-gorunumu";
import { notFound } from "next/navigation";

export default async function PublicUrunDetayPage({ params }: { params: { id: string } }) {
    const supabase = createSupabaseServerClient();
    
    const { data: urun } = await supabase.from('urunler').select('*').eq('id', params.id).single();

    if (!urun) {
        notFound();
    }

    return (
        <div className="bg-secondary py-12 md:py-20">
            <div className="container mx-auto px-6">
                <UrunDetayGorunumu urun={urun} price={urun.temel_satis_fiyati} />
            </div>
        </div>
    );
}