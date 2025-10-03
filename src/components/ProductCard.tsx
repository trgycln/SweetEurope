import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface Product {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  alt: string;
}

interface ProductCardProps {
  product: Product;
  dictionary: any;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, dictionary }) => {
  return (
    <div className="group bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      <div className="relative w-full h-64 overflow-hidden">
        <Image
          src={product.imageUrl}
          alt={product.alt}
          layout="fill"
          objectFit="cover"
          className="transform group-hover:scale-110 transition-transform duration-500 ease-in-out"
        />
      </div>
      <div className="p-6 flex-grow flex flex-col">
        <p className="font-sans text-sm text-gray-500 mb-1">{product.category}</p>
        <h3 className="font-serif text-xl font-bold text-primary mb-4 flex-grow">
          {product.name}
        </h3>
        <Link 
          href={`/produkte/details/${product.id}`} // Örnek ürün detay sayfası linki
          className="mt-auto bg-primary text-secondary text-center font-bold py-2 px-4 rounded-md text-sm hover:bg-opacity-90 transition-opacity"
        >
          {dictionary.productsPage.detailsButton}
        </Link>
      </div>
    </div>
  );
};

export default ProductCard;

