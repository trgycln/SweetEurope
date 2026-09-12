import fs from 'fs';

const items = JSON.parse(fs.readFileSync('data/canonical_triangulation_90.json', 'utf8'));

const groups = {};
for (const item of items) {
  const name = item.proforma_name.toUpperCase();
  let grp = 'OTHER';
  if (name.includes('SAUCE') || name.includes('SOS')) {
    if (name.includes('FRUIT') || name.includes('MEYVELI')) grp = 'FRUITED_SAUCE';
    else if (name.includes('TOPPING') || name.includes('DEKOR')) grp = 'TOPPING_SAUCE';
    else grp = 'BAR_SAUCE';
  } else if (name.includes('SYRUP') || name.includes('SURUP')) {
    if (name.includes('PREMIUM')) grp = 'PREMIUM_SYRUP';
    else grp = 'COCKTAIL_SYRUP';
  } else if (name.includes('DRINK') || name.includes('POWDER') || name.includes('BASE')) {
    grp = 'DRINK_BASE';
  } else if (name.includes('FOAMER')) {
    grp = 'FOAMER';
  }
  groups[grp] = (groups[grp] || 0) + 1;
}

console.log('Group distribution for 90 products:');
console.log(groups);
