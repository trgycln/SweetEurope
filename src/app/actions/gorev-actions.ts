// src/app/actions/gorev-actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums, TablesInsert } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

// Yeni bir görev oluşturan Server Action
export async function gorevOlusturAction(data: TablesInsert<'gorevler'>) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const { error } = await supabase.from('gorevler').insert({
        ...data,
        olusturan_kisi_id: user.id, // Görevi oluşturan kişiyi otomatik ata
    });

    if (error) {
        console.error("Görev oluşturma hatası:", error);
        return { error: error.message };
    }

    revalidatePath('/admin/idari/gorevler');
    return { success: true };
}

// Bir görevin durumunu (örn: 'Yapılacak' -> 'Devam Ediyor') güncelleyen Server Action
export async function gorevDurumGuncelleAction(gorevId: number, yeniDurum: Enums<'gorev_durumu'>) {
    const supabase = createSupabaseServerClient();
    
    const { error } = await supabase
        .from('gorevler')
        .update({ durum: yeniDurum })
        .eq('id', gorevId);

    if (error) {
        console.error("Görev durum güncelleme hatası:", error);
        return { error: error.message };
    }

    revalidatePath('/admin/idari/gorevler');
    return { success: true };
}