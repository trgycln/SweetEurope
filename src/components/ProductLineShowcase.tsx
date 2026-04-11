import Link from 'next/link';
import { FiArrowRight, FiCoffee, FiPackage, FiStar, FiSun } from 'react-icons/fi';
import {
  PRODUCT_LINE_ORDER,
  PRODUCT_LINE_META,
  getProductLineDescription,
  getProductLineLabel,
} from '@/lib/product-lines';

type Category = {
  id: string;
  slug?: string | null;
  ad?: Record<string, string> | null;
  productCount?: number;
};

interface ProductLineShowcaseProps {
  locale: string;
  categories: Category[];
}

const themes = {
  'frozen-desserts': {
    border: 'border-rose-200',
    surface: 'from-rose-50 via-white to-orange-50',
    badge: 'bg-rose-600 text-white',
    eyebrow: 'text-rose-700',
    chip: 'border-rose-200 bg-white/90 text-slate-700',
    cta: 'text-rose-700',
    glow: 'from-rose-300/30 to-orange-300/30',
    iconWrap: 'bg-rose-100 text-rose-700',
    statLabel: { de: 'Dessert-Linie', en: 'Dessert line', tr: 'Tatlı hattı', ar: 'خط الحلويات' },
    points: {
      de: ['Tiefkühlkette geeignet', 'Portionssicher für HoReCa', 'Ideal für Dessertkarten'],
      en: ['Cold-chain suitable', 'Portion-safe for HoReCa', 'Ideal for dessert menus'],
      tr: ['Soğuk zincire uygun', 'HoReCa için porsiyon kontrollü', 'Tatlı menüleri için ideal'],
      ar: ['مناسب لسلسلة التبريد', 'حصص ثابتة للهوريكا', 'مثالي لقوائم الحلويات'],
    },
  },
  'barista-bakery-essentials': {
    border: 'border-teal-200',
    surface: 'from-cyan-50 via-white to-emerald-50',
    badge: 'bg-teal-600 text-white',
    eyebrow: 'text-teal-700',
    chip: 'border-teal-200 bg-white/90 text-slate-700',
    cta: 'text-teal-700',
    glow: 'from-cyan-300/30 to-emerald-300/30',
    iconWrap: 'bg-teal-100 text-teal-700',
    statLabel: { de: 'Barista-Linie', en: 'Barista line', tr: 'Barista hattı', ar: 'خط الباريستا' },
    points: {
      de: ['Für Cafés & Hotels', 'Sirupe, Saucen & Zutaten', 'Schnell für Bar-Abläufe'],
      en: ['For cafés & hotels', 'Syrups, sauces & ingredients', 'Fast for bar workflows'],
      tr: ['Kafe ve oteller için', 'Şurup, sos ve hammaddeler', 'Bar operasyonuna uygun'],
      ar: ['للمقاهي والفنادق', 'شرابات وصلصات ومكونات', 'مناسب لتدفق عمل البار'],
    },
  },
} as const;

