export type Locale = 'de' | 'en' | 'tr' | 'ar';

export type NavigationItem = {
  key: string;
  href: string;
  label: Record<Locale, string>;
  isNew?: boolean;
};

export const mainNavigation: NavigationItem[] = [
  {
    key: 'products',
    href: '/products',
    label: {
      de: 'Produkte',
      en: 'Products',
      tr: 'Ürünler',
      ar: 'منتجات'
    }
  },
  {
    key: 'recipes',
    href: '/recipes',
    label: {
      de: 'Rezept-Bibliothek',
      en: 'Recipe Library',
      tr: 'Reçete Kütüphanesi',
      ar: 'مكتبة الوصفات'
    }
  },
  {
    key: 'blog',
    href: '/blog',
    label: {
      de: 'Blog',
      en: 'Blog',
      tr: 'Blog',
      ar: 'مدونة'
    },
    isNew: true
  },
  {
    key: 'about',
    href: '/about',
    label: {
      de: 'Über uns',
      en: 'About us',
      tr: 'Hakkımızda',
      ar: 'معلومات عنا'
    }
  },
  {
    key: 'contact',
    href: '/contact',
    label: {
      de: 'Kontakt',
      en: 'Contact',
      tr: 'İletişim',
      ar: 'اتصال'
    }
  }
];
