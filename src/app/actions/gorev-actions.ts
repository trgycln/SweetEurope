// src/app/actions/gorev-actions.ts (Bildirimler Eklendi)
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, TablesInsert, Tables } from "@/lib/supabase/database.types"; // Tables import et
import { revalidatePath } from "next/cache";
import { sendNotification } from '@/lib/notificationUtils'; // Bildirim fonksiyonunu import et

// Yeni bir görev oluşturan Server Action
export async function gorevOlusturAction(data: TablesInsert<'gorevler'>) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    // Görev verisine oluşturan kişiyi ekle
    const insertData = {
        ...data,
        olusturan_kisi_id: user.id, // Görevi oluşturan kişiyi otomatik ata
    };

    // Görevi ekle ve eklenen görevin ID'sini ve başlığını al (bildirim için)
    const { data: insertedGorev, error } = await supabase
        .from('gorevler')
        .insert(insertData)
        .select('id, baslik, atanan_kisi_id') // Eklenen görevin ID, başlık ve atanan kişi ID'sini al
        .single();


    if (error || !insertedGorev) {
        console.error("Görev oluşturma hatası:", error);
        return { error: error?.message || "Görev oluşturulamadı." };
    }

    // --- Bildirim Gönderme (Atanan Kişiye) ---
    // Eğer görev oluşturulurken birine atanmışsa (atanan_kisi_id boş değilse)
    // ve atanan kişi görevi oluşturan kişi değilse, bildirim gönder.
    if (insertedGorev.atanan_kisi_id && insertedGorev.atanan_kisi_id !== user.id) {
        const mesaj = `Size yeni bir görev atandı: "${insertedGorev.baslik}"`;
        const link = `/admin/idari/gorevler/${insertedGorev.id}`; // Görev detay sayfasına link
        await sendNotification({
            aliciId: insertedGorev.atanan_kisi_id,
            icerik: mesaj,
            link: link,
            supabaseClient: supabase
        });
    }
    // --- Bildirim Bitti ---

    revalidatePath('/admin/idari/gorevler'); // Görev listesini yenile
    revalidatePath('/admin/dashboard'); // Dashboard'daki görev sayacını yenile (varsa)

    return { success: true };
}

// Bir görevin durumunu güncelleyen Server Action
export async function gorevDurumGuncelleAction(gorevId: number, yeniDurum: Enums<'gorev_durumu'>) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };


    // Önce görevin mevcut bilgilerini al (bildirim için)
    const { data: gorevData, error: fetchError } = await supabase
        .from('gorevler')
        .select('id, baslik, olusturan_kisi_id, atanan_kisi_id')
        .eq('id', gorevId)
        .single();

    if (fetchError || !gorevData) {
        console.error("Güncellenecek görev bulunamadı:", fetchError);
        return { error: "Görev bulunamadı." };
    }


    // Görev durumunu güncelle
    const { error: updateError } = await supabase
        .from('gorevler')
        .update({ durum: yeniDurum })
        .eq('id', gorevId);

    if (updateError) {
        console.error("Görev durum güncelleme hatası:", updateError);
        return { error: updateError.message };
    }

    // --- Bildirim Gönderme ---
    const mesaj = `"${gorevData.baslik}" görevinin durumu "${yeniDurum}" olarak güncellendi.`;
    const link = `/admin/idari/gorevler/${gorevData.id}`;

    // 1. Görevi Oluşturan Kişiye Bildirim (Eğer güncelleyen kişi değilse)
    if (gorevData.olusturan_kisi_id && gorevData.olusturan_kisi_id !== user.id) {
        await sendNotification({
            aliciId: gorevData.olusturan_kisi_id,
            icerik: mesaj,
            link: link,
            supabaseClient: supabase
        });
    }

    // 2. Göreve Atanan Kişiye Bildirim (Eğer varsa ve güncelleyen kişi değilse)
    if (gorevData.atanan_kisi_id && gorevData.atanan_kisi_id !== user.id) {
        // Oluşturan kişiye zaten gönderildiyse tekrar göndermemek için kontrol
        if (gorevData.atanan_kisi_id !== gorevData.olusturan_kisi_id) {
            await sendNotification({
                aliciId: gorevData.atanan_kisi_id,
                icerik: mesaj,
                link: link,
                supabaseClient: supabase
            });
        }
    }
    // --- Bildirim Bitti ---


    revalidatePath('/admin/idari/gorevler'); // Görev listesi
    revalidatePath(`/admin/idari/gorevler/${gorevId}`); // Görev detayı
    revalidatePath('/admin/dashboard'); // Dashboard sayaçları


    return { success: true };
}

// Diğer görev action'ları (silme, atama değiştirme vb.) varsa,
// onlara da benzer şekilde bildirim mantığı eklenebilir.