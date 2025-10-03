import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const CategoryShowcase: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  const categories = [
    {
      name: dictionary.categories.cakes,
      href: '/produkte/torten-kuchen',
      // Yeni, çalışan resim linki
      imageUrl: 'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?q=80&w=1974&auto=format&fit=crop',
      alt: dictionary.categories.cakes_alt,
    },
    {
      name: dictionary.categories.desserts,
      href: '/produkte/pralinen-macarons',
      // Bu resim çalışıyordu, en iyilerinden biriyle değiştirdim
      imageUrl: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?q=80&w=1987&auto=format&fit=crop',
      alt: dictionary.categories.desserts_alt,
    },
    {
      name: dictionary.categories.pastries,
      href: '/produkte/feingebaeck',
      // Yeni, çalışan resim linki
      imageUrl: 'https://images.unsplash.com/photo-1568827999250-3603f0de9562?q=80&w=1974&auto=format&fit=crop',
      alt: dictionary.categories.pastries_alt,
    },
  ];

  return (
    <section className="bg-bg-subtle py-20 px-6">
      <div className="container mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-serif mb-12">
          {dictionary.categories.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {categories.map((category) => (
            <Link key={category.name} href={category.href} className="group relative block overflow-hidden rounded-lg shadow-xl">
              <Image
                src={category.imageUrl}
                alt={category.alt}
                layout="responsive"
                width={700}
                height={900}
                objectFit="cover"
                className="transform group-hover:scale-110 transition-transform duration-500 ease-in-out"
              />
              <div className="absolute inset-0 bg-black bg-opacity-40 group-hover:bg-opacity-50 transition-all duration-300"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-white text-3xl font-serif font-bold p-4 text-center drop-shadow-lg">
                  {category.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;

