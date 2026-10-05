'use client';

import React, { useRef } from 'react';
import Image from 'next/image';

interface Product {
    id: string;
    ad: any;
    aciklamalar: any;
    ana_resim_url: string | null;
}

export default function FlyerClient({ initialProducts, locale }: { initialProducts: Product[], locale: string }) {
    const handlePrint = () => {
        window.print();
    };

    // Helper to get localized string
    const getLoc = (jsonField: any, loc: string) => {
        if (!jsonField) return '';
        if (typeof jsonField === 'string') return jsonField;
        return jsonField[loc] || jsonField['tr'] || jsonField['en'] || jsonField['de'] || '';
    };

    return (
        <div className="bg-gray-100 p-8 rounded-lg overflow-x-auto">
            <div className="mb-4 flex gap-4">
                <button 
                    onClick={handlePrint}
                    className="bg-gray-900 text-amber-500 font-bold px-6 py-2 rounded shadow hover:bg-gray-800 transition"
                >
                    🖨️ PDF Oluştur / Yazdır
                </button>
                <div className="text-sm text-gray-500 flex items-center">
                    Yazdırma ayarlarında <b>Yönlendirme: Yatay (Landscape)</b>, <b>Kenar Boşlukları: Yok</b>, <b>Arka plan grafikleri: Açık</b> seçtiğinizden emin olun.
                </div>
            </div>

            {/* Print Area - In screen mode it's scaled down or scrollable. In print mode it takes full page. */}
            <div className="print-area flex flex-col gap-8 items-center" style={{ width: '297mm' }}>
                
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .print-area, .print-area * {
                            visibility: visible;
                        }
                        .print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 297mm !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            gap: 0 !important;
                        }
                        .a4-page {
                            width: 297mm !important;
                            height: 210mm !important;
                            page-break-after: always;
                            margin: 0 !important;
                            box-shadow: none !important;
                        }
                        @page {
                            size: A4 landscape;
                            margin: 0;
                        }
                    }
                `}} />

                {/* --- PAGE 1: OUTSIDE (Left: Back Cover, Right: Front Cover) --- */}
                <div className="a4-page w-[297mm] h-[210mm] bg-slate-900 flex shadow-2xl relative overflow-hidden text-white">
                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fbbf24 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    
                    {/* Fold Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-slate-700 pointer-events-none z-50"></div>

                    {/* Back Cover (Page 4) */}
                    <div className="w-1/2 h-full flex flex-col justify-between p-12 relative z-10">
                        <div>
                            <h3 className="text-2xl font-bold text-amber-400 mb-6 font-serif">Müşterilerinizden Önce Siz Deneyin!</h3>
                            <p className="text-slate-300 leading-relaxed">
                                Vitrininizdeki kaliteyi bir üst seviyeye taşımak için özel tadım paketimizden isteyin. 
                                Sizin için özenle seçtiğimiz ürünleri bizzat test edin.
                            </p>
                        </div>

                        <div className="flex flex-col items-center bg-slate-800/50 p-6 rounded-2xl border border-slate-700">
                            {/* Placeholder for QR Code */}
                            <div className="w-40 h-40 bg-white rounded-lg flex items-center justify-center p-2 mb-4">
                                <div className="w-full h-full border-4 border-black flex items-center justify-center relative">
                                     <div className="absolute grid grid-cols-5 grid-rows-5 w-3/4 h-3/4 gap-1">
                                        {[...Array(25)].map((_, i) => (
                                            <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>
                                        ))}
                                     </div>
                                </div>
                            </div>
                            <p className="font-bold text-lg">Hemen Bize Ulaşın</p>
                            <p className="text-slate-400 text-sm">Kameranızı okutarak toptan sipariş hattımıza bağlanın.</p>
                        </div>

                        <div className="text-sm text-slate-400 space-y-2">
                            <p className="flex items-center gap-2"><span>🌐</span> www.elysonsweets.de</p>
                            <p className="flex items-center gap-2"><span>📸</span> @elysonsweets</p>
                            <p className="flex items-center gap-2"><span>✉️</span> info@elysonsweets.de</p>
                        </div>
                    </div>

                    {/* Front Cover (Page 1) */}
                    <div className="w-1/2 h-full flex flex-col relative z-10">
                        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none"></div>
                        
                        {/* Cover Image */}
                        <div className="absolute inset-0 z-0">
                            {initialProducts[0]?.ana_resim_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={initialProducts[0].ana_resim_url} alt="Cover" className="w-full h-full object-cover object-center opacity-60" />
                            ) : (
                                <div className="w-full h-full bg-slate-800"></div>
                            )}
                        </div>

                        <div className="relative z-20 flex flex-col items-center justify-center h-full p-12 text-center">
                            {/* Logo Placeholder */}
                            <h1 className="text-5xl font-black text-amber-500 tracking-wider mb-2 font-serif uppercase">Elyson Sweets</h1>
                            <div className="w-24 h-1 bg-amber-500 mb-8"></div>
                            
                            <h2 className="text-4xl font-light text-white leading-tight mb-4 drop-shadow-lg">
                                Vitrininizi <br/>
                                <span className="font-bold text-amber-400">Şahesere Dönüştürün</span>
                            </h2>
                            <p className="text-lg text-slate-200 mt-6 tracking-wide drop-shadow">
                                Müşterilerinizin Unutamayacağı Lezzet Dokunuşları
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- PAGE 2: INSIDE (Left: Inside Left, Right: Inside Right) --- */}
                <div className="a4-page w-[297mm] h-[210mm] bg-white flex shadow-2xl relative overflow-hidden">
                     {/* Fold Line */}
                     <div className="absolute left-1/2 top-0 bottom-0 border-l border-dashed border-gray-300 pointer-events-none z-50"></div>

                    {/* Inside Left (Page 2) - Value Prop */}
                    <div className="w-1/2 h-full p-16 flex flex-col justify-center">
                        <h2 className="text-3xl font-serif font-bold text-slate-900 mb-10 border-b-2 border-amber-500 pb-4 inline-block">Neden Elyson Sweets?</h2>
                        
                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 text-xl">⭐</div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Premium Kalite</h3>
                                    <p className="text-slate-600 leading-relaxed mt-1">Sadece en kaliteli, seçkin malzemelerle hazırlanan usta işi lezzetler.</p>
                                </div>
                            </div>
                            
                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 text-xl">📈</div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Yüksek Karlılık</h3>
                                    <p className="text-slate-600 leading-relaxed mt-1">İşletmeniz için özel toptan fiyatlar ile cazip kar marjları elde edin.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 text-xl">🚚</div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Kusursuz Teslimat</h3>
                                    <p className="text-slate-600 leading-relaxed mt-1">Ürünlerinizi sipariş verdiğiniz tazelikte ve formda vitrininize ulaştırıyoruz.</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600 text-xl">❤️</div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">Müşteri Sadakati</h3>
                                    <p className="text-slate-600 leading-relaxed mt-1">Bir kez tadan müşterilerinizin tekrar tekrar isteyeceği imza tatlar.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Inside Right (Page 3) - Products */}
                    <div className="w-1/2 h-full bg-slate-50 p-12">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-serif font-bold text-slate-900">Şefin Tavsiyeleri</h2>
                            <p className="text-amber-600 text-sm font-semibold tracking-widest uppercase mt-1">Öne Çıkan Ürünlerimiz</p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                            {initialProducts.map((urun, index) => (
                                <div key={urun.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 group">
                                    <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                        {urun.ana_resim_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img 
                                                src={urun.ana_resim_url} 
                                                alt={getLoc(urun.ad, locale)} 
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">Görsel Yok</div>
                                        )}
                                    </div>
                                    <div className="p-4">
                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 mb-1">{getLoc(urun.ad, locale)}</h4>
                                        <div 
                                            className="text-xs text-slate-500 line-clamp-3 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: getLoc(urun.aciklamalar, locale) || "Özel şurup serimizin en beğenilen üyelerinden." }}
                                        ></div>
                                    </div>
                                </div>
                            ))}

                            {/* Pad if fewer than 4 products */}
                            {Array.from({ length: Math.max(0, 4 - initialProducts.length) }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 border-dashed flex flex-col items-center justify-center text-gray-300 p-4">
                                    <p className="text-xs text-center">Önerilen ürün eklendiğinde burada listelenir</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
