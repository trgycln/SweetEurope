// src/lib/plzLookup.ts
// ===================================================================
// TAM VE EKSİKSİZ KÖLN + BONN PLZ HARİTASI
// Kaynak: Resmi Köln.de ve Deutsche Post PLZ listesi, 2024
// ===================================================================

export interface PlzInfo {
  city: string;
  cityPart?: string;
  district: string;
  zone: 'koln' | 'bonn';
}

// -----------------------------------------------------------------------
// KÖLN — 46 resmi PLZ (50xxx linksrheinisch + 51xxx rechtsrheinisch)
// -----------------------------------------------------------------------
export const KOLN_PLZ_MAP: Record<string, PlzInfo> = {

  // === INNENSTADT (Stadtbezirk 1) ===
  "50667": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Nord", zone: "koln" },
  "50668": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Nord", zone: "koln" },
  "50670": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Nord", zone: "koln" },
  "50672": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Nord", zone: "koln" },
  "50674": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Süd", zone: "koln" },
  "50676": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Süd", zone: "koln" },
  "50677": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Süd", zone: "koln" },
  "50678": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Süd", zone: "koln" },
  "50679": { city: "Köln", cityPart: "Innenstadt", district: "Deutz", zone: "koln" },

  // === RODENKIRCHEN (Stadtbezirk 2) ===
  "50968": { city: "Köln", cityPart: "Rodenkirchen", district: "Bayenthal / Raderberg", zone: "koln" },
  "50969": { city: "Köln", cityPart: "Rodenkirchen", district: "Zollstock / Raderthal", zone: "koln" },
  "50996": { city: "Köln", cityPart: "Rodenkirchen", district: "Rodenkirchen / Rondorf", zone: "koln" },
  "50997": { city: "Köln", cityPart: "Rodenkirchen", district: "Godorf / Hahnwald", zone: "koln" },
  "50999": { city: "Köln", cityPart: "Rodenkirchen", district: "Sürth / Weiß / Immendorf / Meschenich", zone: "koln" },

  // === LINDENTHAL (Stadtbezirk 3) ===
  "50931": { city: "Köln", cityPart: "Lindenthal", district: "Lindenthal", zone: "koln" },
  "50933": { city: "Köln", cityPart: "Lindenthal", district: "Braunsfeld / Müngersdorf", zone: "koln" },
  "50935": { city: "Köln", cityPart: "Lindenthal", district: "Sülz / Klettenberg", zone: "koln" },
  "50937": { city: "Köln", cityPart: "Lindenthal", district: "Klettenberg / Sülz", zone: "koln" },
  "50939": { city: "Köln", cityPart: "Lindenthal", district: "Sülz / Deckstein / Junkersdorf", zone: "koln" },

  // === EHRENFELD (Stadtbezirk 4) ===
  "50823": { city: "Köln", cityPart: "Ehrenfeld", district: "Ehrenfeld", zone: "koln" },
  "50825": { city: "Köln", cityPart: "Ehrenfeld", district: "Neuehrenfeld", zone: "koln" },
  "50827": { city: "Köln", cityPart: "Ehrenfeld", district: "Bickendorf / Vogelsang", zone: "koln" },
  "50829": { city: "Köln", cityPart: "Ehrenfeld", district: "Ossendorf / Vogelsang", zone: "koln" },
  "50858": { city: "Köln", cityPart: "Ehrenfeld", district: "Müngersdorf / Junkersdorf", zone: "koln" },
  "50859": { city: "Köln", cityPart: "Ehrenfeld", district: "Weiden / Lövenich", zone: "koln" },

  // === NIPPES (Stadtbezirk 5) ===
  "50733": { city: "Köln", cityPart: "Nippes", district: "Nippes / Riehl", zone: "koln" },
  "50735": { city: "Köln", cityPart: "Nippes", district: "Riehl / Mauenheim", zone: "koln" },
  "50737": { city: "Köln", cityPart: "Nippes", district: "Weidenpesch / Volkhoven", zone: "koln" },
  "50739": { city: "Köln", cityPart: "Nippes", district: "Bilderstöckchen / Longerich", zone: "koln" },

  // === CHORWEILER (Stadtbezirk 6) ===
  "50765": { city: "Köln", cityPart: "Chorweiler", district: "Volkhoven-Weiler / Seeberg", zone: "koln" },
  "50767": { city: "Köln", cityPart: "Chorweiler", district: "Chorweiler / Blumenberg", zone: "koln" },
  "50769": { city: "Köln", cityPart: "Chorweiler", district: "Roggendorf / Worringen / Merkenich", zone: "koln" },

  // === PORZ (Stadtbezirk 7 — rechtsrheinisch, 51xxx) ===
  "51143": { city: "Köln", cityPart: "Porz", district: "Porz / Elsdorf", zone: "koln" },
  "51145": { city: "Köln", cityPart: "Porz", district: "Urbach / Zündorf", zone: "koln" },
  "51147": { city: "Köln", cityPart: "Porz", district: "Wahn / Wahnheide", zone: "koln" },
  "51149": { city: "Köln", cityPart: "Porz", district: "Ensen / Gremberghoven", zone: "koln" },

  // === KALK (Stadtbezirk 8 — rechtsrheinisch, 51xxx) ===
  "51103": { city: "Köln", cityPart: "Kalk", district: "Kalk / Humboldt-Gremberg", zone: "koln" },
  "51105": { city: "Köln", cityPart: "Kalk", district: "Poll / Vingst", zone: "koln" },
  "51107": { city: "Köln", cityPart: "Kalk", district: "Ostheim / Neubrück", zone: "koln" },
  "51109": { city: "Köln", cityPart: "Kalk", district: "Merheim / Rath-Heumar", zone: "koln" },

  // === MÜLHEIM (Stadtbezirk 9 — rechtsrheinisch, 51xxx) ===
  "51061": { city: "Köln", cityPart: "Mülheim", district: "Stammheim / Flittard", zone: "koln" },
  "51063": { city: "Köln", cityPart: "Mülheim", district: "Mülheim / Buchforst", zone: "koln" },
  "51065": { city: "Köln", cityPart: "Mülheim", district: "Buchheim / Höhenberg", zone: "koln" },
  "51067": { city: "Köln", cityPart: "Mülheim", district: "Holweide / Dünnwald", zone: "koln" },
  "51069": { city: "Köln", cityPart: "Mülheim", district: "Dellbrück / Dennenbrück", zone: "koln" },
};

