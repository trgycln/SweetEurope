import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UrunDetayGorunumu } from "@/components/urun-detay-gorunumu"; // Bu bileşeni de güncelleyeceğiz
import { notFound } from "next/navigation";

export default async function PublicUrunDetayPage({ params }: { params: { id: string } }) {
    // ## KORREKTUR: 'await' wurde hier hinzugefügt ##
    const supabase = await createSupabaseServerClient();
    const lang = 'de'; // Dil sabit

    const { data: urun, error } = await supabase
        .from('urunler')
        .select('*, kategoriler(ad)')
        .eq('id', params.id)
        .eq('gorunurluk', 'Herkese Açık') // Sadece halka açık olanları getir
        .single();

    if (error || !urun) {
        notFound();
    }

    return (
        <UrunDetayGorunumu 
            urun={urun}
            lang={lang}
        />
    );
}