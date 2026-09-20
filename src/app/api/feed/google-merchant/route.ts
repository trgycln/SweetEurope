import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch active products with categories
    const { data: urunler, error } = await supabase
      .from('urunler')
      .select('*, kategoriler(ad, slug)')
      .eq('aktif', true);

    if (error) {
      console.error('Error fetching products for feed:', error);
      return new NextResponse('Error fetching products', { status: 500 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://elysonsweets.de';

    const escapeXml = (unsafe: any) => {
      if (unsafe === null || unsafe === undefined) return '';
      const str = String(unsafe);
      return str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '&': return '&amp;';
          case '\'': return '&apos;';
          case '"': return '&quot;';
          default: return c;
        }
      });
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Elyson Sweets - Offizieller Produkt-Katalog</title>
    <link>${siteUrl}</link>
    <description>Premium Lokum, Baklava, Barsaucen und Kaffeesirupe</description>
`;

    for (const urun of urunler) {
      const title = urun.ad?.de || urun.ad?.tr || urun.ad?.en || 'Produkttitel';
      const baseDesc = urun.aciklamalar?.de || urun.aciklamalar?.tr || '';
      const price = urun.satis_fiyati_musteri || 0;
      const link = `${siteUrl}/de/products/${urun.slug}`;
      const imageLink = urun.ana_resim_url || '';
      const availability = (urun.stok_miktari === null || urun.stok_miktari > 0) ? 'in_stock' : 'out_of_stock';
      const brand = urun.hersteller_name || 'Elyson Sweets';
      const gtin = urun.ean_gtin ? `<g:gtin>${escapeXml(urun.ean_gtin)}</g:gtin>` : '';
      const mpn = urun.stok_kodu ? `<g:mpn>${escapeXml(urun.stok_kodu)}</g:mpn>` : '';
      const productType = urun.kategoriler?.ad?.de || '';

      // 1. Özellikler ve Etiketler (Vegan, Glutenfrei, vs.)
      const badges: string[] = [];
      const tech = urun.teknik_ozellikler || {};
      if (tech.vegan) badges.push('Vegan');
      if (tech.vegetarisch) badges.push('Vegetarisch');
      if (tech.glutenfrei) badges.push('Glutenfrei');
      if (tech.laktosefrei) badges.push('Laktosefrei');
      if (tech.ohne_zucker) badges.push('Ohne Zuckerzusatz');
      if (tech.bio) badges.push('Bio');
      if (tech.katkisiz) badges.push('Ohne Zusatzstoffe');
      if (tech.koruyucusuz) badges.push('Ohne Konservierungsstoffe');
      if (tech.dogal_icerik) badges.push('100% Natürlich');

      // 2. İçindekiler (Inhaltsstoffe)
      let ingredientsText = '';
      if (urun.inhaltsstoffe) {
        if (typeof urun.inhaltsstoffe === 'string') {
          ingredientsText = urun.inhaltsstoffe;
        } else if (urun.inhaltsstoffe.de) {
          ingredientsText = urun.inhaltsstoffe.de;
        } else if (urun.inhaltsstoffe.tr) {
          ingredientsText = urun.inhaltsstoffe.tr;
        }
      }

      // 3. Alerjenler (Allergene)
      const allergenList: string[] = [];
      if (urun.allergene && typeof urun.allergene === 'object') {
        const allergenMap: Record<string, string> = {
          milch: 'Milch (Laktose)',
          gluten: 'Glutenhaltiges Getreide',
          eier: 'Eier',
          soja: 'Soja',
          nuesse: 'Schalenfrüchte / Nüsse',
          schalen: 'Schalenfrüchte',
          sesam: 'Sesam',
          erdnuesse: 'Erdnüsse',
          sulfite: 'Schwefeldioxid / Sulfite',
          sellerie: 'Sellerie',
          senf: 'Senf',
          lupinen: 'Lupinen',
          fisch: 'Fisch',
        };
        for (const [key, val] of Object.entries(urun.allergene)) {
          if (val === true && allergenMap[key]) {
            allergenList.push(allergenMap[key]);
          }
        }
      }

      // 4. Besin Değerleri (Nährwerte)
      let nutritionText = '';
      const nw = urun.naehrwerte?.pro_100g || urun.naehrwerte?.pro_100ml;
      if (nw) {
        const parts: string[] = [];
        if (nw.energie_kj || nw.energie_kcal) {
          parts.push(`Energie: ${nw.energie_kj ? nw.energie_kj + ' kJ / ' : ''}${nw.energie_kcal || ''} kcal`);
        }
        if (nw.fett !== undefined && nw.fett !== null) parts.push(`Fett: ${nw.fett}g (davon gesättigte Fettsäuren: ${nw.davon_gesaettigt || 0}g)`);
        if (nw.kohlenhydrate !== undefined && nw.kohlenhydrate !== null) parts.push(`Kohlenhydrate: ${nw.kohlenhydrate}g (davon Zucker: ${nw.davon_zucker || 0}g)`);
        if (nw.eiweiss !== undefined && nw.eiweiss !== null) parts.push(`Eiweiß: ${nw.eiweiss}g`);
        if (nw.salz !== undefined && nw.salz !== null) parts.push(`Salz: ${nw.salz}g`);
        if (parts.length > 0) {
          nutritionText = parts.join(' | ');
        }
      }

      // 5. Kapsamlı Zengin Almanca Açıklama İnşası (Google Merchant Description)
      let fullDescription = baseDesc ? `${baseDesc}\n\n` : '';
      if (badges.length > 0) {
        fullDescription += `Produkteigenschaften: ${badges.join(', ')}\n`;
      }
      if (ingredientsText) {
        fullDescription += `Zutaten: ${ingredientsText}\n`;
      }
      if (allergenList.length > 0) {
        fullDescription += `Allergene: Enthält ${allergenList.join(', ')}\n`;
      } else if (tech.glutenfrei && tech.laktosefrei) {
        fullDescription += `Allergene: Glutenfrei und Laktosefrei\n`;
      }
      if (nutritionText) {
        fullDescription += `Nährwerte pro 100g/ml: ${nutritionText}\n`;
      }
      if (urun.haltbarkeit_monate) {
        fullDescription += `Mindesthaltbarkeit: ${urun.haltbarkeit_monate} Monate ab Herstellung.\n`;
      }
      if (urun.agirlik_kg) {
        fullDescription += `Nettogewicht: ${urun.agirlik_kg} kg.\n`;
      }

      // Galeri resimleri
      let extraImagesXml = '';
      if (Array.isArray(urun.galeri_resim_urls) && urun.galeri_resim_urls.length > 0) {
        for (const img of urun.galeri_resim_urls.slice(0, 5)) {
          if (img && img !== imageLink) {
            extraImagesXml += `\n      <g:additional_image_link>${escapeXml(img)}</g:additional_image_link>`;
          }
        }
      }

      // Ağırlık bilgisi
      const weightXml = urun.agirlik_kg ? `<g:shipping_weight>${urun.agirlik_kg} kg</g:shipping_weight>` : '';
      const countryXml = `<g:country_of_origin>TR</g:country_of_origin>`;
      const customLabel0 = badges.length > 0 ? `<g:custom_label_0>${escapeXml(badges.slice(0, 3).join(', '))}</g:custom_label_0>` : '';
      const customLabel1 = productType ? `<g:custom_label_1>${escapeXml(productType)}</g:custom_label_1>` : '';

      xml += `
    <item>
      <g:id>${urun.id}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(fullDescription.trim())}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>${extraImagesXml}
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price.toFixed(2)} EUR</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      ${gtin}
      ${mpn}
      ${productType ? `<g:product_type>${escapeXml(productType)}</g:product_type>` : ''}
      ${weightXml}
      ${countryXml}
      ${customLabel0}
      ${customLabel1}
    </item>`;
    }

    xml += `
  </channel>
</rss>`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate',
      },
    });
  } catch (error) {
    console.error('Comprehensive feed generation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