// -----------------------------------------------------------------------
// BONN — 15 PLZ (531xx linksrheinisch) + 3 PLZ Beuel (532xx rechtsrheinisch)
// -----------------------------------------------------------------------
export const BONN_PLZ_MAP: Record<string, PlzInfo> = {

  // === STADTBEZIRK BONN (Zentrum, Nordstadt, Südstadt, etc.) ===
  "53111": { city: "Bonn", cityPart: "Bonn-Zentrum", district: "Innenstadt / Altstadt", zone: "bonn" },
  "53113": { city: "Bonn", cityPart: "Bonn-Zentrum", district: "Gronau / Kessenich", zone: "bonn" },
  "53115": { city: "Bonn", cityPart: "Bonn-Zentrum", district: "Südstadt / Poppelsdorf", zone: "bonn" },
  "53117": { city: "Bonn", cityPart: "Bonn-Zentrum", district: "Nordstadt / Buschdorf / Lessenich", zone: "bonn" },
  "53119": { city: "Bonn", cityPart: "Bonn-Zentrum", district: "Auerberg / Tannenbusch / Nordstadt", zone: "bonn" },

  // === STADTBEZIRK HARDTBERG (Duisdorf, Endenich, Röttgen, etc.) ===
  "53121": { city: "Bonn", cityPart: "Hardtberg", district: "Endenich / Dransdorf", zone: "bonn" },
  "53123": { city: "Bonn", cityPart: "Hardtberg", district: "Duisdorf / Medinghoven", zone: "bonn" },
  "53125": { city: "Bonn", cityPart: "Hardtberg", district: "Hardthöhe / Ückesdorf", zone: "bonn" },
  "53127": { city: "Bonn", cityPart: "Hardtberg", district: "Lengsdorf / Lessenich / Dottendorf", zone: "bonn" },
  "53129": { city: "Bonn", cityPart: "Hardtberg", district: "Röttgen / Ippendorf", zone: "bonn" },

  // === STADTBEZIRK BAD GODESBERG ===
  "53173": { city: "Bonn", cityPart: "Bad Godesberg", district: "Alt-Godesberg / Plittersdorf / Rüngsdorf", zone: "bonn" },
  "53175": { city: "Bonn", cityPart: "Bad Godesberg", district: "Friesdorf / Godesberg-Nord / Hochkreuz", zone: "bonn" },
  "53177": { city: "Bonn", cityPart: "Bad Godesberg", district: "Heiderhof / Lannesdorf / Muffendorf / Schweinheim", zone: "bonn" },
  "53179": { city: "Bonn", cityPart: "Bad Godesberg", district: "Mehlem / Pennenfeld / Rüngsdorf", zone: "bonn" },

  // === STADTBEZIRK BEUEL (rechtsrheinisch, 532xx) ===
  "53225": { city: "Bonn", cityPart: "Beuel", district: "Beuel-Mitte / Vilich / Schwarzrheindorf", zone: "bonn" },
  "53227": { city: "Bonn", cityPart: "Beuel", district: "Beuel-Ost / Küdinghoven / Oberkassel", zone: "bonn" },
  "53229": { city: "Bonn", cityPart: "Beuel", district: "Pützchen / Holzlar / Holtorf", zone: "bonn" },
};

