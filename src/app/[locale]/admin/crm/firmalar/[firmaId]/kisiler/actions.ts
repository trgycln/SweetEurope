// src/app/[locale]/admin/crm/firmalar/[firmaId]/kisiler/actions.ts
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Tables } from '@/lib/supabase/database.types';

type ActionResult = {
    success: boolean;
    message: string;
    error?: string;
    data?: any;
};

export async function yeniKisiEkleAction(
    firmaId: string,
    formData: FormData
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const ad_soyad = formData.get('ad_soyad') as string | null;
    if (!ad_soyad) {
        return { success: false, message: 'Name ist erforderlich.' };
    }

    const insertData: any = {
        firma_id: firmaId,
        ad_soyad: ad_soyad,
        unvan: formData.get('unvan') as string || null,
        email: formData.get('email') as string || null,
        telefon: formData.get('telefon') as string || null,
    };

    const { error } = await supabase.from('dis_kontaklar').insert(insertData);

    if (error) {
        console.error('Fehler beim Hinzufügen des Kontakts:', error);
        return { success: false, message: 'Datenbankfehler beim Hinzufügen.' };
    }

    revalidatePath(`/admin/crm/firmalar/${firmaId}/kisiler`);
    return { success: true, message: 'Kontakt erfolgreich hinzugefügt.' };
}

export async function guncelleKisiAction(
    kisiId: string,
    formData: FormData
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const ad_soyad = formData.get('ad_soyad') as string | null;
    if (!ad_soyad) {
        return { success: false, message: 'Name ist erforderlich.' };
    }

    const updateData: any = {
        ad_soyad: ad_soyad,
        unvan: formData.get('unvan') as string || null,
        email: formData.get('email') as string || null,
        telefon: formData.get('telefon') as string || null,
    };

    const { data, error } = await supabase
        .from('dis_kontaklar')
        .update(updateData)
        .eq('id', kisiId)
        .select('firma_id')
        .single();

    if (error || !data) {
        console.error('Fehler beim Aktualisieren des Kontakts:', error);
        return { success: false, message: 'Datenbankfehler beim Aktualisieren.' };
    }

    revalidatePath(`/admin/crm/firmalar/${data.firma_id}/kisiler`);
    return { success: true, message: 'Kontakt erfolgreich aktualisiert.' };
}

export async function silKisiAction(
    kisiId: string,
    firmaId: string
): Promise<ActionResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { error } = await supabase
        .from('dis_kontaklar')
        .delete()
        .eq('id', kisiId);

    if (error) {
        console.error('Fehler beim Löschen des Kontakts:', error);
        return { success: false, message: 'Datenbankfehler beim Löschen.' };
    }

    revalidatePath(`/admin/crm/firmalar/${firmaId}/kisiler`);
    return { success: true, message: 'Kontakt erfolgreich gelöscht.' };
}