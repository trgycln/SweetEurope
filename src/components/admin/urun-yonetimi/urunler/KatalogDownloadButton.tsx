'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Download, Loader2, ChevronDown, QrCode, X } from 'lucide-react';
import { getKatalogData } from '@/app/actions/katalog-actions';
import { QRCodeSVG } from 'qrcode.react';

export const KatalogDownloadButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingLocale, setLoadingLocale] = useState<'de' | 'en' | null>(null);
  const [qrModal, setQrModal] = useState<{isOpen: boolean, locale: 'de' | 'en' | null}>({ isOpen: false, locale: null });
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

  const showQrCode = (locale: 'de' | 'en') => {
    setIsOpen(false);
    setQrModal({ isOpen: true, locale });
  };

  // URL oluştur - Müşteri matbaaya göndereceği için HER ZAMAN canlı site adresini kullanmalıyız.
  // Localhost'ta test ederken indirilen QR kodun bozuk (localhost) olmaması için window.location KULLANMIYORUZ.
  const baseUrl = 'https://www.elysonsweets.de'; 
  const qrUrl = qrModal.locale ? `${baseUrl}/api/katalog/${qrModal.locale}` : '';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button 
          onClick={() => !loadingLocale && setIsOpen(!isOpen)}
          disabled={loadingLocale !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-500 text-rose-600 rounded-md text-sm font-semibold shadow-sm hover:bg-rose-50 whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingLocale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loadingLocale ? (loadingLocale === 'de' ? 'Almanca Hazırlanıyor...' : 'İngilizce Hazırlanıyor...') : 'Katalog (PDF)'}
          {!loadingLocale && <ChevronDown className="w-3 h-3 ml-1" />}
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-slate-200 z-50 overflow-hidden">
            <div className="py-1">
              <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50">Almanca (Deutsch)</div>
              <button 
                onClick={() => handleDownload('de')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-100 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> PDF Olarak İndir
              </button>
              <button 
                onClick={() => showQrCode('de')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" /> QR Kod Göster
              </button>
              
              <div className="border-t border-slate-100 mt-1"></div>
              
              <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 mt-1">İngilizce (English)</div>
              <button 
                onClick={() => handleDownload('en')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium border-b border-slate-100 flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> PDF Olarak İndir
              </button>
              <button 
                onClick={() => showQrCode('en')}
                className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors cursor-pointer text-sm text-slate-700 font-medium flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" /> QR Kod Göster
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Kod Modalı */}
      {qrModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden relative">
            <div className="flex justify-between items-center p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-rose-500" />
                {qrModal.locale === 'de' ? 'Almanca' : 'İngilizce'} Katalog QR
              </h3>
              <button 
                onClick={() => setQrModal({ isOpen: false, locale: null })}
                className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 flex flex-col items-center justify-center space-y-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative qr-container">
                <QRCodeSVG value={qrUrl} size={220} level="H" includeMargin={true} />
              </div>
              
              <div className="text-center">
                <p className="text-sm text-slate-600 mb-2">Müşterileriniz bu kodu okutarak her zaman <span className="font-bold text-rose-600">en güncel</span> kataloğa ulaşabilir.</p>
                <p className="text-[10px] text-slate-400 break-all font-mono bg-slate-50 p-2 rounded-md border border-slate-100">{qrUrl}</p>
              </div>
              
              <div className="flex gap-2 w-full mt-2">
                <button 
                  onClick={() => setQrModal({ isOpen: false, locale: null })}
                  className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Kapat
                </button>
                <button 
                  onClick={() => {
                    const canvas = document.createElement("canvas");
                    const svg = document.querySelector(".qr-container svg");
                    if (!svg) return;
                    
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const img = new window.Image();
                    img.onload = () => {
                      canvas.width = 1000; // Yüksek kalite
                      canvas.height = 1000;
                      const ctx = canvas.getContext("2d");
                      if(ctx) {
                        ctx.fillStyle = "white";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0, 1000, 1000);
                        const pngFile = canvas.toDataURL("image/png");
                        const downloadLink = document.createElement("a");
                        downloadLink.download = `elyson-sweets-qr-${qrModal.locale}.png`;
                        downloadLink.href = `${pngFile}`;
                        downloadLink.click();
                      }
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                  }}
                  className="flex-1 py-2 px-4 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors flex justify-center items-center gap-2"
                >
                  <Download className="w-4 h-4" /> PNG İndir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