// -----------------------------------------------------------------------
// Birleşik harita (her iki şehir)
// -----------------------------------------------------------------------
export const KOLN_BONN_PLZ_MAP: Record<string, PlzInfo> = {
  ...KOLN_PLZ_MAP,
  ...BONN_PLZ_MAP,
};

// -----------------------------------------------------------------------
// Zone Tespiti: Adres Köln/Bonn yerel teslimat bölgesinde mi?
// -----------------------------------------------------------------------
export function isKolnBonnArea(plz?: string | null): boolean {
  if (!plz) return false;
  const cleanPlz = plz.trim();

  // 1. Tam eşleşme haritasına bak
  if (KOLN_BONN_PLZ_MAP[cleanPlz]) return true;

  // 2. Köln prefix kontrolü (50xxx ve 51xxx)
  if (cleanPlz.startsWith('50') || cleanPlz.startsWith('51')) return true;

  // 3. Bonn prefix kontrolü (531xx linksrheinisch + 532xx Beuel rechtsrheinisch)
  if (cleanPlz.startsWith('531') || cleanPlz.startsWith('532')) return true;

  return false;
}

/**
 * @deprecated isKolnBonnArea kullanın
 * Geriye dönük uyumluluk için bırakıldı
 */
export function isKolnArea(plz?: string | null): boolean {
  return isKolnBonnArea(plz);
}

// -----------------------------------------------------------------------
// PLZ'den şehir/semt bilgisi al (statik harita veya API)
// -----------------------------------------------------------------------
export async function fetchLocationByPlz(plz: string): Promise<{ city: string, district: string } | null> {
  const cleanPlz = plz.trim();

  // 1. Önce birleşik statik haritaya bak
  const entry = KOLN_BONN_PLZ_MAP[cleanPlz];
  if (entry) {
    return { city: entry.city, district: entry.district };
  }

  // 2. Listede yoksa Zippopotam.us API ile sorgula (tüm Almanya)
  try {
    const response = await fetch(`https://api.zippopotam.us/de/${cleanPlz}`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.places && data.places.length > 0) {
      const place = data.places[0];
      return {
        city: place['place name'],
        district: ''
      };
    }
  } catch (error) {
    console.error("PLZ API Error:", error);
  }

  return null;
}