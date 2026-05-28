'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

type ActionResult = {
    success?: string;
    error?: string;
};

export async function gorevDurumGuncelleAction(
    gorevId: string,
    firmaId: string,
    yeniDurum: boolean
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await getGlobalCachedUser();
    if (!user) return { error: 'Oturum bulunamadı.' };

    const { error } = await supabase
        .from('gorevler')
        .update({ tamamlandi: yeniDurum })
        .eq('id', gorevId)
        .eq('sahip_id', user.id);

    if (error) {
        console.error('Görev durumu güncelleme hatası:', error);
        return { error: 'Güncelleme başarısız.' };
    }

    revalidatePath(`/portal/musterilerim/${firmaId}/gorevler`);
    revalidatePath('/portal/gorevlerim');
    revalidatePath('/portal');

    return { success: yeniDurum ? 'Görev tamamlandı.' : 'Görev yeniden açıldı.' };
}
