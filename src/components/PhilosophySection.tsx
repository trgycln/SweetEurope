"use client";

import React from 'react';
import ZeroGravityAroma from './products/ZeroGravityAroma';

// Zarif bir ayıraç için SVG bileşeni
const DecorativeSeparator = () => (
  <div className="w-24 h-px bg-accent mx-auto md:mx-0 my-6 relative">
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-secondary rotate-45 border border-accent"></div>
  </div>
);

const PhilosophySection: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <section className="bg-secondary py-16 sm:py-24 px-4 sm:px-8 md:px-12 lg:px-20">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="text-center lg:text-left order-2 lg:order-1">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif mb-4 sm:mb-6">
              {dictionary.philosophy.title}
            </h2>
            
            <DecorativeSeparator />

            <p className="font-sans text-base sm:text-lg md:text-xl text-text-main leading-relaxed">
              {dictionary.philosophy.paragraph1}
            </p>
            <p className="font-sans text-lg md:text-xl text-text-main leading-relaxed mt-6">
              {dictionary.philosophy.paragraph2}
            </p>
          </div>

          {/* Image Content */}
          <div className="relative w-full order-1 lg:order-2">
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute -inset-4 bg-accent/15 rounded-3xl blur-2xl"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-accent/20">
                <ZeroGravityAroma />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhilosophySection;

