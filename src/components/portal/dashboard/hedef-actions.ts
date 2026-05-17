'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export type BayiHedefPayload = {
    hedef_ciro: number;
    hedef_musteri: number;
    hedef_siparis: number;
};

export async function saveBayiHedefleriAction(
    firmaId: string,
    hedefler: BayiHedefPayload,
    locale?: string
): Promise<{ success: boolean; error?: string; message?: string }> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Oturum bulunamadı' };

    const { data: profil } = await (supabase as any)
        .from('profiller')
        .select('firma_id, rol')
        .eq('id', user.id)
        .maybeSingle();

    if (!profil || (profil.firma_id !== firmaId && profil.rol !== 'Yönetici')) {
        return { success: false, error: 'Yetki bulunamadı' };
    }

    const ciro = Number(hedefler.hedef_ciro);
    const musteri = Math.floor(Number(hedefler.hedef_musteri));
    const siparis = Math.floor(Number(hedefler.hedef_siparis));

    if (!Number.isFinite(ciro) || ciro < 0) {
        return { success: false, error: 'Geçersiz ciro hedefi' };
    }
    if (!Number.isFinite(musteri) || musteri < 0) {
        return { success: false, error: 'Geçersiz müşteri hedefi' };
    }
    if (!Number.isFinite(siparis) || siparis < 0) {
        return { success: false, error: 'Geçersiz sipariş hedefi' };
    }

    const { error } = await (supabase as any)
        .from('bayi_hedefleri')
        .upsert(
            {
                firma_id: firmaId,
                hedef_ciro: ciro,
                hedef_musteri: musteri,
                hedef_siparis: siparis,
                updated_by: user.id,
            },
            { onConflict: 'firma_id' }
        );

    if (error) {
        const e: any = error;
        console.error('Bayi hedefleri kaydedilemedi:', {
            message: e?.message, details: e?.details, hint: e?.hint, code: e?.code,
        });
        return { success: false, error: 'Veritabanı hatası' };
    }

    revalidatePath(`/${locale ?? ''}/portal/dashboard`);
    return { success: true, message: 'Hedefler güncellendi' };
}
