// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js'],
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: [
      // Supabase Storage Hostname'i Eklendi
      
      {
        protocol: 'https',
        hostname: 'atydffkpyvxcmzxyibhj.supabase.co', // Hata mesajındaki hostname
        port: '',
        pathname: '/storage/v1/object/public/**', // Tüm public bucket'ları kapsar
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
    ],
  },
};

module.exports = nextConfig;