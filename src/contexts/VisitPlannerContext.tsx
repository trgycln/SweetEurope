// src/contexts/VisitPlannerContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface SelectedCompany {
  id: string;
  unvan: string;
  adres: string | null;
  sehir: string | null;
  ilce: string | null;
  posta_kodu: string | null;
  google_maps_url: string | null;
  telefon: string | null;
  parent_firma_id: string | null;
}

interface VisitPlannerContextType {
  selectedCompanies: SelectedCompany[];
  addCompany: (company: SelectedCompany) => void;
  removeCompany: (id: string) => void;
  clearAll: () => void;
  isSelected: (id: string) => boolean;
  generateRouteUrls: (startPoint: 'depot' | 'location' | 'first', customCompanies?: SelectedCompany[]) => Promise<string[]>;
}

const VisitPlannerContext = createContext<VisitPlannerContextType | undefined>(undefined);

const STORAGE_KEY = 'visit_planner_companies';
export const DEPOT_ADDRESS = "Wilhelm Ruppert Straße 38, 51147 Köln";
// Google Maps consumer app supports max 10 total stops (1 origin + 9 destinations/waypoints)
const MAX_STOPS_PER_BATCH = 9;

export function extractCompanyLocation(company: SelectedCompany): string | null {
  if (company.google_maps_url) {
    const url = company.google_maps_url;
    
    // Check for explicit coordinates in query parameter: ?q=lat,lng or ?q=loc:lat,lng
    const coordMatch = url.match(/[?&]q=(?:loc:)?(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coordMatch) return `${coordMatch[1]},${coordMatch[2]}`;

    // Check for @lat,lng in URL path
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return `${atMatch[1]},${atMatch[2]}`;

    // Check for place name in maps/place/Place+Name
    const placeNameMatch = url.match(/maps\/place\/([^/?#]+)/);
    if (placeNameMatch) {
      try {
        return decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '));
      } catch {
        return placeNameMatch[1].replace(/\+/g, ' ');
      }
    }
  }

  // If coordinates/place not found in URL, build structured address
  const addressParts = [
    company.adres,
    company.posta_kodu,
    company.ilce,
    company.sehir
  ].filter(Boolean);

  if (addressParts.length > 0) {
    return addressParts.join(', ');
  }

  // Fallback to unvan with city
  if (company.unvan) {
    return company.sehir ? `${company.unvan}, ${company.sehir}` : company.unvan;
  }

  return null;
}

export function VisitPlannerProvider({ children }: { children: React.ReactNode }) {
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSelectedCompanies(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load visit planner data:', e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage whenever selection changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCompanies));
    }
  }, [selectedCompanies, isLoaded]);

  const addCompany = (company: SelectedCompany) => {
    setSelectedCompanies(prev => {
      if (prev.find(c => c.id === company.id)) {
        return prev; // Already added
      }
      return [...prev, company];
    });
  };

  const removeCompany = (id: string) => {
    setSelectedCompanies(prev => prev.filter(c => c.id !== id));
  };

  const clearAll = () => {
    setSelectedCompanies([]);
  };

  const isSelected = (id: string) => {
    return selectedCompanies.some(c => c.id === id);
  };

  const generateRouteUrls = async (
    startPoint: 'depot' | 'location' | 'first',
    customCompanies?: SelectedCompany[]
  ): Promise<string[]> => {
    const getCurrentPosition = (): Promise<GeolocationPosition> => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
    };

    const targetCompanies = customCompanies || selectedCompanies;
    if (targetCompanies.length === 0) return [];

    // Extract valid locations for all selected companies
    const validWaypoints: string[] = [];
    for (const company of targetCompanies) {
      const loc = extractCompanyLocation(company);
      if (loc) {
        validWaypoints.push(loc);
      }
    }

    if (validWaypoints.length === 0) return [];

    let startOrigin = '';

    if (startPoint === 'location') {
      try {
        const position = await getCurrentPosition();
        startOrigin = `${position.coords.latitude},${position.coords.longitude}`;
      } catch (error) {
        console.warn('Could not get current location, using first company as origin:', error);
        startPoint = 'first';
      }
    } else if (startPoint === 'depot') {
      startOrigin = DEPOT_ADDRESS;
    }

    if (startPoint === 'first') {
      startOrigin = validWaypoints[0];
      validWaypoints.shift(); // Remove first waypoint as it becomes the origin
    }

    // If no remaining stops and origin is set
    if (validWaypoints.length === 0) {
      return [`https://www.google.com/maps/dir/${encodeURIComponent(startOrigin)}`];
    }

    // Google Maps universal multi-stop URL format:
    // https://www.google.com/maps/dir/Stop1/Stop2/Stop3/...
    // This format is fully supported by Google Maps Mobile App (iOS/Android) and Web.
    const urls: string[] = [];
    let currentOrigin = startOrigin;

    for (let i = 0; i < validWaypoints.length; i += MAX_STOPS_PER_BATCH) {
      const batch = validWaypoints.slice(i, i + MAX_STOPS_PER_BATCH);
      const pointsInBatch = [currentOrigin, ...batch];
      
      const encodedUrl = `https://www.google.com/maps/dir/${pointsInBatch.map(p => encodeURIComponent(p)).join('/')}`;
      urls.push(encodedUrl);

      // Next batch starts from the last stop of the current batch
      currentOrigin = batch[batch.length - 1];
    }

    return urls;
  };

  const value: VisitPlannerContextType = {
    selectedCompanies,
    addCompany,
    removeCompany,
    clearAll,
    isSelected,
    generateRouteUrls,
  };

  return (
    <VisitPlannerContext.Provider value={value}>
      {children}
    </VisitPlannerContext.Provider>
  );
}

export function useVisitPlanner() {
  const context = useContext(VisitPlannerContext);
  if (context === undefined) {
    throw new Error('useVisitPlanner must be used within a VisitPlannerProvider');
  }
  return context;
}
