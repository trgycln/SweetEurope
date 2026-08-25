import { KOLN_PLZ_MAP } from './plzLookup';

export interface ShippingCalculationResult {
  isKolnArea: boolean;
  shippingCost: number;
  freeShippingThreshold: number;
  isFreeShipping: boolean;
  shippingMethodName: string;
  description: string;
}

/**
 * Checks if a given German postal code (PLZ) is within the Cologne / Rheinland local delivery area.
 */
export function isKolnArea(plz?: string | null): boolean {
  if (!plz) return false;
  const cleanPlz = plz.trim();
  
  // 1. Direct match in detailed map
  if (KOLN_PLZ_MAP[cleanPlz]) return true;
  
  // 2. Cologne and surrounding region PLZ prefixes (50xxx, 51xxx)
  if (cleanPlz.startsWith('50') || cleanPlz.startsWith('51')) {
    return true;
  }
  
  return false;
}

/**
 * Calculates shipping cost based on the delivery address PLZ and the order total.
 * 
 * B2B Logic:
 * - Cologne & Direct Surroundings (50xxx, 51xxx):
 *   - Local Direct Courier / Eigene Lieferflotte
 *   - Free shipping for orders above 150 € net. Otherwise 15 € flat local delivery.
 * - Rest of Germany (Almanya Geneli):
 *   - Freight / Spedition / Paketversand
 *   - Free shipping for orders above 400 € net (or pallet limit). Otherwise 29 € standard freight.
 */
export function calculateShipping(
  orderSubtotalNet: number,
  plz?: string | null
): ShippingCalculationResult {
  const inKoln = isKolnArea(plz);

  if (inKoln) {
    const freeThreshold = 150;
    const isFree = orderSubtotalNet >= freeThreshold;
    return {
      isKolnArea: true,
      shippingCost: isFree ? 0 : 15.0,
      freeShippingThreshold: freeThreshold,
      isFreeShipping: isFree,
      shippingMethodName: 'Köln & Umgebung Direktauslieferung',
      description: isFree 
        ? 'Kostenlose Lieferung (ab 150 € Bestellwert in Köln & Umgebung)' 
        : 'Lokale Zustellpauschale Köln & Umgebung: 15,00 €',
    };
  }

  // Rest of Germany
  const freeThreshold = 400;
  const isFree = orderSubtotalNet >= freeThreshold;
  return {
    isKolnArea: false,
    shippingCost: isFree ? 0 : 29.0,
    freeShippingThreshold: freeThreshold,
    isFreeShipping: isFree,
    shippingMethodName: 'Standard Spedition / Paket (Deutschlandweit)',
    description: isFree
      ? 'Kostenloser Versand deutschlandweit (ab 400 € Bestellwert)'
      : 'Speditions- & Frachtpauschale: 29,00 €',
  };
}
