'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Tables } from '@/lib/supabase/database.types';

type ActionResult = {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
};

export async function updateEtkinlikAction(
    etkinlikId: string,
    formData: FormData
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Oturum bulunamadı.' };

    const aciklama = formData.get('aciklama') as string | null;
    if (!aciklama) return { success: false, error: 'Açıklama gerekli.' };

    const { data, error } = await supabase
        .from('etkinlikler')
        .update({ aciklama })
        .eq('id', etkinlikId)
        .eq('olusturan_personel_id', user.id)
        .select('firma_id, aciklama')
        .single();

    if (error || !data) {
        console.error('Etkinlik güncelleme hatası:', error);
        return { success: false, error: 'Güncelleme başarısız.' };
    }

    revalidatePath(`/portal/musterilerim/${data.firma_id}/etkinlikler`);

    return { success: true, data };
}
