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
    <section className="bg-secondary py-20 px-6">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <div className="text-center md:text-left">
          <h2 className="text-4xl md:text-5xl font-serif">
            {dictionary.philosophy.title}
          </h2>
          
          <DecorativeSeparator />

          <p className="font-sans text-lg text-text-main leading-loose">
            {dictionary.philosophy.paragraph1}
          </p>
          <p className="font-sans text-lg text-text-main leading-loose mt-6">
            {dictionary.philosophy.paragraph2}
          </p>
        </div>

        {/* Image Content (Arka fonsuz resim için düzenlendi) */}
        <div className="relative h-96 w-full flex items-center justify-center">
          <Image
            src="/philosophy-cake.png" // Resminizin adının bu olduğundan ve /public klasöründe olduğundan emin olun
            alt={dictionary.philosophy.imageAlt}
            width={800} // Resminizin en uygun genişliğini buraya girin
            height={800} // Resminizin en uygun yüksekliğini buraya girin
            className="transform hover:scale-105 transition-transform duration-500 ease-in-out drop-shadow-2xl"
          />
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;

