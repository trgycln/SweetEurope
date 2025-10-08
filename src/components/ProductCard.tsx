import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

// DÜZELTME: 'price' özelliği eklendi.
interface Product {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  alt: string;
  price: number; 
}

// İYİLEŞTİRME: 'dictionary' için 'any' yerine daha spesifik bir tip kullanıldı.
interface ProductCardProps {
  product: Product;
  dictionary: {
    productsPage: {
      detailsButton: string;
    }
  };
}

// Fiyatı formatlamak için yardımcı fonksiyon
const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(price);
};

const ProductCard: React.FC<ProductCardProps> = ({ product, dictionary }) => {
  return (
    <div className="group bg-white rounded-lg shadow-lg overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
      <div className="relative w-full h-64 overflow-hidden">
        {/* DÜZELTME: next/image'in modern kullanımı (layout ve objectFit kaldırıldı, fill ve className kullanıldı) */}
        <Image
          src={product.imageUrl || '/placeholder.png'} // Eğer imageUrl yoksa bir placeholder göster
          alt={product.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transform group-hover:scale-110 transition-transform duration-500 ease-in-out"
        />
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <p className="font-sans text-sm text-gray-500 mb-1">{product.category}</p>
        <h3 className="font-serif text-xl font-bold text-primary mb-2 flex-grow">
          {product.name}
        </h3>
        
        {/* YENİ: Fiyat bilgisi eklendi */}
        <p className="font-sans font-bold text-xl text-accent mb-4">
            {formatPrice(product.price)}
        </p>

        <Link 
          href={`/produkte/details/${product.id}`}
          className="mt-auto bg-primary text-secondary text-center font-bold py-2 px-4 rounded-md text-sm hover:bg-opacity-90 transition-opacity"
        >
          {dictionary.productsPage.detailsButton}
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;