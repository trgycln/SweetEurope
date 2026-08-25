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
  generateRouteUrls: (startPoint: 'depot' | 'location' | 'first') => Promise<string[]>;
}

const VisitPlannerContext = createContext<VisitPlannerContextType | undefined>(undefined);

const STORAGE_KEY = 'visit_planner_companies';
export const DEPOT_ADDRESS = "Wilhelm Ruppert Straße 38, 51147 Köln";
const BATCH_SIZE = 15; // Max waypoints per Google Maps URL to avoid limits

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

  const generateRouteUrls = async (startPoint: 'depot' | 'location' | 'first'): Promise<string[]> => {
    // Helper functions
    const extractPlaceInfo = (url: string) => {
      const coordMatch = url.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (coordMatch) return `${coordMatch[1]},${coordMatch[2]}`;

      const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
      if (atMatch) return `${atMatch[1]},${atMatch[2]}`;

      const placeMatch = url.match(/place_id=([^&]+)/);
      if (placeMatch) return `place_id:${placeMatch[1]}`;

      const placeNameMatch = url.match(/maps\/place\/([^/]+)/);
      if (placeNameMatch) return decodeURIComponent(placeNameMatch[1].replace(/\+/g, ' '));

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

    const companiesWithMaps = selectedCompanies.filter(c => c.google_maps_url);
    if (companiesWithMaps.length === 0) return [];

    const waypoints: string[] = [];
    for (const company of companiesWithMaps) {
      const placeInfo = extractPlaceInfo(company.google_maps_url!);
      if (placeInfo) {
        waypoints.push(placeInfo);
      } else if (company.adres) {
        waypoints.push(getAddressString(company));
      }
    }

    if (waypoints.length === 0) return [];

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
      startOrigin = encodeURIComponent(DEPOT_ADDRESS);
    }

    if (startPoint === 'first') {
      startOrigin = waypoints[0];
      waypoints.shift(); // Remove first waypoint as it becomes the origin
    }

    // Split into batches
    const urls: string[] = [];
    let currentOrigin = startOrigin;
    
    // If only one place left and we have an origin (or if first point was used as origin and 0 left)
    if (waypoints.length === 0) {
       return [`https://www.google.com/maps/dir/?api=1&origin=${currentOrigin}&destination=${startOrigin}&travelmode=driving`];
    }
    
    for (let i = 0; i < waypoints.length; i += BATCH_SIZE) {
      const batch = waypoints.slice(i, i + BATCH_SIZE);
      const destination = batch[batch.length - 1];
      const intermediateWaypoints = batch.slice(0, -1);
      
      let url = `https://www.google.com/maps/dir/?api=1&origin=${currentOrigin}&destination=${destination}`;
      
      if (intermediateWaypoints.length > 0) {
        url += `&waypoints=${intermediateWaypoints.join('|')}`;
      }
      url += '&travelmode=driving';
      urls.push(url);
      
      // Next batch's origin is this batch's destination
      currentOrigin = destination;
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
