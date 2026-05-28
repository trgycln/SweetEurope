import Link from 'next/link';
import { FiArrowRight, FiCoffee, FiPackage, FiStar, FiAward, FiGlobe } from 'react-icons/fi';

type Category = {
  id: string;
  slug?: string | null;
  ad?: Record<string, string> | null;
  productCount?: number;
};

interface ProductLineShowcaseProps {
  locale: string;
  dictionary: any;
  categories: Category[];
}

const CERTS = ['BRC', 'Halal', 'Türk. Patent-Sieger'];

export default function ProductLineShowcase({ locale, dictionary, categories }: ProductLineShowcaseProps) {
  // Show only FO (barista-bakery-essentials) categories
  const foCategories = categories.filter((cat) =>
    [
      'sauces-and-ingredients', 'coffee', 'drinks',
      'powder-drinks', 'fruit-pastes', 'topping-decor-sauces',
      'topping-ice-cream-sauces', 'special-sauces-940g', 'fruited-sauces',
      'premium-syrups', 'cocktail-syrups', 'silvery-syrups',
      'iced-tea-syrup-bases', 'cafe-bar-sauces', 'cocktail-mixes',
      'foamer', 'special-pistachio-sauce',
    ].includes(cat.slug || '')
  );
  const totalFoProducts = foCategories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  const headline = dictionary.productLine.headline;
  const subheadline = dictionary.productLine.subheadline;
  const ctaLabel = dictionary.productLine.ctaLabel;
  const productsLabel = `${totalFoProducts}+`;

  return (
    <section className="bg-gradient-to-b from-amber-50 via-white to-teal-50/30 py-12 px-6">
      <div className="container mx-auto">
        {/* Section eyebrow */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-accent shadow-sm ring-1 ring-accent/10">
            <FiStar className="h-3.5 w-3.5" />
            {dictionary.productLine.eyebrow}
          </span>
        </div>

        {/* Single large FO brand card */}
        <Link
          href={`/${locale}/products`}
          className="group relative overflow-hidden rounded-[28px] border border-teal-200 bg-white shadow-[0_18px_50px_-24px_rgba(15,23,42,0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_26px_60px_-28px_rgba(15,23,42,0.4)] block"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/20 to-emerald-300/20 opacity-70" />
          <div className="relative bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-8 md:p-10">
            <div className="flex flex-col lg:flex-row gap-8">

              {/* Left: Brand info */}
              <div className="flex-1">
                <div className="flex items-start gap-4 mb-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 shadow-sm flex-shrink-0">
                    <FiCoffee className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] font-semibold text-teal-700 mb-1">
                      FO Food Products · Özmer A.Ş.
                    </p>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                      {headline}
                    </h3>
                  </div>
                </div>

                <p className="text-sm md:text-base leading-6 text-slate-700 mb-6 max-w-2xl">
                  {subheadline}
                </p>

                {/* Category chips */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {foCategories.slice(0, 8).map((cat) => (
                    <span
                      key={cat.id}
                      className="rounded-full border border-teal-200 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      {cat.ad?.[locale] || cat.ad?.de || cat.slug}
                    </span>
                  ))}
                  {foCategories.length > 8 && (
                    <span className="rounded-full border border-teal-200 bg-white/90 px-3 py-1 text-xs font-semibold text-teal-700 shadow-sm">
                      +{foCategories.length - 8} {dictionary.productLine.more}
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700">
                  {ctaLabel}
                  <FiArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>

              {/* Right: Stats + product count */}
              <div className="flex flex-col gap-4 lg:w-64 flex-shrink-0">
                <div className="bg-teal-600 text-white rounded-2xl px-5 py-4 text-center shadow-sm">
                  <p className="text-3xl font-bold">{productsLabel}</p>
                  <p className="text-xs font-medium uppercase tracking-widest text-teal-200 mt-1">
                    {dictionary.productLine.productsInCatalog}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: dictionary.productLine.stats.expLabel, sub: dictionary.productLine.stats.expSub },
                    { label: dictionary.productLine.stats.countriesLabel, sub: dictionary.productLine.stats.countriesSub },
                    { label: dictionary.productLine.stats.labsLabel, sub: dictionary.productLine.stats.labsSub },
                    { label: dictionary.productLine.stats.palletsLabel, sub: dictionary.productLine.stats.palletsSub },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/80 rounded-2xl px-3 py-3 text-center ring-1 ring-slate-200/70">
                      <p className="text-base font-bold text-slate-900">{s.label}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Cert badges */}
                <div className="flex flex-wrap gap-2">
                  {CERTS.map((c) => (
                    <span key={c} className="inline-flex items-center gap-1 bg-white border border-teal-200 text-teal-800 text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm">
                      <FiAward className="h-3 w-3" /> {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
