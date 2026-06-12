'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  
  // Extract locale from pathname (e.g. /de/about -> de)
  const localeMatch = pathname.match(/^\/([a-z]{2})\//);
  const locale = localeMatch ? localeMatch[1] : 'de';

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setIsVisible(false);
    // Dispatch event so Analytics components can initialize immediately
    window.dispatchEvent(new Event('cookie_consent_change'));
  };

  const handleRejectAll = () => {
    localStorage.setItem('cookie_consent', 'rejected');
    setIsVisible(false);
    window.dispatchEvent(new Event('cookie_consent_change'));
  };

  if (!isVisible) return null;

  const content = {
    de: {
      title: 'Wir verwenden Cookies',
      desc: 'Wir nutzen Cookies und ähnliche Technologien, um die ordnungsgemäße Funktion unserer Website zu gewährleisten, Inhalte und Anzeigen zu personalisieren, Funktionen für soziale Medien anbieten zu können und die Zugriffe auf unsere Website zu analysieren.',
      accept: 'Alle akzeptieren',
      reject: 'Nur notwendige',
      policy: 'Datenschutz',
    },
    en: {
      title: 'We use cookies',
      desc: 'We use cookies and similar technologies to ensure the proper functioning of our website, personalize content and ads, provide social media features, and analyze our traffic.',
      accept: 'Accept all',
      reject: 'Essential only',
      policy: 'Privacy Policy',
    },
    tr: {
      title: 'Çerezleri kullanıyoruz',
      desc: 'Web sitemizin düzgün çalışmasını sağlamak, içerikleri ve reklamları kişiselleştirmek, sosyal medya özellikleri sunmak ve trafiğimizi analiz etmek için çerezler ve benzeri teknolojiler kullanıyoruz.',
      accept: 'Tümünü kabul et',
      reject: 'Sadece zorunlu',
      policy: 'Gizlilik Politikası',
    },
    ar: {
      title: 'نحن نستخدم ملفات تعريف الارتباط',
      desc: 'نستخدم ملفات تعريف الارتباط والتقنيات المشابهة لضمان العمل السليم لموقعنا، وتخصيص المحتوى والإعلانات، وتوفير ميزات وسائل التواصل الاجتماعي، وتحليل حركة المرور لدينا.',
      accept: 'قبول الكل',
      reject: 'الضرورية فقط',
      policy: 'سياسة الخصوصية',
    }
  };

  const currentContent = content[locale as keyof typeof content] || content.de;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 sm:p-6 bg-white border-t border-slate-200 shadow-2xl transform transition-transform duration-500 ease-in-out">
      <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-lg font-bold text-slate-900 mb-1">{currentContent.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            {currentContent.desc}{' '}
            <Link href={`/${locale}/datenschutz`} className="text-indigo-600 hover:underline font-medium">
              {currentContent.policy}
            </Link>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-shrink-0">
          <button
            onClick={handleRejectAll}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            {currentContent.reject}
          </button>
          <button
            onClick={handleAcceptAll}
            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
          >
            {currentContent.accept}
          </button>
        </div>
      </div>
    </div>
  );
}
