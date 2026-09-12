"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

const HeroSection: React.FC<{ dictionary: any; locale: string }> = ({ dictionary, locale }) => {
  const [videoHasError, setVideoHasError] = useState(false);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center text-center overflow-hidden bg-primary">
      {!videoHasError && (
        <video
          key="local-hero-video"
          autoPlay
          loop
          muted
          playsInline
          onError={() => setVideoHasError(true)}
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-80"
        >
          <source src="/hero-video.mp4" type="video/mp4" />
        </video>
      )}
      {videoHasError && (
        <Image
          src="https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&dpr=1"
          alt="ElysonSweets B2B Bar & HoReCa Sortiment"
          fill
          priority
          className="absolute top-0 left-0 w-full h-full object-cover z-0"
        />
      )}
      {/* Subtle overlay for text readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-black/60 md:bg-black/50 z-10 pointer-events-none" />

      <div className="relative z-20 text-white px-4 sm:px-8 md:px-12 lg:px-20 max-w-5xl mx-auto py-16 sm:py-24 flex flex-col items-center pt-28">
        {/* Kicker Badge */}
        {dictionary.hero?.kicker && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/20 border border-accent/50 text-accent text-xs sm:text-sm font-semibold tracking-wider uppercase backdrop-blur-md mb-4 shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <span>{dictionary.hero.kicker}</span>
          </motion.div>
        )}

        {/* Company Name */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
          className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold mb-3 sm:mb-4 drop-shadow-2xl tracking-wide whitespace-nowrap" style={{ color: '#FFD700', willChange: 'transform, opacity' }}>
          ElysonSweets
        </motion.h1>

        {/* Main Headline */}
        <motion.h2 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.35, ease: [0.25, 1, 0.5, 1] }}
          className="text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg text-center leading-tight max-w-4xl" style={{ willChange: 'transform, opacity' }}>
          {dictionary.hero.mainHeadline}
        </motion.h2>

        {/* Core Product Focus Pills (Kokteyl, Kahve, Bar Sosları, Meyve Püreleri) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6 max-w-3xl"
        >
          <Link
            href={`/${locale}/products`}
            className="group inline-flex items-center gap-2 bg-black/40 hover:bg-accent hover:text-primary transition-all duration-300 border border-accent/40 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-md text-white/95 shadow-md"
          >
            <span className="text-base">🍸</span>
            <span>{dictionary.hero.categories?.cocktailSyrups || 'Cocktail-Sirupe'}</span>
          </Link>
          <Link
            href={`/${locale}/products`}
            className="group inline-flex items-center gap-2 bg-black/40 hover:bg-accent hover:text-primary transition-all duration-300 border border-accent/40 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-md text-white/95 shadow-md"
          >
            <span className="text-base">☕</span>
            <span>{dictionary.hero.categories?.coffeeSyrups || 'Kaffee- & Baristasirupe'}</span>
          </Link>
          <Link
            href={`/${locale}/products`}
            className="group inline-flex items-center gap-2 bg-black/40 hover:bg-accent hover:text-primary transition-all duration-300 border border-accent/40 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-md text-white/95 shadow-md"
          >
            <span className="text-base">🍫</span>
            <span>{dictionary.hero.categories?.barSauces || 'Gourmet-Barsaucen'}</span>
          </Link>
          <Link
            href={`/${locale}/products`}
            className="group inline-flex items-center gap-2 bg-black/40 hover:bg-accent hover:text-primary transition-all duration-300 border border-accent/40 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-medium backdrop-blur-md text-white/95 shadow-md"
          >
            <span className="text-base">🍓</span>
            <span>{dictionary.hero.categories?.fruitPurees || 'Fruchtpürees & Mixers'}</span>
          </Link>
        </motion.div>

        {/* Subheadline (What We Do & B2B Clarity) */}
        <motion.p 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.55, ease: [0.25, 1, 0.5, 1] }}
          className="text-sm sm:text-base md:text-xl text-neutral-200 mb-6 sm:mb-8 max-w-3xl mx-auto drop-shadow-md leading-relaxed text-center" style={{ willChange: 'transform, opacity' }}>
          {dictionary.hero.subHeadline}
        </motion.p>

        {/* Value Proposition Box */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="bg-black/40 backdrop-blur-md border border-accent/50 rounded-2xl p-4 sm:p-5 md:p-6 max-w-3xl mx-auto shadow-2xl mb-7" style={{ willChange: 'transform, opacity' }}>
          <p className="text-xs sm:text-sm md:text-base text-white/95 font-medium leading-relaxed text-center">
            {dictionary.hero.valueProposition}
          </p>
        </motion.div>

        {/* B2B Info Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.85, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-8" style={{ willChange: 'transform, opacity' }}>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-semibold text-white/90">{dictionary.hero.b2bNote}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
            </svg>
            <span className="font-semibold text-white/90">{dictionary.hero.badgeMoq || 'Mindestbestellung: 1 Karton (MOQ)'}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <span className="font-semibold text-white/90">{dictionary.hero.badgePalette || 'Palettenrabatt verfügbar'}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-3.5 py-1.5 text-xs sm:text-sm">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            <span className="font-semibold text-white/90">{dictionary.hero.badgeShipping || 'Schneller Versand DE / EU'}</span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.0, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 w-full sm:w-auto" style={{ willChange: 'transform, opacity' }}>
          <Link
            href={`/${locale}/products`}
            className="w-full sm:w-auto text-center bg-accent text-primary font-bold py-3.5 px-8 rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-[0_0_25px_rgba(255,215,0,0.5)] text-base"
          >
            {dictionary.hero.btnProducts || 'Sortiment entdecken'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="w-full sm:w-auto text-center bg-white/15 backdrop-blur-sm text-white font-semibold py-3.5 px-7 rounded-xl border-2 border-white/40 transition-all duration-300 hover:bg-white/25 hover:scale-105 shadow-xl text-base"
          >
            {dictionary.hero.btnTrial || 'Probierpaket anfragen'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="w-full sm:w-auto text-center bg-transparent text-white/80 font-medium py-3.5 px-6 rounded-xl border border-white/20 transition-all duration-300 hover:border-accent/80 hover:text-white hover:bg-white/5 text-sm"
          >
            {dictionary.hero.btnPricelist || 'B2B-Preisliste (PDF)'}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;
