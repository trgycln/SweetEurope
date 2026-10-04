'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createLexwareDeliveryNoteForInternalIssue } from '@/lib/lexware/delivery-notes'; // Bunu birazdan olusturacagiz

export type NedenKodu = '101_numune' | '102_ofis_tuketimi' | '103_sahsi_kullanim' | '104_fire' | '105_diger';

export interface DahiliCikisPayload {
  urunId: string;
  miktar: number;
  nedenKodu: NedenKodu;
  firmaId?: string; // Sadece numune icin gecerli olabilir
  aciklama?: string;
  isTest?: boolean;
}

export async function dahiliStokCikisiYapAction(payload: DahiliCikisPayload) {
  try {
    const supabase = await createSupabaseServerClient(await cookies());
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Yetkisiz islem. Lütfen giris yapin.' };
    }

    // 1. Stok tablosundan urunu bul
    const { data: urun, error: urunError } = await supabase
      .from('urunler')
      .select('id, ad, stok_miktari')
      .eq('id', payload.urunId)
      .single();

    if (urunError || !urun) {
      return { success: false, error: 'Secilen urun bulunamadi.' };
    }

    if ((urun.stok_miktari || 0) < payload.miktar) {
      const urunAd = typeof urun.ad === 'object' && urun.ad ? (urun.ad as any).tr || (urun.ad as any).de || 'Urun' : String(urun.ad);
      return { success: false, error: `Yetersiz stok: ${urunAd} ürününden sadece ${urun.stok_miktari || 0} adet mevcut.` };
    }

    if (payload.isTest) {
      // Test modunda stoğu gerçekten düşmemek için veritabanına kayıt atmıyoruz.
      // Sadece Lexware API bağlantısını (Sandbox) test ediyoruz.
      try {
        const lexwareResult = await createLexwareDeliveryNoteForInternalIssue('TEST-0000-0000', payload, true);
        return { 
          success: true, 
          message: 'SIMÜLASYON BAŞARILI: Stok düşülmedi, sadece Lexware Test (Sandbox) belgesi oluşturuldu.', 
          hareketId: 'TEST-ID',
          lexwareBelgeNo: lexwareResult.voucherNumber
        };
      } catch (err: any) {
        return { success: false, error: 'TEST MODU HATASI: Lexware entegrasyonu başarısız. ' + err.message };
      }
    }

    // 2. Veritabanına hareket kaydını at (Trigger stok_miktari'ni otomatik düsecek)
    // Supabase trigger'i yazdik, insert attigimiz anda urunler tablosundaki stok_miktari duser.
    const { data: insertResult, error: insertError } = await supabase
      .from('dahili_stok_hareketleri')
      .insert({
        urun_id: payload.urunId,
        miktar: payload.miktar,
        neden_kodu: payload.nedenKodu,
        firma_id: payload.firmaId || null,
        aciklama: payload.aciklama || null,
        olusturan_kullanici_id: user.id
      })
      .select('id')
      .single();

    if (insertError) {
      return { success: false, error: `Veritabani hatasi (Hareket kaydedilemedi): ${insertError.message}` };
    }

    // 3. Lexware Irsaliye (Delivery Note / Eigenbeleg) Olusturma
    // Bu kısım muhasebe için kritik. "101_numune" veya "104_fire" olmasına göre açıklama yazacağız.
    let lexwareResult: { id?: string, voucherNumber?: string, error?: string } = {};
    try {
        lexwareResult = await createLexwareDeliveryNoteForInternalIssue(insertResult.id, payload, payload.isTest);
        
        // Lexware ID ve numarasini veritabanina guncelle
        if (lexwareResult.id) {
            await supabase
                .from('dahili_stok_hareketleri')
                .update({
                    lexware_belge_id: lexwareResult.id,
                    lexware_belge_no: lexwareResult.voucherNumber
                })
                .eq('id', insertResult.id);
        }
    } catch (lexwareErr: any) {
        console.error('Lexware dahili cikis irsaliyesi olusturulurken hata:', lexwareErr);
        lexwareResult.error = lexwareErr.message;
        // Supabase tarafında stok dustu ama Lexware patladi. Graceful degradation yapabiliriz.
    }

    revalidatePath('/admin/stok-yonetimi/dahili-cikis');
    revalidatePath('/admin/urun-yonetimi/urunler');

    return { 
        success: true, 
        message: 'Dahili stok çıkışı başarıyla yapıldı.', 
        hareketId: insertResult.id,
        lexwareBelgeNo: lexwareResult.voucherNumber,
        lexwareHata: lexwareResult.error
    };

  } catch (error: any) {
    console.error('dahiliStokCikisiYapAction Hatası:', error);
    return { success: false, error: 'Beklenmeyen bir sunucu hatası oluştu.' };
  }
}
