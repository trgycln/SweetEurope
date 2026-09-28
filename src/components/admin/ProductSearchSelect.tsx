'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Check, ChevronDown, ImageIcon, Barcode } from 'lucide-react';

interface ProductSearchSelectProps {
  products: any[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  getProductName: (ad: any) => string;
}

export default function ProductSearchSelect({
  products,
  value,
  onChange,
  disabled,
  getProductName
}: ProductSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedProduct = useMemo(() => 
    products.find(p => p.id === value),
  [products, value]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 100); // Show max 100 initially for perf
    
    const term = search.toLowerCase();
    return products.filter(p => {
      const name = getProductName(p.ad).toLowerCase();
      const code = (p.stok_kodu || '').toLowerCase();
      const barcode = (p.ean_gtin || '').toLowerCase();
      return name.includes(term) || code.includes(term) || barcode.includes(term);
    }).slice(0, 100);
  }, [products, search, getProductName]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full min-w-[280px]" ref={wrapperRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-1.5 border border-indigo-200 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow disabled:bg-gray-50 disabled:cursor-not-allowed group hover:border-indigo-300"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedProduct ? (
             <>
               <div className="w-5 h-5 rounded flex-shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden border border-gray-100">
                 {selectedProduct.ana_resim_url ? (
                   <img src={selectedProduct.ana_resim_url} alt="" className="w-full h-full object-cover" />
                 ) : (
                   <ImageIcon size={10} className="text-gray-300" />
                 )}
               </div>
               <div className="flex flex-col truncate">
                 <span className="text-[11px] font-semibold text-slate-800 truncate">
                   {getProductName(selectedProduct.ad)}
                 </span>
                 <span className="text-[9px] text-slate-400 font-mono flex items-center gap-1">
                   {selectedProduct.ean_gtin ? <><Barcode size={8}/> {selectedProduct.ean_gtin}</> : selectedProduct.stok_kodu}
                 </span>
               </div>
             </>
          ) : (
             <span className="text-[11px] text-slate-400 font-medium">Lütfen bir ürün seçin...</span>
          )}
        </div>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0 group-hover:text-indigo-500 transition-colors" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full max-w-[400px] min-w-[320px] bg-white rounded-md shadow-xl border border-gray-100 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                placeholder="Ürün adı, stok kodu veya barkod ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-white border border-gray-200 rounded-md focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>
          
          <ul className="max-h-[250px] overflow-y-auto p-1 custom-scrollbar">
            {filteredProducts.length === 0 ? (
              <li className="px-3 py-4 text-center text-[11px] text-slate-400">
                Aramanıza uygun ürün bulunamadı.
              </li>
            ) : (
              filteredProducts.map(p => {
                const isSelected = p.id === value;
                return (
                  <li
                    key={p.id}
                    onClick={() => {
                      onChange(p.id);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded bg-white flex-shrink-0 flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                       {p.ana_resim_url ? (
                         <img src={p.ana_resim_url} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <ImageIcon size={12} className="text-gray-300" />
                       )}
                    </div>
                    <div className="flex flex-col flex-grow min-w-0">
                      <span className={`text-[11px] truncate ${isSelected ? 'font-bold text-indigo-700' : 'font-medium text-slate-700'}`}>
                        {getProductName(p.ad)}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.ean_gtin && (
                          <span className="flex items-center gap-0.5 text-[9px] font-mono text-slate-500">
                            <Barcode size={8} /> {p.ean_gtin}
                          </span>
                        )}
                        {p.stok_kodu && (
                          <span className="text-[9px] font-mono text-slate-400">
                            [{p.stok_kodu}]
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check size={14} className="text-indigo-600 flex-shrink-0 mr-1" />}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
