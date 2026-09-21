'use client';

import { useState, useEffect, useRef } from 'react';
import { FiCoffee, FiDownload, FiLoader, FiStar } from 'react-icons/fi';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveRecipesBulk } from '@/lib/actions/recipe-actions';

interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  prep_time_minutes: number;
  category: string;
}

export default function BaristaAiClient({ locale }: { locale: string }) {
  const [ingredients, setIngredients] = useState('');
  const [concept, setConcept] = useState('');
  const [cafeName, setCafeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [productId, setProductId] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // URL'den gelen ürünü yakala ve forma otomatik doldur
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const prefilledIngredient = params.get('ingredient');
      const urlProductId = params.get('productId');
      if (prefilledIngredient) {
        setIngredients(prefilledIngredient);
      }
      if (urlProductId) {
        setProductId(urlProductId);
      }
    }
  }, []);

  const generateRecipes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients || !concept) {
      toast.error(locale === 'tr' ? 'Lütfen zorunlu alanları doldurun.' : 'Bitte füllen Sie die Pflichtfelder aus.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/barista-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, concept, cafeName, locale }),
      });

      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      if (data.recipes && data.recipes.length > 0) {
        // UI'da hemen göster ki PDF'i indirebilsin
        setRecipes(data.recipes);
        
        // Arka planda hepsini SEO için veritabanına kaydet
          const formattedRecipes = data.recipes.map((recipe: Recipe) => ({
            title: recipe.title,
            description: recipe.description,
            ingredients: recipe.ingredients,
            instructions: recipe.instructions,
            prep_time_minutes: recipe.prep_time_minutes || 5,
            category: recipe.category || 'coffee'
          }));

        // Yönlendirme yapmadan sadece kaydet
        saveRecipesBulk(formattedRecipes, locale, productId).catch(err => {
          console.error("Background save error:", err);
        });
      } else {
        throw new Error('No recipes returned');
      }
    } catch (error) {
      console.error(error);
      toast.error(locale === 'tr' ? 'Bir hata oluştu.' : 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    if (!recipes || !printRef.current) return;
    setPdfLoading(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages = printRef.current.children;

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const canvas = await html2canvas(pageEl, { 
          scale: 2, 
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        if (i > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(`${cafeName || 'Menu'}_Signature_Drinks.pdf`);
      toast.success(locale === 'tr' ? 'PDF indirildi!' : 'PDF heruntergeladen!');
    } catch (error) {
      console.error(error);
      toast.error(locale === 'tr' ? 'PDF oluşturulurken hata oluştu.' : 'Fehler beim Erstellen der PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <>
      <div className="grid lg:grid-cols-2 gap-12 items-start relative z-10">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-6 flex items-center gap-3">
            <FiCoffee className="text-amber-600" />
            {locale === 'tr' ? 'Reçete Sihirbazı' : 'Rezept-Assistent'}
          </h2>
          <form onSubmit={generateRecipes} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {locale === 'tr' ? 'Mekan Adı (Opsiyonel)' : 'Name des Cafés (Optional)'}
              </label>
              <input type="text" value={cafeName} onChange={e => setCafeName(e.target.value)} placeholder="Cafe Elysion" className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {locale === 'tr' ? 'Elinizdeki Malzemeler *' : 'Vorhandene Zutaten *'}
              </label>
              <textarea required value={ingredients} onChange={e => setIngredients(e.target.value)} placeholder={locale === 'tr' ? "Espresso, Süt, Yulaf Sütü, Çilek..." : "Espresso, Milch, Hafermilch, Erdbeeren..."} className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all h-24 resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                {locale === 'tr' ? 'Konsept / Tema *' : 'Konzept / Thema *'}
              </label>
              <input type="text" required value={concept} onChange={e => setConcept(e.target.value)} placeholder={locale === 'tr' ? "Yazlık soğuk kahveler, Alkolsüz kokteyller..." : "Sommerliche Eiskaffees, Alkoholfreie Cocktails..."} className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all" />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              {loading ? <FiLoader className="animate-spin" /> : <FiStar className="text-amber-400" />}
              {loading ? (locale === 'tr' ? 'Üretiliyor...' : 'Wird generiert...') : (locale === 'tr' ? 'İmza Reçetelerimi Yarat' : 'Signature Rezepte erstellen')}
            </button>
          </form>
        </div>

        <div className="bg-[#FAF9F6] p-8 rounded-3xl border border-stone-200 min-h-[500px] flex flex-col">
          {!recipes ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 text-center">
              <FiCoffee size={48} className="mb-4 opacity-20" />
              <p>{locale === 'tr' ? 'Uzman baristanız siparişinizi bekliyor...' : 'Unser Barista-Experte wartet auf Ihre Bestellung...'}</p>
            </div>
          ) : (
            <div className="space-y-6 flex-1">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-stone-900">{locale === 'tr' ? 'Sizin İçin Hazırlanan Menü' : 'Ihr individuelles Menü'}</h3>
                <button 
                  onClick={downloadPDF} 
                  disabled={pdfLoading}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
                >
                  {pdfLoading ? <FiLoader className="animate-spin" /> : <FiDownload />}
                  {pdfLoading ? (locale === 'tr' ? 'Hazırlanıyor...' : 'Wird erstellt...') : 'PDF İndir'}
                </button>
              </div>
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {recipes.map((recipe, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h4 className="font-bold text-lg text-amber-900">{recipe.title}</h4>
                      {recipe.category && (
                        <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full border border-amber-200 shrink-0 uppercase">
                          {recipe.category}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 mb-4">{recipe.description}</p>
                    
                    <div className="mb-4">
                      <strong className="text-xs uppercase tracking-wider text-stone-400 block mb-1.5">
                        {locale === 'tr' ? 'Malzemeler' : 'Zutaten'}
                      </strong>
                      <ul className="space-y-1">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                            <span className="text-amber-500 mt-0.5">•</span> {ing}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {recipe.instructions && recipe.instructions.length > 0 && (
                      <div className="pt-3 border-t border-stone-100">
                        <strong className="text-xs uppercase tracking-wider text-stone-400 block mb-1.5">
                          {locale === 'tr' ? 'Hazırlanışı' : 'Zubereitung'}
                        </strong>
                        <ol className="space-y-1.5 list-decimal list-inside text-sm text-stone-600">
                          {recipe.instructions.map((step, i) => (
                            <li key={i} className="leading-snug">
                              <span className="text-stone-700">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden PDF Render Container */}
      {recipes && (
        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none" style={{ width: '794px' }}>
          <div ref={printRef} className="flex flex-col gap-0 w-full">
            {recipes.map((recipe, idx) => (
              <div 
                key={idx} 
                className="w-[794px] h-[1123px] bg-white p-12 flex flex-col relative overflow-hidden shrink-0 box-border"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {/* PDF Background Decorations */}
                <div className="absolute top-0 left-0 w-full h-4 bg-amber-600" />
                <div className="absolute bottom-0 left-0 w-full h-8 bg-stone-900" />
                <div className="absolute top-20 right-10 opacity-[0.03]">
                  <FiCoffee size={300} />
                </div>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-12 border-b border-stone-100 pb-8 relative z-10">
                  <div>
                    <h1 className="text-4xl font-serif font-bold text-stone-900 mb-2">{cafeName || 'Signature Menu'}</h1>
                    <p className="text-amber-600 font-medium tracking-widest uppercase text-sm">Powered by Elysonsweets & FO</p>
                  </div>
                  <div className="text-stone-400 font-medium text-xl">
                    0{idx + 1}
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 relative z-10">
                  <div className="mb-10">
                    <h2 className="text-5xl font-serif font-bold text-amber-900 mb-4 leading-tight">{recipe.title}</h2>
                    <p className="text-xl text-stone-600 italic leading-relaxed">{recipe.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-12">
                    <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200">
                      <h3 className="text-lg font-bold text-stone-900 uppercase tracking-widest mb-6 border-b border-stone-200 pb-3">
                        {locale === 'tr' ? 'Malzemeler' : 'Zutaten'}
                      </h3>
                      <ul className="space-y-4">
                        {recipe.ingredients.map((ing, i) => (
                          <li key={i} className="text-base text-stone-800 flex items-start gap-3">
                            <span className="text-amber-500 mt-[5px] shrink-0"><FiStar size={14} className="fill-amber-500" /></span> 
                            <span className="leading-relaxed">{ing}</span>
                          </li>
                        ))}
                      </ul>
                      
                      {recipe.category && (
                        <div className="mt-8 pt-6 border-t border-stone-200">
                          <p className="text-sm font-bold text-stone-900 uppercase tracking-widest mb-1">{locale === 'tr' ? 'Kategori' : 'Kategorie'}</p>
                          <p className="text-amber-600 font-medium text-lg capitalize">{recipe.category}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-stone-900 uppercase tracking-widest mb-6 border-b border-stone-200 pb-3">
                        {locale === 'tr' ? 'Hazırlanışı' : 'Zubereitung'}
                      </h3>
                      <ul className="space-y-6">
                        {recipe.instructions.map((step, i) => (
                          <li key={i} className="text-base text-stone-700 flex items-start gap-4 leading-relaxed">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold shrink-0 mt-[2px]">
                              <span className="mb-[2px]">{i + 1}</span>
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto text-center relative z-10 pt-8">
                  <p className="text-sm text-stone-400">
                    {locale === 'tr' 
                      ? 'Bu özel reçete, profesyonel FO ürünleri ve uzman barista standartları ile hazırlanmıştır.'
                      : 'Dieses exklusive Rezept wurde mit professionellen FO-Produkten nach Barista-Standards kreiert.'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
