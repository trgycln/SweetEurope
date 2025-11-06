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
      <div className="relative z-20 text-white px-4">
        <h1 className="text-5xl md:text-7xl font-bold font-serif mb-4 drop-shadow-lg text-white">
          {dictionary.hero.title}<span className="text-accent">{dictionary.hero.highlight}</span>
        </h1>
        <p className="text-lg md:text-xl font-sans max-w-3xl mx-auto mb-8 drop-shadow-lg">
          {dictionary.hero.subtitle}
        </p>
        {/* Buton artık bir Link bileşeni */}
        <Link href={`/${locale}/register`} className="bg-accent text-primary font-bold py-3 px-8 rounded-md transition-opacity duration-300 hover:opacity-90 shadow-lg inline-block">
          {dictionary.hero.button}
        </Link>
      </div>
    </div>
  );
};

export default HeroSection;