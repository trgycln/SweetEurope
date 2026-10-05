'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Download, AlertCircle, FileText } from 'lucide-react';
import KatalogPdfDocument from '@/components/admin/urun-yonetimi/urunler/KatalogPdfDocument';

export default function KatalogAutoDownloader({ data, locale }: { data: any, locale: 'de' | 'en' }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function generate() {
      try {
        // Dinamik olarak kütüphaneyi yükleyelim (sunucuda çalışmaması için)
        const { pdf } = await import('@react-pdf/renderer');
        
        const blob = await pdf(<KatalogPdfDocument data={data} locale={locale} />).toBlob();
        if (!isMounted) return;
        
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setLoading(false);
      } catch(e) {
        console.error('Katalog oluşturma hatası:', e);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    }
    
    generate();
    
    return () => {
      isMounted = false;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [data, locale]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-rose-500 mb-6" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {locale === 'de' ? 'Katalog wird generiert...' : 'Generating catalog...'}
        </h2>
        <p className="text-slate-500 max-w-sm">
          {locale === 'de' 
            ? 'Bitte warten Sie einen Moment. Die aktuellsten Preise und Produkte werden geladen.' 
            : 'Please wait a moment. The latest prices and products are being loaded.'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          {locale === 'de' ? 'Ein Fehler ist aufgetreten' : 'An error occurred'}
        </h2>
        <p className="text-slate-500 mb-8 max-w-sm">
          {locale === 'de'
            ? 'Der Katalog konnte leider nicht erstellt werden. Bitte versuchen Sie es später erneut.'
            : 'The catalog could not be generated. Please try again later.'}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition-colors shadow-md shadow-rose-200"
        >
          {locale === 'de' ? 'Erneut versuchen' : 'Try again'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl shadow-slate-200/50 max-w-md w-full text-center border border-slate-100">
        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText className="w-10 h-10 text-rose-500" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          Elyson Sweets Katalog
        </h1>
        
        <p className="text-slate-500 mb-8 text-sm md:text-base leading-relaxed">
          {locale === 'de'
            ? 'Ihr Katalog wurde erfolgreich erstellt. Klicken Sie auf die Schaltfläche unten, um ihn anzusehen oder herunterzuladen.'
            : 'Your catalog has been successfully generated. Click the button below to view or download it.'}
        </p>
        
        {blobUrl && (
          <a 
            href={blobUrl} 
            download={`elyson-sweets-katalog-${locale}.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 bg-rose-600 text-white rounded-xl font-semibold text-lg hover:bg-rose-700 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-lg shadow-rose-600/30"
          >
            <Download className="w-5 h-5" />
            {locale === 'de' ? 'Katalog ansehen / PDF' : 'View / Download PDF'}
          </a>
        )}
      </div>
    </div>
  );
}
