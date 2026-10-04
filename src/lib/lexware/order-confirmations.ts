/**
 * Lexware Office Order Confirmations API Handler
 * Sipariş onaylarını (Auftragsbestätigung) Proforma Fatura olarak kesmeyi yönetir.
 */

import { lexwareFetch } from './client';
import { getOrCreateLexwareContact } from './contacts';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { LexwareLineItem } from './invoices';

export interface LexwareOrderConfirmationPayload {
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
  title: string;
  introduction?: string;
  remark?: string;
}

/**
 * Belirtilen sipariş için Lexware'de Auftragsbestätigung (Proforma) oluşturur ve onaylar (?finalize=true)
 */
export async function createLexwareProformaForOrder(
  siparisId: string,
  options: { finalize?: boolean } = { finalize: true }
): Promise<{ proformaId: string; proformaNo: string; pdfUrl: string }> {
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
  const contactId = await getOrCreateLexwareContact(firma.id, siparis.is_test === true);

  // 2. Ürün kalemlerini hazırla
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
        taxRatePercentage: 7,
      },
      discountPercentage: 0,
    };
  });

  // 3. Kargo kalemi ekle
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
        taxRatePercentage: 7,
      },
      discountPercentage: 0,
    });
  }

  const nowIso = new Date().toISOString();
  const finalizeParam = options.finalize !== false ? '?finalize=true' : '';

  const payload: LexwareOrderConfirmationPayload = {
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
    title: 'Proforma-Rechnung',
    introduction: `Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihre Bestellung (Bestell-Nr. ${siparis.id.slice(0, 8)}). Dies ist eine Proforma-Rechnung.`,
    remark: 'Bitte überweisen Sie den Betrag vorab. Vielen Dank für Ihr Vertrauen!',
  };

  const isTestOrder = siparis.is_test === true;
  const result = await lexwareFetch<any>(`/v1/order-confirmations${finalizeParam}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    isTest: isTestOrder,
  });

  const proformaId = result.id;
  
  let proformaNo = result.voucherNumber;
  if (!proformaNo) {
    try {
      const fetched = await lexwareFetch<any>(`/v1/order-confirmations/${proformaId}`, { isTest: isTestOrder });
      proformaNo = fetched.voucherNumber || `AB-${siparis.id.slice(0, 6).toUpperCase()}`;
    } catch {
      proformaNo = `AB-${siparis.id.slice(0, 6).toUpperCase()}`;
    }
  }

  const pdfUrl = `/api/invoices/${siparisId}/proforma-pdf`;

  try {
    const { error: err1 } = await supabase
      .from('siparisler')
      .update({
        lexware_proforma_id: proformaId,
        lexware_proforma_no: proformaNo,
        lexware_proforma_pdf_url: pdfUrl,
        proforma_durumu: 'kesildi',
      } as any)
      .eq('id', siparisId);
      
    if (err1) {
        console.warn('DB Update failed:', err1);
    }
  } catch (e) {
    console.error('Error updating Lexware columns:', e);
  }

  return {
    proformaId,
    proformaNo,
    pdfUrl,
  };
}

/**
 * Proforma faturanın PDF dosyasını indirir.
 */
export async function getLexwareProformaPdfBuffer(proformaId: string, isTest: boolean = false): Promise<{ buffer: Buffer; filename: string }> {
  const docInfo = await lexwareFetch<any>(`/v1/order-confirmations/${proformaId}/document`, { isTest });
  const fileId = docInfo?.documentFileId;

  if (!fileId) {
    throw new Error(`Belge için PDF bulunamadı [ID: ${proformaId}]`);
  }

  const blob = await lexwareFetch<Blob>(`/v1/files/${fileId}`, {
    isTest,
    headers: {
      Accept: 'application/pdf',
    },
  });

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    filename: `Proforma-${proformaId.slice(0, 8)}.pdf`,
  };
}
