// next.config.ts
import withSerwistInit from '@serwist/next';

const withSerwist = withSerwistInit({
  // Service Worker kaynak dosyası (TypeScript)
  swSrc: 'src/app/sw.ts',
  // Derlenmiş SW çıktısı (public klasörüne)
  swDest: 'public/sw.js',
  // GELİŞTİRME ortamında SW'yi devre dışı bırak (debug kolaylığı)
  disable: process.env.NODE_ENV === 'development',
});

import { NextConfig } from 'next';

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
    optimizePackageImports: ['lucide-react', 'react-icons', 'date-fns'],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 yıl cache (Tarayıcı önbellekleme)
    remotePatterns: [
      // Supabase Storage Hostnames
      {
        protocol: 'https',
        hostname: 'szuhjzgyhhlrydyllrcd.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'atydffkpyvxcmzxyibhj.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'drive.google.com',
      },
      {
        protocol: 'https',
        hostname: 'elysonsweets.de',
      },
    ],
  },
};

module.exports = withSerwist(nextConfig);