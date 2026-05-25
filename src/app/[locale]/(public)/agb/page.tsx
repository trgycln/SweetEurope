import type { Metadata } from 'next';
import { getDictionary } from '@/dictionaries';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  return {
    title: `${dictionary.agbPage.title} | ElysonSweets`,
    description: 'Allgemeine Geschäftsbedingungen der Elyson Sweets GmbH i.G. für gewerbliche Kunden.',
  };
}

export default async function AgbPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dictionary = await getDictionary(locale as any);
  const t = dictionary.agbPage;
  const isRtl = locale === 'ar';

  return (
    <div className="bg-secondary text-text-main" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="relative bg-primary text-secondary text-center py-20 md:py-32">
        <h1 className="text-5xl md:text-7xl font-serif text-secondary">{t.title}</h1>
        <p className="text-secondary/60 mt-3 text-lg">{t.subtitle}</p>
      </div>

      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl font-sans">
          <div className="space-y-8 bg-white p-10 rounded-lg shadow-lg text-text-main">

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.para1Title}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{t.para1p1}</p>
              <p className="text-sm leading-relaxed text-gray-700 mt-2">{t.para1p2}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.para2Title}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{t.para2p1}</p>
              <p className="text-sm leading-relaxed text-gray-700 mt-2">{t.para2p2}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.para3Title}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{t.para3text}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.para4Title}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{t.para4p1}</p>
              <p className="text-sm leading-relaxed text-gray-700 mt-2">{t.para4p2}</p>
            </div>

            <div>
              <h2 className="text-xl font-bold font-serif text-primary mb-3">{t.para5Title}</h2>
              <p className="text-sm leading-relaxed text-gray-700">{t.para5p1}</p>
              <p className="text-sm leading-relaxed text-gray-700 mt-2">{t.para5p2}</p>
            </div>

            <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">{t.lastUpdated}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
