import React from 'react';
import Image from 'next/image';

interface Product {
  name_de: string;
  image_url: string;
}

interface TopProductCardProps {
  title: string;
  product: Product | null;
  icon: React.ReactNode;
}

const TopProductCard: React.FC<TopProductCardProps> = ({ title, product, icon }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col">
      <div className="flex items-center space-x-4">
        <div className="bg-accent/10 p-3 rounded-full">
          {icon}
        </div>
        <div>
          <p className="font-sans text-sm text-gray-500">{title}</p>
          <p className="font-serif text-2xl font-bold text-primary truncate" title={product?.name_de || 'N/A'}>
            {product?.name_de || 'N/A'}
          </p>
        </div>
      </div>
      {product?.image_url ? (
        <div className="mt-4 relative h-32 w-full rounded-md overflow-hidden">
          <Image 
            src={product.image_url} 
            alt={product.name_de} 
            layout="fill" 
            objectFit="cover" 
          />
        </div>
      ) : (
        <div className="mt-4 h-32 w-full rounded-md bg-gray-100 flex items-center justify-center">
          <p className="text-xs text-gray-400">Kein Bild</p>
        </div>
      )}
    </div>
  );
};

export default TopProductCard;