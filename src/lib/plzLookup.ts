// src/lib/plzLookup.ts

// Köln ve çevresi için detaylı PLZ -> İlçe/Semt haritası
// Bu liste zamanla genişletilebilir.
export const KOLN_PLZ_MAP: Record<string, { city: string, district: string }> = {
    // Innenstadt
    "50667": { city: "Köln", district: "Altstadt-Nord" },
    "50668": { city: "Köln", district: "Altstadt-Nord" },
    "50670": { city: "Köln", district: "Neustadt-Nord" },
    "50672": { city: "Köln", district: "Neustadt-Nord" },
    "50674": { city: "Köln", district: "Neustadt-Süd" },
    "50676": { city: "Köln", district: "Altstadt-Süd" },
    "50677": { city: "Köln", district: "Neustadt-Süd" },
    "50678": { city: "Köln", district: "Altstadt-Süd" },
    "50679": { city: "Köln", district: "Deutz" },
    
    // Nippes
    "50733": { city: "Köln", district: "Nippes" },
    "50735": { city: "Köln", district: "Riehl" },
    "50737": { city: "Köln", district: "Weidenpesch" },
    "50739": { city: "Köln", district: "Bilderstöckchen" },
    
    // Ehrenfeld
    "50823": { city: "Köln", district: "Ehrenfeld" },
    "50825": { city: "Köln", district: "Neuehrenfeld" },
    "50827": { city: "Köln", district: "Bickendorf" },
    "50829": { city: "Köln", district: "Vogelsang" },
    
    // Lindenthal
    "50931": { city: "Köln", district: "Lindenthal" },
    "50933": { city: "Köln", district: "Braunsfeld" },
    "50935": { city: "Köln", district: "Sülz" },
    "50937": { city: "Köln", district: "Klettenberg" },
    
    // Rodenkirchen
    "50968": { city: "Köln", district: "Bayenthal" },
    "50969": { city: "Köln", district: "Zollstock" },
    "50996": { city: "Köln", district: "Rodenkirchen" },
    "50997": { city: "Köln", district: "Godorf" },
    "50999": { city: "Köln", district: "Sürth" },
    
    // Mülheim
    "51061": { city: "Köln", district: "Stammheim" },
    "51063": { city: "Köln", district: "Mülheim" },
    "51065": { city: "Köln", district: "Buchheim" },
    "51067": { city: "Köln", district: "Holweide" },
    "51069": { city: "Köln", district: "Dellbrück" },
    
    // Kalk
    "51103": { city: "Köln", district: "Kalk" },
    "51105": { city: "Köln", district: "Poll" },
    "51107": { city: "Köln", district: "Ostheim" },
    "51109": { city: "Köln", district: "Merheim" },
    
    // Porz
    "51143": { city: "Köln", district: "Porz" },
    "51145": { city: "Köln", district: "Urbach" },
    "51147": { city: "Köln", district: "Wahn" },
    "51149": { city: "Köln", district: "Ensen" }
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