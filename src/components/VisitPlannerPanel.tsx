// src/components/VisitPlannerPanel.tsx
'use client';

import React, { useState } from 'react';
import { useVisitPlanner } from '@/contexts/VisitPlannerContext';
import { FiX, FiMapPin, FiTrash2, FiNavigation, FiChevronDown, FiChevronUp, FiPhone } from 'react-icons/fi';

export default function VisitPlannerPanel() {
  const { selectedCompanies, removeCompany, clearAll, generateRouteUrl } = useVisitPlanner();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isGeneratingRoute, setIsGeneratingRoute] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  if (selectedCompanies.length === 0) {
    return null; // Don't show panel if empty
  }

  const handleGenerateRoute = async (useCurrentLocation = true) => {
    setIsGeneratingRoute(true);
    setLocationError(null);

    try {
      const routeUrl = await generateRouteUrl(useCurrentLocation);
      if (routeUrl) {
        window.open(routeUrl, '_blank');
      } else {
        setLocationError('Seçili firmalarda Google Maps linki bulunamadı.');
      }
    } catch (error) {
      console.error('Route generation error:', error);
      setLocationError('Güzergah oluşturulurken hata oluştu.');
    } finally {
      setIsGeneratingRoute(false);
    }
  };

  const companiesWithMaps = selectedCompanies.filter(c => c.google_maps_url).length;
  const companiesWithoutMaps = selectedCompanies.length - companiesWithMaps;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white rounded-lg shadow-2xl border-2 border-accent overflow-hidden">
      {/* Header */}
      <div 
        className="bg-accent text-white px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FiMapPin size={20} />
          <h3 className="font-bold text-lg">Ziyaret Planlayıcı</h3>
          <span className="bg-white text-accent px-2 py-0.5 rounded-full text-xs font-bold">
            {selectedCompanies.length}
          </span>
        </div>
        <button className="text-white hover:bg-white/20 p-1 rounded transition-colors">
          {isExpanded ? <FiChevronDown size={20} /> : <FiChevronUp size={20} />}
        </button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {/* Company List */}
          <div className="p-3 space-y-2">
            {selectedCompanies.map((company, index) => (
              <div
                key={company.id}
                className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-primary text-xs bg-gray-200 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-sm text-primary truncate">
                        {company.unvan}
                      </h4>
                    </div>
                    
                    {/* Address */}
                    {(company.adres || company.sehir || company.ilce) && (
                      <div className="text-xs text-gray-600 mt-1 ml-8">
                        {company.adres && <div className="truncate">{company.adres}</div>}
                        <div>
                          {company.posta_kodu && <span>{company.posta_kodu} </span>}
                          {company.ilce && <span>{company.ilce}, </span>}
                          {company.sehir && <span>{company.sehir}</span>}
                        </div>
                      </div>
                    )}

                    {/* Phone */}
                    {company.telefon && (
                      <div className="text-xs text-gray-500 mt-1 ml-8 flex items-center gap-1">
                        <FiPhone size={10} />
                        {company.telefon}
                      </div>
                    )}

                    {/* Status indicator */}
                    <div className="mt-1 ml-8">
                      {company.google_maps_url ? (
                        <a
                          href={company.google_maps_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-green-600 hover:text-green-800 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiMapPin size={10} />
                          Haritada Aç
                        </a>
                      ) : (
                        <span className="text-[10px] text-red-500 flex items-center gap-1">
                          <FiMapPin size={10} />
                          Maps linki yok
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeCompany(company.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-colors flex-shrink-0"
                    title="Listeden Çıkar"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
            {/* Info */}
            <div className="text-xs text-gray-600 mb-2">
              {companiesWithMaps > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-green-600">✓</span>
                  {companiesWithMaps} firma Google Maps linki mevcut
                </div>
              )}
              {companiesWithoutMaps > 0 && (
                <div className="flex items-center gap-1 text-orange-600">
                  <span>⚠</span>
                  {companiesWithoutMaps} firmada Google Maps linki yok
                </div>
              )}
            </div>

            {/* Location Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
              <div className="flex items-start gap-2">
                <FiMapPin className="flex-shrink-0 mt-0.5" size={14} />
                <div>
                  <div className="font-semibold">📍 Başlangıç Noktası</div>
                  <div className="text-blue-600">Mevcut konumunuz kullanılacak</div>
                  <div className="text-[10px] text-blue-500 mt-1">
                    Tarayıcınız konum izni isteyecek
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
                {locationError}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleGenerateRoute(true)}
                disabled={companiesWithMaps === 0 || isGeneratingRoute}
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg hover:bg-opacity-90 transition-all duration-200 font-bold text-sm flex items-center justify-center gap-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
                title={companiesWithMaps === 0 ? 'En az 1 firmada Google Maps linki olmalı' : 'Konumunuzdan Başla'}
              >
                {isGeneratingRoute ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Oluşturuluyor...
                  </>
                ) : (
                  <>
                    <FiNavigation size={16} />
                    Konumumdan Başla
                  </>
                )}
              </button>
              <button
                onClick={clearAll}
                disabled={isGeneratingRoute}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-200 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Tümünü Temizle"
              >
                <FiTrash2 size={16} />
              </button>
            </div>

            {/* Alternative: Start from first company */}
            <button
              onClick={() => handleGenerateRoute(false)}
              disabled={companiesWithMaps < 2 || isGeneratingRoute}
              className="w-full bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-300 transition-all duration-200 text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Konum izni vermek istemiyorsanız"
            >
              Veya ilk firmadan başla
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
