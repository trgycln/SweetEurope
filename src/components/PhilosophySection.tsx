import React from 'react';
import Image from 'next/image';

// Zarif bir ayıraç için SVG bileşeni
const DecorativeSeparator = () => (
  <div className="w-24 h-px bg-accent mx-auto md:mx-0 my-6 relative">
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-secondary rotate-45 border border-accent"></div>
  </div>
);

const PhilosophySection: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <section className="bg-secondary py-24 px-6">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif mb-6">
              {dictionary.philosophy.title}
            </h2>
            
            <DecorativeSeparator />

            <p className="font-sans text-lg md:text-xl text-text-main leading-relaxed">
              {dictionary.philosophy.paragraph1}
            </p>
            <p className="font-sans text-lg md:text-xl text-text-main leading-relaxed mt-6">
              {dictionary.philosophy.paragraph2}
            </p>
          </div>

          {/* Image Content - Daha büyük ve etkileyici */}
          <div className="relative w-full order-1 lg:order-2">
            <div className="relative aspect-square max-w-2xl mx-auto">
              <div className="absolute inset-0 bg-accent/10 rounded-full blur-3xl transform scale-90"></div>
              <Image
                src="/philosophy-cake.JPEG"
                alt={dictionary.philosophy.imageAlt}
                fill
                className="object-contain transform hover:scale-105 transition-transform duration-700 ease-in-out drop-shadow-2xl relative z-10"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                priority
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;

