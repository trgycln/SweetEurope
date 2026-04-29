'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export type StokHesaplaResult = {
    success?: boolean;
    error?: string;
    guncellenenSayi?: number;
    atlananSayi?: number;
    mesaj?: string;
};

/**
 * Tüm ürünlerin stok_miktari değerini ithalat_parti_kalemleri tablosundaki
 * miktar_adet toplamlarından yeniden hesaplar.
 *
 * Sadece Yönetici rolü çalıştırabilir.
 */
export async function stokYenidenHesaplaAction(): Promise<StokHesaplaResult> {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Oturum açık değil.' };

    const { data: profile } = await supabase
        .from('profiller')
        .select('rol')
        .eq('id', user.id)
        .single();

    if (profile?.rol !== 'Yönetici') {
        return { error: 'Bu işlem için Yönetici yetkisi gerekiyor.' };
    }

    // Service client — RLS'i atlar, tüm satırları okuyup yazabilir
    const db = createSupabaseServiceClient() as any;

    // Tüm parti kalemlerini çek (urun_id + miktar_adet)
    const { data: kalemler, error: kalemError } = await db
        .from('ithalat_parti_kalemleri')
        .select('urun_id, miktar_adet');

    if (kalemError) {
        return { error: `Parti kalemleri çekilemedi: ${kalemError.message}` };
    }

    if (!kalemler || kalemler.length === 0) {
        return {
            error: 'Hiç parti kalemi bulunamadı. Önce TIR / Parti girişi yapılmış olmalı.',
        };
    }

    // urun_id başına miktar topla
    const stokMap = new Map<string, number>();
    for (const kalem of kalemler) {
        const id: string = kalem.urun_id;
        const adet: number = Number(kalem.miktar_adet) || 0;
        stokMap.set(id, (stokMap.get(id) ?? 0) + adet);
    }

    // Her ürünü güncelle
    let guncellenenSayi = 0;
    let atlananSayi = 0;

    for (const [urunId, toplamStok] of stokMap) {
        const { error: updateError } = await db
            .from('urunler')
            .update({ stok_miktari: toplamStok })
            .eq('id', urunId);

        if (updateError) {
            console.error(`stok güncelleme hatası (${urunId}):`, updateError.message);
            atlananSayi++;
        } else {
            guncellenenSayi++;
        }
    }

    revalidatePath('/admin/urun-yonetimi/urunler');
    revalidatePath('/admin/urun-yonetimi/fiyatlandirma-hub');
    revalidatePath('/admin/urun-yonetimi/karlilik-raporu');
    revalidatePath('/admin/dashboard');

    return {
        success: true,
        guncellenenSayi,
        atlananSayi,
        mesaj: `${guncellenenSayi} ürünün stoğu güncellendi${atlananSayi > 0 ? `, ${atlananSayi} ürün atlandı` : ''}.`,
    };
}
