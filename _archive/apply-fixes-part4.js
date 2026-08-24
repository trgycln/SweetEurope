const fs = require('fs');
const p = 'src/components/portal/katalog/PortalUrunDetay.tsx';
let c = fs.readFileSync(p, 'utf8');
if (!c.includes('computeTedarikDurumu')) {
    c = c.replace(/getLocalizedName, formatCurrency } from/, 'getLocalizedName, formatCurrency, computeTedarikDurumu } from');
}
c = c.replace(/toast\.error\("Dieses Produkt ist ausverkauft\."\);/g, 'toast.error(locale === "de" ? "Dieses Produkt ist nicht auf Lager." : "Stokta yok.");');
fs.writeFileSync(p, c, 'utf8');
