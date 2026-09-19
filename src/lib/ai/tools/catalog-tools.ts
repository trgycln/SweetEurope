import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { sendAdminEmail, sendCustomerEmail } from '@/lib/email';
import { TieredQuoteResult, SampleKitResult } from '../types';

/**
 * Search products in Supabase catalog
 */
export async function searchProducts(query: string, limit: number = 5) {
  try {
    const supabase = createSupabaseServiceClient();
    const cleanQuery = query.trim().toLowerCase();

    const { data: products, error } = await supabase
      .from('urunler')
      .select('id, slug, ad, aciklamalar, satis_fiyati_musteri, satis_fiyati_toptanci, koli_ici_adet, palet_ici_adet, stok_miktari, ana_resim_url, stok_kodu, ean_gtin')
      .eq('aktif', true);

    if (error || !products) {
      return { success: false, error: error?.message || 'Failed to search' };
    }

    // Filter in JS across multi-lang ad and aciklamalar (multi-word search)
    const queryTerms = cleanQuery.split(/\s+/).filter(Boolean);
    const matches = products.filter((p) => {
      const adStr = JSON.stringify(p.ad || '').toLowerCase();
      const descStr = JSON.stringify(p.aciklamalar || '').toLowerCase();
      const slugStr = (p.slug || '').toLowerCase();
      const stokKoduStr = (p.stok_kodu || '').toLowerCase();
      const eanGtinStr = (p.ean_gtin || '').toLowerCase();
      
      const searchTarget = `${adStr} ${descStr} ${slugStr} ${stokKoduStr} ${eanGtinStr}`;
      
      return queryTerms.every(term => searchTarget.includes(term));
    }).slice(0, limit);

    return {
      success: true,
      count: matches.length,
      products: matches.map((p) => {
        const titleDe = (p.ad as Record<string, string>)?.de || (p.ad as Record<string, string>)?.tr || '';
        return {
          id: p.id,
          slug: p.slug,
          name: titleDe,
          casePriceNet: (p.satis_fiyati_musteri || 0) * (p.koli_ici_adet || 1),
          tierPriceNet: (p.satis_fiyati_toptanci || 0) * (p.koli_ici_adet || 1),
          unitsPerCase: p.koli_ici_adet || 6,
          unitsPerPallet: p.palet_ici_adet || 240,
          inStock: (p.stok_miktari ?? 0) > 0,
          imageUrl: p.ana_resim_url,
        };
      }),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Get detailed specifications of a specific product by slug or ID
 */
export async function getProductDetails(slugOrId: string) {
  try {
    const supabase = createSupabaseServiceClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    let query = supabase.from('urunler').select('*');
    if (isUuid) {
      query = query.eq('id', slugOrId);
    } else {
      query = query.eq('slug', slugOrId);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      return { success: false, error: 'Product not found' };
    }

    const titleDe = (data.ad as Record<string, string>)?.de || (data.ad as Record<string, string>)?.tr || '';
    const descDe = (data.aciklamalar as Record<string, string>)?.de || (data.aciklamalar as Record<string, string>)?.tr || '';

    return {
      success: true,
      product: {
        // Inject raw database fields first
        ...data,
        // Essential mapped fields for prompt
        id: data.id,
        slug: data.slug,
        name: titleDe,
        description: descDe,
        singleCasePriceNet: (data.satis_fiyati_musteri || 0) * (data.koli_ici_adet || 1),
        fivePlusCasePriceNet: (data.satis_fiyati_toptanci || 0) * (data.koli_ici_adet || 1),
        palletPriceNet: (data.satis_fiyati_palet || 0) * (data.koli_ici_adet || 1),
        unitsPerCase: data.koli_ici_adet || 6,
        palletCases: data.palet_ici_adet ? Math.round(data.palet_ici_adet / (data.koli_ici_adet || 6)) : 40,
        stockStatus: (data.stok_miktari ?? 0) > 0 ? 'in_stock' : 'preorder',
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Calculate B2B tiered quote with upselling opportunity
 */
export async function calculateB2BPricing(slugOrId: string, cases: number): Promise<TieredQuoteResult | { error: string }> {
  try {
    const details = await getProductDetails(slugOrId);
    if (!details.success || !details.product) {
      return { error: 'Product not found' };
    }

    const p = details.product;
    const requestedCases = Math.max(1, Math.round(cases));
    const unitsPerCase = p.unitsPerCase || 6;
    const singlePrice = Number(p.singleCasePriceNet) || 24; // fallback standard case net
    const tierPrice = Number(p.fivePlusCasePriceNet) || singlePrice * 0.9; // 10% volume discount fallback
    const palletPrice = Number(p.palletPriceNet) || tierPrice * 0.9; // pallet discount fallback

    const isFivePlus = requestedCases >= 5;
    const activeCasePrice = isFivePlus ? tierPrice : singlePrice;
    const totalNet = Math.round(activeCasePrice * requestedCases * 100) / 100;
    const mwstPercent = 7; // German Food VAT
    const totalGross = Math.round(totalNet * 1.07 * 100) / 100;

    let upsellOpportunity: TieredQuoteResult['upsellOpportunity'] | undefined;
    if (requestedCases >= 2 && requestedCases < 5) {
      const needed = 5 - requestedCases;
      const nextTotalNet = Math.round(tierPrice * 5 * 100) / 100;
      const savingsPct = Math.round(((singlePrice - tierPrice) / singlePrice) * 100);

      upsellOpportunity = {
        nextTierName: '5+ Karton Staffelpreis',
        requiredCases: 5,
        additionalCasesNeeded: needed,
        nextCasePriceNet: tierPrice,
        nextTotalNet,
        potentialSavingsPercent: savingsPct,
        messagePrompt: `Nur noch ${needed} Karton(s) bis zur 5er-Staffel! Statt ${singlePrice.toFixed(2)} € zahlen Sie dann nur ${tierPrice.toFixed(2)} € netto pro Karton (ca. ${savingsPct}% Ersparnis).`,
      };
    }

    return {
      productId: p.id,
      productName: p.name,
      requestedCases,
      unitsPerCase,
      totalUnits: requestedCases * unitsPerCase,
      singleCasePriceNet: singlePrice,
      recommendedTier: {
        tierName: isFivePlus ? '5+ Kartons (Volumenrabatt)' : '1-4 Kartons (Standard B2B)',
        casePriceNet: activeCasePrice,
        totalNet,
        mwstPercent,
        totalGross,
        savingsEur: isFivePlus ? Math.round((singlePrice - tierPrice) * requestedCases * 100) / 100 : undefined,
      },
      upsellOpportunity,
      palletOption: {
        casesPerPallet: p.palletCases || 40,
        palletCasePriceNet: palletPrice,
        palletTotalNet: Math.round(palletPrice * (p.palletCases || 40) * 100) / 100,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { error: msg };
  }
}

/**
 * Strictly check sample kit eligibility (Köln & Bonn only, direct handover)
 */
export function checkSampleKitEligibility(city: string, postalCode?: string): SampleKitResult {
  const normalized = city.trim().toLowerCase();
  const isCologne = normalized.includes('köln') || normalized.includes('koeln') || normalized.includes('cologne');
  const isBonn = normalized.includes('bonn');

  if (isCologne || isBonn) {
    return {
      eligible: true,
      city: isCologne ? 'Köln' : 'Bonn',
      message: 'Ihr Betrieb liegt in unserem Kerngebiet (Köln/Bonn)! Unser Außendienstteam übergibt Ihnen gerne ein kostenloses B2B-Musterpaket persönlich vor Ort.',
    };
  }

  return {
    eligible: false,
    city,
    message: 'Unsere kostenlosen B2B-Verkostungspakete übergeben wir derzeit ausschließlich persönlich vor Ort an Gastronomiebetriebe im Raum Köln und Bonn (kein Paketversand für Proben). Für Betriebe außerhalb dieser Region bieten wir die flexible Möglichkeit, Sorten ab 1 Karton (Mindestmenge) direkt im Shop zu bestellen, um sie im regulären Bar-/Cafébetrieb zu testen.',
  };
}

/**
 * Get all categories
 */
export async function getCategories() {
  try {
    const supabase = createSupabaseServiceClient();
    const { data, error } = await supabase.from('kategoriler').select('*').order('sira');
    
    if (error || !data) {
      return { success: false, error: 'Failed to fetch categories' };
    }

    return {
      success: true,
      categories: data.map(c => ({
        id: c.id,
        name: (c.ad as any)?.de || (c.ad as any)?.tr,
        slug: c.slug,
        level: (c as any).seviye || 1,
        parentId: c.ust_kategori_id
      }))
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}

/**
 * Creates a draft order based on AI chat conversation
 */
export async function createDraftOrder(params: {
  companyName: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  items: { slugOrId: string; cases: number }[];
}) {
  try {
    const supabase = createSupabaseServiceClient();

    // 1. Try to find the company by email or taxId
    let firmaId: string | undefined = undefined;
    
    if (params.email) {
      const { data: existingByEmail } = await supabase.from('firmalar').select('id').eq('email', params.email).maybeSingle();
      if (existingByEmail) firmaId = existingByEmail.id;
    }
    
    if (!firmaId && params.taxId) {
      const { data: existingByTax } = await supabase.from('firmalar').select('id').eq('vergi_no', params.taxId).maybeSingle();
      if (existingByTax) firmaId = existingByTax.id;
    }

    // 2. If no company found, create a placeholder "Guest" company
    if (!firmaId) {
      const { data: newFirma, error: firmaError } = await supabase.from('firmalar').insert({
        unvan: params.companyName,
        email: params.email,
        telefon: params.phone || null,
        adres: params.address || null,
        vergi_no: params.taxId || null,
        status: 'Aday',
        iskonto_orani: 0,
      }).select('id').single();

      if (firmaError) {
        return { success: false, error: 'Failed to register company details. Error: ' + firmaError.message };
      }
      firmaId = newFirma.id;
    }

    // 3. Resolve products and calculate prices
    let totalNet = 0;
    const orderItemsToInsert: any[] = [];

    for (const item of params.items) {
      const details = await getProductDetails(item.slugOrId);
      if (!details.success || !details.product) continue;
      
      const p = details.product;
      const requestedCases = Math.max(1, Math.round(item.cases));
      
      const isFivePlus = requestedCases >= 5;
      const singlePrice = Number(p.singleCasePriceNet) || 0;
      const tierPrice = Number(p.fivePlusCasePriceNet) || singlePrice;
      const activeCasePrice = isFivePlus ? tierPrice : singlePrice;
      
      const lineTotal = activeCasePrice * requestedCases;
      totalNet += lineTotal;

      orderItemsToInsert.push({
        urun_id: p.id,
        miktar: requestedCases,
        birim_fiyat: activeCasePrice,
        toplam_fiyat: lineTotal,
      });
    }

    if (orderItemsToInsert.length === 0) {
      return { success: false, error: 'Could not resolve any valid products' };
    }

    const totalGross = Math.round((totalNet * 1.07) * 100) / 100;

    // 4. Create Order (siparisler)
    const { data: newOrder, error: orderError } = await supabase.from('siparisler').insert({
      firma_id: firmaId,
      siparis_durumu: 'Taslak',
      siparis_kaynagi: null,
      toplam_tutar_net: totalNet,
      toplam_tutar_brut: totalGross,
      kdv_orani: 7,
      teslimat_adresi: params.address || null,
      siparis_tarihi: new Date().toISOString(),
    }).select('id').single();

    if (orderError || !newOrder) {
      return { success: false, error: 'Failed to create order record' };
    }

    // 5. Insert Order Items (siparis_detay)
    const itemsWithOrderId = orderItemsToInsert.map(i => ({
      ...i,
      siparis_id: newOrder.id,
    }));

    const { error: itemsError } = await supabase.from('siparis_detay').insert(itemsWithOrderId);
    if (itemsError) {
      console.error('Order items error:', itemsError);
    }

    // 6. Send emails (fire-and-forget, non-blocking)
    const orderRef = `ELY-${newOrder.id.slice(0, 8).toUpperCase()}`;
    const itemsSummaryHtml = orderItemsToInsert
      .map(i => `<tr><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0">${i.urun_id}</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:center">${i.miktar} Koli</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right">${i.birim_fiyat.toFixed(2)} € netto</td><td style="padding:6px 8px;border-bottom:1px solid #f0f0f0;text-align:right">${i.toplam_fiyat.toFixed(2)} €</td></tr>`)
      .join('');

    // Admin notification
    sendAdminEmail({
      subject: `🛒 Yeni B2B Sipariş (AI Chat) — ${params.companyName} — ${orderRef}`,
      replyTo: params.email,
      html: `
<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f4f5;padding:24px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;border:1px solid #e5e7eb">
  <h2 style="color:#0f172a;margin:0 0 8px">🛒 Yeni AI Chat Siparişi</h2>
  <p style="color:#6b7280;margin:0 0 24px;font-size:14px">Bu sipariş web sitesindeki yapay zeka asistanı üzerinden alınmıştır.</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px">
    <tr><td style="padding:5px 0;font-weight:600;width:140px">Sipariş No:</td><td><strong>${orderRef}</strong></td></tr>
    <tr><td style="padding:5px 0;font-weight:600">Firma:</td><td>${params.companyName}</td></tr>
    <tr><td style="padding:5px 0;font-weight:600">E-posta:</td><td><a href="mailto:${params.email}">${params.email}</a></td></tr>
    ${params.phone ? `<tr><td style="padding:5px 0;font-weight:600">Telefon:</td><td>${params.phone}</td></tr>` : ''}
    ${params.address ? `<tr><td style="padding:5px 0;font-weight:600">Adres:</td><td>${params.address}</td></tr>` : ''}
    ${params.taxId ? `<tr><td style="padding:5px 0;font-weight:600">USt-IdNr:</td><td>${params.taxId}</td></tr>` : ''}
    <tr><td style="padding:5px 0;font-weight:600">Net Toplam:</td><td><strong>${totalNet.toFixed(2)} €</strong></td></tr>
    <tr><td style="padding:5px 0;font-weight:600">Brüt Toplam:</td><td><strong>${totalGross.toFixed(2)} € (inkl. 7% MwSt)</strong></td></tr>
  </table>
  <p style="font-size:13px;color:#6b7280">⚠️ Müşteriye Proforma fatura hazırlayıp gönderin. Ödeme sonrası siparişi onaylayın.</p>
</div>
</body></html>`,
    }).catch(console.error);

    // In-app admin notification
    import('@/lib/notificationUtils').then(({ sendNotification }) => {
      sendNotification({
        aliciRol: ['Yönetici', 'Personel', 'Ekip Üyesi'] as any,
        icerik: `🛒 AI Chat'ten yeni sipariş: ${params.companyName} (${totalGross.toFixed(2)} €)`,
        link: '/admin/operasyon/siparisler',
        preferenceKey: 'order_updates',
        supabaseClient: supabase as any,
      }).catch(console.error);
    }).catch(console.error);

    // Customer confirmation
    if (params.email) {
      sendCustomerEmail({
        to: params.email,
        subject: `Ihre Bestellanfrage bei Elyson Sweets – ${orderRef}`,
        html: `
<!DOCTYPE html><html lang="de"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;padding:40px 16px;margin:0">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);border:1px solid #e2e8f0">
  <div style="background:#0f172a;padding:32px;text-align:center;border-bottom:3px solid #16a34a">
    <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;letter-spacing:2px">ELYSON SWEETS</h1>
    <p style="color:#94a3b8;margin:6px 0 0;font-size:12px;letter-spacing:1.5px;text-transform:uppercase">B2B Großhandel</p>
  </div>
  <div style="padding:36px 32px">
    <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px">Sehr geehrtes Team von ${params.companyName},</h2>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px">vielen Dank für Ihre Bestellanfrage über unser B2B-Beratungssystem. Ihre Anfrage wurde erfolgreich in unserem System erfasst.</p>
    
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:24px">
      <p style="margin:0;font-size:14px;font-weight:700;color:#166534">Auftrags-Referenz: ${orderRef}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
      <thead><tr style="background:#f8fafc">
        <th style="padding:8px;text-align:left;border-bottom:2px solid #e2e8f0;color:#334155">Position</th>
        <th style="padding:8px;text-align:center;border-bottom:2px solid #e2e8f0;color:#334155">Menge</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;color:#334155">Einzelpreis</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #e2e8f0;color:#334155">Gesamt</th>
      </tr></thead>
      <tbody>${itemsSummaryHtml}</tbody>
      <tfoot>
        <tr><td colspan="3" style="padding:8px;text-align:right;font-weight:600">Netto:</td><td style="padding:8px;text-align:right;font-weight:600">${totalNet.toFixed(2)} €</td></tr>
        <tr><td colspan="3" style="padding:8px;text-align:right;color:#6b7280">MwSt (7%):</td><td style="padding:8px;text-align:right;color:#6b7280">${(totalGross - totalNet).toFixed(2)} €</td></tr>
        <tr style="background:#f0fdf4"><td colspan="3" style="padding:10px 8px;text-align:right;font-weight:700;font-size:16px">Gesamt (brutto):</td><td style="padding:10px 8px;text-align:right;font-weight:700;font-size:16px;color:#166534">${totalGross.toFixed(2)} €</td></tr>
      </tfoot>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px">
      <h3 style="margin:0 0 12px;font-size:13px;text-transform:uppercase;letter-spacing:1px;color:#334155">Bankverbindung für Vorkasse-Zahlung</h3>
      <table style="width:100%;font-size:14px;border-collapse:collapse">
        <tr><td style="padding:4px 0;color:#6b7280;width:140px">Kontoinhaber:</td><td style="font-weight:600">Elyson Sweets GmbH</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Bank:</td><td style="font-weight:600">Qonto</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">IBAN:</td><td style="font-weight:700;font-family:monospace;letter-spacing:1px">DE44 1001 0123 3494 5712 22</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">BIC/SWIFT:</td><td style="font-weight:600">QNTODEB2XXX</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Verwendungszweck:</td><td style="font-weight:700;color:#166534">${orderRef} / ${params.companyName}</td></tr>
      </table>
    </div>

    <p style="color:#475569;line-height:1.7;margin:0 0 8px">Sobald Ihr Zahlungseingang bei uns bestätigt wurde, wird Ihre Ware umgehend für den Versand vorbereitet. Die Lieferung erfolgt in der Regel <strong>innerhalb von 2–3 Werktagen</strong> nach Zahlungseingang.</p>
    <p style="color:#475569;line-height:1.7;margin:0 0 24px">Unser Team wird Ihnen zeitnah die offizielle Proforma-Rechnung zusenden. Bei Fragen stehen wir Ihnen jederzeit unter <a href="mailto:info@elysonsweets.de" style="color:#0f172a;font-weight:600">info@elysonsweets.de</a> oder <strong>+49 2203 9899714</strong> zur Verfügung.</p>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:24px">
      <p style="margin:0;font-size:13px;color:#92400e">💡 <strong>Tipp:</strong> Registrieren Sie sich kostenlos auf unserem B2B-Portal, um Ihre Bestellungen zu verwalten, Rechnungen einzusehen und Ihre individuellen Staffelpreise jederzeit abzurufen: <a href="https://elysonsweets.de" style="color:#92400e">elysonsweets.de</a></p>
    </div>

    <p style="color:#475569;margin:0">Mit freundlichen Grüßen,<br><strong>Ihr Elyson Sweets Vertriebsteam</strong></p>
  </div>
  <div style="background:#f1f5f9;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0">
    <p style="font-size:12px;color:#64748b;margin:0">Elyson Sweets GmbH • Wiesenstraße 21, 51147 Köln • <a href="mailto:info@elysonsweets.de" style="color:#64748b">info@elysonsweets.de</a></p>
  </div>
</div>
</body></html>`,
      }).catch(console.error);
    }

    // Return success summary
    return {
      success: true,
      orderId: newOrder.id,
      orderRef,
      message: 'Order draft created and confirmation emails sent.',
      totalNet,
      totalGross,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}