export default function ProductLineShowcase({ locale, categories }: ProductLineShowcaseProps) {
  return (
    <section className="bg-gradient-to-b from-amber-50 via-white to-rose-50/40 py-12 px-6">
      <div className="container mx-auto">
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent shadow-sm ring-1 ring-accent/10">
            <FiStar className="h-3.5 w-3.5" />
            {locale === 'de'
              ? 'Für Cafés, Hotels & Handel'
              : locale === 'en'
                ? 'For cafés, hotels & retail'
                : locale === 'ar'
                  ? 'للمقاهي والفنادق والتجزئة'
                  : 'Kafe, otel ve perakende için'}
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-serif font-bold text-slate-900">
            {locale === 'de'
              ? 'Für Desserts, Kaffee & HoReCa-Bedarf'
              : locale === 'en'
                ? 'For desserts, coffee & HoReCa supply'
                : locale === 'ar'
                  ? 'للحلويات والقهوة واحتياجات الهوريكا'
                  : 'Tatlı, kahve ve HoReCa ihtiyaçları için'}
          </h2>
          <p className="mt-3 text-sm md:text-base text-slate-600 max-w-3xl mx-auto">
            {locale === 'de'
              ? 'Desserts und Barista-Lösungen greifen ineinander – wählen Sie die Linie, die zu Ihrem Betrieb passt.'
              : locale === 'en'
                ? 'Desserts and barista solutions work hand in hand – start with the line that fits your business best.'
                : locale === 'ar'
                  ? 'الحلويات وحلول الباريستا تكمل بعضها بعضًا — ابدأ بخط المنتجات الأنسب لعملك.'
                  : 'Tatlılar ve barista çözümleri birlikte çalışır; işletmenize uygun ürün gamıyla başlayın.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {PRODUCT_LINE_ORDER.map((line) => {
            const meta = PRODUCT_LINE_META[line];
            const theme = themes[line];
            const lineCategories = categories.filter((category) =>
              meta.mainCategorySlugs.includes(category.slug || '')
            );
            const totalProducts = lineCategories.reduce(
              (sum, category) => sum + (category.productCount || 0),
              0
            );
            const Icon = line === 'frozen-desserts' ? FiSun : FiCoffee;
            const localizedPoints = theme.points[locale as keyof typeof theme.points] || theme.points.de;
            const productCountLabel = locale === 'de'
              ? `${totalProducts}+ Produkte`
              : locale === 'en'
                ? `${totalProducts}+ products`
                : locale === 'ar'
                  ? `${totalProducts}+ منتج`
                  : `${totalProducts}+ ürün`;

            return (
              <Link
                key={line}
                href={`/${locale}/products?urunGami=${line}`}
                className={`group relative overflow-hidden rounded-[28px] border ${theme.border} bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-28px_rgba(15,23,42,0.4)]`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.glow} opacity-70`} />
                <div className={`relative h-full bg-gradient-to-br ${theme.surface} p-6 md:p-7`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${theme.iconWrap}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className={`text-xs uppercase tracking-[0.25em] font-semibold ${theme.eyebrow}`}>
                          {line === 'frozen-desserts' ? 'Sweet Heaven' : 'FO'}
                        </p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900 md:text-[2rem] leading-tight">
                          {getProductLineLabel(line, locale as any)}
                        </h3>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm ${theme.badge}`}>
                        {productCountLabel}
                      </span>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        {theme.statLabel[locale as keyof typeof theme.statLabel] || theme.statLabel.de}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-sm md:text-[15px] leading-6 text-slate-700">
                    {getProductLineDescription(line, locale as any)}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                    <FiPackage className="h-4 w-4" />
                    <span>
                      {locale === 'de'
                        ? `${lineCategories.length} relevante Hauptkategorien`
                        : locale === 'en'
                          ? `${lineCategories.length} relevant main categories`
                          : locale === 'ar'
                            ? `${lineCategories.length} فئات رئيسية مرتبطة`
                            : `${lineCategories.length} ilgili ana kategori`}
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {lineCategories.map((category) => (
                      <span
                        key={category.id}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold shadow-sm ${theme.chip}`}
                      >
                        {category.ad?.[locale] || category.ad?.de || category.slug}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-2 sm:grid-cols-3">
                    {localizedPoints.map((point) => (
                      <div
                        key={point}
                        className="rounded-2xl bg-white/80 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200/70"
                      >
                        {point}
                      </div>
                    ))}
                  </div>

                  <div className={`mt-6 inline-flex items-center gap-2 text-sm font-semibold ${theme.cta}`}>
                    {locale === 'de'
                      ? 'Produktlinie öffnen'
                      : locale === 'en'
                        ? 'Open product line'
                        : locale === 'ar'
                          ? 'افتح خط المنتجات'
                          : 'Ürün gamını aç'}
                    <FiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
