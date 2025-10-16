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

// YENİ: Bir etkinlik notunu güncelleyen fonksiyon
export async function updateEtkinlikAction(etkinlikId: string, formData: FormData) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const aciklama = formData.get('aciklama') as string;
    if (!aciklama) return { error: "Açıklama boş olamaz." };

    // Güvenlik: Sadece notu oluşturan kişi, ilk 15 dakika içinde güncelleyebilir.
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data, error } = await supabase
        .from('etkinlikler')
        .update({ aciklama: aciklama })
        .eq('id', etkinlikId)
        .eq('olusturan_personel_id', user.id) // Sadece kendi notunu güncelleyebilir
        .gte('created_at', fifteenMinutesAgo) // Sadece 15 dakikadan yeniyse
        .select()
        .single();
    
    if (error || !data) {
        console.error("Etkinlik güncelleme hatası:", error);
        return { error: "Güncelleme başarısız oldu. Süre dolmuş veya yetkiniz yok." };
    }
    
    revalidatePath(`/admin/crm/firmalar/${data.firma_id}/etkinlikler`);
    
    return { success: true, data };
}