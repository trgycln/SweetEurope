"use client";

import React, { useState } from 'react';
import Link from 'next/link';

const HeroSection: React.FC<{ dictionary: any; locale: string }> = ({ dictionary, locale }) => {
  const [videoHasError, setVideoHasError] = useState(false);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center text-center overflow-hidden bg-primary">
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
        </video>
      )}
      {videoHasError && (
        <img
          src="https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1"
          alt="Lezzetli bir tatlı"
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        />
      )}
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-60 z-10" />

      {/* Logo - Sağ Üstte */}
      <div className="absolute top-20 right-10 md:top-24 md:right-20 z-15 pointer-events-none hidden md:block">
        <div className="rounded-full shadow-2xl border-8 border-white/30 bg-white/5 backdrop-blur-sm overflow-hidden flex items-center justify-center" style={{ width: '280px', height: '280px' }}>
          <img src="/Logo.jpg" alt="ElysonSweets Logo" width={280} height={280} style={{ objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%', opacity: '0.3' }} />
        </div>
      </div>

      <div className="relative z-20 text-white px-4 max-w-5xl mx-auto py-20">
        {/* Company Name */}
        <h1 className="text-6xl md:text-8xl font-serif font-bold mb-6 drop-shadow-2xl tracking-wide" style={{ color: '#FFD700' }}>
          ElysonSweets
        </h1>

        {/* Main Headline */}
        <h2 className="text-3xl md:text-5xl font-bold text-accent mb-6 drop-shadow-lg">
          {dictionary.hero.mainHeadline}
        </h2>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white mb-8 max-w-4xl mx-auto drop-shadow-md leading-relaxed">
          {dictionary.hero.subHeadline}
        </p>

        {/* Value Proposition */}
        <div className="bg-white/15 backdrop-blur-md border-2 border-accent/60 rounded-2xl p-6 md:p-8 max-w-3xl mx-auto shadow-2xl mb-8">
          <p className="text-lg md:text-xl text-white font-semibold leading-relaxed">
            {dictionary.hero.valueProposition}
          </p>
        </div>

        {/* B2B Info Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold text-white/90">{dictionary.hero.b2bNote}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <span className="text-sm font-semibold text-white/90">Mindestbestellung: 1 Karton (MOQ)</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <span className="text-sm font-semibold text-white/90">Palettenrabatt verfügbar</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-semibold text-white/90">Versand DE / EU</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href={`/${locale}/products`}
            className="bg-accent text-primary font-bold py-4 px-10 rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl inline-block text-lg"
          >
            Produkte entdecken
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="bg-white/15 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl border-2 border-white/40 transition-all duration-300 hover:bg-white/25 shadow-xl inline-block text-base"
          >
            Probierpaket anfragen
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="bg-transparent text-white/80 font-semibold py-4 px-6 rounded-xl border border-white/20 transition-all duration-300 hover:border-accent/60 hover:text-white text-sm inline-block"
          >
            Preisliste anfordern (PDF)
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
