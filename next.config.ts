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
  // i18n: {
    // Desteklediğimiz dillerin kodları
   // locales: ['de', 'en', 'tr', 'ar'],
    // Varsayılan dil (örn: site.com adresine gidildiğinde /de açılır)
   // defaultLocale: 'de',
 // },
};

module.exports = nextConfig;