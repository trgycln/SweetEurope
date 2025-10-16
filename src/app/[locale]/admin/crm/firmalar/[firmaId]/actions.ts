'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, Tables } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type FirmaStatus = Enums<'firma_status'>;

// Bu "akıllı" fonksiyon, hem firma bilgilerini günceller hem de statü değişikliğini loglar.
export async function updateFirmaAction(
    firmaId: string, 
    oncekiStatus: FirmaStatus,
    formData: FormData
) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const yeniStatus = formData.get('status') as FirmaStatus;

    // Formdan gelen diğer verileri alıyoruz.
    const updatedData: Partial<Tables<'firmalar'>> = {
        unvan: formData.get('unvan') as string,
        kategori: formData.get('kategori') as Enums<'firma_kategori'>,
        status: yeniStatus,
        adres: formData.get('adres') as string,
        telefon: formData.get('telefon') as string,
        email: formData.get('email') as string,
        referans_olarak_goster: formData.get('referans_olarak_goster') === 'on',
    };

    // Firmanın ana bilgilerini güncelleme işlemi
    const updatePromise = supabase
        .from('firmalar')
        .update(updatedData)
        .eq('id', firmaId)
        .select()
        .single();

    const promises = [updatePromise];

    // EĞER STATÜ DEĞİŞTİYSE: Etkinlik Akışına bir not ekle.
    if (yeniStatus !== oncekiStatus) {
        const logPromise = supabase.from('etkinlikler').insert({
            firma_id: firmaId,
            olusturan_personel_id: user.id,
            etkinlik_tipi: 'Not',
            aciklama: `Durum '${oncekiStatus}' -> '${yeniStatus}' olarak güncellendi.`
        });
        promises.push(logPromise);
    }

    try {
        const [updateResult, ..._] = await Promise.all(promises);
        
        if (updateResult.error) throw updateResult.error;

        // İlgili sayfaların önbelleğini temizleyerek anında güncellenmesini sağlıyoruz.
        revalidatePath('/admin/crm/firmalar');
        revalidatePath(`/admin/crm/firmalar/${firmaId}`);
        revalidatePath(`/admin/crm/firmalar/${firmaId}/etkinlikler`);

        return { success: true, data: updateResult.data };

    } catch (error: any) {
        console.error("Firma güncelleme hatası:", error);
        return { error: "Güncelleme sırasında bir veritabanı hatası oluştu: " + error.message };
    }
}
