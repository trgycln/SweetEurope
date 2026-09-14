import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Force dynamic rendering — no static caching by Next.js
export const dynamic = 'force-dynamic';

/**
 * Meta flags titles/descriptions that are ALL_CAPS.
 * Detect strings where >80% of letters are uppercase and convert to Title Case.
 */
function normalizeTitle(text: string): string {
  const letters = text.match(/[a-zA-Z]/g) ?? [];
  const uppers  = text.match(/[A-Z]/g) ?? [];
  if (letters.length > 3 && uppers.length / letters.length > 0.8) {
    return text
      .toLowerCase()
      .replace(/\b(\w)/g, (c) => c.toUpperCase());
  }
  return text;
}

/**
 * Validates EAN-8, EAN-13, UPC-12, and GTIN-14 checksum.
 * Meta rejects GTINs with invalid checksums even if the length is correct.
 */
function isValidGtinChecksum(gtin: string): boolean {
  if (!/^\d+$/.test(gtin)) return false;
  const len = gtin.length;
  if (![8, 12, 13, 14].includes(len)) return false;

  // Pad to 14 digits for uniform checksum calculation
  const padded = gtin.padStart(14, '0');
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(padded[i]) * (i % 2 === 0 ? 3 : 1);
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(padded[13]);
}

export async function GET() {
  try {
    // Use service-role client: bypasses RLS, safe for server-only route
    const supabase = createSupabaseServiceClient();

    const { data: products, error } = await supabase
      .from('urunler')
      .select(`id, ad, aciklamalar, slug, ana_resim_url, stok_miktari, stok_esigi, hersteller_name, ean_gtin, stok_kodu, koli_ici_adet, palet_ici_adet, mindest_bestellmenge, mindest_bestellmenge_einheit, zertifikate`)
      .eq('aktif', true);

    if (error) {
      console.error('[whatsapp-feed] Supabase error:', error);
      return new Response(`Database error: ${error.message}`, { status: 500 });
    }

    // ── RSS / Google Base XML header ───────────────────────────────────────────
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Elyson Sweets B2B Catalog</title>
    <link>https://elysonsweets.de</link>
    <description>Elyson Sweets Gastro &amp; Wholesale Product Feed</description>`;

    // ── Product items ──────────────────────────────────────────────────────────
    for (const prod of products ?? []) {
      // ── Image Validation ──────────────────────────────────────────────────────
      // Skip products without an image or pointing to old deprecated storage project
      if (!prod.ana_resim_url || prod.ana_resim_url.includes('atydffkpyvxcmzxyibhj')) {
        continue;
      }

      const rawTitle =
        (prod.ad as Record<string, string> | null)?.de ||
        (prod.ad as Record<string, string> | null)?.en ||
        'Elyson Sweets Product';
      const title = normalizeTitle(rawTitle);

      const baseDesc =
        (prod.aciklamalar as Record<string, string> | null)?.de ||
        (prod.aciklamalar as Record<string, string> | null)?.en ||
        '';

      // ── B2B-enriched description ─────────────────────────────────────────────
      let desc = baseDesc ? `${baseDesc}\n\n` : '';
      desc += `📦 LOGISTIK & VERPACKUNG:\n`;
      if (prod.koli_ici_adet)
        desc += `- Kartoninhalt: ${prod.koli_ici_adet} Stk.\n`;
      if (prod.palet_ici_adet)
        desc += `- Paletteninhalt: ${prod.palet_ici_adet} Stk.\n`;
      if (prod.mindest_bestellmenge)
        desc += `- Mindestbestellmenge: ${prod.mindest_bestellmenge} ${prod.mindest_bestellmenge_einheit ?? 'Stk.'}\n`;

      const certs = prod.zertifikate as string[] | null;
      if (certs && certs.length > 0) {
        desc += `\n🏅 ZERTIFIKATE:\n- ${certs.join(', ')}\n`;
      }

      desc +=
        `\n💼 B2B HINWEIS: Preise variieren je nach Karton-, 5+ Karton- und Palettenabnahme. ` +
        `Für individuelle Partnerpreise senden Sie uns eine Nachricht oder loggen Sie sich im Partnerportal ein.`;

      // ── Availability ─────────────────────────────────────────────────────────
      const stockQty   = typeof prod.stok_miktari === 'number' ? prod.stok_miktari : 0;
      const threshold  = typeof prod.stok_esigi   === 'number' ? prod.stok_esigi   : 0;

      let availability: string;
      let availabilityDate: string | null = null;

      if (stockQty === 0) {
        // Stok sıfır → ön sipariş, teslimat tarihi 24 Eylül 2026
        availability     = 'preorder';
        availabilityDate = '2026-09-24T09:00:00+02:00';
      } else if (stockQty > threshold) {
        availability = 'in stock';
      } else {
        availability = 'out of stock';
      }

      // ── Build <item> ─────────────────────────────────────────────────────────
      xml += `
    <item>
      <g:id>${prod.id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${desc}]]></g:description>
      <g:link>https://elysonsweets.de/de/products/${prod.slug ?? ''}</g:link>
      <g:image_link>${prod.ana_resim_url ?? ''}</g:image_link>
      <g:availability>${availability}</g:availability>${availabilityDate ? `\n      <g:availability_date>${availabilityDate}</g:availability_date>` : ''}
      <g:price>1.00 EUR</g:price>
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${prod.hersteller_name ?? 'Elyson Sweets'}]]></g:brand>`;

      // GTIN: sadece rakam + geçerli uzunluk (EAN-8/UPC-12/EAN-13/EAN-14) + checksum
      const rawGtin = (prod.ean_gtin ?? '').replace(/\D/g, ''); // boşluk/tire temizle
      const isValidGtin = isValidGtinChecksum(rawGtin);

      if (isValidGtin) {
        xml += `\n      <g:gtin>${rawGtin}</g:gtin>`;
      } else if (prod.stok_kodu) {
        // GTIN yoksa/geçersiz checksum varsa SKU'yu MPN olarak bas
        xml += `\n      <g:mpn><![CDATA[${prod.stok_kodu}]]></g:mpn>`;
      }

      xml += `\n    </item>`;
    }

    xml += `\n  </channel>\n</rss>`;

    // ── Return with headers that tell Meta (and CDNs) never to cache ───────────
    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[whatsapp-feed] Unhandled error:', message);
    return new Response(`Error generating feed: ${message}`, { status: 500 });
  }
}
