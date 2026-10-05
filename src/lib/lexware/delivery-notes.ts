import { lexwareFetch } from './client';
import { getOrCreateLexwareContact } from './contacts';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import type { DahiliCikisPayload } from '@/app/actions/dahili-stok-actions';

const INTERNAL_CONTACT_NAME = 'Elyson Sweets - Interner Beleg';

/** Dahili (firmasız) çıkışlar için Lexware'de tek bir iç müşteri kartı bulur veya oluşturur. */
async function getOrCreateInternalContact(isTest: boolean): Promise<string> {
  try {
    const found = await lexwareFetch<any>(
      `/v1/contacts?name=${encodeURIComponent(INTERNAL_CONTACT_NAME)}`,
      { isTest }
    );
    const existing = found?.content?.find((c: any) => c?.company?.name === INTERNAL_CONTACT_NAME);
    if (existing?.id) return existing.id;
  } catch {
    // arama başarısızsa yeni oluşturmayı dene
  }
  const created = await lexwareFetch<any>('/v1/contacts', {
    method: 'POST',
    body: JSON.stringify({
      version: 0,
      roles: { customer: {} },
      company: { name: INTERNAL_CONTACT_NAME },
      addresses: { billing: [{ street: 'Interne Buchung', zip: '50667', city: 'Köln', countryCode: 'DE' }] },
    }),
    isTest,
  });
  if (!created?.id) throw new Error('Interner Lexware-Kontakt konnte nicht erstellt werden.');
  return created.id;
}

/**
 * Dahili çıkışlar (Numune, Fire, Özel Tüketim) için Lexware Lieferschein (İrsaliye) veya Eigenbeleg oluşturur.
 */
export async function createLexwareDeliveryNoteForInternalIssue(
  hareketId: string,
  payload: DahiliCikisPayload,
  isTest: boolean = false
): Promise<{ id: string; voucherNumber: string }> {
  
  const supabase = createSupabaseServiceClient();

  // 1. Ürün bilgilerini çek
  const { data: urun } = await supabase
    .from('urunler')
    .select('id, ad, stok_kodu')
    .eq('id', payload.urunId)
    .single();

  const productName = urun?.ad 
    ? (typeof urun.ad === 'object' ? ((urun.ad as any).de || (urun.ad as any).tr) : String(urun.ad)) 
    : 'Produkt';

  // 2. Lexware Müşterisi Belirle (Firma seçilmişse o firma, seçilmemişse Elyson Sweets "Eigenbeleg" hesabı)
  let contactId = '';
  let addressName = 'Elyson Sweets (Eigenbeleg/Interne Bewegung)';
  let street = 'Interne Adresse';
  let zip = '50667';
  let city = 'Köln';

  if (payload.firmaId) {
    // Müşteriye numune bırakılıyorsa o firmanın contact bilgilerini al
    const { data: firma } = await supabase.from('firmalar').select('*').eq('id', payload.firmaId).single();
    if (firma) {
      contactId = await getOrCreateLexwareContact(firma.id, isTest);
      addressName = firma.unvan || addressName;
      street = firma.adres || street;
      zip = firma.posta_kodu || zip;
      city = firma.sehir || city;
    }
  }

  if (!contactId) {
    contactId = await getOrCreateInternalContact(isTest);
    addressName = INTERNAL_CONTACT_NAME;
  }

  // 3. Neden Koduna Göre Açıklama ve Başlık
  let title = 'Lieferschein / Eigenbeleg';
  let intro = `Interne Warenbewegung (ID: ${hareketId.substring(0,8)})\n\n`;
  let remark = '';

  switch (payload.nedenKodu) {
    case '101_numune':
        title = 'Lieferschein (Muster)'; // Max 25 chars required by Lexware
        intro += 'Die nachfolgenden Artikel werden als Muster / Warenprobe (Unverkäuflich) überlassen.';
        remark = 'Zweck: Werbeaufwand / Streuartikel.';
        break;
    case '102_ofis_tuketimi':
        title = 'Eigenbeleg (Betrieb)';
        intro += 'Entnahme für den betrieblichen Eigenbedarf (Kundenbewirtung / Mitarbeiter).';
        remark = 'Kein Verkauf.';
        break;
    case '103_sahsi_kullanim':
        title = 'Eigenbeleg (Privat)';
        intro += 'Entnahme für private Zwecke (Privatentnahme). USt.-Pflichtig prüfen.';
        break;
    case '104_fire':
        title = 'Eigenbeleg (Bruch)';
        intro += 'Ausbuchung wegen Bruch, Verderb oder Qualitätsmängeln.';
        break;
    default:
        title = 'Lieferschein (Intern)';
        break;
  }

  if (payload.aciklama) {
    intro += `\nNotiz: ${payload.aciklama}`;
  }

  const nowIso = new Date().toISOString();

  // 4. Lexware Lieferschein (Delivery Note) Payload'u
  const deliveryNotePayload = {
    voucherDate: nowIso,
    address: {
      contactId,
      name: addressName,
      street: street,
      zip: zip,
      city: city,
      countryCode: 'DE',
    },
    lineItems: [
      {
        type: 'custom',
        name: productName,
        description: urun?.stok_kodu ? `Art.-Nr.: ${urun.stok_kodu}` : '',
        quantity: payload.miktar,
        unitName: 'Stück'
        // Lieferschein'da fiyat olmaz, adet belirtilir.
      }
    ],
    title: title,
    introduction: intro,
    remark: remark,
    taxConditions: { taxType: 'net' },
    shippingConditions: { shippingDate: nowIso, shippingType: 'delivery' },
  };

  // Lexware Delivery Notes Endpoint'ine POST (finalize: belge numarası alınsın)
  const result = await lexwareFetch<any>('/v1/delivery-notes?finalize=true', {
    method: 'POST',
    body: JSON.stringify(deliveryNotePayload),
    isTest: isTest,
  });

  let voucherNumber = result.voucherNumber;
  if (!voucherNumber) {
    try {
      const fetched = await lexwareFetch<any>(`/v1/delivery-notes/${result.id}`, { isTest });
      voucherNumber = fetched.voucherNumber || `LS-${hareketId.slice(0, 6).toUpperCase()}`;
    } catch {
      voucherNumber = `LS-${hareketId.slice(0, 6).toUpperCase()}`;
    }
  }

  return {
    id: result.id,
    voucherNumber: voucherNumber
  };
}

