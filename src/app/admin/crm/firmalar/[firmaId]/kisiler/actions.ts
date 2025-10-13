// src/app/admin/crm/firmalar/[firmaId]/kisiler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function yeniKisiEkleAction(firmaId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();

    const ad_soyad = formData.get('ad_soyad') as string;
    if (!ad_soyad) {
        return { success: false, message: 'Ad Soyad alanı zorunludur.' };
    }

    const { error } = await supabase.from('dis_kontaklar').insert({
        firma_id: firmaId,
        ad_soyad: ad_soyad,
        unvan: formData.get('unvan') as string || null,
        email: formData.get('email') as string || null,
        telefon: formData.get('telefon') as string || null,
    });

    if (error) {
        console.error('İlgili kişi ekleme hatası:', error);
        return { success: false, message: 'Veritabanına kayıt sırasında bir hata oluştu.' };
    }

    revalidatePath(`/admin/crm/firmalar/${firmaId}/kisiler`);
    return { success: true, message: 'İlgili kişi başarıyla eklendi.' };
}