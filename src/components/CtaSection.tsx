import React from 'react';
import Link from 'next/link';

const DecorativeSeparator = () => (
    <div className="w-24 h-px bg-accent mx-auto my-6 relative">
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-primary rotate-45 border border-accent"></div>
    </div>
);

const CtaSection: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <section className="bg-primary text-secondary py-20 px-6">
      <div className="container mx-auto text-center max-w-3xl">
        <h2 className="text-4xl md:text-5xl font-serif">
          {dictionary.cta.title}
        </h2>
        
        <DecorativeSeparator />

        <p className="font-sans text-lg opacity-90 leading-relaxed mb-8">
          {dictionary.cta.subtitle}
        </p>

        {/* Buton artık bir Link bileşeni */}
        <Link 
          href="/register" 
          className="bg-accent text-primary font-bold py-3 px-10 rounded-md text-lg hover:opacity-90 transition-opacity inline-block shadow-lg"
        >
          {dictionary.cta.button}
        </Link>
      </div>
    </section>
  );
};

export default CtaSection;