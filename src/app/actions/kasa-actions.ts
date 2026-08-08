'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function createKasaIslemiAction(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const islem_tipi = formData.get('islem_tipi') as string;
    const kasa_tipi = formData.get('kasa_tipi') as string;
    const tutar = parseFloat(formData.get('tutar') as string);
    const aciklama = formData.get('aciklama') as string;
    const tarih = formData.get('tarih') as string;

    if (!islem_tipi || !kasa_tipi || isNaN(tutar) || !tarih) {
        return { error: 'Eksik alanlar var.' };
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
        .from('finans_kasa_islemleri')
        .insert({
            islem_tipi,
            kasa_tipi,
            tutar,
            aciklama,
            tarih,
            islem_yapan_id: user?.id
        });

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/idari/finans/kasa');
    revalidatePath('/admin/dashboard');

    return { success: 'İşlem başarıyla eklendi.' };
}

export async function deleteKasaIslemiAction(id: string) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { error } = await supabase
        .from('finans_kasa_islemleri')
        .delete()
        .eq('id', id);

    if (error) {
        return { error: error.message };
    }

    revalidatePath('/admin/idari/finans/kasa');
    revalidatePath('/admin/dashboard');

    return { success: 'İşlem başarıyla silindi.' };
}
