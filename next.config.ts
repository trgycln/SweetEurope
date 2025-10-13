// next.config.ts

/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Vercel'in build sırasında TypeScript hatalarını görmezden gelmesini sağlar
  typescript: {
    ignoreBuildErrors: true,
  },

  // Vercel'in build sırasında ESLint hatalarını görmezden gelmesini sağlar
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