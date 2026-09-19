/**
 * Lexware Office Invoices & Credit Notes API Handler
 * Sipariş faturalandırma, PDF indirme ve iptal (Storno) işlemlerini yönetir.
 */

import { lexwareFetch } from './client';
import { getOrCreateLexwareContact } from './contacts';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

export interface LexwareLineItem {
  type: 'custom';
  name: string;
  description?: string;
  quantity: number;
  unitName: string;
  unitPrice: {
    currency: 'EUR';
    netAmount: number;
    taxRatePercentage: number;
  };
  discountPercentage?: number;
}

export interface LexwareInvoicePayload {
  voucherDate: string;
  address: {
    contactId: string;
    name: string;
    street?: string;
    zip?: string;
    city?: string;
    countryCode: string;
  };
  lineItems: LexwareLineItem[];
  totalPrice: {
    currency: 'EUR';
  };
  taxConditions: {
    taxType: 'net';
  };
  shippingConditions: {
    shippingDate: string;
    shippingType: 'delivery';
  };
  title: string;
  introduction?: string;
  remark?: string;
}

/**
 * Belirtilen sipariş için Lexware'de resmi fatura oluşturur ve onaylar (?finalize=true)
 */
export async function createLexwareInvoiceForOrder(
  siparisId: string,
  options: { finalize?: boolean } = { finalize: true }
): Promise<{ invoiceId: string; invoiceNo: string; pdfUrl: string }> {
  const supabase = createSupabaseServiceClient();

  // Sipariş ve firma bilgilerini detaylarıyla çek
  const { data: siparis, error } = await supabase
    .from('siparisler')
    .select(`
      *,
      firmalar (*),
      siparis_detay (
        id, urun_id, miktar, birim_fiyat, toplam_fiyat,
        urunler ( id, ad, stok_kodu )
      )
    `)
    .eq('id', siparisId)
    .single();

  if (error || !siparis) {
    throw new Error(`Sipariş bulunamadı [ID: ${siparisId}]: ${error?.message}`);
  }

  const firma = siparis.firmalar;
  if (!firma) {
    throw new Error(`Siparişe bağlı firma kaydı bulunamadı [Sipariş ID: ${siparisId}]`);
  }

  // 1. Lexware müşteri kartını doğrula veya oluştur
  const contactId = await getOrCreateLexwareContact(firma.id);

  // 2. Ürün kalemlerini hazırla (%7 KDV)
  const lineItems: LexwareLineItem[] = (siparis.siparis_detay || []).map((item: any) => {
    const rawName = item.urunler?.ad;
    const productName = typeof rawName === 'object' && rawName !== null
      ? rawName.de || rawName.tr || Object.values(rawName)[0]
      : String(rawName || 'Produkt');

    return {
      type: 'custom',
      name: productName,
      description: item.urunler?.stok_kodu ? `Art.-Nr.: ${item.urunler.stok_kodu}` : undefined,
      quantity: Number(item.miktar) || 1,
      unitName: 'Stück',
      unitPrice: {
        currency: 'EUR',
        netAmount: Number(item.birim_fiyat) || 0,
        taxRatePercentage: 7, // Gıda KDV standardı
      },
      discountPercentage: 0,
    };
  });

  // 3. Kargo kalemi ekle (varsa, %7 KDV Nebenleistung)
  const kargoNet = Number(siparis.kargo_tutari_net) || 0;
  if (kargoNet > 0) {
    lineItems.push({
      type: 'custom',
      name: `Versandkosten (${siparis.kargo_yontemi || 'Lieferung'})`,
      quantity: 1,
      unitName: 'Pauschal',
      unitPrice: {
        currency: 'EUR',
        netAmount: kargoNet,
        taxRatePercentage: 7, // Nebenleistung gıda ile aynı KDV
      },
      discountPercentage: 0,
    });
  }

  const nowIso = new Date().toISOString();
  const finalizeParam = options.finalize !== false ? '?finalize=true' : '';

  const payload: LexwareInvoicePayload = {
    voucherDate: nowIso,
    address: {
      contactId,
      name: firma.unvan?.trim() || 'B2B Kunde',
      street: firma.adres?.trim() || undefined,
      zip: firma.posta_kodu?.trim() || '50667',
      city: firma.sehir?.trim() || 'Köln',
      countryCode: 'DE',
    },
    lineItems,
    totalPrice: {
      currency: 'EUR',
    },
    taxConditions: {
      taxType: 'net',
    },
    shippingConditions: {
      shippingDate: nowIso,
      shippingType: 'delivery',
    },
    title: 'Rechnung',
    introduction: `Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Bestellung (Bestell-Nr. ${siparis.id.slice(0, 8)}).`,
    remark: 'Zahlbar sofort nach Erhalt der Rechnung ohne Abzug. Vielen Dank für Ihr Vertrauen!',
  };

  const invoiceResult = await lexwareFetch<any>(`/v1/invoices${finalizeParam}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const invoiceId = invoiceResult.id;
  
  // Detayları çekerek kesinleşen fatura numarasını al (RE-XXXX)
  let invoiceNo = invoiceResult.voucherNumber;
  if (!invoiceNo) {
    try {
      const fetched = await lexwareFetch<any>(`/v1/invoices/${invoiceId}`);
      invoiceNo = fetched.voucherNumber || `RE-${siparis.id.slice(0, 6).toUpperCase()}`;
    } catch {
      invoiceNo = `RE-${siparis.id.slice(0, 6).toUpperCase()}`;
    }
  }

  const pdfUrl = `/api/invoices/${siparisId}/pdf`;

  // Supabase sipariş kaydını güncelle
  await supabase
    .from('siparisler')
    .update({
      lexware_invoice_id: invoiceId,
      lexware_invoice_no: invoiceNo,
      lexware_pdf_url: pdfUrl,
      fatura_durumu: 'kesildi',
    } as any)
    .eq('id', siparisId);

  return {
    invoiceId,
    invoiceNo,
    pdfUrl,
  };
}

/**
 * Lexware üzerinden faturanın resmi PDF dosya içeriğini binary olarak indirir.
 */
export async function getLexwareInvoicePdfBuffer(invoiceId: string): Promise<{ buffer: Buffer; filename: string }> {
  // 1. Doküman bilgisini al
  const docInfo = await lexwareFetch<any>(`/v1/invoices/${invoiceId}/document`);
  const fileId = docInfo?.documentFileId;

  if (!fileId) {
    throw new Error(`Fatura için henüz PDF dokümanı oluşturulmamış (Taslak olabilir) [Invoice ID: ${invoiceId}]`);
  }

  // 2. Dosyayı indir
  const blob = await lexwareFetch<Blob>(`/v1/files/${fileId}`, {
    headers: {
      Accept: 'application/pdf',
    },
  });

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    filename: `Rechnung-${invoiceId.slice(0, 8)}.pdf`,
  };
}

/**
 * Resmi kesilmiş bir faturayı iptal eder (Stornorechnung / Rechnungskorrektur düzenler).
 */
export async function cancelLexwareInvoiceForOrder(
  siparisId: string,
  reason: string = 'Kundenstornierung / Auftragsstornierung'
): Promise<{ creditNoteId: string; creditNoteNo: string; stornoPdfUrl: string }> {
  const supabase = createSupabaseServiceClient();

  const { data: siparis, error } = await supabase
    .from('siparisler')
    .select(`
      *,
      firmalar (*)
    `)
    .eq('id', siparisId)
    .single();

  if (error || !siparis) {
    throw new Error(`Sipariş bulunamadı: ${error?.message}`);
  }

  const originalInvoiceId = siparis.lexware_invoice_id;
  if (!originalInvoiceId) {
    throw new Error('Bu siparişe ait kesilmiş bir Lexware faturası bulunamadı.');
  }

  // Orijinal faturayı Lexware'den çek
  const originalInvoice = await lexwareFetch<any>(`/v1/invoices/${originalInvoiceId}`);
  const nowIso = new Date().toISOString();

  // Credit Note (Rechnungskorrektur) payload'u
  const creditNotePayload = {
    voucherDate: nowIso,
    address: originalInvoice.address,
    lineItems: originalInvoice.lineItems,
    totalPrice: originalInvoice.totalPrice,
    taxConditions: originalInvoice.taxConditions,
    title: 'Rechnungskorrektur',
    introduction: `Korrektur zu Rechnung ${originalInvoice.voucherNumber || ''}.\nGrund: ${reason}`,
    remark: 'Dieser Betrag wird storniert bzw. erstattet.',
  };

  const creditNoteResult = await lexwareFetch<any>('/v1/credit-notes?finalize=true', {
    method: 'POST',
    body: JSON.stringify(creditNotePayload),
  });

  const creditNoteId = creditNoteResult.id;
  let creditNoteNo = creditNoteResult.voucherNumber;
  if (!creditNoteNo) {
    try {
      const fetched = await lexwareFetch<any>(`/v1/credit-notes/${creditNoteId}`);
      creditNoteNo = fetched.voucherNumber || `ST-${siparis.id.slice(0, 6).toUpperCase()}`;
    } catch {
      creditNoteNo = `ST-${siparis.id.slice(0, 6).toUpperCase()}`;
    }
  }

  const stornoPdfUrl = `/api/invoices/${siparisId}/storno-pdf`;

  // Supabase güncelle
  await supabase
    .from('siparisler')
    .update({
      lexware_storno_id: creditNoteId,
      lexware_storno_no: creditNoteNo,
      lexware_storno_pdf_url: stornoPdfUrl,
      fatura_durumu: 'iptal_edildi',
      siparis_durumu: 'İptal Edildi',
    } as any)
    .eq('id', siparisId);

  return {
    creditNoteId,
    creditNoteNo,
    stornoPdfUrl,
  };
}

/**
 * Lexware üzerinden storno/kredi notunun resmi PDF dosya içeriğini binary olarak indirir.
 */
export async function getLexwareCreditNotePdfBuffer(creditNoteId: string): Promise<{ buffer: Buffer; filename: string }> {
  const docInfo = await lexwareFetch<any>(`/v1/credit-notes/${creditNoteId}/document`);
  const fileId = docInfo?.documentFileId;

  if (!fileId) {
    throw new Error(`İptal faturası için PDF dosyası bulunamadı [Credit Note ID: ${creditNoteId}]`);
  }

  const blob = await lexwareFetch<Blob>(`/v1/files/${fileId}`, {
    headers: {
      Accept: 'application/pdf',
    },
  });

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    filename: `Rechnungskorrektur-${creditNoteId.slice(0, 8)}.pdf`,
  };
}
