
/**
 * Extracts latitude and longitude from various Google Maps URL formats.
 * Supports:
 * - https://www.google.com/maps/place/.../@52.5200066,13.404954,17z...
 * - https://maps.google.com/?q=52.5200066,13.404954
 * - Short links (requires resolving, which we try to do via fetch if possible, or regex if the coord is in the path)
 */
export async function extractCoordinatesFromUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  try {
    let targetUrl = url;

    // If it's a short link, we might need to resolve it to get the full URL with coordinates
    // Note: This might fail if the server blocks the request or if it's client-side only redirection.
    if (url.includes('goo.gl') || url.includes('maps.app.goo.gl')) {
      try {
        const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        targetUrl = response.url;
      } catch (e) {
        console.warn('Could not resolve short URL:', e);
        // Continue with original URL, maybe it has info or we can't do anything
      }
    }

    // Pattern 5: /dir/From/To/@lat,lng (Direction URLs) - PRIORITIZED
    // The @lat,lng in direction URLs is often the center of the map, not the destination.
    // However, the destination coordinates are often embedded in the 'data' parameter or the path.
    // Example: .../data=!4m13!4m12!1m5!1m1!1s0x...:0x...!2m2!1d6.941266!2d50.9372902...
    // The destination coordinates are usually the last !1d...!2d... pair in the data string.
    
    // Try to find coordinates in the 'data' parameter specifically for destination (usually ends with !1d... !2d...)
    // This is a bit heuristic but works for many 'dir' URLs.
    // Look for the LAST occurrence of !1d(lng)!2d(lat)
    const dataParam = targetUrl.split('data=')[1];
    if (dataParam) {
        const coordMatches = [...dataParam.matchAll(/!1d(-?\d+\.\d+)!2d(-?\d+\.\d+)/g)];
        if (coordMatches.length > 0) {
            // Use the last match as it's typically the destination in a direction URL
            const lastMatch = coordMatches[coordMatches.length - 1];
            return { lat: parseFloat(lastMatch[2]), lng: parseFloat(lastMatch[1]) };
        }
    }

    // Pattern 1: @lat,lng
    const atMatch = targetUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // Pattern 2: q=lat,lng
    const qMatch = targetUrl.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }
    
    // Pattern 3: ll=lat,lng
    const llMatch = targetUrl.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (llMatch) {
      return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
    }

    // Pattern 4: 3dlat!4dlng (often in data params)
    // Example: !3d50.9372902!4d6.941266
    const dataMatch = targetUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (dataMatch) {
        return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) };
    }

    return null;
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    return null;
  }
}

interface AddressDetails {
  sehir: string | null;
  ilce: string | null;
  mahalle: string | null;
  posta_kodu: string | null;
  tam_adres: string | null;
}

/**
 * Uses OpenStreetMap Nominatim API to get address details from coordinates.
 * Free to use, requires User-Agent.
 */
export async function getAddressFromCoordinates(lat: number, lng: number): Promise<AddressDetails | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'SweetHeavenCRM/1.0 (trgycln@gmail.com)' // Replace with valid contact if needed, required by OSM policy
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.statusText}`);
    }

    const data = await response.json();
    const addr = data.address;

    if (!addr) return null;

    // Map OSM fields to our fields
    // City: city, town, village, municipality
    const sehir = addr.city || addr.town || addr.village || addr.municipality || addr.state || null;
    
    // District (Stadtbezirk): suburb, city_district, district
    // In Germany/Cologne: 'suburb' -> Stadtbezirk (e.g. Nippes)
    const ilce = addr.suburb || addr.city_district || addr.district || null;

    // Neighborhood (Stadtteil/Veedel): neighbourhood, quarter
    // In Germany/Cologne: 'neighbourhood' -> Stadtteil (e.g. Weidenpesch)
    const mahalle = addr.neighbourhood || addr.quarter || addr.hamlet || null;
    
    // Zip
    const posta_kodu = addr.postcode || null;

    // Full Address construction (simplified)
    const road = addr.road || '';
    const house_number = addr.house_number || '';
    const tam_adres = `${road} ${house_number}, ${posta_kodu} ${sehir}`.trim();

    return {
      sehir,
      ilce,
      mahalle,
      posta_kodu,
      tam_adres: tam_adres.length > 5 ? tam_adres : null
    };

  } catch (error) {
    console.error('Error fetching address from OSM:', error);
    return null;
  }
}

export async function autoFillLocationFromUrl(url: string): Promise<Partial<AddressDetails>> {
    if (!url) return {};

    const coords = await extractCoordinatesFromUrl(url);
    if (!coords) return {};

    const address = await getAddressFromCoordinates(coords.lat, coords.lng);
    if (!address) return {};

    return address;
}
