// src/app/actions/siparis-actions.ts (BİLDİRİM MANTIĞI DÜZELTİLMİŞ NİHAİ HALİ)

'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";

type OrderItem = {
    urun_id: string;
    adet: number;
    o_anki_satis_fiyati: number;
};

// Yöneticilere bildirim gönderme fonksiyonu (değişiklik yok)
async function yoneticilereBildirimGonder(mesaj: string, link: string) {
    const supabase = createSupabaseServerClient();
    const { data: yoneticiler } = await supabase
        .from('profiller')
        .select('id')
        .in('rol', ['Yönetici', 'Ekip Üyesi']);

    if (yoneticiler && yoneticiler.length > 0) {
        const bildirimler = yoneticiler.map(y => ({
            alici_id: y.id,
            icerik: mesaj,
            link: link
        }));
        await supabase.from('bildirimler').insert(bildirimler);
    }
}

// === ANA SİPARİŞ OLUŞTURMA FONKSİYONU (değişiklik yok) ===
export async function siparisOlusturAction(payload: {
    firmaId: string, 
    teslimatAdresi: string, 
    items: OrderItem[],
    kaynak: Enums<'siparis_kaynagi'>
}) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Yetkisiz işlem. Lütfen giriş yapın." };
    if (!payload.firmaId || payload.items.length === 0) {
        return { error: "Müşteri veya ürün bilgisi eksik." };
    }

    const { data: newOrderId, error } = await supabase.rpc('create_order_with_items_and_update_stock', {
        p_firma_id: payload.firmaId,
        p_teslimat_Adresi: payload.teslimatAdresi,
        p_items: payload.items,
        p_olusturan_kullanici_id: user.id,
        p_olusturma_kaynagi: payload.kaynak
    });

    if (error || !newOrderId) {
        console.error("Sipariş oluşturma RPC hatası:", error);
        return { error: "Sipariş oluşturulurken bir veritabanı hatası oluştu." };
    }

    if (payload.kaynak === 'Müşteri Portalı') {
        const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
        const mesaj = `${firma?.unvan || 'Bir partner'} yeni bir sipariş oluşturdu.`;
        const link = `/admin/operasyon/siparisler/${newOrderId}`;
        await yoneticilereBildirimGonder(mesaj, link);
    }
    
    revalidatePath('/admin/operasyon/urunler');
    revalidatePath(`/admin/crm/firmalar/${payload.firmaId}/siparisler`);
    revalidatePath('/portal/siparisler');

    return { success: true, orderId: newOrderId };
}


// === SİPARİŞ DURUM GÜNCELLEME FONKSİYONU (DÜZELTİLDİ) ===
export async function siparisDurumGuncelleAction(
    siparisId: string, 
    yeniDurum: Enums<'siparis_durumu'>
) {
    'use server';
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    const { error: rpcError } = await supabase.rpc('update_order_status_and_log_activity', {
        p_siparis_id: siparisId,
        p_yeni_status: yeniDurum,
        p_kullanici_id: user.id
    });

    if (rpcError) {
        console.error("Sipariş durum güncelleme RPC hatası:", rpcError);
        return { error: "Durum güncellenirken bir veritabanı hatası oluştu." };
    }

    // DEĞİŞİKLİK: Müşteriye bildirim göndermek için doğru mantığı kuruyoruz.
    // 1. Siparişten firma_id'yi al.
    const { data: siparisData } = await supabase
        .from('siparisler')
        .select('firma_id')
        .eq('id', siparisId)
        .single();

    const firmaId = siparisData?.firma_id;
    
    if (firmaId) {
        // 2. Bu firma_id'ye sahip tüm Müşteri ve Alt Bayi profillerini bul.
        const { data: partnerKullanicilari } = await supabase
            .from('profiller')
            .select('id')
            .eq('firma_id', firmaId)
            .in('rol', ['Müşteri', 'Alt Bayi']);

        // 3. Bulunan tüm kullanıcılara bildirim gönder.
        if (partnerKullanicilari && partnerKullanicilari.length > 0) {
            const bildirimler = partnerKullanicilari.map(partner => ({
                alici_id: partner.id,
                icerik: `#${siparisId.substring(0, 8)}... numaralı siparişinizin durumu "${yeniDurum}" olarak güncellendi.`,
                link: `/portal/siparisler/${siparisId}`
            }));
            await supabase.from('bildirimler').insert(bildirimler);
        }
    }

    revalidatePath(`/admin/crm/firmalar/[firmaId]/siparisler/${siparisId}`, 'layout');
    revalidatePath('/admin/operasyon/siparisler');
    
    return { success: `Sipariş durumu başarıyla "${yeniDurum}" olarak güncellendi.` };
}


// === FATURA İNDİRME LİNKİ OLUŞTURMA FONKSİYONU (değişiklik yok) ===
export async function getInvoiceDownloadUrlAction(siparisId: string) {
    'use server';
    // ... (bu fonksiyonun içeriği aynı kalabilir)
}