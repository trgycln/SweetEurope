import React from 'react';
import Link from 'next/link';
import { FaFacebook, FaInstagram, FaTwitter, FaTiktok, FaLinkedin, FaYoutube, FaPinterest } from 'react-icons/fa';

const Footer: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <footer className="bg-primary text-secondary border-t-2 border-accent">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          {/* Column 1: Brand & Legal */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-2xl font-serif font-bold">ElysonSweets</h3>
            <nav className="flex flex-col space-y-2 mt-4 text-sm">
              <Link href="/impressum" className="hover:text-accent transition-colors">{dictionary.footer.impressum}</Link>
              <Link href="/datenschutz" className="hover:text-accent transition-colors">{dictionary.footer.datenschutz}</Link>
            </nav>
          </div>

          {/* Column 2: Empty Spacer for Balance */}
          <div className="hidden md:block">
            {/* Bu sütun masaüstünde denge için boş kalacak */}
          </div>

          {/* Column 3: Contact & Social Media */}
          <div className="flex flex-col items-center md:items-end">
             <h4 className="font-bold font-sans tracking-wider uppercase mb-4">{dictionary.navigation.contact}</h4>
             <div className="flex flex-col items-center md:items-end space-y-2 text-sm mb-6">
               <a href="mailto:info@ElysonSweets.de" className="hover:text-accent transition-colors">info@ElysonSweets.de</a>
               <a href="tel:+49123456789" className="hover:text-accent transition-colors">+49 (0) 123 456 789</a>
             </div>
             <div className="flex items-center justify-center md:justify-end space-x-4 flex-wrap gap-y-2">
                <a href="#" aria-label={dictionary.socials.instagram} title={dictionary.socials.instagram} className="hover:text-accent transition-colors"><FaInstagram size={22} /></a>
                <a href="#" aria-label={dictionary.socials.facebook} title={dictionary.socials.facebook} className="hover:text-accent transition-colors"><FaFacebook size={22} /></a>
                <a href="#" aria-label={dictionary.socials.twitter} title={dictionary.socials.twitter} className="hover:text-accent transition-colors"><FaTwitter size={22} /></a>
                <a href="#" aria-label={dictionary.socials.tiktok} title={dictionary.socials.tiktok} className="hover:text-accent transition-colors"><FaTiktok size={22} /></a>
                <a href="#" aria-label={dictionary.socials.linkedin} title={dictionary.socials.linkedin} className="hover:text-accent transition-colors"><FaLinkedin size={22} /></a>
                <a href="#" aria-label={dictionary.socials.youtube} title={dictionary.socials.youtube} className="hover:text-accent transition-colors"><FaYoutube size={22} /></a>
                <a href="#" aria-label={dictionary.socials.pinterest} title={dictionary.socials.pinterest} className="hover:text-accent transition-colors"><FaPinterest size={22} /></a>
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

