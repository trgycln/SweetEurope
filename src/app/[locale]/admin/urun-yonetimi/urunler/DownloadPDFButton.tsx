'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Download, Loader2, ChevronDown } from 'lucide-react';

// Use a separate wrapper component to avoid Next.js ESM import issues inside dynamic()
const PDFDownloadLinkWrapper = dynamic(
  () => import('./PDFDownloadLinkWrapper'),
  { ssr: false }
);

interface DownloadPDFButtonProps {
  products: any[];
  categories: any[];
}

export const DownloadPDFButton = ({ products, categories }: DownloadPDFButtonProps) => {
  const [isClient, setIsClient] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isClient) {
    return (
      <button disabled className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-500 rounded-md text-sm font-semibold opacity-70 cursor-not-allowed">
        <Loader2 className="w-4 h-4 animate-spin" />
        PDF Yükleniyor...
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-500 text-rose-600 rounded-md text-sm font-semibold shadow-sm hover:bg-rose-50 whitespace-nowrap transition-colors"
      >
        <Download className="w-4 h-4" />
        Katalog İndir (PDF)
        <ChevronDown className="w-3 h-3 ml-1" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 z-50 overflow-hidden">
          <div className="py-1">
            <div className="px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-100">
              <PDFDownloadLinkWrapper
                products={products}
                categories={categories}
                language="de"
                fileName={`ElysonSweets_Katalog_${new Date().toISOString().split('T')[0]}.pdf`}
                renderContent={({ loading }: any) => (loading ? (
                  <span className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> Almanca Hazırlanıyor...</span>
                ) : 'Almanca (Deutsch)')}
              />
            </div>
            <div className="px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium">
              <PDFDownloadLinkWrapper
                products={products}
                categories={categories}
                language="en"
                fileName={`ElysonSweets_Catalog_${new Date().toISOString().split('T')[0]}.pdf`}
                renderContent={({ loading }: any) => (loading ? (
                  <span className="flex items-center gap-2 text-slate-400"><Loader2 className="w-3 h-3 animate-spin" /> İngilizce Hazırlanıyor...</span>
                ) : 'İngilizce (English)')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
