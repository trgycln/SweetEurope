'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader2, ChevronDown } from 'lucide-react';
import { getKatalogData } from '@/app/actions/katalog-actions';

export const KatalogDownloadButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingLocale, setLoadingLocale] = useState<'de' | 'en' | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDownload = async (locale: 'de' | 'en') => {
    try {
      setLoadingLocale(locale);
      setIsOpen(false);
      
      const data = await getKatalogData(locale);
      
      const { pdf } = await import('@react-pdf/renderer');
      const { default: KatalogPdfDocument } = await import('./KatalogPdfDocument');
      
      const blob = await pdf(<KatalogPdfDocument data={data} locale={locale} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `elyson-sweets-katalog-${locale}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Katalog indirme hatası:', error);
      alert('Katalog indirilirken bir hata oluştu.');
    } finally {
      setLoadingLocale(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => !loadingLocale && setIsOpen(!isOpen)}
        disabled={loadingLocale !== null}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-500 text-rose-600 rounded-md text-sm font-semibold shadow-sm hover:bg-rose-50 whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingLocale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {loadingLocale ? (loadingLocale === 'de' ? 'Almanca Hazırlanıyor...' : 'İngilizce Hazırlanıyor...') : 'Katalog İndir (PDF)'}
        {!loadingLocale && <ChevronDown className="w-3 h-3 ml-1" />}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 z-50 overflow-hidden">
          <div className="py-1">
            <button 
              onClick={() => handleDownload('de')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-100 flex items-center gap-2"
            >
              🇩🇪 Deutsch (PDF)
            </button>
            <button 
              onClick={() => handleDownload('en')}
              className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium flex items-center gap-2"
            >
              🇬🇧 English (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
