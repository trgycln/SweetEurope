"use client";

import React, { useState } from 'react';
import Link from 'next/link'; // Link bileşenini import ediyoruz

const HeroSection: React.FC<{ dictionary: any; locale: string }> = ({ dictionary, locale }) => {
  const [videoHasError, setVideoHasError] = useState(false);

  return (
    <div className="relative h-screen w-full flex items-center justify-center text-center overflow-hidden bg-primary">
      {!videoHasError && (
        <video
          key="local-video-final"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoHasError(true)}
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
          Tarayıcınız video etiketini desteklemiyor.
        </video>
      )}
      {videoHasError && (
        <img
          src="https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1"
          alt="Lezzetli bir tatlı"
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        />
      )}
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-60 z-10"></div>
      
      {/* Logo - Sağ Üstte */}
      <div className="absolute top-20 right-10 md:top-24 md:right-20 z-15 pointer-events-none">
        <div className="rounded-full shadow-2xl border-8 border-white/30 bg-white/5 backdrop-blur-sm overflow-hidden flex items-center justify-center" style={{width: '280px', height: '280px'}}>
          <img src="/Logo.jpg" alt="ElysonSweets Logo" width={280} height={280} style={{objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%', opacity: '0.3'}} />
        </div>
      </div>

      <div className="relative z-20 text-white px-4 max-w-5xl mx-auto">
        {/* Company Name - Üstte, Logo Üzerinde */}
        <h1 className="text-6xl md:text-8xl font-serif font-bold mb-8 drop-shadow-2xl tracking-wide" style={{color: '#FFD700'}}>
          ElysonSweets
        </h1>

        {/* Main Headline */}
        <h2 className="text-3xl md:text-5xl font-bold text-accent mb-6 drop-shadow-lg">
          {dictionary.hero.mainHeadline}
        </h2>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white mb-10 max-w-4xl mx-auto drop-shadow-md leading-relaxed">
          {dictionary.hero.subHeadline}
        </p>

        {/* Value Proposition */}
        <div className="bg-white/15 backdrop-blur-md border-2 border-accent/60 rounded-2xl p-6 md:p-10 max-w-3xl mx-auto shadow-2xl mb-10">
          <p className="text-lg md:text-2xl text-white font-semibold leading-relaxed">
            {dictionary.hero.valueProposition}
          </p>
        </div>

        {/* CTA Button */}
        <Link href={`/${locale}/products`} className="bg-accent text-primary font-bold py-5 px-10 rounded-xl transition-all duration-300 hover:scale-110 shadow-2xl inline-block text-xl pointer-events-auto">
          {dictionary.hero.ctaButton}
        </Link>
        
        {/* B2B Only Note */}
        <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-semibold text-white/90">{dictionary.hero.b2bNote}</span>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;