// src/app/admin/crm/firmalar/[firmaId]/gorevler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Bu fonksiyonda değişiklik yok.
export async function firmaIcinGorevEkleAction(firmaId: string, formData: FormData) {
    // ... (mevcut kod aynı kalıyor)
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const baslik = formData.get('baslik') as string;
    if (!baslik) return { error: "Görev başlığı zorunludur." };

    const { error } = await supabase.from('gorevler').insert({
        ilgili_firma_id: firmaId,
        baslik: baslik,
        son_tarih: formData.get('son_tarih') as string || null,
        atanan_kisi_id: formData.get('atanan_kisi_id') as string,
        oncelik: formData.get('oncelik') as any,
        olusturan_kisi_id: user.id,
        tamamlandi: false,
    });

    if (error) {
        console.error("Firmaya özel görev ekleme hatası:", error);
        return { error: "Görev eklenirken bir hata oluştu." };
    }

    revalidatePath(`/admin/crm/firmalar/${firmaId}/gorevler`);
    return { success: "Görev başarıyla eklendi." };
}


// GÜNCELLEME: Fonksiyon artık görevin yeni durumunu (true veya false) parametre olarak alıyor.
export async function gorevDurumGuncelleAction(gorevId: string, firmaId: string, yeniDurum: boolean) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const { error } = await supabase
        .from('gorevler')
        .update({ tamamlandi: yeniDurum }) // Durumu dinamik olarak güncelliyoruz.
        .eq('id', gorevId);

    if (error) {
        console.error("Görev durum güncelleme hatası:", error);
        return { error: "Görev durumu güncellenirken bir hata oluştu." };
    }

    revalidatePath(`/admin/crm/firmalar/${firmaId}/gorevler`);
    
    // Başarı mesajını duruma göre dinamik hale getiriyoruz.
    const message = yeniDurum ? "Görev tamamlandı olarak işaretlendi." : "Görev yeniden açıldı.";
    return { success: message };
}