// src/app/actions/favoriten-actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleFavoriteAction(urunId: string, isCurrentlyFavorited: boolean) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Lütfen giriş yapın." };
    }

    if (isCurrentlyFavorited) {
        // Favorit entfernen
        const { error } = await supabase.from('favori_urunler')
            .delete()
            .match({ kullanici_id: user.id, urun_id: urunId });
        
        if (error) return { error: "Favori kaldırılamadı." };

    } else {
        // Favorit hinzufügen
        const { error } = await supabase.from('favori_urunler').insert({
            kullanici_id: user.id,
            urun_id: urunId
        });

        if (error) return { error: "Favori eklenemedi." };
    }
    
    // Relevante Seiten neu validieren, damit die Änderungen sofort sichtbar sind
    revalidatePath('/portal/katalog');
    revalidatePath(`/portal/katalog/${urunId}`);
    // Später auch die Bestellseite
    revalidatePath('/portal/siparisler/yeni');

    return { success: true };
}