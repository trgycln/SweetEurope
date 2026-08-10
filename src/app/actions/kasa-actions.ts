'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { SUPER_ADMIN_EMAILS } from '@/lib/constants';

export async function createKasaIslemiAction(formData: FormData) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const islem_tipi = formData.get('islem_tipi') as string;
    const kasa_tipi = formData.get('kasa_tipi') as string;
    const tutar = parseFloat(formData.get('tutar') as string);
    const aciklama = formData.get('aciklama') as string;
    const tarih = formData.get('tarih') as string;
    const ortak_id = formData.get('ortak_id') as string | null;

    if (!islem_tipi || !kasa_tipi || isNaN(tutar) || !tarih) {
        return { error: 'Eksik alanlar var.' };
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email || !SUPER_ADMIN_EMAILS.includes(user.email)) {
        return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
    }

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

    // Otomasyon: Ortak seçilmişse ve işlem sermaye ise Ortaklar (Cari) tablosuna da yansıt
    if (ortak_id && (islem_tipi === 'sermaye_girisi' || islem_tipi === 'sermaye_cikisi')) {
        const ortakIslemTipi = islem_tipi === 'sermaye_girisi' ? 'Sermaye Ekleme' : 'Sermaye Çıkışı';
        
        await supabase.from('ortak_islemleri').insert({
            ortak_id: ortak_id,
            islem_tipi: ortakIslemTipi,
            tarih: new Date(tarih).toISOString(),
            tutar: islem_tipi === 'sermaye_girisi' ? Math.abs(tutar) : -Math.abs(tutar),
            aciklama: `Kasa Üzerinden: ${aciklama}`,
            islem_yapan_kullanici_id: user?.id
        });
        
        revalidatePath('/admin/idari/finans/ortaklar');
    }

    revalidatePath('/admin/idari/finans/kasa');
    revalidatePath('/admin/dashboard');

    return { success: 'İşlem başarıyla eklendi.' };
}

export async function deleteKasaIslemiAction(id: string) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || !user.email || !SUPER_ADMIN_EMAILS.includes(user.email)) {
        return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
    }

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
