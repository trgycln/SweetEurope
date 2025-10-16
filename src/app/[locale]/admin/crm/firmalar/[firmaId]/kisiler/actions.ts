'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// DÜZELTME: Bu fonksiyonun eksik olan içeriği eklendi.
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

// Kişi bilgilerini güncellemek için Server Action (değişiklik yok)
export async function guncelleKisiAction(kisiId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();

    const ad_soyad = formData.get('ad_soyad') as string;
    if (!ad_soyad) {
        return { success: false, message: 'Ad Soyad alanı zorunludur.' };
    }

    const { data, error } = await supabase
        .from('dis_kontaklar')
        .update({
            ad_soyad: ad_soyad,
            unvan: formData.get('unvan') as string || null,
            email: formData.get('email') as string || null,
            telefon: formData.get('telefon') as string || null,
        })
        .eq('id', kisiId)
        .select('firma_id')
        .single();
        
    if (error) {
        console.error('Kişi güncelleme hatası:', error);
        return { success: false, message: 'Veritabanı güncellemesi sırasında bir hata oluştu.' };
    }

    revalidatePath(`/admin/crm/firmalar/${data.firma_id}/kisiler`);
    return { success: true, message: 'Kişi başarıyla güncellendi.' };
}

// Kişiyi silmek için Server Action (değişiklik yok)
export async function silKisiAction(kisiId: string, firmaId: string) {
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
        .from('dis_kontaklar')
        .delete()
        .eq('id', kisiId);

    if (error) {
        console.error('Kişi silme hatası:', error);
        return { success: false, message: 'Veritabanı silme işlemi sırasında bir hata oluştu.' };
    }
    
    revalidatePath(`/admin/crm/firmalar/${firmaId}/kisiler`);
    return { success: true, message: 'Kişi başarıyla silindi.' };
}