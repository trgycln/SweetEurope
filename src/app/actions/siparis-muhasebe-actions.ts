'use server';

/**
 * Sipariş Muhasebe Actions
 * ========================
 * processOrderPaymentAction: Ödeme onaylandığında Lexware'de fatura keser ve müşteriye e-posta gönderir.
 * cancelOrderAndStornoAction: Siparişi iptal eder, Lexware'de storno keser, müşteriye e-posta gönderir, stokları geri yükler.
 *
 * KURAL: Her iki fonksiyon da idempotent çalışır — mükerrer işlem asla yapılmaz.
 * KURAL: Lexware/e-posta hatası sistemi çökertmez (graceful failure).
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import {
  cancelLexwareInvoiceForOrder,
  getLexwareCreditNotePdfBuffer,
} from '@/lib/lexware/invoices';
import {
  createLexwareProformaForOrder,
  getLexwareProformaPdfBuffer,
} from '@/lib/lexware/order-confirmations';
import { sendInvoiceEmail, sendStornoEmail } from '@/lib/email';

// -------------------------------------------------------------------
// Auth yardımcısı: Yönetici/Personel rolü kontrolü
// -------------------------------------------------------------------
async function requireAdminRole() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { supabase, user: null, error: 'Yetkisiz işlem: Giriş yapınız.' };
  }

  const { data: profile } = await supabase
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (!['Yönetici', 'Personel', 'Ekip Üyesi'].includes(profile?.rol || '')) {
    return { supabase, user: null, error: 'Bu işlem için yetkiniz bulunmamaktadır.' };
  }

  return { supabase, user, error: null };
}

// -------------------------------------------------------------------
// createAndSendInvoiceAction — Admin kontrolünden sonra manuel tetiklenir:
// Lexware faturası keser + PDF'i müşteriye e-posta ile gönderir (ödeme durumunu DEĞİŞTİRMEZ).
// -------------------------------------------------------------------
export async function createAndSendInvoiceAction(siparisId: string): Promise<{
  success: boolean;
  invoiceNo?: string;
  pdfUrl?: string;
  warning?: string;
  error?: string;
}> {
  try {
    const { user, error: authError } = await requireAdminRole();
    if (authError || !user) {
      return { success: false, error: authError! };
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // Siparişi çek (firma e-postası dahil)
    const { data: siparis, error: siparisError } = await supabaseAdmin
      .from('siparisler')
      .select(`
        id, odeme_durumu, lexware_proforma_id, lexware_proforma_no, is_test,
        firmalar ( id, email, unvan )
      `)
      .eq('id', siparisId)
      .single();

    if (siparisError || !siparis) {
      return { success: false, error: `Sipariş bulunamadı: ${siparisError?.message}` };
    }

    // IDEMPOTENCY: Zaten proforma kesilmişse tekrar kesme
    if ((siparis as any).lexware_proforma_id) {
      return {
        success: true,
        invoiceNo: (siparis as any).lexware_proforma_no,
        pdfUrl: `/api/invoices/${siparisId}/proforma-pdf`,
        warning: 'Proforma Fatura zaten daha önce kesilmişti — tekrar kesilmedi.',
      };
    }

    // 1. Lexware Proforma faturası kes
    let invoiceResult: { proformaId: string; proformaNo: string; pdfUrl: string } | null = null;
    let lexwareWarning: string | undefined;

    try {
      invoiceResult = await createLexwareProformaForOrder(siparisId, { finalize: true });
    } catch (lexErr: any) {
      // GRACEFUL FAILURE: Lexware hatası sistemi çökertmesin
      console.error('[muhasebe] Lexware proforma kesme hatası:', lexErr);
      lexwareWarning = `Lexware proforma faturası kesilemedi. Lütfen Lexware panelinden kontrol edin. Hata: ${lexErr?.message}`;

      return {
        success: true,
        warning: lexwareWarning,
      };
    }

    // 3. Fatura PDF'ini Lexware'den indir
    let pdfBuffer: Buffer | null = null;
    let pdfFilename = `Proforma-${invoiceResult.proformaNo}.pdf`;

    try {
      const pdfResult = await getLexwareProformaPdfBuffer(invoiceResult.proformaId, (siparis as any).is_test === true);
      pdfBuffer = pdfResult.buffer;
      pdfFilename = pdfResult.filename;
    } catch (pdfErr: any) {
      console.error('[muhasebe] Lexware PDF indirme hatası:', pdfErr);
      // PDF indirilemese de işlem devam etsin, e-posta gönderilmeyecek
      lexwareWarning = `Proforma kesildi (${invoiceResult.proformaNo}) ancak PDF indirilemedi — e-posta gönderilemedi. Hata: ${pdfErr?.message}`;
    }

    // 4. Müşteriye faturayı e-posta ile gönder
    const firma = (siparis as any).firmalar;
    if (pdfBuffer && firma?.email) {
      try {
        await sendInvoiceEmail({
          to: firma.email,
          orderNo: siparisId.slice(0, 8).toUpperCase(),
          invoiceNo: invoiceResult.proformaNo,
          pdfBuffer,
          pdfFilename,
        });
      } catch (emailErr: any) {
        console.error('[muhasebe] Fatura e-posta gönderim hatası:', emailErr);
        // E-posta hatası işlemi durdurmaz
        lexwareWarning = `Proforma kesildi (${invoiceResult.proformaNo}) ancak e-posta gönderilemedi. Hata: ${emailErr?.message}`;
      }
    }

    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');

    return {
      success: true,
      invoiceNo: invoiceResult.proformaNo,
      pdfUrl: invoiceResult.pdfUrl,
      ...(lexwareWarning ? { warning: lexwareWarning } : {}),
    };
  } catch (error: any) {
    console.error('[muhasebe] processOrderPaymentAction beklenmeyen hata:', error);
    return {
      success: false,
      error: error?.message || 'Ödeme işlenirken beklenmeyen bir hata oluştu.',
    };
  }
}

// -------------------------------------------------------------------
// generateLexwareDeliveryNoteAction — Lexware'de Lieferschein (İrsaliye) oluşturur
// -------------------------------------------------------------------
export async function generateLexwareDeliveryNoteAction(siparisId: string): Promise<{
  success: boolean;
  pdfUrl?: string;
  error?: string;
}> {
  try {
    const { user, error: authError } = await requireAdminRole();
    if (authError || !user) return { success: false, error: authError! };

    const { createLexwareDeliveryNoteForOrder } = await import('@/lib/lexware/delivery-notes');
    
    // 1. İrsaliye kes
    const result = await createLexwareDeliveryNoteForOrder(siparisId);

    // 2. Cache temizle ve dön
    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');

    return {
      success: true,
      pdfUrl: result.pdfUrl
    };
  } catch (error: any) {
    console.error('[muhasebe] generateLexwareDeliveryNoteAction beklenmeyen hata:', error);
    return {
      success: false,
      error: error?.message || 'İrsaliye oluşturulurken beklenmeyen bir hata oluştu.',
    };
  }
}

// -------------------------------------------------------------------
// -------------------------------------------------------------------
// processOrderPaymentAction — Havale/Vorkasse: sadece "Ödendi" işaretler (fatura KESMEZ)
// -------------------------------------------------------------------
export async function processOrderPaymentAction(siparisId: string): Promise<{
  success: boolean;
  warning?: string;
  error?: string;
}> {
  try {
    const { user, error: authError } = await requireAdminRole();
    if (authError || !user) return { success: false, error: authError! };

    const supabaseAdmin = createSupabaseServiceClient();
    const { error } = await supabaseAdmin
      .from('siparisler')
      .update({ odeme_durumu: 'paid' } as any)
      .eq('id', siparisId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Ödeme işaretlenirken hata oluştu.' };
  }
}

// -------------------------------------------------------------------
// getInvoicePreviewAction — Fatura kesilmeden önce kalemleri gösterir (Lexware'e dokunmaz)
// -------------------------------------------------------------------
export interface InvoicePreview {
  firma: { unvan: string; adres: string; plz: string; sehir: string; email: string };
  items: Array<{ name: string; artNo?: string; qty: number; unitNet: number; totalNet: number }>;
  kargo?: { name: string; net: number };
  net: number;
  vat: number;
  gross: number;
  vatRate: number;
}

export async function getInvoicePreviewAction(siparisId: string): Promise<{
  success: boolean;
  preview?: InvoicePreview;
  error?: string;
}> {
  try {
    const { user, error: authError } = await requireAdminRole();
    if (authError || !user) return { success: false, error: authError! };

    const supabaseAdmin = createSupabaseServiceClient();
    const { data: s, error } = await supabaseAdmin
      .from('siparisler')
      .select(`
        id, kargo_tutari_net, kargo_yontemi,
        firmalar ( unvan, adres, posta_kodu, sehir, email ),
        siparis_detay ( miktar, birim_fiyat, urunler ( ad, stok_kodu ) )
      `)
      .eq('id', siparisId)
      .single();
    if (error || !s) return { success: false, error: `Sipariş bulunamadı: ${error?.message}` };

    const order = s as any;
    const VAT = 7; // createLexwareInvoiceForOrder ile aynı oran
    const items = (order.siparis_detay || []).map((d: any) => {
      const raw = d.urunler?.ad;
      const name = typeof raw === 'object' && raw !== null
        ? raw.de || raw.tr || Object.values(raw)[0]
        : String(raw || 'Produkt');
      const qty = Number(d.miktar) || 1;
      const unitNet = Number(d.birim_fiyat) || 0;
      return {
        name: String(name),
        artNo: d.urunler?.stok_kodu || undefined,
        qty,
        unitNet,
        totalNet: Math.round(qty * unitNet * 100) / 100,
      };
    });

    const kargoNet = Number(order.kargo_tutari_net) || 0;
    const net = Math.round((items.reduce((a: number, i: any) => a + i.totalNet, 0) + kargoNet) * 100) / 100;
    const vat = Math.round(net * VAT) / 100;

    return {
      success: true,
      preview: {
        firma: {
          unvan: order.firmalar?.unvan || '',
          adres: order.firmalar?.adres || '',
          plz: order.firmalar?.posta_kodu || '',
          sehir: order.firmalar?.sehir || '',
          email: order.firmalar?.email || '',
        },
        items,
        ...(kargoNet > 0 ? { kargo: { name: `Versandkosten (${order.kargo_yontemi || 'Lieferung'})`, net: kargoNet } } : {}),
        net,
        vat,
        gross: Math.round((net + vat) * 100) / 100,
        vatRate: VAT,
      },
    };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Önizleme oluşturulamadı.' };
  }
}

// -------------------------------------------------------------------
// cancelOrderAndStornoAction
// -------------------------------------------------------------------
export async function cancelOrderAndStornoAction(
  siparisId: string,
  reason: string = 'Müşteri talebi / Kundenstornierung'
): Promise<{
  success: boolean;
  creditNoteNo?: string;
  stornoPdfUrl?: string;
  warning?: string;
  error?: string;
}> {
  try {
    const { user, error: authError } = await requireAdminRole();
    if (authError || !user) {
      return { success: false, error: authError! };
    }

    const supabaseAdmin = createSupabaseServiceClient();

    // Siparişi çek
    const { data: siparis, error: siparisError } = await supabaseAdmin
      .from('siparisler')
      .select(`
        id, siparis_durumu, is_test, lexware_proforma_id, lexware_invoice_id, lexware_storno_id, lexware_storno_no,
        firmalar ( id, email, unvan )
      `)
      .eq('id', siparisId)
      .single();

    if (siparisError || !siparis) {
      return { success: false, error: `Sipariş bulunamadı: ${siparisError?.message}` };
    }

    let creditNoteNo: string | undefined;
    let stornoPdfUrl: string | undefined;
    let warningMsg: string | undefined;

    // 1. Lexware Storno: Fatura varsa iptal et
    if ((siparis as any).lexware_invoice_id) {
      // IDEMPOTENCY: Zaten storno kesilmişse tekrar kesme
      if ((siparis as any).lexware_storno_id) {
        creditNoteNo = (siparis as any).lexware_storno_no;
        stornoPdfUrl = `/api/invoices/${siparisId}/storno-pdf`;
        warningMsg = 'Storno zaten daha önce kesilmişti — tekrar kesilmedi.';
      } else {
        try {
          const stornoResult = await cancelLexwareInvoiceForOrder(siparisId, reason);
          creditNoteNo = stornoResult.creditNoteNo;
          stornoPdfUrl = stornoResult.stornoPdfUrl;
        } catch (stornoErr: any) {
          console.error('[muhasebe] Lexware storno hatası:', stornoErr);
          warningMsg = `Sipariş iptal edildi ancak Lexware Storno kesilemedi. Manuel kontrol gerekli. Hata: ${stornoErr?.message}`;
        }
      }

      // 2. Storno PDF'ini indir ve müşteriye e-posta gönder
      if (creditNoteNo && !warningMsg) {
        const stornoIdForPdf = (siparis as any).lexware_storno_id;
        if (stornoIdForPdf) {
          try {
            const { buffer: pdfBuffer, filename: pdfFilename } = await getLexwareCreditNotePdfBuffer(stornoIdForPdf, (siparis as any).is_test === true);
            const firma = (siparis as any).firmalar;
            if (firma?.email) {
              await sendStornoEmail({
                to: firma.email,
                orderNo: siparisId.slice(0, 8).toUpperCase(),
                creditNoteNo,
                pdfBuffer,
                pdfFilename,
              });
            }
          } catch (pdfEmailErr: any) {
            console.error('[muhasebe] Storno PDF/e-posta hatası:', pdfEmailErr);
            warningMsg = `Storno kesildi (${creditNoteNo}) ancak PDF/e-posta gönderilemedi. Hata: ${pdfEmailErr?.message}`;
          }
        }
      }
    }

    // 3. STOK BÜTÜNLÜĞÜ: Stokları geri yükle (test siparişlerinde stok düşülmediği için atılır)
    if ((siparis as any).is_test !== true) {
    try {
      await supabaseAdmin.rpc('restore_order_stock' as any, { p_siparis_id: siparisId });
    } catch (stockErr: any) {
      console.error('[muhasebe] Stok geri yükleme hatası:', stockErr);
      // Stok hatası da uyarı olarak ilet ama akışı durdurma
      warningMsg = (warningMsg ? warningMsg + ' | ' : '') +
        `Stok geri yüklenemedi: ${stockErr?.message}. Lütfen stokları manuel kontrol edin.`;
    }
    }

    // 4. Sipariş durumunu 'İptal Edildi' yap
    await supabaseAdmin
      .from('siparisler')
      .update({
        siparis_durumu: 'İptal Edildi',
        fatura_durumu: (siparis as any).lexware_invoice_id ? 'iptal_edildi' : 'yok',
      } as any)
      .eq('id', siparisId);

    revalidatePath('/[locale]/admin/operasyon/siparisler/[siparisId]', 'page');
    revalidatePath('/[locale]/portal/siparisler/[siparisId]', 'page');

    return {
      success: true,
      ...(creditNoteNo ? { creditNoteNo } : {}),
      ...(stornoPdfUrl ? { stornoPdfUrl } : {}),
      ...(warningMsg ? { warning: warningMsg } : {}),
    };
  } catch (error: any) {
    console.error('[muhasebe] cancelOrderAndStornoAction beklenmeyen hata:', error);
    return {
      success: false,
      error: error?.message || 'İptal işlemi sırasında beklenmeyen bir hata oluştu.',
    };
  }
}
