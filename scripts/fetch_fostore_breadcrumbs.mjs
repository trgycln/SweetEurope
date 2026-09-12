import fs from 'fs';
import * as cheerio from 'cheerio';

async function fetchBreadcrumbs() {
  const mapped = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));
  const fostoreUrls = mapped.map(m => m.fostore_url).filter(Boolean);
  
  // To avoid hammering, just fetch 5 distinct URLs that represent our main product groups.
  const sampleUrls = [];
  const patterns = ['sos', 'surup', 'premium', 'toz', 'frozen'];
  for (const url of fostoreUrls) {
      if (patterns.length > 0 && url.includes(patterns[0])) {
          sampleUrls.push(url);
          patterns.shift();
      }
  }
  // add a few more if missing
  for (const url of fostoreUrls) {
      if (sampleUrls.length < 10 && !sampleUrls.includes(url)) {
          sampleUrls.push(url);
      }
  }

  for (const url of sampleUrls) {
      try {
          const res = await fetch(url);
          const html = await res.text();
          const $ = cheerio.load(html);
          
          const breadcrumbs = [];
          $('.breadcrumb li, .breadcrumbs li, nav[aria-label="breadcrumb"] li, .path li, .bCrumb li').each((i, el) => {
              breadcrumbs.push($(el).text().trim().replace(/>$/, '').trim());
          });
          
          if(breadcrumbs.length === 0) {
              // Try another generic selector for FO Store
              $('.container .row a').each((i, el) => {
                  const text = $(el).text().trim();
                  if(text && text.length > 2) breadcrumbs.push(text);
              });
          }
          
          console.log(`\nURL: ${url}`);
          // Look at script tags with json-ld which might have breadcrumbs
          let jsonLdBreadcrumbs = [];
          $('script[type="application/ld+json"]').each((i, el) => {
              try {
                  const data = JSON.parse($(el).html());
                  if(data['@type'] === 'BreadcrumbList') {
                      jsonLdBreadcrumbs = data.itemListElement.map(item => item.name || item.item.name);
                  }
              } catch(e) {}
          });
          if (jsonLdBreadcrumbs.length > 0) {
              console.log('JSON-LD Breadcrumbs:', jsonLdBreadcrumbs.join(' > '));
          } else {
              // Filter and clean html breadcrumbs
              console.log('HTML Breadcrumbs:', breadcrumbs.slice(0, 5).join(' > '));
          }
      } catch(e) {
          console.log(`Failed to fetch ${url}: ${e.message}`);
      }
  }
}

fetchBreadcrumbs();
