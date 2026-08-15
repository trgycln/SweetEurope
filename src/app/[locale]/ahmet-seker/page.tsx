import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ahmet Seker - Elysonsweets GmbH',
  description: 'Geschäftsführer bei Elysonsweets GmbH. Kontaktieren Sie mich oder speichern Sie meine vCard.',
  openGraph: {
    title: 'Ahmet Seker - Elysonsweets',
    description: 'Geschäftsführer bei Elysonsweets GmbH',
    images: ['/logo.png']
  }
};

export default function DigitalCard() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#153023] text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="max-w-sm w-full space-y-8 text-center pt-8 pb-12">
        {/* Profile Section */}
        <div className="flex flex-col items-center space-y-4">
          <div className="w-48 h-24 relative mb-4">
            <Image src="/logo.png" alt="Elysonsweets Logo" fill className="object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-[#FBF5B7] uppercase tracking-wider">
            Ahmet Seker
          </h1>
          <p className="text-[#D4AF37] font-medium tracking-widest uppercase text-sm">
            Geschäftsführer
          </p>
        </div>

        {/* Main Action Button */}
        <a 
          href="/ahmet_seker.vcf"
          className="block w-full py-4 px-6 bg-gradient-to-r from-[#B38728] via-[#FBF5B7] to-[#D4AF37] text-[#153023] font-bold rounded-lg shadow-lg transform transition hover:scale-105 uppercase tracking-wide"
          download
        >
          Kontakt speichern
        </a>

        {/* Links Grid */}
        <div className="space-y-4 pt-4">
          <LinkBox href="tel:+4917641533653" icon="📞" text="Jetzt anrufen" />
          <LinkBox href="https://wa.me/4917641533653" icon="💬" text="WhatsApp Nachricht" />
          <LinkBox href="mailto:info@elysonsweets.de" icon="✉️" text="E-Mail senden" />
          <LinkBox href="https://maps.google.com/?q=Wilhelm-Ruppert-Str.+38+F/8,+51147+Köln" icon="📍" text="Route planen" />
          <LinkBox href="https://www.elysonsweets.de" icon="🌐" text="Webseite besuchen" />
        </div>
      </div>
    </div>
  );
}

function LinkBox({ href, icon, text }: { href: string; icon: string; text: string }) {
  return (
    <a 
      href={href}
      className="flex items-center p-4 border border-[#D4AF37]/30 rounded-lg hover:bg-[#D4AF37]/20 transition-colors bg-[#153023] shadow-md"
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      <span className="text-xl mr-4">{icon}</span>
      <span className="text-[#FBF5B7] font-medium tracking-wide">{text}</span>
    </a>
  );
}
