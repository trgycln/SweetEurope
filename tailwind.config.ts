// tailwind.config.ts

import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2B2B2B',       // Ana Renk (Antrasit)
        secondary: '#FAF9F6',    // İkincil Renk (Krem Arka Plan)
        accent: '#C69F6B',        // Vurgu Rengi (Altın)
        'text-main': '#3D3D3D',     // Ana Metin Rengi
        'bg-subtle': '#EAE8E1',     // Hafif Arka Plan
      },
      fontFamily: {
        sans: ['var(--font-lato)'], // Paragraf fontu
        serif: ['var(--font-playfair)'], // Başlık fontu
      },
    },
  },
  plugins: [],
}
export default config