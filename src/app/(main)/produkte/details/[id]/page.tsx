"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { dictionary } from '@/dictionaries/de';
import { FaWeightHanging, FaSnowflake, FaClock, FaCalendarAlt, FaCookieBite, FaBoxOpen } from 'react-icons/fa';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  // Simülasyon: Normalde bu ID ile veritabanından veri çekilir.
  // Biz şimdilik sözlükteki örnek ürünü kullanıyoruz.
  const product = dictionary.productDetailPage.sampleProduct;
  const content = dictionary.productDetailPage;
  const [activeImage, setActiveImage] = useState(product.mainImage);
  const [activeTab, setActiveTab] = useState('description');

  // Detay satırları için yeniden kullanılabilir bileşen
  const DetailRow = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="flex justify-between items-center py-3 border-b border-gray-200">
      <div className="flex items-center gap-3">
        {icon}
        <span className="font-medium text-text-main">{label}</span>
      </div>
      <span className="font-semibold text-primary">{value}</span>
    </div>
  );

  return (
    <div className="bg-secondary py-12 md:py-20">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Sol Sütun: Resim Galerisi */}
          <div>
            <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4">
              <Image src={activeImage} alt={product.name} layout="fill" objectFit="cover" priority />
            </div>
            <div className="flex gap-4">
              {product.gallery.map((imgUrl, index) => (
                <button key={index} onClick={() => setActiveImage(imgUrl)} className={`relative w-24 h-24 rounded-md overflow-hidden transition-all duration-300 ${activeImage === imgUrl ? 'ring-2 ring-accent ring-offset-2' : 'opacity-70 hover:opacity-100'}`}>
                  <Image src={imgUrl} alt={`${product.name} - Resim ${index + 1}`} layout="fill" objectFit="cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Sağ Sütun: Ürün Detayları */}
          <div className="flex flex-col">
            <p className="font-sans text-sm text-gray-500 mb-2">{product.category}</p>
            <h1 className="text-4xl md:text-5xl font-serif text-primary mb-4">{product.name}</h1>
            <p className="font-serif text-3xl text-accent mb-6">{product.price}</p>
            
            {/* İnteraktif Sekmeler */}
            <div className="border-b border-gray-300 mb-6">
              <nav className="flex space-x-8">
                <button onClick={() => setActiveTab('description')} className={`py-4 font-bold font-sans transition-colors ${activeTab === 'description' ? 'border-b-2 border-accent text-primary' : 'text-gray-500 hover:text-primary'}`}>
                  {content.description}
                </button>
                <button onClick={() => setActiveTab('details')} className={`py-4 font-bold font-sans transition-colors ${activeTab === 'details' ? 'border-b-2 border-accent text-primary' : 'text-gray-500 hover:text-primary'}`}>
                  {content.tabDetails}
                </button>
                 <button onClick={() => setActiveTab('handling')} className={`py-4 font-bold font-sans transition-colors ${activeTab === 'handling' ? 'border-b-2 border-accent text-primary' : 'text-gray-500 hover:text-primary'}`}>
                  {content.tabHandling}
                </button>
              </nav>
            </div>
            
            {/* Sekme İçerikleri */}
            <div className="font-sans text-text-main leading-loose">
              {activeTab === 'description' && (
                <div>
                  <p>{product.descriptionText}</p>
                  <h3 className="font-bold uppercase tracking-wider mt-6 mb-2 text-sm">{content.ingredients}</h3>
                  <p className="text-sm">{product.ingredientsList}</p>
                  <h3 className="font-bold uppercase tracking-wider mt-4 mb-2 text-sm">{content.allergens}</h3>
                  <p className="text-sm">{product.allergensList}</p>
                </div>
              )}
              {activeTab === 'details' && (
                <div className="space-y-2">
                  <DetailRow icon={<FaCookieBite className="text-accent" />} label={content.sliceCount} value={product.technicalDetails.sliceCount} />
                  <DetailRow icon={<FaWeightHanging className="text-accent" />} label={content.weight} value={product.technicalDetails.weight} />
                  <DetailRow icon={<FaBoxOpen className="text-accent" />} label={content.portionSize} value={product.technicalDetails.portionSize} />
                </div>
              )}
              {activeTab === 'handling' && (
                <div className="space-y-2">
                   <DetailRow icon={<FaSnowflake className="text-accent" />} label={content.storageConditions} value={product.storageInfo.conditions} />
                   <DetailRow icon={<FaCalendarAlt className="text-accent" />} label={content.storageDuration} value={product.storageInfo.duration} />
                   <DetailRow icon={<FaClock className="text-accent" />} label={content.thawingTime} value={product.storageInfo.thawingTime} />
                   <DetailRow icon={<FaClock className="text-accent" />} label={content.shelfLife} value={product.storageInfo.shelfLife} />
                </div>
              )}
            </div>

            <div className="mt-auto pt-8">
                <button className="w-full bg-accent text-primary font-bold py-4 px-8 rounded-md text-lg hover:opacity-90 transition-opacity shadow-lg">
                  {content.addToCart}
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

