// src/app/actions/storage-actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Bu fonksiyon, özel (private) bir bucket'taki dosya için güvenli, süreli bir indirme linki oluşturur.
export async function getFileDownloadUrlAction(filePath: string, bucketName: string) {
    const supabase = createSupabaseServerClient();

    // Güvenlik kontrolü: Kullanıcı bu dosyayı görmeye yetkili mi?
    // Not: Storage RLS politikalarımız bu kontrolü zaten yapıyor, bu ek bir katman.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz erişim." };

    // İndirme linkini oluştur
    const { data, error } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 60); // 60 saniye geçerli bir link

    if (error) {
        console.error("İndirme linki oluşturma hatası:", error);
        return { error: "Dosya indirilirken bir hata oluştu." };
    }
    
    return { url: data.signedUrl };
}

// Bu fonksiyon, Storage'dan bir dosyayı siler.
export async function deleteFileAction(filePath: string, bucketName: string) {
    const supabase = createSupabaseServerClient();
    // (Burada da yönetici rol kontrolü eklenebilir)

    const { error } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);
    
    if (error) {
        console.error("Dosya silme hatası:", error);
        return { error: "Dosya silinemedi." };
    }

    return { success: true };
}