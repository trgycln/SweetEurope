"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaChevronRight } from 'react-icons/fa';

// Tipleri tanımlıyoruz
interface Sublink { name: string; href: string; description?: string; }
interface MainCategory { name: string; promoImage: string; subCategories: Sublink[]; }
interface MegaMenuData {
  promo: { imageUrl: string; imageAlt: string; title: string; description: string; href: string; button: string; };
  mainCategories: MainCategory[];
}

const MegaMenu: React.FC<{ dictionary: { megaMenu: MegaMenuData } }> = ({ dictionary }) => {
  const { promo, mainCategories } = dictionary.megaMenu;
  const [activeCategory, setActiveCategory] = useState<MainCategory | null>(null);

  return (
    <div 
      className="bg-secondary text-primary shadow-lg rounded-b-lg border-t border-gray-200"
      onMouseLeave={() => setActiveCategory(null)} 
    >
      <div className="container mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 border-r border-gray-200 pr-8">
          <nav className="flex flex-col space-y-2">
            {mainCategories.map((category: MainCategory) => (
              <div key={category.name} onMouseEnter={() => setActiveCategory(category)} className="flex justify-between items-center p-3 rounded-md hover:bg-bg-subtle cursor-pointer transition-colors">
                <span className="font-bold font-sans tracking-wider uppercase text-primary">{category.name}</span>
                <FaChevronRight className="text-accent opacity-50" />
              </div>
            ))}
          </nav>
        </div>
        <div className="col-span-2">
          {!activeCategory && (
            <div className="bg-bg-subtle p-6 rounded-lg flex flex-col items-center text-center h-full justify-center">
              <div className="relative w-full h-40 mb-4 rounded-md overflow-hidden">
                <Image src={promo.imageUrl} alt={promo.imageAlt} layout="fill" objectFit="cover" />
              </div>
              <h4 className="font-serif text-2xl font-bold mb-2">{promo.title}</h4>
              <p className="font-sans text-sm mb-4">{promo.description}</p>
              <Link href={promo.href} className="bg-accent text-primary font-bold py-2 px-4 rounded-md text-sm hover:opacity-90 transition-opacity whitespace-nowrap">
                {promo.button}
              </Link>
            </div>
          )}
          {activeCategory && (
             <div className="grid grid-cols-2 gap-8 h-full">
               <div>
                 <h3 className="font-bold font-sans tracking-wider uppercase mb-4 text-primary">{activeCategory.name}</h3>
                 <nav className="flex flex-col space-y-3">
                  {activeCategory.subCategories.map((link: Sublink) => (
                    <Link key={link.name} href={link.href} className="text-text-main hover:text-accent transition-colors">
                      {link.name}
                      {link.description && <span className="text-xs text-gray-500 ml-2">({link.description})</span>}
                    </Link>
                  ))}
                </nav>
               </div>
               <div className="relative w-full h-full min-h-[250px] rounded-lg overflow-hidden">
                  <Image src={activeCategory.promoImage} alt={activeCategory.name} layout="fill" objectFit="cover" />
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MegaMenu;