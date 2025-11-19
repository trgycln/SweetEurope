// src/app/[locale]/products/[slug]/urun-galerisi.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FiImage } from 'react-icons/fi';

interface UrunGalerisiProps {
    anaResim: string | null;
    galeri: string[] | null;
    urunAdi: string;
}

export function UrunGalerisi({ anaResim, galeri, urunAdi }: UrunGalerisiProps) {
    const tumResimler = [anaResim, ...(galeri || [])].filter(Boolean) as string[];
    const [aktifResim, setAktifResim] = useState(tumResimler[0] || null);

    if (tumResimler.length === 0) {
        return (
            <div className="sticky top-24">
                <div className="aspect-square w-full rounded-lg border bg-gray-100 flex items-center justify-center">
                    <FiImage className="text-gray-300 text-6xl" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="sticky top-24">
            <div className="aspect-square w-full overflow-hidden rounded-lg border bg-gray-100">
                 {aktifResim && (
                    <Image 
                        key={aktifResim} // Resim değiştiğinde animasyon için
                        src={aktifResim}
                        alt={urunAdi}
                        width={800}
                        height={800}
                        className="w-full h-full object-cover"
                        priority // Ana resim olduğu için öncelikli yükle
                    />
                 )}
            </div>
            {tumResimler.length > 1 && (
                <div className="mt-4 grid grid-cols-5 gap-4">
                    {tumResimler.map((imgUrl, index) => (
                        <button 
                            key={index}
                            onClick={() => setAktifResim(imgUrl)}
                            className={`aspect-square w-full overflow-hidden rounded-md border-2 transition ${
                                aktifResim === imgUrl ? 'border-accent' : 'border-transparent hover:border-gray-300'
                            }`}
                        >
                            <Image src={imgUrl} alt={`Galeri ${index+1}`} width={200} height={200} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}