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
}

interface VisitPlannerContextType {
  selectedCompanies: SelectedCompany[];
  addCompany: (company: SelectedCompany) => void;
  removeCompany: (id: string) => void;
  clearAll: () => void;
  isSelected: (id: string) => boolean;
  generateRouteUrl: (useCurrentLocation?: boolean) => Promise<string | null>;
}

const VisitPlannerContext = createContext<VisitPlannerContextType | undefined>(undefined);

const STORAGE_KEY = 'visit_planner_companies';

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

  const generateRouteUrl = async (useCurrentLocation = true) => {
    // Helper functions
    const extractPlaceInfo = (url: string) => {
      // Try to extract place ID or coordinates from various Google Maps URL formats
      
      // Format 1: https://maps.google.com/?q=lat,lng
      const coordMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) {
        return `${coordMatch[1]},${coordMatch[2]}`;
      }

      // Format 2: https://www.google.com/maps/place/.../@lat,lng
      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) {
        return `${atMatch[1]},${atMatch[2]}`;
      }

      // Format 3: Place ID
      const placeMatch = url.match(/place_id=([^&]+)/);
      if (placeMatch) {
        return `place_id:${placeMatch[1]}`;
      }

      // Format 4: Google Maps short link or place name
      const placeNameMatch = url.match(/maps\/place\/([^/]+)/);
      if (placeNameMatch) {
        return decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '));
      }

      return null;
    };

    const getAddressString = (company: SelectedCompany) => {
      const address = [
        company.adres,
        company.posta_kodu,
        company.ilce,
        company.sehir
      ].filter(Boolean).join(', ');
      return encodeURIComponent(address);
    };

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

    // Main logic
    const companiesWithMaps = selectedCompanies.filter(c => c.google_maps_url);
    
    if (companiesWithMaps.length === 0) {
      return null;
    }

    if (companiesWithMaps.length === 1) {
      // Single location - create route from current location if available
      if (useCurrentLocation) {
        try {
          const position = await getCurrentPosition();
          const origin = `${position.coords.latitude},${position.coords.longitude}`;
          const destination = extractPlaceInfo(companiesWithMaps[0].google_maps_url!) || 
                            getAddressString(companiesWithMaps[0]);
          return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`;
        } catch (error) {
          // Fallback to just opening the location
          return companiesWithMaps[0].google_maps_url;
        }
      }
      return companiesWithMaps[0].google_maps_url;
    }

    // Multiple locations - create a route
    const waypoints: string[] = [];
    
    for (const company of companiesWithMaps) {
      const placeInfo = extractPlaceInfo(company.google_maps_url!);
      if (placeInfo) {
        waypoints.push(placeInfo);
      } else if (company.adres) {
        waypoints.push(getAddressString(company));
      }
    }

    if (waypoints.length === 0) {
      return null;
    }

    let origin: string;
    let destination: string;
    let intermediateWaypoints: string[];

    if (useCurrentLocation) {
      try {
        // Get user's current location
        const position = await getCurrentPosition();
        origin = `${position.coords.latitude},${position.coords.longitude}`;
        
        // All selected companies become waypoints
        destination = waypoints[waypoints.length - 1];
        intermediateWaypoints = waypoints.slice(0, -1);
      } catch (error) {
        console.warn('Could not get current location, using first company as origin:', error);
        // Fallback: use first company as origin
        origin = waypoints[0];
        destination = waypoints[waypoints.length - 1];
        intermediateWaypoints = waypoints.slice(1, -1);
      }
    } else {
      // Use first company as origin
      origin = waypoints[0];
      destination = waypoints[waypoints.length - 1];
      intermediateWaypoints = waypoints.slice(1, -1);
    }

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    
    if (intermediateWaypoints.length > 0) {
      url += `&waypoints=${intermediateWaypoints.join('|')}`;
    }
    
    url += '&travelmode=driving';

    return url;
  };

  const value: VisitPlannerContextType = {
    selectedCompanies,
    addCompany,
    removeCompany,
    clearAll,
    isSelected,
    generateRouteUrl,
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
