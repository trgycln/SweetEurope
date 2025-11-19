'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Tables } from '@/lib/supabase/database.types';

type ActionResult = {
    success: boolean;
    message: string;
    error?: string;
    data?: any;
};

export async function guncelleKisiAction(
    kisiId: string,
    formData: FormData
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const ad_soyad = formData.get('ad_soyad') as string | null;
    if (!ad_soyad) {
        return { success: false, message: 'Ad Soyad gerekli.' };
    }

    const updateData: Partial<Tables<'dis_kontaklar'>> = {
        ad_soyad: ad_soyad,
        unvan: formData.get('unvan') as string || null,
        email: formData.get('email') as string || null,
        telefon: formData.get('telefon') as string || null,
    };

    const { data, error } = await supabase
        .from('dis_kontaklar')
        .update(updateData)
        .eq('id', kisiId)
        .select('firma_id')
        .single();

    if (error || !data) {
        console.error('Kişi güncelleme hatası:', error);
        return { success: false, message: 'Güncelleme başarısız.' };
    }

    revalidatePath(`/portal/musterilerim/${data.firma_id}/kisiler`);

    return { success: true, message: 'Kişi güncellendi.' };
}

export async function silKisiAction(
    kisiId: string,
    firmaId: string
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { error } = await supabase
        .from('dis_kontaklar')
        .delete()
        .eq('id', kisiId);

    if (error) {
        console.error('Kişi silme hatası:', error);
        return { success: false, message: 'Silme başarısız.' };
    }

    revalidatePath(`/portal/musterilerim/${firmaId}/kisiler`);

    return { success: true, message: 'Kişi silindi.' };
}
