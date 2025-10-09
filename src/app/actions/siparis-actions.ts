// src/app/actions/siparis-actions.ts
'use server';

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Enums } from "@/lib/supabase/database.types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

type OrderItem = {
  urun_id: string;
  adet: number;
  o_anki_satis_fiyati: number;
};

// YARDIMCI FONKSİYON: Tüm yöneticilere bildirim gönderir.
async function yoneticilereBildirimGonder(mesaj: string, link: string) {
    const supabase = createSupabaseServerClient();
    const { data: yoneticiler, error } = await supabase.from('profiller').select('id').eq('rol', 'Yönetici');
    
    if (error || !yoneticiler) {
        console.error("Yöneticiler bulunamadı:", error);
        return;
    }

    const bildirimler = yoneticiler.map(y => ({
        alici_id: y.id,
        icerik: mesaj,
        link: link
    }));

    await supabase.from('bildirimler').insert(bildirimler);
}

// Sipariş oluşturan ana fonksiyon
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
    p_teslimat_adresi: payload.teslimatAdresi,
    p_items: payload.items,
    p_olusturan_kullanici_id: user.id,
    p_olusturma_kaynagi: payload.kaynak
  });

  if (error) {
    console.error("Sipariş oluşturma RPC hatası:", error);
    return { error: "Sipariş oluşturulurken bir veritabanı hatası oluştu." };
  }

  // --- YENİ KISIM: Bildirim oluşturma ---
  if (payload.kaynak === 'Müşteri Portalı') {
    const { data: firma } = await supabase.from('firmalar').select('unvan').eq('id', payload.firmaId).single();
    const mesaj = `${firma?.unvan || 'Bir partner'} yeni bir sipariş oluşturdu.`;
    const link = `/admin/operasyon/siparisler/${newOrderId}`;
    await yoneticilereBildirimGonder(mesaj, link);
  }
  // --- YENİ KISIM SONU ---

  revalidatePath('/admin/operasyon/urunler');
  revalidatePath('/admin/crm/firmalar');
  revalidatePath(`/admin/crm/firmalar/${payload.firmaId}`);
  revalidatePath('/admin/operasyon/siparisler');
  revalidatePath('/portal/dashboard');
  revalidatePath('/portal/siparislerim');

  redirect(`/admin/operasyon/siparisler/${newOrderId}`);
}

// Fatura indirme linki oluşturan fonksiyon
export async function getInvoiceDownloadUrlAction(siparisId: number, filePath: string) {
    'use server';
    const supabase = createSupabaseServerClient();
    
    const { data: order } = await supabase.from('siparisler').select('id').eq('id', siparisId).single();
    if (!order) {
        return { error: "Sipariş bulunamadı veya yetkiniz yok." };
    }
    
    const { data, error } = await supabase.storage
        .from('siparis-faturalari')
        .createSignedUrl(filePath, 3600);
        
    if (error) {
        console.error("Signed URL hatası:", error);
        return { error: "Fatura indirilirken bir hata oluştu." };
    }
    
    return { url: data.signedUrl };
}

// Sipariş durumunu güncelleyen fonksiyon
export async function siparisDurumGuncelleAction(siparisId: number, yeniDurum: Enums<'siparis_durumu'>) {
    'use server';
    const supabase = createSupabaseServerClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Yetkisiz işlem." };

    // --- YENİ KISIM: Partnere bildirim göndermek için sipariş bilgilerini al ---
    const { data: siparisData } = await supabase
        .from('siparisler')
        .select('firmalar(portal_kullanicisi_id)')
        .eq('id', siparisId)
        .single();
    const partnerKullaniciId = siparisData?.firmalar?.portal_kullanicisi_id;
    // --- YENİ KISIM SONU ---

    // RPC fonksiyonunu çağırarak hem durumu güncelle hem de log oluştur
    const { error } = await supabase.rpc('update_order_status_and_log_activity', {
        p_siparis_id: siparisId,
        p_yeni_status: yeniDurum,
        p_kullanici_id: user.id
    });

    if (error) {
        console.error("Sipariş durum güncelleme hatası:", error);
        return { error: "Durum güncellenirken bir hata oluştu." };
    }

    // --- YENİ KISIM: Partnere bildirim gönder ---
    if (partnerKullaniciId) {
        await supabase.from('bildirimler').insert({
            alici_id: partnerKullaniciId,
            icerik: `#${siparisId} numaralı siparişinizin durumu "${yeniDurum}" olarak güncellendi.`,
            link: `/portal/siparislerim/${siparisId}`
        });
    }
    // --- YENİ KISIM SONU ---

    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    
    return { success: `Sipariş durumu başarıyla "${yeniDurum}" olarak güncellendi.` };
}