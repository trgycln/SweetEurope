import React from 'react';
import Link from 'next/link';
import { FaInstagram, FaLinkedin } from 'react-icons/fa';

const FO_CATEGORY_LINKS = [
  { slug: 'premium-syrups',           de: 'Premium-Sirupe' },
  { slug: 'cocktail-syrups',          de: 'Cocktail-Sirupe' },
  { slug: 'silvery-syrups',           de: 'Silvery-Sirupe' },
  { slug: 'powder-drinks',            de: 'Pulvergetränke' },
  { slug: 'fruit-pastes',             de: 'Frucht- & Aromapasten' },
  { slug: 'topping-decor-sauces',     de: 'Dekor-Toppingsoßen 750 g' },
  { slug: 'topping-ice-cream-sauces', de: 'Eis-Toppingsoßen 1 kg' },
  { slug: 'fruited-sauces',           de: 'Fruchtsoßen 1 kg' },
  { slug: 'cafe-bar-sauces',          de: 'Café-Bar-Soßen 2,5 kg' },
  { slug: 'special-sauces-940g',      de: 'Spezialsoßen 940 g' },
  { slug: 'iced-tea-syrup-bases',     de: 'Eistee- & Sirup-Basen' },
  { slug: 'cocktail-mixes',           de: 'Cocktail-Mixes' },
  { slug: 'foamer',                   de: 'Foamer' },
  { slug: 'special-pistachio-sauce',  de: 'Pistachio Kadayıfı Soße' },
];

const Footer: React.FC<{ dictionary: any }> = ({ dictionary }) => {
  return (
    <footer className="bg-primary text-secondary border-t-2 border-accent">

      {/* B2B Notice Bar */}
      <div className="bg-accent/10 border-b border-accent/20 px-6 py-3">
        <p className="text-center text-xs text-secondary/70 font-medium max-w-4xl mx-auto">
          Verkauf ausschließlich an Gewerbetreibende gem. §14 BGB. Alle Preise verstehen sich netto, zzgl. gesetzlicher MwSt., zzgl. Versand.
        </p>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Column 1: ElysonSweets */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent/40 bg-white/10 flex-shrink-0">
                <img src="/Logo.jpg" alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white tracking-wide">ElysonSweets</h3>
            </div>
            <p className="text-sm text-secondary/70 leading-relaxed mb-4">
              Ihr B2B-Partner für FO-Markensortiment – Premium-Sirupe, Soßen und Backzutaten für Cafés, Hotels und Patisserien in Deutschland und der EU.
            </p>
            <div className="text-sm text-secondary/60 space-y-1">
              <p>📍 Köln, Deutschland</p>
              <a href="mailto:info@elysonsweets.de" className="block hover:text-accent transition-colors">
                ✉ info@elysonsweets.de
              </a>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://instagram.com/elysonsweets.de" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-accent transition-colors">
                <FaInstagram size={20} />
              </a>
              <a href="https://linkedin.com/company/elysonsweets" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-accent transition-colors">
                <FaLinkedin size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Sortiment */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">Sortiment</h4>
            <nav className="space-y-1.5">
              {FO_CATEGORY_LINKS.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/de/products?kategori=${cat.slug}`}
                  className="block text-sm text-secondary/70 hover:text-accent transition-colors truncate"
                >
                  {cat.de}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Geschäftskunden */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">Geschäftskunden</h4>
            <nav className="space-y-2">
              {[
                { href: '/de/register', label: 'Partner werden' },
                { href: '/de/contact', label: 'Probierpaket anfragen' },
                { href: '/de/contact', label: 'Preisliste anfordern' },
                { href: '/de/contact', label: 'Anfrage senden' },
                { href: '/de/contact', label: 'FAQ' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block text-sm text-secondary/70 hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 4: Rechtliches */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">Rechtliches</h4>
            <nav className="space-y-2">
              {[
                { href: '/de/impressum', label: 'Impressum' },
                { href: '/de/datenschutz', label: 'Datenschutz' },
                { href: '/de/agb', label: 'AGB (B2B)' },
                { href: '/de/widerruf', label: 'Widerrufsbelehrung' },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="block text-sm text-secondary/70 hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="text-[11px] text-secondary/40 mt-4 leading-relaxed">
              Widerrufsbelehrung: Für Käufe durch Gewerbetreibende i.S.v. §14 BGB gelten abweichende Regelungen.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <p className="opacity-60 text-xs">{dictionary.footer.copyright}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-secondary/50">
            <span className="border border-secondary/20 rounded px-2 py-0.5">Vorkasse</span>
            <span className="border border-secondary/20 rounded px-2 py-0.5">Rechnung 14 Tage netto</span>
            <span className="border border-secondary/20 rounded px-2 py-0.5">DHL / UPS</span>
            <span className="border border-secondary/20 rounded px-2 py-0.5">EU-Versand</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