/**
 * Normal siparişler için Lexware'de Lieferschein (İrsaliye) oluşturur.
 */
export async function createLexwareDeliveryNoteForOrder(
  siparisId: string,
  options: { finalize?: boolean } = { finalize: true }
): Promise<{ id: string; voucherNumber: string; pdfUrl: string }> {
  const supabase = createSupabaseServiceClient();

  const { data: siparis, error } = await supabase
    .from('siparisler')
    .select(`
      *,
      firmalar (*),
      siparis_detay (
        id, urun_id, miktar,
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

  const contactId = await getOrCreateLexwareContact(firma.id, siparis.is_test === true);

  const lineItems = (siparis.siparis_detay || []).map((item: any) => {
    const rawName = item.urunler?.ad;
    const productName = typeof rawName === 'object' && rawName !== null
      ? rawName.de || rawName.tr || Object.values(rawName)[0]
      : String(rawName || 'Produkt');

    return {
      type: 'custom',
      name: productName,
      description: item.urunler?.stok_kodu ? `Art.-Nr.: ${item.urunler.stok_kodu}` : undefined,
      quantity: Number(item.miktar) || 1,
      unitName: 'Stück'
    };
  });

  const nowIso = new Date().toISOString();
  const finalizeParam = options.finalize !== false ? '?finalize=true' : '';

  const deliveryNotePayload = {
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
    title: 'Lieferschein',
    introduction: `Lieferschein für Ihre Bestellung #${siparis.id.slice(0, 8).toUpperCase()}`,
    taxConditions: { taxType: 'net' },
    shippingConditions: { shippingDate: nowIso, shippingType: 'delivery' },
  };

  const result = await lexwareFetch<any>(`/v1/delivery-notes${finalizeParam}`, {
    method: 'POST',
    body: JSON.stringify(deliveryNotePayload),
    isTest: siparis.is_test === true,
  });

  if (!result || !result.id) {
    throw new Error('Lexware Lieferschein oluşturulamadı: API yanıtı geçersiz.');
  }

  let voucherNumber = result.voucherNumber || '';
  if (!voucherNumber && options.finalize !== false) {
    try {
      const fetched = await lexwareFetch<any>(`/v1/delivery-notes/${result.id}`, { isTest: siparis.is_test === true });
      voucherNumber = fetched.voucherNumber || '';
    } catch (e) {}
  }

  const pdfUrl = `https://api.lexwareoffice.de/v1/delivery-notes/${result.id}/document`;

  await supabase
    .from('siparisler')
    .update({
      lexware_delivery_note_id: result.id,
      lexware_delivery_note_no: voucherNumber,
      lexware_delivery_note_pdf_url: pdfUrl
    })
    .eq('id', siparisId);

  return {
    id: result.id,
    voucherNumber,
    pdfUrl
  };
}

/**
 * İrsaliyenin PDF dosyasını indirir.
 */
export async function getLexwareDeliveryNotePdfBuffer(deliveryNoteId: string, isTest: boolean = false): Promise<{ buffer: Buffer; filename: string }> {
  const docInfo = await lexwareFetch<any>(`/v1/delivery-notes/${deliveryNoteId}/document`, { isTest });
  const fileId = docInfo?.documentFileId;

  if (!fileId) {
    throw new Error(`Belge için PDF bulunamadı [ID: ${deliveryNoteId}]`);
  }

  const blob = await lexwareFetch<Blob>(`/v1/files/${fileId}`, {
    isTest,
    headers: {
      Accept: 'application/pdf',
    },
  });

  const arrayBuffer = await blob.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `Lieferschein-${deliveryNoteId}`,
  };
}
