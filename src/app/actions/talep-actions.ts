'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getGlobalCachedUser } from "@/lib/admin/cache-utils";
import { revalidatePath } from "next/cache";

export async function submitUrunTalep(params: {
    urun_id: string;
    miktar: number;
    birim: string;
    notlar?: string;
}) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return { success: false, error: 'Oturum açmanız gerekiyor.' };

    const { data: profile } = await supabase
        .from('profiller')
        .select('firma_id')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.firma_id) {
        return { success: false, error: 'Firma bilgisi bulunamadı.' };
    }

    const { error } = await (supabase as any)
        .from('urun_talepleri')
        .insert({
            firma_id: profile.firma_id,
            kullanici_id: user.id,
            urun_id: params.urun_id,
            miktar: params.miktar,
            birim: params.birim,
            notlar: params.notlar || null,
            durum: 'Bekliyor'
        });

    if (error) {
        console.error('Talep oluşturma hatası:', error);
        return { success: false, error: 'Talep oluşturulurken bir hata oluştu.' };
    }

    return { success: true };
}

export async function updateUrunTalepDurumu(talep_id: string, durum: string) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { error } = await (supabase as any)
        .from('urun_talepleri')
        .update({ durum })
        .eq('id', talep_id);

    if (error) {
        console.error('Talep durumu güncellenirken hata:', error);
        return { success: false, error: 'Talep durumu güncellenirken bir hata oluştu.' };
    }

    revalidatePath('/admin/urun-yonetimi/musteri-talepleri');
    return { success: true };
}
