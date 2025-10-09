// src/components/ProductCard.tsx (NİHAİ VE DOĞRU HALİ)
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Tables } from '@/lib/supabase/database.types';

// Prop olarak doğrudan veritabanı tipini ('urunler' satırı) alacak şekilde güncelliyoruz.
type ProductCardProps = {
  urun: Tables<'urunler'>;
  dictionary: any; // Şimdilik any kalabilir
  linkHref: string; // Kartın nereye link vereceğini dışarıdan alıyoruz
};

// Fiyatı formatlamak için yardımcı fonksiyon
const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);
};

const ProductCard: React.FC<ProductCardProps> = ({ urun, dictionary, linkHref }) => {
  return (
    <Link href={linkHref} className="group bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="relative w-full h-64 overflow-hidden">
        <Image
          src={urun.fotograf_url_listesi?.[0] || '/placeholder.png'} // veritabanındaki doğru kolon adı
          alt={urun.urun_adi} // veritabanındaki doğru kolon adı
          fill // Modern Next.js kullanımı
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transform group-hover:scale-110 transition-transform duration-500 ease-in-out"
        />
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <p className="font-sans text-sm text-gray-500 mb-1">{urun.kategori}</p> 
        <h3 className="font-serif text-xl font-bold text-primary mb-4 flex-grow">
          {urun.urun_adi}
        </h3>
        <div className="flex justify-between items-center mt-auto">
            <p className="font-sans font-bold text-xl text-accent">
                {formatPrice(urun.temel_satis_fiyati)} 
            </p>
            <div className="text-secondary bg-primary text-center font-bold py-2 px-4 rounded-md text-sm">
              {dictionary.productsPage.detailsButton}
            </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;