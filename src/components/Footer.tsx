import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaInstagram, FaLinkedin, FaWhatsapp, FaPhone } from 'react-icons/fa';

const FO_CATEGORY_SLUGS = [
  { slug: 'syrups',             key: 'catSyrupsLabel',   fallback: 'Sirupe & Barista-Basen' },
  { slug: 'cafe-bar-sauces',    key: 'catSaucesLabel',   fallback: 'Saucen & Fruchtpürees' },
  { slug: 'powdered-beverages', key: 'catDrinksLabel',   fallback: 'Getränkepulver & Frappés' },
  { slug: 'premium',            key: 'catPremiumLabel',  fallback: 'Premium-Sortiment' },
  { slug: 'cocktail-mixes',     key: 'catMixesLabel',    fallback: 'Cocktail-Mixes' },
  { slug: 'foamer',             key: 'catFoamerLabel',   fallback: 'Foamer' },
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
                <Image src="/Logo.jpg" alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
              </div>
              <h3 className="text-xl font-serif font-bold text-white tracking-wide">ElysonSweets</h3>
            </div>
            <p className="text-sm text-secondary/70 leading-relaxed mb-4">
              {f.description}
            </p>
            <div className="text-sm text-secondary/60 space-y-1.5">
              <a
                href="https://maps.google.com/?q=Wilhelm-Ruppert-Stra%C3%9Fe+38%2C+51147+K%C3%B6ln%2C+Deutschland"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-accent transition-colors cursor-pointer"
                title="Google Maps"
              >
                <span>📍</span> <span>{f.location}</span>
              </a>
              <a href="tel:+4922039899714" className="flex items-center gap-2 hover:text-accent transition-colors">
                <FaPhone className="text-xs text-accent" /> <span>+49 2203 9899714</span>
              </a>
              <a href="mailto:info@elysonsweets.de" className="flex items-center gap-2 hover:text-accent transition-colors">
                <span>✉</span> <span>info@elysonsweets.de</span>
              </a>
            </div>
            <div className="flex items-center gap-3 mt-4">
              <a href="https://wa.me/4922039899714" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="hover:text-[#25D366] transition-colors" title="WhatsApp Business: +49 2203 9899714">
                <FaWhatsapp size={20} />
              </a>
              <a href="https://instagram.com/elysonsweets.de" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-accent transition-colors">
                <FaInstagram size={20} />
              </a>
              <a href="https://linkedin.com/company/elysonsweets" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" className="hover:text-accent transition-colors">
                <FaLinkedin size={20} />
              </a>
            </div>
          </div>

          {/* Column 2: Wissen & Inspiration */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">
              {locale === 'de' ? 'Wissen & Inspiration' : locale === 'tr' ? 'Bilgi & İlham' : locale === 'ar' ? 'المعرفة والإلهام' : 'Knowledge & Inspiration'}
            </h4>
            <nav className="space-y-1.5">
              <Link href={`/${locale}/products`} className="block text-sm text-secondary/70 hover:text-accent transition-colors truncate">
                {locale === 'de' ? 'Produkte' : locale === 'tr' ? 'Ürünler' : locale === 'ar' ? 'المنتجات' : 'Products'}
              </Link>
              <Link href={`/${locale}/recipes`} className="block text-sm text-secondary/70 hover:text-accent transition-colors truncate">
                {locale === 'de' ? 'Rezept-Bibliothek' : locale === 'tr' ? 'Reçete Kütüphanesi' : locale === 'ar' ? 'مكتبة الوصفات' : 'Recipe Library'}
              </Link>
              <Link href={`/${locale}/barista-ai`} className="block text-sm text-secondary/70 hover:text-accent transition-colors truncate">
                {locale === 'de' ? 'Rezept-Assistent' : locale === 'tr' ? 'Reçete Sihirbazı' : locale === 'ar' ? 'معالج الوصفات' : 'Recipe Wizard'}
              </Link>
              <Link href={`/${locale}/blog`} className="block text-sm text-secondary/70 hover:text-accent transition-colors truncate">
                HORECA Blog
              </Link>
            </nav>
          </div>

          {/* Column 3: B2B & Tools */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">
              {locale === 'de' ? 'B2B & Tools' : locale === 'tr' ? 'B2B & Araçlar' : locale === 'ar' ? 'B2B والأدوات' : 'B2B & Tools'}
            </h4>
            <nav className="space-y-2">
              <Link href={`/${locale}/b2b-portal`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {locale === 'de' ? 'B2B Kundenportal' : locale === 'tr' ? 'B2B Müşteri Portalı' : locale === 'ar' ? 'بوابة عملاء B2B' : 'B2B Customer Portal'}
              </Link>
              <Link href={`/${locale}/partner-portal`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {locale === 'de' ? 'Partner Portal' : locale === 'tr' ? 'Partner Portalı' : locale === 'ar' ? 'بوابة الشركاء' : 'Partner Portal'}
              </Link>
              <Link href={`/${locale}/tools/margin-calculator`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {locale === 'de' ? 'Gewinnmargen-Rechner' : locale === 'tr' ? 'Kâr Marjı Hesaplayıcı' : locale === 'ar' ? 'حاسبة هامش الربح' : 'Margin Calculator'}
              </Link>
            </nav>
          </div>

          {/* Column 4: Unternehmen */}
          <div>
            <h4 className="font-bold text-sm uppercase tracking-wider text-accent mb-4">
              {locale === 'de' ? 'Unternehmen' : locale === 'tr' ? 'Şirket' : locale === 'ar' ? 'الشركة' : 'Company'}
            </h4>
            <nav className="space-y-2">
              <Link href={`/${locale}/about`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {locale === 'de' ? 'Über uns' : locale === 'tr' ? 'Hakkımızda' : locale === 'ar' ? 'معلومات عنا' : 'About us'}
              </Link>
              <Link href={`/${locale}/contact`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {locale === 'de' ? 'Kontakt' : locale === 'tr' ? 'İletişim' : locale === 'ar' ? 'اتصل بنا' : 'Contact'}
              </Link>
              <Link href={`/${locale}/impressum`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {f.impressum || 'Impressum'}
              </Link>
              <Link href={`/${locale}/datenschutz`} className="block text-sm text-secondary/70 hover:text-accent transition-colors">
                {f.datenschutz || 'Datenschutz'}
              </Link>
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
            <span className="border border-secondary/20 rounded px-2 py-0.5">
              {locale === 'ar' ? 'حلال · BRC' : locale === 'tr' ? 'BRC · Helal' : 'BRC · Halal'}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
