import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { 
  FiClock as Clock, 
  FiCoffee as Coffee, 
  FiChevronRight as ChevronRight, 
  FiStar, 
  FiAward, 
  FiArrowRight, 
  FiCheckCircle, 
  FiZap
} from 'react-icons/fi';
import LikeButton from '@/components/recipes/LikeButton';
import PrintButton from '@/components/recipes/PrintButton';

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

const translations = {
  tr: {
    home: 'Ana Sayfa',
    recipes: 'Reçeteler',
    signatureBadge: 'Master Barista Özel Formülü',
    prepTime: 'Hazırlama',
    minutes: 'dk',
    category: 'Kategori',
    difficulty: 'Zorluk',
    portion: 'Porsiyon',
    standardServing: '1 Porsiyon',
    easy: 'Pratik & Hızlı',
    coffee: 'Gurme Kahve',
    cocktail: 'İmza Kokteyl',
    mocktail: 'Alkolsüz Kokteyl',
    smoothie: 'Smoothie / Frozen',
    ingredients: 'Malzemeler',
    ingredientsCount: (n: number) => `${n} Malzeme`,
    instructions: 'Adım Adım Hazırlanışı',
    stepsCount: (n: number) => `${n} Adım`,
    featuredProduct: 'Reçetenin Yıldız Ürünü',
    featuredProductDesc: 'Bu içeceğin dengeli ve unutulmaz aromasını veren özel bileşen.',
    viewProduct: 'Ürünü İncele & Keşfet',
    viewRecipe: 'Reçeteyi İncele',
    baristaTipTitle: 'Usta Baristanın Püf Noktası',
    baristaTipContent: 'Şurubun zengin aromatik profilini tam olarak açığa çıkarmak için, sıcak tariflerde şurubu espresso/kahve shot’ı ile önceden hafifçe karıştırın; ardından buharla ısıtılmış kadife sütü ekleyin. Soğuk tariflerde ise shaker veya bol buzla 10-12 saniye homojen şekilde çalkalayın.',
    print: 'Reçeteyi Yazdır',
    ctaBadge: 'Kafeniz İçin Özel Tasarım',
    ctaTitle: 'Farklı Bir Konseptte İmza İçecek mi Arıyorsunuz?',
    ctaDesc: 'Elinizdeki mevcut malzemeleri girin; uzman barista sihirbazımız FO şuruplarıyla kafenize özel yeni reçeteler tasarlasın ve PDF menünüzü hazırlasın.',
    ctaButton: 'Reçete Sihirbazına Git',
    moreRecipes: 'İlginizi Çekebilecek Diğer İmza Reçeteler',
    moreRecipesDesc: 'Kafenizin menüsünü zenginleştirecek diğer özel formüller.'
  },
  de: {
    home: 'Startseite',
    recipes: 'Rezepte',
    signatureBadge: 'Master Barista Signature Rezeptur',
    prepTime: 'Zubereitung',
    minutes: 'Min.',
    category: 'Kategorie',
    difficulty: 'Schwierigkeit',
    portion: 'Portion',
    standardServing: '1 Portion',
    easy: 'Schnell & Einfach',
    coffee: 'Gourmet Kaffee',
    cocktail: 'Signature Cocktail',
    mocktail: 'Alkoholfreier Cocktail',
    smoothie: 'Smoothie / Frozen',
    ingredients: 'Zutaten',
    ingredientsCount: (n: number) => `${n} Zutaten`,
    instructions: 'Schritt-für-Schritt Zubereitung',
    stepsCount: (n: number) => `${n} Schritte`,
    featuredProduct: 'Empfohlenes Produkt',
    featuredProductDesc: 'Die Schlüsselzutat für das unverwechselbare Aroma dieses Signature Drinks.',
    viewProduct: 'Produkt ansehen & entdecken',
    viewRecipe: 'Rezept ansehen',
    baristaTipTitle: 'Tipp vom Barista-Experten',
    baristaTipContent: 'Um das feine Aromaprofil des Sirups optimal zu entfalten, rühren Sie den Sirup bei Heißgetränken direkt in den heißen Espresso ein, bevor Sie samtigen Milchschaum darübergießen. Bei Kaltgetränken kräftig mit viel Eis im Shaker aufschlagen.',
    print: 'Rezept drucken',
    ctaBadge: 'Exklusiv für Ihr Café',
    ctaTitle: 'Möchten Sie weitere maßgeschneiderte Signature Drinks?',
    ctaDesc: 'Geben Sie Ihre Zutaten ein und lassen Sie sich in Sekundenschnelle individuelle Rezepturen und PDF-Menükarten von unserem Barista-Assistenten erstellen.',
    ctaButton: 'Zum Rezept-Assistenten',
    moreRecipes: 'Weitere Signature-Kreationen entdecken',
    moreRecipesDesc: 'Inspirierende Rezepte für Ihre professionelle Barkarte.'
  },
  en: {
    home: 'Home',
    recipes: 'Recipes',
    signatureBadge: 'Master Barista Signature Recipe',
    prepTime: 'Prep Time',
    minutes: 'min',
    category: 'Category',
    difficulty: 'Difficulty',
    portion: 'Portion',
    standardServing: '1 Serving',
    easy: 'Quick & Easy',
    coffee: 'Gourmet Coffee',
    cocktail: 'Signature Cocktail',
    mocktail: 'Mocktail',
    smoothie: 'Smoothie / Frozen',
    ingredients: 'Ingredients',
    ingredientsCount: (n: number) => `${n} Ingredients`,
    instructions: 'Step-by-Step Instructions',
    stepsCount: (n: number) => `${n} Steps`,
    featuredProduct: 'Featured Product',
    featuredProductDesc: 'The defining ingredient delivering the signature aroma and balance.',
    viewProduct: 'View Product Details',
    viewRecipe: 'View Recipe',
    baristaTipTitle: 'Master Barista Pro Tip',
    baristaTipContent: 'To unlock the full aromatic spectrum of the syrup, mix it directly into the hot espresso before adding steamed milk. For cold iced recipes, shake vigorously with plenty of ice for 10-12 seconds.',
    print: 'Print Recipe',
    ctaBadge: 'Custom Menu Creation',
    ctaTitle: 'Looking for a custom signature drink for your cafe?',
    ctaDesc: 'Enter your available ingredients and generate high-margin signature drink recipes with branded PDF menus instantly.',
    ctaButton: 'Launch Recipe Wizard',
    moreRecipes: 'Discover More Signature Recipes',
    moreRecipesDesc: 'Elevate your cafe menu with more barista-crafted creations.'
  },
  ar: {
    home: 'الرئيسية',
    recipes: 'الوصفات',
    signatureBadge: 'وصفة حصرية من خبير الباريستا',
    prepTime: 'التحضير',
    minutes: 'دقيقة',
    category: 'التصنيف',
    difficulty: 'المستوى',
    portion: 'الحصة',
    standardServing: 'حصة واحدة',
    easy: 'سريع وسهل',
    coffee: 'قهوة فاخرة',
    cocktail: 'كوكتيل حصري',
    mocktail: 'كوكتيل بدون كحول',
    smoothie: 'سموذي / فروزن',
    ingredients: 'المكونات',
    ingredientsCount: (n: number) => `${n} مكونات`,
    instructions: 'طريقة التحضير خطوة بخطوة',
    stepsCount: (n: number) => `${n} خطوات`,
    featuredProduct: 'المنتج المميز',
    featuredProductDesc: 'المكون الأساسي الذي يمنح هذا المشروب توازنه ونكهته المميزة.',
    viewProduct: 'عرض تفاصيل المنتج',
    viewRecipe: 'عرض الوصفة',
    baristaTipTitle: 'نصيحة الباريستا المحترف',
    baristaTipContent: 'لإبراز النكهة العطرية الكاملة للشراب، امزجه جيداً مع جرعة الإسبريسو الساخنة قبل إضافة الحليب المبخر. أما في المشروبات الباردة، فرجه جيداً مع الثلج في الشيكر.',
    print: 'طباعة الوصفة',
    ctaBadge: 'مخصص لمقهاك',
    ctaTitle: 'هل تبحث عن وصفات مميزة أخرى لمقهاك؟',
    ctaDesc: 'أدخل مكوناتك المتوفرة ودع مساعد الباريستا يبتكر لك وصفات فريدة وقوائم مشروبات فورية.',
    ctaButton: 'فتح صانع الوصفات',
    moreRecipes: 'استكشف المزيد من الوصفات الحصرية',
    moreRecipesDesc: 'وصفات استثنائية تثري قائمة مقهاك.'
  }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: recipe } = await supabase
    .from('recipes')
    .select('title, description')
    .eq('slug', slug)
    .eq('locale', locale)
    .single();

  if (!recipe) return {};

  return {
    title: `${recipe.title} | Elysonsweets Signature Recipe Library`,
    description: recipe.description,
  };
}

