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

// Die Action akzeptiert jetzt ein Objekt mit allen notwendigen Daten
export async function siparisOlusturAction(payload: {
    firmaId: string, 
    teslimatAdresi: string, 
    items: OrderItem[],
    kaynak: Enums<'siparis_kaynagi'> // 'İç Sistem' oder 'Müşteri Portalı'
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
    p_olusturma_kaynagi: payload.kaynak // Der neue Parameter wird hier übergeben
  });

  if (error) {
    console.error("Sipariş oluşturma RPC hatası:", error);
    return { error: "Sipariş oluşturulurken bir veritabanı hatası oluştu." };
  }

  // Alle relevanten Seiten neu validieren
  revalidatePath('/admin/operasyon/urunler');
  revalidatePath('/admin/crm/firmalar');
  revalidatePath(`/admin/crm/firmalar/${payload.firmaId}`);
  revalidatePath('/admin/operasyon/siparisler');
  revalidatePath('/portal/dashboard'); // Das Partner-Dashboard auch
  revalidatePath('/portal/siparislerim'); // Und die zukünftige Bestellliste des Partners

  // Umleitung zur Bestätigungs-/Detailseite
  // Wir leiten Admins und Partner zur gleichen Detailseite weiter.
  // Unsere Middleware wird sicherstellen, dass jeder nur das sieht, was er darf.
  redirect(`/admin/operasyon/siparisler/${newOrderId}`);
}

export async function getInvoiceDownloadUrlAction(siparisId: number, filePath: string) {
    'use server';
    const supabase = createSupabaseServerClient();
    
    // Sicherheitsprüfung: Darf dieser Benutzer diese Bestellung überhaupt sehen?
    const { data: order } = await supabase.from('siparisler').select('id').eq('id', siparisId).single();
    if (!order) {
        return { error: "Sipariş bulunamadı veya yetkiniz yok." };
    }
    
    // Signierte URL mit 1 Stunde Gültigkeit erstellen
    const { data, error } = await supabase.storage
        .from('siparis-faturalari')
        .createSignedUrl(filePath, 3600);
        
    if (error) {
        console.error("Signed URL hatası:", error);
        return { error: "Fatura indirilirken bir hata oluştu." };
    }
    
    return { url: data.signedUrl };
}

export async function siparisDurumGuncelleAction(siparisId: number, yeniDurum: Enums<'siparis_durumu'>) {
    'use server';
    
    // 1. Yetki Kontrolü
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Sadece admin/yetkili kullanıcıların durumu değiştirmesine izin verilmeli
    // Not: Gerçek uygulamada daha detaylı rol kontrolü yapılmalıdır.
    if (!user) {
        return { error: "Yetkisiz işlem. Lütfen giriş yapın." };
    }

    // 2. Veritabanında Güncelleme İşlemi
    const { error } = await supabase
        .from('siparisler')
        .update({ siparis_statusu: yeniDurum })
        .eq('id', siparisId);

    if (error) {
        console.error("Sipariş durum güncelleme hatası:", error);
        return { error: "Durum güncellenirken bir hata oluştu." };
    }

    // 3. İlgili Sayfaları Yenileme (Revalidation)
    // Güncellenen siparişin detay sayfasını ve siparişler listesini yenile
    revalidatePath(`/admin/operasyon/siparisler/${siparisId}`);
    revalidatePath('/admin/operasyon/siparisler');
    
    // İşlem başarılı mesajı
    return { success: `Sipariş #${siparisId} durumu başarıyla "${yeniDurum}" olarak güncellendi.` };
}