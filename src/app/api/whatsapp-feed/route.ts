import { createSupabaseServiceClient } from '@/lib/supabase/service';

// Force dynamic rendering — no static caching by Next.js
export const dynamic = 'force-dynamic';

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
      const title =
        (prod.ad as Record<string, string> | null)?.de ||
        (prod.ad as Record<string, string> | null)?.en ||
        'Elyson Sweets Product';

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
      const threshold = typeof prod.stok_esigi === 'number' ? prod.stok_esigi : 0;
      const inStock = typeof prod.stok_miktari === 'number' && prod.stok_miktari > threshold;
      const availability = inStock ? 'in stock' : 'out of stock';

      // ── Build <item> ─────────────────────────────────────────────────────────
      xml += `
    <item>
      <g:id>${prod.id}</g:id>
      <g:title><![CDATA[${title}]]></g:title>
      <g:description><![CDATA[${desc}]]></g:description>
      <g:link>https://elysonsweets.de/de/products/${prod.slug ?? ''}</g:link>
      <g:image_link>${prod.ana_resim_url ?? ''}</g:image_link>
      <g:availability>${availability}</g:availability>
      <g:price>0.00 EUR</g:price>
      <g:condition>new</g:condition>
      <g:brand><![CDATA[${prod.hersteller_name ?? 'Elyson Sweets'}]]></g:brand>`;

      if (prod.ean_gtin) {
        xml += `\n      <g:gtin>${prod.ean_gtin}</g:gtin>`;
      } else if (prod.stok_kodu) {
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
