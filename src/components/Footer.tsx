import React from 'react';
import Link from 'next/link';
import { FaInstagram, FaLinkedin } from 'react-icons/fa';

const FO_CATEGORY_SLUGS = [
  { slug: 'sauces-and-ingredients', key: 'catSaucesLabel' },
  { slug: 'coffee',                 key: 'catCoffeeLabel' },
  { slug: 'drinks',                 key: 'catDrinksLabel' },
] as const;

const Footer: React.FC<{ dictionary: any; locale?: string }> = ({ dictionary, locale = 'de' }) => {
  const f = dictionary.footer;
  const isRtl = locale === 'ar';

  return (
    <footer className="bg-primary text-secondary border-t-2 border-accent" dir={isRtl ? 'rtl' : 'ltr'}>

      {/* B2B Notice Bar */}
      <div className="bg-accent/10 border-b border-accent/20 px-6 py-3">
        <p className="text-center text-xs text-secondary/70 font-medium max-w-4xl mx-auto">
          {f.b2bNotice}
        </p>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">

          {/* Column 1: Company info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-accent/40 bg-white/10 flex-shrink-0">
                <img src="/Logo.jpg" alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white tracking-wide">ElysonSweets</h3>
            </div>
            <p className="text-sm text-secondary/70 leading-relaxed mb-4">
              {f.description}
            </p>
            <div className="text-sm text-secondary/60 space-y-1">
              <p>📍 {f.location}</p>
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

          {/* Column 2: Assortment */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">{f.sortimentTitle}</h4>
            <nav className="space-y-1.5">
              {FO_CATEGORY_SLUGS.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/${locale}/products?kategori=${cat.slug}`}
                  className="block text-sm text-secondary/70 hover:text-accent transition-colors truncate"
                >
                  {f[cat.key]}
                </Link>
              ))}
            </nav>
          </div>

          {/* Column 3: Business customers */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">{f.businessTitle}</h4>
            <nav className="space-y-2">
              {[
                { href: `/${locale}/register`, label: f.linkPartner },
                { href: `/${locale}/contact`,  label: f.linkTrial },
                { href: `/${locale}/contact`,  label: f.linkPricelist },
                { href: `/${locale}/contact`,  label: f.linkContact },
                { href: `/${locale}/contact`,  label: f.linkFaq },
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

          {/* Column 4: Legal */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">{f.legal}</h4>
            <nav className="space-y-2">
              {[
                { href: `/${locale}/impressum`,  label: f.impressum },
                { href: `/${locale}/datenschutz`, label: f.datenschutz },
                { href: `/${locale}/agb`,        label: f.linkAgb },
                { href: `/${locale}/widerruf`,   label: f.linkWiderruf },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-sm text-secondary/70 hover:text-accent transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <p className="text-[11px] text-secondary/40 mt-4 leading-relaxed">
              {f.b2bLegalNote}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <p className="opacity-60 text-xs">{f.copyright}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-secondary/50">
            <span className="border border-secondary/20 rounded px-2 py-0.5">{f.badgePrepayment}</span>
            <span className="border border-secondary/20 rounded px-2 py-0.5">{f.badgeInvoice}</span>
            <span className="border border-secondary/20 rounded px-2 py-0.5">HACCP</span>
            <span className="border border-secondary/20 rounded px-2 py-0.5">BRC · Halal</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
