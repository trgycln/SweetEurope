'use server';

/**
 * Sipariş Kargo Actions
 * =====================
 * markOrderAsShippedAction: Siparişi "Yola Çıktı" olarak işaretler,
 * kargo bilgilerini kaydeder, müşteriye e-posta gönderir ve portal bildirimi atar.
 *
 * KURAL: E-posta hatası işlemi durdurmaz (Graceful Degradation) — warning döner.
 * KURAL: Sadece Yönetici / Personel / Ekip Üyesi rolleri bu action'ı çalıştırabilir.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { sendShippingEmail } from '@/lib/email';
import { sendNotification } from '@/lib/notificationUtils';

export async function markOrderAsShippedAction(
  siparisId: string,
  kargoFirmasi: string,
  kargoTakipNo: string,
  kargoTakipUrl: string
): Promise<{
  success: boolean;
  warning?: string;
  error?: string;
}> {
  try {
    // --- Auth & Rol kontrolü ---
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Yetkisiz işlem: Giriş yapınız.' };
    }

    const { data: profile } = await supabase
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '')) {
      return { success: false, error: 'Bu işlem için yetkiniz bulunmamaktadır.' };
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // --- Siparişi ve firma e-postasını çek ---
    const { data: siparis, error: siparisError } = await supabaseAdmin
      .from('siparisler')
      .select(`
        id, siparis_durumu,
        firmalar ( id, email, unvan )
      `)
      .eq('id', siparisId)
      .single();

    if (siparisError || !siparis) {
      return { success: false, error: `Sipariş bulunamadı: ${siparisError?.message}` };
    }

    // 1. Supabase güncelle: durum, kargo bilgileri
    const { error: updateError } = await supabaseAdmin
      .from('siparisler')
      .update({
        siparis_durumu: 'Yola Çıktı',
        kargo_firmasi: kargoFirmasi || null,
        kargo_takip_no: kargoTakipNo || null,
        kargo_takip_url: kargoTakipUrl || null,
      } as any)
      .eq('id', siparisId);

    if (updateError) {
      return { success: false, error: `Sipariş güncellenemedi: ${updateError.message}` };
    }

    const orderNo = siparisId.slice(0, 8).toUpperCase();
    const firma = (siparis as any).firmalar;
    let warningMsg: string | undefined;

    // 2. Müşteriye e-posta gönder — GRACEFUL FAILURE
    if (firma?.email) {
      try {
        await sendShippingEmail({
          to: firma.email,
          orderNo,
          courier: kargoFirmasi,
          trackingNo: kargoTakipNo || null,
          trackingUrl: kargoTakipUrl || null,
        });
      } catch (emailErr: any) {
        console.error('[kargo] Kargo e-postası gönderilemedi:', emailErr);
        // E-posta hatası işlemi durdurmaz — admin'e warning dönülür
        warningMsg = `Sipariş "Yola Çıktı" olarak güncellendi ancak müşteriye e-posta gönderilemedi. Hata: ${emailErr?.message}`;
      }
    } else {
      console.warn(`[kargo] Firma e-postası bulunamadı, e-posta gönderilmedi. Sipariş: ${siparisId}`);
    }

    // 3. Portal içi bildirim — GRACEFUL FAILURE
    try {
      const bildirimIcerik = kargoTakipNo
        ? `Siparişiniz yola çıktı. Kargo: ${kargoFirmasi} — Takip No: ${kargoTakipNo}`
        : `Siparişiniz yola çıktı. Kargo: ${kargoFirmasi}`;

      await sendNotification({
        aliciFirmaId: (siparis as any).firmalar?.id,
        icerik: bildirimIcerik,
        link: `/portal/siparisler/${siparisId}`,
        supabaseClient: supabaseAdmin,
      });
    } catch (notifErr: any) {
      console.warn('[kargo] Portal bildirimi gönderilemedi:', notifErr);
      // Bildirim hatası da sessizce geçilir
    }

    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');

    return {
      success: true,
      ...(warningMsg ? { warning: warningMsg } : {}),
    };
  } catch (error: any) {
    console.error('[kargo] markOrderAsShippedAction beklenmeyen hata:', error);
    return {
      success: false,
      error: error?.message || 'Kargo işlenirken beklenmeyen bir hata oluştu.',
    };
  }
}