export default async function RecipePage({ params }: Props) {
  const { locale, slug } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const t = translations[locale as keyof typeof translations] || translations.de;

  const { data: recipe } = await supabase
    .from('recipes')
    .select('*, urunler(id, slug, ad, ana_resim_url)')
    .eq('slug', slug)
    .eq('locale', locale)
    .single();

  if (!recipe) notFound();

  // Diğer önerilen reçeteleri getir
  const { data: moreRecipes } = await supabase
    .from('recipes')
    .select('id, slug, title, description, prep_time_minutes, category, likes_count')
    .eq('locale', locale)
    .neq('id', recipe.id)
    .order('likes_count', { ascending: false })
    .limit(3);

  // Google Schema
  const recipeSchema = {
    "@context": "https://schema.org/",
    "@type": "Recipe",
    "name": recipe.title,
    "description": recipe.description,
    "author": {
      "@type": "Organization",
      "name": "Elysonsweets"
    },
    "prepTime": `PT${recipe.prep_time_minutes || 5}M`,
    "recipeIngredient": recipe.ingredients,
    "recipeInstructions": (recipe.instructions || []).map((step: string, index: number) => ({
      "@type": "HowToStep",
      "text": step,
      "position": index + 1
    }))
  };

  const getUrunAdi = () => {
    if (!recipe.urunler || !recipe.urunler.ad) return '';
    const ad: any = recipe.urunler.ad;
    if (typeof ad === 'string') return ad;
    return ad[locale] || ad['de'] || ad['tr'] || ad['en'] || '';
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'coffee': return t.coffee;
      case 'cocktail': return t.cocktail;
      case 'mocktail': return t.mocktail;
      case 'smoothie': return t.smoothie;
      default: return cat || t.coffee;
    }
  };

  const urunAdi = getUrunAdi();

  return (
    <div className="min-h-screen bg-[#FBF9F5] text-stone-800 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema) }} />

      {/* Hero Accent Glow */}
      <div className="relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent print:bg-white print:from-white print:to-white pt-8 pb-12 border-b border-amber-100/50 print:border-b print:border-stone-200 print:pt-0 print:pb-2 print:overflow-visible">
        <div className="container mx-auto px-4 max-w-5xl print:max-w-none print:px-0">
          {/* Breadcrumb Navigation - Baskıda gereksiz, alan tasarrufu için gizle */}
          <nav className="flex items-center space-x-2 text-xs md:text-sm text-stone-500 mb-8 print:hidden">
            <Link href={`/${locale}`} className="hover:text-amber-700 transition-colors font-medium">
              {t.home}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <Link href={`/${locale}/recipes`} className="hover:text-amber-700 transition-colors font-medium">
              {t.recipes}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-amber-900 font-semibold truncate max-w-[200px] sm:max-w-none">
              {recipe.title}
            </span>
          </nav>

          {/* Top Badges & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 print:mb-1">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-300/40 text-amber-900 text-xs font-bold uppercase tracking-wider shadow-sm print:bg-amber-50 print:border-amber-300 print:py-0.5 print:px-2 print:text-[9px] print:shadow-none">
              <FiZap className="text-amber-600 w-3.5 h-3.5 print:w-3 print:h-3" />
              <span>{t.signatureBadge}</span>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              <PrintButton label={t.print} />
              <LikeButton recipeId={recipe.id} initialLikes={recipe.likes_count || 0} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-stone-900 leading-[1.15] mb-5 tracking-tight print:text-2xl print:mb-1 print:leading-snug print:text-black">
            {recipe.title}
          </h1>

          {/* Sensory Description */}
          {recipe.description && (
            <p className="text-lg md:text-xl text-stone-600 font-serif italic max-w-3xl leading-relaxed border-l-2 border-amber-500/50 pl-4 py-1 mb-8 print:text-[11px] print:leading-snug print:mb-2 print:py-0 print:border-l-amber-600 print:text-stone-800">
              &ldquo;{recipe.description}&rdquo;
            </p>
          )}

          {/* Quick Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 pt-2 print:grid-cols-4 print:gap-2 print:pt-0 print:mb-0">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center gap-3.5 print:bg-white print:p-1.5 print:rounded-lg print:border-stone-200 print:shadow-none print:gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0 print:w-6 print:h-6 print:bg-amber-50 print:rounded-md">
                <Clock className="w-5 h-5 print:w-3.5 print:h-3.5 text-amber-700" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 print:text-[8px] print:text-stone-500">{t.prepTime}</p>
                <p className="text-sm md:text-base font-bold text-stone-900 print:text-[11px] print:text-black">{recipe.prep_time_minutes || 5} {t.minutes}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center gap-3.5 print:bg-white print:p-1.5 print:rounded-lg print:border-stone-200 print:shadow-none print:gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0 print:w-6 print:h-6 print:bg-amber-50 print:rounded-md">
                <Coffee className="w-5 h-5 print:w-3.5 print:h-3.5 text-amber-700" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 print:text-[8px] print:text-stone-500">{t.category}</p>
                <p className="text-sm md:text-base font-bold text-stone-900 print:text-[11px] print:text-black">{getCategoryLabel(recipe.category)}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center gap-3.5 print:bg-white print:p-1.5 print:rounded-lg print:border-stone-200 print:shadow-none print:gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0 print:w-6 print:h-6 print:bg-amber-50 print:rounded-md">
                <FiStar className="w-5 h-5 print:w-3.5 print:h-3.5 text-amber-700" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 print:text-[8px] print:text-stone-500">{t.difficulty}</p>
                <p className="text-sm md:text-base font-bold text-stone-900 print:text-[11px] print:text-black">{t.easy}</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-stone-200/80 shadow-sm flex items-center gap-3.5 print:bg-white print:p-1.5 print:rounded-lg print:border-stone-200 print:shadow-none print:gap-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-700 shrink-0 print:w-6 print:h-6 print:bg-amber-50 print:rounded-md">
                <FiAward className="w-5 h-5 print:w-3.5 print:h-3.5 text-amber-700" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 print:text-[8px] print:text-stone-500">{t.portion}</p>
                <p className="text-sm md:text-base font-bold text-stone-900 print:text-[11px] print:text-black">{t.standardServing}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Recipe Content Grid */}
      <div className="container mx-auto px-4 max-w-5xl mt-10 print:mt-2 print:max-w-none print:px-0">
        <div className="grid lg:grid-cols-12 gap-8 items-start recipe-print-container">
          
          {/* Left Column: Ingredients & Featured Product (5 Columns) */}
          <div className="lg:col-span-5 space-y-6 print:space-y-2 recipe-print-left">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-stone-200/80 relative overflow-hidden print:p-3 print:rounded-lg print:border-stone-200 print:shadow-none">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 print:hidden" />
              
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 print:mb-2 print:pb-1.5 print:border-stone-200">
                <h2 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2 print:text-xs print:font-bold">
                  <span>{t.ingredients}</span>
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 print:border-amber-300 print:text-[9px] print:px-2 print:py-0.5">
                  {t.ingredientsCount(recipe.ingredients?.length || 0)}
                </span>
              </div>

              <ul className="space-y-3.5 print:space-y-1">
                {(recipe.ingredients || []).map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-stone-800 text-sm md:text-base group print:text-[10px] print:gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-white transition-all print:w-3.5 print:h-3.5 print:text-amber-700 print:bg-transparent">
                      <FiCheckCircle className="w-3.5 h-3.5 text-amber-700" />
                    </span>
                    <span className="leading-snug print:text-black">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Featured Product Card */}
            {recipe.urunler && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-3xl p-6 border border-amber-200/60 shadow-sm relative overflow-hidden group print:bg-stone-50/50 print:p-2.5 print:rounded-lg print:border-stone-200 print:shadow-none">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 mb-3 print:mb-1 print:text-[8px]">
                  <FiStar className="text-amber-500 fill-amber-500 w-3.5 h-3.5 print:w-2.5 print:h-2.5" />
                  <span>{t.featuredProduct}</span>
                </div>

                <div className="flex items-center gap-4 mb-4 print:mb-0 print:gap-2.5">
                  {recipe.urunler.ana_resim_url && (
                    <div className="w-20 h-24 bg-white rounded-2xl p-2 border border-amber-200/40 shadow-sm shrink-0 flex items-center justify-center overflow-hidden print:w-10 print:h-12 print:p-0.5 print:border-stone-200 print:rounded-md">
                      <img 
                        src={recipe.urunler.ana_resim_url} 
                        alt={urunAdi} 
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 text-base leading-snug truncate group-hover:text-amber-700 transition-colors print:text-xs print:text-black">
                      {urunAdi}
                    </h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2 print:text-[9px] print:text-stone-600 print:line-clamp-2">
                      {t.featuredProductDesc}
                    </p>
                  </div>
                </div>

                {/* Kağıt çıktıda tıklanamayacak web butonunu baskıda gizle */}
                <Link
                  href={`/${locale}/products/${recipe.urunler.slug}`}
                  className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-white font-medium py-3 px-4 rounded-xl text-sm transition-all duration-300 shadow-sm group-hover:shadow-md print:hidden"
                >
                  <span>{t.viewProduct}</span>
                  <FiArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: Instructions & Barista Tips (7 Columns) */}
          <div className="lg:col-span-7 space-y-6 print:space-y-2 recipe-print-right">
            <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-stone-200/80 print:p-3 print:rounded-lg print:border-stone-200 print:shadow-none">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-100 print:mb-2 print:pb-1.5 print:border-stone-200">
                <h2 className="text-xl font-serif font-bold text-stone-900 print:text-xs print:font-bold">
                  {t.instructions}
                </h2>
                <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 text-stone-700 rounded-full print:border print:border-stone-200 print:text-[9px] print:px-2 print:py-0.5">
                  {t.stepsCount(recipe.instructions?.length || 0)}
                </span>
              </div>

              <div className="space-y-6 print:space-y-1.5">
                {(recipe.instructions || []).map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-4 group print:gap-2">
                    <span className="w-9 h-9 rounded-2xl bg-stone-900 text-amber-400 font-serif font-bold text-base flex items-center justify-center shrink-0 shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-colors duration-300 print:w-4 print:h-4 print:text-[9px] print:rounded print:bg-stone-800 print:text-amber-300 print:shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 pt-1 print:pt-0">
                      <p className="text-stone-700 leading-relaxed text-sm md:text-base font-sans print:text-[10px] print:leading-snug print:text-black">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Barista Pro Tip Callout Box */}
            <div className="print:hidden bg-amber-500/10 rounded-3xl p-6 md:p-8 border border-amber-300/40 relative overflow-hidden">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-stone-900 flex items-center justify-center shrink-0 font-bold shadow-sm">
                  💡
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base mb-1.5">
                    {t.baristaTipTitle}
                  </h3>
                  <p className="text-stone-700 text-sm md:text-base leading-relaxed">
                    {t.baristaTipContent}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Print Only Footer */}
        <div className="hidden print:flex items-center justify-between pt-2 mt-3 border-t border-stone-200 text-[8px] text-stone-400">
          <span>Elysonsweets B2B HORECA • www.elysonsweets.de</span>
          <span>{recipe.title} • {t.signatureBadge}</span>
        </div>

        {/* CTA Banner: Create Your Own Custom Recipe */}
        <div className="mt-16 print:hidden bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white rounded-3xl p-8 md:p-12 shadow-xl border border-stone-800 relative overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-5 pointer-events-none text-white">
            <Coffee size={320} />
          </div>

          <div className="relative z-10 max-w-2xl">
            <span className="inline-block text-amber-400 text-xs font-bold uppercase tracking-widest mb-3">
              {t.ctaBadge}
            </span>
            <h2 className="text-2xl md:text-4xl font-serif font-bold text-white mb-4 leading-tight">
              {t.ctaTitle}
            </h2>
            <p className="text-stone-300 text-sm md:text-base mb-8 leading-relaxed">
              {t.ctaDesc}
            </p>
            <Link
              href={`/${locale}/barista-ai`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold py-3.5 px-7 rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] hover:-translate-y-0.5"
            >
              <span>{t.ctaButton}</span>
              <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* More Related Signature Recipes */}
        {moreRecipes && moreRecipes.length > 0 && (
          <div className="mt-16 pt-12 border-t border-stone-200 print:hidden">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900">
                {t.moreRecipes}
              </h2>
              <p className="text-stone-500 text-sm mt-1">
                {t.moreRecipesDesc}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {moreRecipes.map((item) => (
                <Link
                  key={item.id}
                  href={`/${locale}/recipes/${item.slug}`}
                  className="group bg-white rounded-2xl p-6 border border-stone-200/80 shadow-sm hover:shadow-md hover:border-amber-400/50 transition-all duration-300 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        {getCategoryLabel(item.category)}
                      </span>
                      <span className="text-xs text-stone-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        {item.prep_time_minutes || 5} {t.minutes}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-stone-900 text-lg group-hover:text-amber-700 transition-colors line-clamp-1 mb-2">
                      {item.title}
                    </h3>
                    <p className="text-stone-500 text-sm line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-amber-700 group-hover:text-amber-600">
                    <span>{t.viewRecipe}</span>
                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
