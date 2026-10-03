/**
 * Order Payment Service (auth-free, server-only)
 * ==============================================
 * Stripe webhook gibi sistem kaynaklı çağrılar için. Admin oturumu gerektirmez.
 *
 * markOrderPaidFromStripe:
 *  - Siparişi 'paid' olarak işaretler (idempotent — tekrar çağrılırsa e-posta tekrar gitmez).
 *  - Müşteriye Bestellbestätigung (faturasız) gönderir. Test siparişlerinde e-posta atlanır.
 *  - Lexware faturası KESMEZ. Fatura, admin panelinden manuel tetiklenir
 *    (kontrol + teslimat sonrası; § 14 Abs. 2 UStG: 6 ay içinde fatura yeterli).
 */

import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { sendOrderConfirmationEmail } from '@/lib/email';

export async function markOrderPaidFromStripe(orderId: string): Promise<{
  success: boolean;
  alreadyPaid?: boolean;
  warning?: string;
  error?: string;
}> {
  const supabase = createSupabaseServiceClient();

  // Atomik geçiş: yalnızca henüz 'paid' olmayan kayıt güncellenir
  const { data: updated, error: updErr } = await supabase
    .from('siparisler')
    .update({ odeme_durumu: 'paid' } as any)
    .eq('id', orderId)
    .neq('odeme_durumu', 'paid')
    .select('id')
    .maybeSingle();

  if (updErr) {
    return { success: false, error: `Sipariş güncellenemedi: ${updErr.message}` };
  }
  if (!updated) {
    // Ya zaten ödenmiş ya da sipariş yok
    const { data: exists } = await supabase.from('siparisler').select('id').eq('id', orderId).maybeSingle();
    if (!exists) return { success: false, error: `Sipariş bulunamadı: ${orderId}` };
    return { success: true, alreadyPaid: true };
  }

  // Onay e-postası (graceful)
  try {
    const { data: s } = await supabase
      .from('siparisler')
      .select(`
        id, is_test, teslimat_adresi, toplam_tutar_net, toplam_tutar_brut,
        kargo_tutari_net, kargo_kdv_tutari,
        firmalar ( email, unvan ),
        siparis_detay ( miktar, birim_fiyat, toplam_fiyat, urunler ( ad ) )
      `)
      .eq('id', orderId)
      .single();

    const order = s as any;
    if (!order || order.is_test === true) return { success: true };

    const to = order.firmalar?.email;
    if (!to) return { success: true, warning: 'Firma e-postası yok — onay e-postası gönderilmedi.' };

    const items = (order.siparis_detay || []).map((d: any) => {
      const raw = d.urunler?.ad;
      const ad = typeof raw === 'object' && raw !== null ? raw.de || raw.tr || Object.values(raw)[0] : String(raw || 'Produkt');
      return {
        ad: String(ad),
        miktar: Number(d.miktar) || 0,
        birimFiyat: Number(d.birim_fiyat) || 0,
        toplamFiyat: Number(d.toplam_fiyat) || 0,
      };
    });

    const kargoBrut = (Number(order.kargo_tutari_net) || 0) + (Number(order.kargo_kdv_tutari) || 0);

    await sendOrderConfirmationEmail({
      to,
      firmName: order.firmalar?.unvan || null,
      orderId,
      orderType: 'normal',
      items,
      toplamNet: Number(order.toplam_tutar_net) || 0,
      kargoTutariBrut: kargoBrut,
      toplamBrut: Number(order.toplam_tutar_brut) || 0,
      teslimatAdresi: order.teslimat_adresi,
      locale: 'de',
      portalOrderUrl: `https://elysonsweets.de/de/portal/siparisler/${orderId}`,
      paymentMethod: 'stripe',
    });
  } catch (e: any) {
    console.error('[order-payment] Onay e-postası gönderilemedi:', e);
    return { success: true, warning: `Ödeme işlendi ancak onay e-postası gönderilemedi: ${e?.message}` };
  }

  return { success: true };
}
