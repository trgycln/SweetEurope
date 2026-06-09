// src/lib/plzLookup.ts

// Köln ve çevresi için detaylı PLZ -> İlçe/Semt haritası
// Bu liste zamanla genişletilebilir.
export const KOLN_PLZ_MAP: Record<string, { city: string, district: string, cityPart?: string }> = {
    // Innenstadt (Bölge 1)
    "50667": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Nord" },
    "50668": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Nord" },
    "50670": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Nord" },
    "50672": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Nord" },
    "50674": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Süd" },
    "50676": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Süd" },
    "50677": { city: "Köln", cityPart: "Innenstadt", district: "Neustadt-Süd" },
    "50678": { city: "Köln", cityPart: "Innenstadt", district: "Altstadt-Süd" },
    "50679": { city: "Köln", cityPart: "Innenstadt", district: "Deutz" },
    
    // Nippes (Bölge 5)
    "50733": { city: "Köln", cityPart: "Nippes", district: "Nippes" },
    "50735": { city: "Köln", cityPart: "Nippes", district: "Riehl" },
    "50737": { city: "Köln", cityPart: "Nippes", district: "Weidenpesch" },
    "50739": { city: "Köln", cityPart: "Nippes", district: "Bilderstöckchen" },
    
    // Ehrenfeld (Bölge 4)
    "50823": { city: "Köln", cityPart: "Ehrenfeld", district: "Ehrenfeld" },
    "50825": { city: "Köln", cityPart: "Ehrenfeld", district: "Neuehrenfeld" },
    "50827": { city: "Köln", cityPart: "Ehrenfeld", district: "Bickendorf" },
    "50829": { city: "Köln", cityPart: "Ehrenfeld", district: "Vogelsang" },
    
    // Lindenthal (Bölge 3)
    "50931": { city: "Köln", cityPart: "Lindenthal", district: "Lindenthal" },
    "50933": { city: "Köln", cityPart: "Lindenthal", district: "Braunsfeld" },
    "50935": { city: "Köln", cityPart: "Lindenthal", district: "Sülz" },
    "50937": { city: "Köln", cityPart: "Lindenthal", district: "Klettenberg" },
    
    // Rodenkirchen (Bölge 2)
    "50968": { city: "Köln", cityPart: "Rodenkirchen", district: "Bayenthal" },
    "50969": { city: "Köln", cityPart: "Rodenkirchen", district: "Zollstock" },
    "50996": { city: "Köln", cityPart: "Rodenkirchen", district: "Rodenkirchen" },
    "50997": { city: "Köln", cityPart: "Rodenkirchen", district: "Godorf" },
    "50999": { city: "Köln", cityPart: "Rodenkirchen", district: "Sürth" },
    
    // Mülheim (Bölge 9)
    "51061": { city: "Köln", cityPart: "Mülheim", district: "Stammheim" },
    "51063": { city: "Köln", cityPart: "Mülheim", district: "Mülheim" },
    "51065": { city: "Köln", cityPart: "Mülheim", district: "Buchheim" },
    "51067": { city: "Köln", cityPart: "Mülheim", district: "Holweide" },
    "51069": { city: "Köln", cityPart: "Mülheim", district: "Dellbrück" },
    
    // Kalk (Bölge 8)
    "51103": { city: "Köln", cityPart: "Kalk", district: "Kalk" },
    "51105": { city: "Köln", cityPart: "Kalk", district: "Poll" },
    "51107": { city: "Köln", cityPart: "Kalk", district: "Ostheim" },
    "51109": { city: "Köln", cityPart: "Kalk", district: "Merheim" },
    
    // Porz (Bölge 7)
    "51143": { city: "Köln", cityPart: "Porz", district: "Porz" },
    "51145": { city: "Köln", cityPart: "Porz", district: "Urbach" },
    "51147": { city: "Köln", cityPart: "Porz", district: "Wahn" },
    "51149": { city: "Köln", cityPart: "Porz", district: "Ensen" }
};

export async function fetchLocationByPlz(plz: string): Promise<{ city: string, district: string } | null> {
    const cleanPlz = plz.trim();
    
    // 1. Önce statik listemize bak (Köln ve çevresi için en doğru veriler)
    if (KOLN_PLZ_MAP[cleanPlz]) {
        return KOLN_PLZ_MAP[cleanPlz];
    }

    // 2. Eğer listede yoksa, genel API'den sorgula (Tüm Almanya için)
    // Zippopotam.us ücretsiz ve key gerektirmez.
    try {
        const response = await fetch(`https://api.zippopotam.us/de/${cleanPlz}`);
        if (!response.ok) return null;
        
        const data = await response.json();
        if (data.places && data.places.length > 0) {
            const place = data.places[0];
            return {
                city: place['place name'],
                district: '' // API genellikle district vermez, boş bırakıyoruz
            };
        }
    } catch (error) {
        console.error("PLZ API Error:", error);
    }

    return null;
}