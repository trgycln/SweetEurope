// src/app/admin/operasyon/siparisler/actions.ts
'use server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Enums } from '@/lib/supabase/database.types';

export async function statusAendernAction(siparisId: string, neuerStatus: Enums<'siparis_durumu'>) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.from('siparisler').update({ siparis_durumu: neuerStatus }).eq('id', siparisId);

    if (error) {
        console.error("Fehler bei Statusänderung:", error);
        return { error: "Status konnte nicht geändert werden." };
    }
    revalidatePath('/admin/operasyon/siparisler');
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    return { success: `Status wurde auf "${neuerStatus}" geändert.` };
}