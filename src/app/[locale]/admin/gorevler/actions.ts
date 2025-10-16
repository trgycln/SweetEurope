// src/app/admin/gorevler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Bu fonksiyon, bir görevin durumunu 'tamamlandı' (true) veya 'açık' (false) olarak günceller.
export async function gorevDurumGuncelleAction(gorevId: string, yeniDurum: boolean) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const { error } = await supabase
        .from('gorevler')
        .update({ tamamlandi: yeniDurum })
        .eq('id', gorevId);

    if (error) {
        console.error("Ana görev listesi durum güncelleme hatası:", error);
        return { error: "Görev durumu güncellenirken bir hata oluştu." };
    }

    // Ana görevler sayfasının önbelleğini temizleyerek anında güncellenmesini sağlıyoruz.
    revalidatePath('/admin/gorevler');
    
    const message = yeniDurum ? "Görev tamamlandı olarak işaretlendi." : "Görev yeniden açıldı.";
    return { success: message };
}