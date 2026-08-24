const fs = require('fs');
const path = 'src/components/portal/katalog/PortalUrunDetay.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes('computeTedarikDurumu')) {
    content = content.replace('getLocalizedName, formatCurrency } from', 'getLocalizedName, formatCurrency, computeTedarikDurumu } from');
}

const oldStr =     if (currentMenge <= 0) {
        status = { text: content.availabilityOutOfStock || "Ausverkauft", color: "text-red-600", icon: <FiXCircle /> };
    } else if (currentMenge <= warnSchwelle) {
        status = { text: content.availabilityLowStock || "Wenig Bestand", color: "text-yellow-600", icon: <FiAlertTriangle /> };
    } else {
        status = { text: content.availabilityInStock || "Auf Lager", color: "text-green-600", icon: <FiCheckCircle /> };
    };

const newStr =     const durum = computeTedarikDurumu(currentMenge, (urun as any).stok_tukenme_tarihi);
    if (durum === 'talep_uzerine') {
        status = { text: locale === 'de' ? 'Bestellartikel' : 'Özel Sipariş', color: "text-violet-600", icon: <FiAlertTriangle /> };
    } else if (durum === 'tukendi') {
        status = { text: locale === 'de' ? 'Nicht auf Lager' : 'Stokta yok', color: "text-red-600", icon: <FiXCircle /> };
    } else if (currentMenge <= warnSchwelle) {
        status = { text: content.availabilityLowStock || "Wenig Bestand", color: "text-yellow-600", icon: <FiAlertTriangle /> };
    } else {
        status = { text: content.availabilityInStock || "Auf Lager", color: "text-green-600", icon: <FiCheckCircle /> };
    };

content = content.replace(oldStr, newStr);
content = content.replace('toast.error("Dieses Produkt ist ausverkauft.");', 'toast.error(locale === "de" ? "Dieses Produkt ist nicht auf Lager." : "Stokta yok.");');

fs.writeFileSync(path, content, 'utf8');
console.log("Updated PortalUrunDetay.tsx");
