import React from 'react';
import Link from 'next/link';
import { FaFacebook, FaInstagram, FaLinkedin } from 'react-icons/fa';

const Footer: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <footer className="bg-primary text-secondary border-t-2 border-accent">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          {/* Column 1: Brand & Legal */}
          <div className="flex flex-col items-center md:items-start">
            <nav className="flex flex-col space-y-2 mt-4 text-sm">
              <Link href="/impressum" className="hover:text-accent transition-colors">{dictionary.footer.impressum}</Link>
              <Link href="/datenschutz" className="hover:text-accent transition-colors">{dictionary.footer.datenschutz}</Link>
            </nav>
          </div>

          {/* Column 2: Logo + ElysonSweets tam ortada */}
          <div className="flex flex-col items-center justify-center py-4">
            <div className="rounded-full shadow-lg border-8 border-white bg-white mb-4 mx-auto overflow-hidden flex items-center justify-center" style={{width: '170px', height: '170px', maxWidth: '220px'}}>
              <img src="/Logo.jpg" alt="Logo" width={170} height={170} style={{objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%'}} />
            </div>
            <h3 className="text-4xl font-serif font-bold text-white tracking-wide drop-shadow-lg">ElysonSweets</h3>
          </div>

          {/* Column 3: Contact & Social Media */}
          <div className="flex flex-col items-center md:items-end">
             <h4 className="font-bold font-sans tracking-wider uppercase mb-4">{dictionary.navigation.contact}</h4>
             <div className="flex flex-col items-center md:items-end space-y-2 text-sm mb-6">
               <a href="mailto:info@elysonsweets.de" className="hover:text-accent transition-colors">info@elysonsweets.de</a>
               <p className="text-secondary/80 text-xs max-w-xs md:text-right">{dictionary.footer.locationNote}</p>
             </div>
             <div className="flex items-center justify-center md:justify-end space-x-4">
                <a href="https://instagram.com/elysonsweets.de" target="_blank" rel="noopener noreferrer" aria-label="Instagram: @elysonsweets.de" title="Instagram: @elysonsweets.de" className="hover:text-accent transition-colors"><FaInstagram size={24} /></a>
                <a href="https://facebook.com/elysonsweets.de" target="_blank" rel="noopener noreferrer" aria-label="Facebook: @elysonsweets.de" title="Facebook: @elysonsweets.de" className="hover:text-accent transition-colors"><FaFacebook size={24} /></a>
                <a href="https://linkedin.com/company/elysonsweets" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn: ElysonSweets" title="LinkedIn: ElysonSweets" className="hover:text-accent transition-colors"><FaLinkedin size={24} /></a>
             </div>
          </div>
        </div>
        
        {/* Bottom Bar: Copyright & Credit */}
        <div className="mt-12 pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center text-center text-sm">
          <p className="opacity-70 mb-2 sm:mb-0">{dictionary.footer.copyright}</p>
          <p className="opacity-50">Design by Turgay Celen</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

