import React from 'react';
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { UniversalProductCard } from '@/components/products/UniversalProductCard';
import { FiStar } from 'react-icons/fi';
import Link from 'next/link';

export default async function FeaturedProductsSection({ dictionary, locale }: { dictionary: any; locale: string }) {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    // Kullanıcının belirlediği özel öne çıkan 5 ürün (EAN kodlarına göre)
    const targetEans = [
        '8691123120236', // FO Karamel Aromalı Şurup 70 CL
        '8691123463500', // Fo Çikolata Aromalı Şurup 70 cl
        '8691123463487', // Fo Vanilya Aromalı Şurup - Şekersiz 700 ml
        '8691123468864', // FO Profesyonel Çikolata Sosu 2,5 kg
        '8691123470218', // FO KOI Kokteyl Köpürtücü 100 ml
    ];

    const { data: rawProducts } = await supabase
        .from('urunler')
        .select('*')
        .in('ean_gtin', targetEans);

    if (!rawProducts || rawProducts.length === 0) return null;

    // Kullanıcının verdiği sıraya göre diz
    const selectedProducts = targetEans
        .map(ean => rawProducts.find(p => p.ean_gtin === ean))
        .filter(Boolean) as any[];

    const content = dictionary.featuredProductsSection || {
        badge: "Bestseller",
        title: "Premium Auswahl für Profis",
        description: "Entdecken Sie unsere meistverkauften Sirupe, Pürees und Bar-Saucen, die von führenden Baristas und Mixologen in ganz Europa bevorzugt werden.",
        viewAll: "Alle Produkte ansehen",
    };

    return (
        <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
            {/* Background Accents */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-amber-50/50 blur-3xl opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-orange-50/50 blur-3xl opacity-50 pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative z-10">
                
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12 gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100/50 border border-amber-200 text-amber-700 text-xs font-bold tracking-widest uppercase mb-4">
                            <FiStar className="text-amber-500" size={14} />
                            <span>{content.badge}</span>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-4">
                            {content.title}
                        </h2>
                        <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
                            {content.description}
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0">
                        <Link 
                            href={`/${locale}/products`}
                            className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white font-semibold py-3 px-6 rounded-xl hover:bg-slate-800 transition-all shadow-sm hover:shadow-md"
                        >
                            {content.viewAll}
                        </Link>
                    </div>
                </div>

                {/* Grid Layout: 5'li vitrin düzeni */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 sm:gap-6">
                    {selectedProducts.map(product => (
                        <UniversalProductCard 
                            key={product.id} 
                            urun={product} 
                            locale={locale} 
                            isPortal={false} 
                        />
                    ))}
                </div>

            </div>
        </section>
    );
}
