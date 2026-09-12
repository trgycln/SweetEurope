import fs from 'fs';
import * as cheerio from 'cheerio';

async function extractCategories() {
  const mapped = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));
  
  const categoryMap = new Map();
  const fostoreCategories = new Set();
  
  // We'll just fetch a few to see the breadcrumbs or we can look at the URL structure
  for (const item of mapped) {
    if (item.fostore_url) {
      // url example: https://fostore.com/mango-meyveli-surup---premium-700-ml
      // Fostore URLs don't seem to have category in the path. Let's fetch one to check breadcrumbs.
      break;
    }
  }

  // Instead of fetching all 90, let's group by our current proforma names and see if we can do better.
  const groups = {};
  for(const item of mapped) {
      const name = item.proforma_name;
      // categorize based on keywords
      let cat = "Diğer";
      if(name.includes('FRUITED SAUCE') || name.includes('FRUIT SAUCE')) cat = "Meyveli Soslar 1 KG";
      else if(name.includes('SAUCE') && name.includes('PREMIUM')) cat = "Premium Soslar 2.5 KG";
      else if(name.includes('SAUCE')) cat = "Cafe Bar Sosları";
      else if(name.includes('SYRUP') && name.includes('PREMIUM')) cat = "Premium Şuruplar 700 ML";
      else if(name.includes('SYRUP')) cat = "Kokteyl Şurupları 700 ML";
      else if(name.includes('POWDER')) cat = "Toz İçecekler";
      else if(name.includes('DRINK') && name.includes('MIX')) cat = "İçecek Karışımları";
      else if(name.includes('DRINK') || name.includes('BASE')) cat = "İçecek Bazları";
      else if(name.includes('FOAMER')) cat = "Barmen Ekipmanları / Foamer";

      if(!groups[cat]) groups[cat] = [];
      groups[cat].push(name);
  }
  
  console.log("Current grouping based on Proforma Names:");
  for(const [cat, names] of Object.entries(groups)) {
      console.log(`\n--- ${cat} (${names.length}) ---`);
      console.log(names.slice(0, 3).join('\n') + (names.length > 3 ? `\n... and ${names.length - 3} more` : ''));
  }
}

extractCategories();
