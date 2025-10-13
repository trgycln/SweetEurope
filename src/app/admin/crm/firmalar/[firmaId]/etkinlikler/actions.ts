// src/app/admin/crm/firmalar/[firmaId]/etkinlikler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function yeniEtkinlikEkleAction(firmaId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();

    // 1. Oturum açmış kullanıcıyı al
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return redirect('/login');
    }

    // 2. Form verilerini al ve doğrula
    const aciklama = formData.get('aciklama') as string;
    const etkinlik_tipi = formData.get('etkinlik_tipi') as string;

    if (!aciklama || !etkinlik_tipi) {
        return { success: false, message: 'Açıklama ve etkinlik tipi zorunludur.' };
    }

    // 3. Veritabanına yeni etkinliği ekle
    const { error } = await supabase.from('etkinlikler').insert({
        firma_id: firmaId,
        olusturan_personel_id: user.id,
        aciklama: aciklama,
        etkinlik_tipi: etkinlik_tipi,
    });

    if (error) {
        console.error('Etkinlik ekleme hatası:', error);
        return { success: false, message: 'Etkinlik eklenirken bir veritabanı hatası oluştu.' };
    }

    // 4. İlgili sayfanın önbelleğini temizle ki yeni veri anında görünsün
    revalidatePath(`/admin/crm/firmalar/${firmaId}/etkinlikler`);
    
    return { success: true, message: 'Etkinlik başarıyla eklendi.' };
}