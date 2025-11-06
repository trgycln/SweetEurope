// src/components/PublicHeader.tsx
'use client';

import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FiGlobe, FiChevronDown, FiUser, FiSearch } from 'react-icons/fi';
import { Dictionary } from '@/dictionaries';

interface PublicHeaderProps {
  dictionary: Dictionary;
}

const diller = [
  { kod: 'de', ad: 'Deutsch' },
  { kod: 'en', ad: 'English' },
  { kod: 'tr', ad: 'Türkçe' },
  { kod: 'ar', ad: 'العربية' },
];

export function PublicHeader({ dictionary }: PublicHeaderProps) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const currentLocale = params.locale as string;

  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const getPathWithoutLocale = () => {
    if (!pathname) return '/';
    const segments = pathname.split('/');
    if (diller.some(d => d.kod === segments[1])) {
      segments.splice(1, 1);
      return segments.join('/') || '/';
    }
    return pathname;
  };

  const pathWithoutLocale = getPathWithoutLocale();
  const currentLangName = diller.find(d => d.kod === currentLocale)?.ad || 'Dil';
  
  const nav = dictionary.navigation;

  const handleLanguageChange = (newLocale: string) => {
    setIsLangMenuOpen(false);
    const newPath = `/${newLocale}${pathWithoutLocale}`;
    router.push(newPath);
    router.refresh();
  };

  return (
    // Tasarım: Eski admin header'ınızdaki 'fixed', 'z-20', 'h-16', 'border-b' gibi sınıfları temel aldık.
    // Renkler: 'bg-secondary' gibi sizin paletinizden renkler kullanıldı.
    <header className="sticky top-0 z-40 flex h-20 w-full items-center justify-between border-b border-bg-subtle bg-secondary px-4 sm:px-6">
      
      {/* Sol Taraf: Logo ve Navigasyon */}
      <div className="flex items-center gap-8">
        <Link href={`/${currentLocale}`} className="text-white text-2xl font-serif font-bold">
          ElysonSweets
        </Link>
        {/* Navigasyon Linkleri (Doğru ve Çok Dilli) */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href={`/${currentLocale}/urunler`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
            {nav.products}
          </Link>
          <Link href={`/${currentLocale}/hakkimizda`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
            {nav.about}
          </Link>
          <Link href={`/${currentLocale}/iletisim`} className="text-sm font-semibold text-gray-300 hover:text-white transition-colors">
            {nav.contact}
          </Link>
        </nav>
      </div>

      {/* Sağ Taraf: Arama, Dil ve Portal Butonları */}
      <div className="flex items-center gap-4">
        <div className="relative hidden sm:block">
          <FiSearch size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-main/40" />
          <input 
            type="text" 
            placeholder={nav.search} 
            className="w-full max-w-xs rounded-lg border border-bg-subtle bg-white py-2 pl-10 pr-4 text-sm text-text-main"
          />
        </div>

        {/* Dil Değiştirme Menüsü */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            onBlur={() => setTimeout(() => setIsLangMenuOpen(false), 200)}
            className="flex items-center gap-2 rounded-md border border-bg-subtle bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <FiGlobe size={16} />
            <span className="hidden md:inline">{currentLangName}</span>
            <FiChevronDown size={16} className={`transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isLangMenuOpen && (
            <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                {diller.map((dil) => (
                  <button
                    key={dil.kod}
                    onClick={() => handleLanguageChange(dil.kod)}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {dil.ad}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Partner Portalı Giriş Butonu */}
        <Link href="/login" passHref>
          <button className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow-sm hover:bg-opacity-90 transition-all font-bold text-sm">
              <FiUser size={16} />
              <span className="hidden sm:inline">{nav.partnerPortal}</span>
          </button>
        </Link>
      </div>
    </header>
  );
}