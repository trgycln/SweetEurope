// src/app/actions/numune-actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createNumuneTalepAction(urunId: string) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Lütfen giriş yapın." };

    // Finde die Firma, die zum eingeloggten Partner gehört
    const { data: firma, error: firmaError } = await supabase
        .from('firmalar')
        .select('id')
        .eq('portal_kullanicisi_id', user.id)
        .single();
    
    if (firmaError || !firma) {
        return { error: "İlişkili firma bulunamadı." };
    }

    // Erstelle die neue Musteranfrage
    const { error: insertError } = await supabase.from('numune_talepleri').insert({
        urun_id: urunId,
        firma_id: firma.id,
    });

    if (insertError) {
        // 'duplicate key value violates unique constraint' bedeutet, dass bereits eine Anfrage existiert.
        // Wir können dies als Erfolg werten oder eine spezifischere Nachricht zurückgeben.
        if (insertError.code === '23505') { 
             return { success: true, message: "Bu ürün için zaten bir talebiniz var." };
        }
        return { error: "Talep oluşturulamadı." };
    }
    
    // Relevante Seiten neu validieren
    revalidatePath(`/portal/katalog/${urunId}`);
    revalidatePath('/portal/taleplerim');

    return { success: true };
}