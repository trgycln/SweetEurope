'use client';

import { useState } from 'react';
import Image from 'next/image';
import { submitWaitlistForm, updateWaitlistPreferences } from '@/app/actions/waitlist';
import { toast } from 'sonner';

export default function ComingSoonLandingPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    firma_adi: '',
    yetkili_kisi: '',
    email: '',
  });
  const [waitlistId, setWaitlistId] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [prefSubmitting, setPrefSubmitting] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const productCategoryOptions: { key: string; label: string; description: string }[] = [
    { key: 'cakes', label: 'Kuchen & Torten', description: 'Cheesecake, Schokoladenkuchen, Saisonklassiker' },
    { key: 'cookies', label: 'Cookies & Muffins', description: 'Weiche Cookies, Premium Muffins' },
    { key: 'coffee', label: 'Kaffee', description: 'Aromatische Röstungen für Cafés' },
    { key: 'drinks', label: 'Getränke', description: 'Erfrischende Begleiter und Spezialsorten' },
  ];

  const heroProducts: { slug: string; name: string }[] = [
    { slug: 'san-sebastian', name: 'San Sebastian Cheesecake' },
    { slug: 'lotus-magnolia', name: 'Lotus Magnolia' },
    { slug: 'premium-kaffee', name: 'Premium Kaffee' },
    { slug: 'premium-getraenke', name: 'Premium Getränke' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await submitWaitlistForm(formData);

      if (result.success && result.id) {
        setWaitlistId(result.id);
        toast.success(result.message);
        // İlk formu temizle ama ID sakla
        setFormData({ firma_adi: '', yetkili_kisi: '', email: '' });
        // Tercih modalını aç
        setShowPreferences(true);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const toggleCategory = (key: string) => {
    setSelectedCategories(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);
  };

  const toggleProduct = (slug: string) => {
    setSelectedProducts(prev => prev.includes(slug) ? prev.filter(p => p !== slug) : [...prev, slug]);
  };

  const handlePreferencesSubmit = async () => {
    if (!waitlistId) {
      toast.error('Kayıt ID bulunamadı.');
      return;
    }
    setPrefSubmitting(true);
    try {
      const result = await updateWaitlistPreferences(waitlistId, {
        categories: selectedCategories,
        specific_products: selectedProducts,
      });
      if (result.success) {
        toast.success('Tercihler kaydedildi. Teşekkürler!');
        setShowPreferences(false);
        setSelectedCategories([]);
        setSelectedProducts([]);
        setWaitlistId(null);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      toast.error('Tercihler kaydedilemedi.');
    } finally {
      setPrefSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary via-primary/95 to-primary/90 pt-8">
      {/* Hero Section with Background */}
      <div className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black/40 z-10" />
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover z-0"
            poster="/categories/cakes-and-tarts.jpg"
          >
            <source src="/hero-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="rounded-full shadow-2xl border-8 border-white bg-white overflow-hidden flex items-center justify-center" style={{width: '180px', height: '180px'}}>
              <img src="/Logo.jpg" alt="ElysonSweets Logo" width={180} height={180} style={{objectFit: 'cover', objectPosition: 'center', transform: 'scale(1.18)', width: '100%', height: '100%'}} />
            </div>
          </div>

          {/* Company Name */}
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-2xl tracking-wide">
            ElysonSweets
          </h1>

          {/* Main Headline */}
          <h2 className="text-3xl md:text-4xl font-bold text-accent mb-4 drop-shadow-lg">
            Köln's neuer Partner für Premium-Desserts
          </h2>

          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto drop-shadow-md">
            Wir bringen exklusive Sweet Heaven Qualität in Ihr Café. <span className="font-bold text-accent">Bald verfügbar!</span>
          </p>

          {/* Value Proposition */}
          <div className="bg-white/10 backdrop-blur-md border-2 border-accent/50 rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl">
            <p className="text-lg md:text-xl text-white font-semibold leading-relaxed">
              Sichern Sie sich jetzt Ihren Platz auf der Warteliste und erhalten Sie zum Start ein <span className="text-accent font-bold">kostenloses Probierpaket</span> für Ihre Gastronomie.
            </p>
          </div>
        </div>
      </div>

      {/* Registration Form Section */}
      <div className="relative z-10 py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-3xl md:text-4xl font-bold text-primary text-center mb-8">
              Jetzt vormerken & Muster sichern
            </h3>

            <form onSubmit={handleSubmit} className="bg-gray-50 rounded-2xl shadow-xl p-8 space-y-6 border-2 border-accent/20">
              <div>
                <label htmlFor="firma_adi" className="block text-sm font-bold text-gray-700 mb-2">
                  Firma Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="firma_adi"
                  name="firma_adi"
                  value={formData.firma_adi}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  placeholder="Ihre Firma"
                />
              </div>

              <div>
                <label htmlFor="yetkili_kisi" className="block text-sm font-bold text-gray-700 mb-2">
                  Ansprechpartner <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="yetkili_kisi"
                  name="yetkili_kisi"
                  value={formData.yetkili_kisi}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  placeholder="Ihr Name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                  E-Mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                  placeholder="ihre@email.de"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-accent hover:bg-accent/90 text-primary font-bold py-4 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-lg"
              >
                {isSubmitting ? 'Wird gesendet...' : 'Jetzt vormerken & Muster sichern'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Product Showcase Section */}
      <div className="relative z-10 py-16 bg-gradient-to-b from-white to-gray-100">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl md:text-4xl font-bold text-primary text-center mb-4">
            Unsere Premium-Auswahl
          </h3>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Tiefgekühlt. Frisch. Ohne Verlust.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {/* Product 1 */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all border-2 border-accent/10">
              <div className="relative h-64">
                <Image
                  src="/categories/cakes-and-tarts.jpg"
                  alt="San Sebastian Cheesecake"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 text-center">
                <h4 className="text-xl font-bold text-primary mb-2">San Sebastian Cheesecake</h4>
                <p className="text-sm text-gray-600">Cremig, karamellisiert, unvergesslich</p>
              </div>
            </div>

            {/* Product 2 */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all border-2 border-accent/10">
              <div className="relative h-64">
                <Image
                  src="/categories/cookies-and-muffins.jpg"
                  alt="Lotus Magnolia"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 text-center">
                <h4 className="text-xl font-bold text-primary mb-2">Lotus Magnolia</h4>
                <p className="text-sm text-gray-600">Knusprig, süß, unwiderstehlich</p>
              </div>
            </div>

            {/* Product 3 */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all border-2 border-accent/10">
              <div className="relative h-64">
                <Image
                  src="/categories/coffee.jpg"
                  alt="Premium Kaffee"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 text-center">
                <h4 className="text-xl font-bold text-primary mb-2">Premium Kaffee</h4>
                <p className="text-sm text-gray-600">Aromatisch, vollmundig, perfekt</p>
              </div>
            </div>

            {/* Product 4 */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all border-2 border-accent/10">
              <div className="relative h-64">
                <Image
                  src="/categories/drinks.jpg"
                  alt="Erfrischende Getränke"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 text-center">
                <h4 className="text-xl font-bold text-primary mb-2">Premium Getränke</h4>
                <p className="text-sm text-gray-600">Erfrischend, vielfältig, hochwertig</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Section */}
      <div className="relative z-10 py-12 bg-primary text-white border-t-4 border-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h4 className="text-2xl font-bold mb-4">Folgen Sie uns</h4>
          <div className="flex justify-center space-x-6 mb-8">
            {/* Social Media Icons - placeholder links */}
            <a href="#" className="hover:text-accent transition-colors text-3xl">📷</a>
            <a href="#" className="hover:text-accent transition-colors text-3xl">📘</a>
            <a href="#" className="hover:text-accent transition-colors text-3xl">💼</a>
          </div>
          <p className="text-white/80 mb-2">
            <a href="mailto:info@elysonsweets.de" className="hover:text-accent transition-colors">
              info@elysonsweets.de
            </a>
          </p>
          <p className="text-white/60 text-sm">
            © 2025 ElysonSweets. Alle Rechte vorbehalten.
          </p>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-5 text-white">
              <h3 className="text-2xl font-bold mb-1">Danke! 🎉</h3>
              <p className="text-sm text-white/90">Wählen Sie jetzt, was Sie in Ihrem kostenlosen Probierpaket testen möchten.</p>
            </div>
            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Kategoriler */}
              <div>
                <h4 className="text-lg font-semibold text-primary mb-3">Produktkategorien</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {productCategoryOptions.map(cat => {
                    const active = selectedCategories.includes(cat.key);
                    return (
                      <button
                        type="button"
                        key={cat.key}
                        onClick={() => toggleCategory(cat.key)}
                        className={`text-left rounded-xl border-2 p-4 transition-all shadow-sm hover:shadow-md ${active ? 'border-accent bg-accent/10' : 'border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`font-bold ${active ? 'text-primary' : 'text-gray-800'}`}>{cat.label}</span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'}`}>{active ? 'Seçildi' : 'Seç'}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">{cat.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Öne Çıkan Ürünler */}
              <div>
                <h4 className="text-lg font-semibold text-primary mb-3">Öne Çıkan Ürünler</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {heroProducts.map(prod => {
                    const active = selectedProducts.includes(prod.slug);
                    return (
                      <button
                        key={prod.slug}
                        type="button"
                        onClick={() => toggleProduct(prod.slug)}
                        className={`flex items-center justify-between w-full rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${active ? 'border-accent bg-accent/10 text-primary' : 'border-gray-200 bg-white text-gray-700 hover:border-accent/50'}`}
                      >
                        {prod.name}
                        <span className={`text-xs px-2 py-1 rounded-full ${active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500'}`}>{active ? '✓' : '+'}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPreferences(false); setSelectedCategories([]); setSelectedProducts([]); setWaitlistId(null); }}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                  disabled={prefSubmitting}
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handlePreferencesSubmit}
                  disabled={prefSubmitting}
                  className="flex-1 px-4 py-3 rounded-lg bg-accent text-primary font-bold shadow hover:bg-accent/90 transition-colors disabled:opacity-50"
                >
                  {prefSubmitting ? 'Kaydediliyor...' : 'Seçimi Tamamla'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
