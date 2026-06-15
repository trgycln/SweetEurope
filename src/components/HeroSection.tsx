"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
          className="absolute top-0 left-0 w-full h-full object-cover z-0 opacity-80"
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
      {/* Subtle overlay for text readability */}
      <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-40 z-10 pointer-events-none" />

      {/* FO Food Products Logo - Sol Üstte */}
      <div className="absolute top-20 left-10 md:top-24 md:left-20 z-15 pointer-events-none hidden md:block">
        <div className="rounded-full shadow-2xl border-8 border-white/30 bg-white/5 backdrop-blur-sm overflow-hidden flex items-center justify-center" style={{ width: '280px', height: '280px' }}>
          <img src="/fologo.webp" alt="FO Food Products Logo" width={280} height={280} style={{ objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%', opacity: '0.3' }} />
        </div>
      </div>

      {/* ElysonSweets Logo - Sağ Üstte */}
      <div className="absolute top-20 right-10 md:top-24 md:right-20 z-15 pointer-events-none hidden md:block">
        <div className="rounded-full shadow-2xl border-8 border-white/30 bg-white/5 backdrop-blur-sm overflow-hidden flex items-center justify-center" style={{ width: '280px', height: '280px' }}>
          <img src="/Logo.jpg" alt="ElysonSweets Logo" width={280} height={280} style={{ objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%', opacity: '0.3' }} />
        </div>
      </div>

      <div className="relative z-20 text-white px-4 max-w-5xl mx-auto py-20 flex flex-col items-center">
        {/* Company Name */}
        <motion.h1 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.1, ease: [0.25, 1, 0.5, 1] }}
          className="text-6xl md:text-8xl font-serif font-bold mb-6 drop-shadow-2xl tracking-wide" style={{ color: '#FFD700', willChange: 'transform, opacity' }}>
          ElysonSweets
        </motion.h1>

        {/* Main Headline */}
        <motion.h2 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 1, 0.5, 1] }}
          className="text-3xl md:text-5xl font-bold text-accent mb-6 drop-shadow-lg text-center" style={{ willChange: 'transform, opacity' }}>
          {dictionary.hero.mainHeadline}
        </motion.h2>

        {/* Subheadline */}
        <motion.p 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5, ease: [0.25, 1, 0.5, 1] }}
          className="text-xl md:text-2xl text-white mb-8 max-w-4xl mx-auto drop-shadow-md leading-relaxed text-center" style={{ willChange: 'transform, opacity' }}>
          {dictionary.hero.subHeadline}
        </motion.p>

        {/* Value Proposition */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 1, 0.5, 1] }}
          className="bg-white/15 backdrop-blur-md border-2 border-accent/60 rounded-2xl p-6 md:p-8 max-w-3xl mx-auto shadow-2xl mb-8" style={{ willChange: 'transform, opacity' }}>
          <p className="text-lg md:text-xl text-white font-semibold leading-relaxed text-center">
            {dictionary.hero.valueProposition}
          </p>
        </motion.div>

        {/* B2B Info Badges */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.9, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-wrap items-center justify-center gap-3 mb-8" style={{ willChange: 'transform, opacity' }}>
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
            <span className="text-sm font-semibold text-white/90">{dictionary.hero.badgeMoq || 'Mindestbestellung: 1 Karton (MOQ)'}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
            </svg>
            <span className="text-sm font-semibold text-white/90">{dictionary.hero.badgePalette || 'Palettenrabatt verfügbar'}</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-accent/40 rounded-lg px-4 py-2">
            <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-semibold text-white/90">{dictionary.hero.badgeShipping || 'Versand DE / EU'}</span>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.1, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4" style={{ willChange: 'transform, opacity' }}>
          <Link
            href={`/${locale}/products`}
            className="bg-accent text-primary font-bold py-4 px-10 rounded-xl transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-[0_0_20px_rgba(255,215,0,0.5)] inline-block text-lg"
          >
            {dictionary.hero.btnProducts || 'Produkte entdecken'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="bg-white/15 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl border-2 border-white/40 transition-all duration-300 hover:bg-white/30 hover:scale-105 shadow-xl inline-block text-base"
          >
            {dictionary.hero.btnTrial || 'Probierpaket anfragen'}
          </Link>
          <Link
            href={`/${locale}/contact`}
            className="bg-transparent text-white/80 font-semibold py-4 px-6 rounded-xl border border-white/20 transition-all duration-300 hover:border-accent/80 hover:text-white hover:bg-white/5 text-sm inline-block"
          >
            {dictionary.hero.btnPricelist || 'Preisliste anfordern (PDF)'}
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default HeroSection;
