'use client';

import { useState, useRef } from 'react';
import { FiPrinter, FiCoffee, FiStar, FiLoader, FiDownload } from 'react-icons/fi';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

type PrintButtonProps = {
  label: string;
  headerTitle?: string;
  recipeTitle: string;
  recipeDescription: string;
  recipeIngredients: string[];
  recipeInstructions: string[];
  recipeCategory: string;
  recipePrepTime: number;
  locale: string;
  translations: {
    labelIngr: string;
    labelInstr: string;
    labelCategory: string;
    successPdf: string;
    errorPdf: string;
    btnPdfLoading: string;
  }
};

export default function PrintButton({ 
  label,
  headerTitle,
  recipeTitle, 
  recipeDescription, 
  recipeIngredients, 
  recipeInstructions,
  recipeCategory,
  recipePrepTime,
  locale,
  translations 
}: PrintButtonProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!printRef.current) return;
    setPdfLoading(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageEl = printRef.current;
      const canvas = await html2canvas(pageEl, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

      const pdfUrl = pdf.output('bloburl');
      window.open(pdfUrl, '_blank');

      toast.success(translations.successPdf);
    } catch (error) {
      console.error(error);
      toast.error(translations.errorPdf);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={downloadPDF}
        disabled={pdfLoading}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-200 bg-white text-stone-700 text-sm font-medium hover:bg-stone-50 hover:text-stone-900 transition-all shadow-sm print:hidden disabled:opacity-70"
        title={label}
      >
        {pdfLoading ? <FiLoader className="w-4 h-4 text-amber-600 animate-spin" /> : <FiPrinter className="w-4 h-4 text-amber-600" />}
        <span>{pdfLoading ? translations.btnPdfLoading : label}</span>
      </button>

      {/* Hidden PDF Render Container */}
      <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ width: '794px' }}>
        <div ref={printRef} className="w-[794px] h-[1123px] bg-white p-12 flex flex-col relative overflow-hidden box-border" style={{ fontFamily: "'Inter', sans-serif" }}>
          {/* PDF Background Decorations */}
          <div className="absolute top-0 left-0 w-full h-4 bg-amber-600" />
          <div className="absolute bottom-0 left-0 w-full h-8 bg-stone-900" />
          <div className="absolute top-20 right-10 opacity-[0.03]">
            <FiCoffee size={300} />
          </div>
          
          {/* Header */}
          <div className="flex justify-between items-center mb-12 border-b border-stone-100 pb-8 relative z-10">
            <div>
              <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">{headerTitle || 'Premium Recipe'}</h1>
              <p className="text-amber-600 font-medium tracking-widest uppercase text-sm">Powered by Elysonsweets & FO</p>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 relative z-10">
            <div className="mb-10">
              <h2 className="text-5xl font-serif font-bold text-amber-900 mb-4 leading-tight">{recipeTitle}</h2>
              <p className="text-xl text-stone-600 italic leading-relaxed">{recipeDescription}</p>
            </div>

            <div className="grid grid-cols-2 gap-12">
              <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
                <h3 className="text-lg font-bold text-stone-900 uppercase tracking-widest mb-6 border-b border-stone-200 pb-3">
                  {translations.labelIngr}
                </h3>
                <ul className="space-y-4">
                  {recipeIngredients.map((ing, i) => (
                    <li key={i} className="text-base text-stone-800 flex items-start gap-3">
                      <span className="text-amber-500 mt-[5px] shrink-0"><FiStar size={14} className="fill-amber-500" /></span> 
                      <span className="leading-relaxed">{ing}</span>
                    </li>
                  ))}
                </ul>
                
                {recipeCategory && (
                  <div className="mt-8 pt-6 border-t border-stone-200">
                    <p className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-1">{translations.labelCategory}</p>
                    <p className="text-amber-600 font-medium text-lg capitalize">{recipeCategory}</p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold text-stone-900 uppercase tracking-widest mb-6 border-b border-stone-200 pb-3">
                  {translations.labelInstr}
                </h3>
                <ul className="space-y-6">
                  {recipeInstructions.map((step, i) => (
                    <li key={i} className="text-base text-stone-700 flex items-start gap-4 leading-relaxed">
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold shrink-0 mt-[2px]">
                        <span className="mb-[2px]">{i + 1}</span>
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto text-center relative z-10 pt-8">
            <p className="text-sm text-stone-400">
              {locale === 'tr' 
                ? 'Bu özel reçete, profesyonel FO ürünleri ve uzman barista standartları ile hazırlanmıştır.'
                : 'Dieses exklusive Rezept wurde mit professionellen FO-Produkten nach Barista-Standards kreiert.'}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
