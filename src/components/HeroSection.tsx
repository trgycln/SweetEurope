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
          Köln's neuer Partner für Premium-Desserts
        </h2>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white mb-10 max-w-4xl mx-auto drop-shadow-md leading-relaxed">
          Wir bringen exklusive <span className="font-bold" style={{color: '#FFD700'}}>ElysonSweets Qualität</span> in Ihr Café. 
        </p>

        {/* Value Proposition */}
        <div className="bg-white/15 backdrop-blur-md border-2 border-accent/60 rounded-2xl p-6 md:p-10 max-w-3xl mx-auto shadow-2xl mb-10">
          <p className="text-lg md:text-2xl text-white font-semibold leading-relaxed">
            Fordern Sie jetzt Ihr <span className="text-accent font-bold text-xl md:text-3xl">kostenloses Probierpaket</span> an und überzeugen Sie sich von unserer Qualität.
          </p>
        </div>

        {/* CTA Button */}
        <Link href={`/${locale}/products`} className="bg-accent text-primary font-bold py-5 px-10 rounded-xl transition-all duration-300 hover:scale-110 shadow-2xl inline-block text-xl pointer-events-auto">
          Produkte entdecken
        </Link>
      </div>
    </div>
  );
};

export default HeroSection;