'use client';

import { useState, useEffect } from 'react';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  FiSettings, FiFileText, FiMessageCircle, FiRefreshCw, 
  FiSave, FiCheckCircle, FiXCircle, FiStar, FiCalendar, FiMapPin, FiBriefcase, FiTag, FiZap, FiImage, FiPackage
} from 'react-icons/fi';
import { FaGoogle } from 'react-icons/fa';

// Types
interface GbpSettings {
  id?: string;
  account_id: string | null;
  location_id: string | null;
  refresh_token: string | null;
  business_name: string | null;
  business_category: string | null;
  target_keywords: string | null;
  target_locations: string | null;
  default_post_image_url: string | null;
}

interface GbpPost {
  id: string;
  title: string;
  content: string;
  status: string;
  post_type: string;
  created_at: string;
  error_message?: string;
}

interface GbpReview {
  id: string;
  review_id: string;
  reviewer_name: string;
  star_rating: number;
  comment: string;
  reply_text: string;
  replied_at: string;
  created_at: string;
}

export default function GBPAutomationDashboard() {
  const [activeTab, setActiveTab] = useState<'settings' | 'posts' | 'reviews'>('settings');
  const [supabase] = useState(() => createDynamicSupabaseClient(true));

  // Data States
  const [settings, setSettings] = useState<GbpSettings>({
    account_id: '', location_id: '', refresh_token: '', business_name: '', business_category: '', target_keywords: '', target_locations: '', default_post_image_url: ''
  });
  const [posts, setPosts] = useState<GbpPost[]>([]);
  const [reviews, setReviews] = useState<GbpReview[]>([]);
  const [productCount, setProductCount] = useState<number>(0);
  
  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Initial Fetch
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch Settings
      const { data: dbSettings } = await supabase.from('gbp_settings').select('*').limit(1).maybeSingle();
      if (dbSettings) setSettings(dbSettings);

      // Fetch Posts
      const { data: dbPosts } = await supabase.from('google_business_posts').select('*').order('created_at', { ascending: false }).limit(20);
      if (dbPosts) setPosts(dbPosts);

      // Fetch Reviews
      const { data: dbReviews } = await supabase.from('google_business_reviews').select('*').order('created_at', { ascending: false }).limit(20);
      if (dbReviews) setReviews(dbReviews);

      // Fetch Product Count
      const { count } = await supabase.from('urunler').select('*', { count: 'exact', head: true }).eq('aktif', true);
      setProductCount(count || 0);

    } catch (error) {
      toast.error('Veriler yüklenirken bir hata oluştu.');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Actions
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (settings.id) {
        await supabase.from('gbp_settings').update(settings).eq('id', settings.id);
      } else {
        await supabase.from('gbp_settings').insert(settings);
      }
      toast.success('SEO & GEO ayarları başarıyla kaydedildi!');
      fetchDashboardData();
    } catch (error) {
      toast.error('Ayarlar kaydedilemedi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerCron = async (type: 'post' | 'review') => {
    setIsGenerating(true);
    const toastId = toast.loading(`${type === 'post' ? 'Ürün veritabanından rastgele bir ürün seçilip GEO postu üretiliyor...' : 'Yorumlar senkronize ediliyor...'}`);
    
    try {
      const endpoint = type === 'post' ? '/api/gbp/cron-post' : '/api/gbp/sync-reviews';
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'YOUR_SECRET_HERE'}` }
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'İşlem başarıyla tamamlandı!', { id: toastId });
        fetchDashboardData();
      } else {
        toast.error(data.error || 'İşlem başarısız oldu.', { id: toastId });
        fetchDashboardData(); // Refetch to show the error log card
      }
    } catch (error) {
      toast.error('Bağlantı hatası.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSimulateReviews = async () => {
    setIsSimulating(true);
    const toastId = toast.loading('AI Yanıt Simülasyonu başlatıldı. Gemini yanıt üretiyor...');
    
    try {
      const res = await fetch('/api/gbp/simulate-review');
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Simülasyon tamamlandı! Yorumlar sekmesinde görebilirsiniz.', { id: toastId });
        setReviews(data.simulatedReviews); // Temporarily overwrite UI state
      } else {
        toast.error(data.error || 'Simülasyon başarısız oldu.', { id: toastId });
      }
    } catch (error) {
      toast.error('Simülasyon bağlantı hatası.', { id: toastId });
    } finally {
      setIsSimulating(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <FiStar key={i} className={`w-4 h-4 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
    ));
  };

  const tabClass = (tab: string) => `
    flex items-center space-x-2 px-5 py-3 rounded-xl font-medium text-sm transition-all duration-200
    ${activeTab === tab 
      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}
  `;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6 mb-8 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FaGoogle className="text-blue-500" />
              <span>GBP Otonom Zeka</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Google Business Profile için SEO/GEO uyumlu otonom yönetim paneli. (Gemini 3.1 Pro)
            </p>
          </div>
          
          <div className="flex bg-gray-50/50 p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>
              <FiSettings className="w-4 h-4" /> <span>Ayarlar</span>
            </button>
            <button onClick={() => setActiveTab('posts')} className={tabClass('posts')}>
              <FiFileText className="w-4 h-4" /> <span>Gönderiler</span>
            </button>
            <button onClick={() => setActiveTab('reviews')} className={tabClass('reviews')}>
              <FiMessageCircle className="w-4 h-4" /> <span>Yorumlar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-medium">Sistem yükleniyor...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* 1. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <form onSubmit={handleSaveSettings}>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Künye & Hedefler */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><FiBriefcase className="w-5 h-5" /></div>
                        <h2 className="text-lg font-semibold text-gray-900">İşletme Künyesi & SEO</h2>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Adı</label>
                          <input type="text" value={settings.business_name || ''} onChange={e => setSettings({...settings, business_name: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm" placeholder="Örn: Elyson Sweets" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">İşletme Kategorisi</label>
                          <input type="text" value={settings.business_category || ''} onChange={e => setSettings({...settings, business_category: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm" placeholder="Örn: Butik Pastane" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FiTag className="text-gray-400"/> Hedef Anahtar Kelimeler (Virgülle ayırın)</label>
                          <input type="text" value={settings.target_keywords || ''} onChange={e => setSettings({...settings, target_keywords: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm" placeholder="Örn: taze pasta, el yapımı tatlı..." required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FiMapPin className="text-gray-400"/> Hedef Lokasyonlar (Virgülle ayırın)</label>
                          <input type="text" value={settings.target_locations || ''} onChange={e => setSettings({...settings, target_locations: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm" placeholder="Örn: Berlin, Kreuzberg..." required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><FiImage className="text-gray-400"/> Varsayılan Post Görsel URL'si</label>
                          <input type="text" value={settings.default_post_image_url || ''} onChange={e => setSettings({...settings, default_post_image_url: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm" placeholder="https://unsplash.com/photos/..." />
                          <p className="text-xs text-gray-400 mt-1">Görselsiz ürün postlarında yedek olarak kullanılır.</p>
                        </div>
                      </div>
                    </div>

                    {/* API Ayarları */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg"><FaGoogle className="w-5 h-5" /></div>
                          <h2 className="text-lg font-semibold text-gray-900">API Kimlikleri</h2>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-semibold border border-green-100">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Sistem Aktif
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Account ID</label>
                          <input type="text" value={settings.account_id || ''} onChange={e => setSettings({...settings, account_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-mono" placeholder="Örn: 1234567890" />
                          <p className="text-xs text-gray-400 mt-1">Eğer boşsa .env dosyasından okunur.</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
                          <input type="text" value={settings.location_id || ''} onChange={e => setSettings({...settings, location_id: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-mono" placeholder="Örn: 0987654321" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Token</label>
                          <textarea rows={3} value={settings.refresh_token || ''} onChange={e => setSettings({...settings, refresh_token: e.target.value})} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-xs font-mono resize-none" placeholder="1//0e..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button type="submit" disabled={isSaving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                      {isSaving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                      {isSaving ? 'Kaydediliyor...' : 'Tüm Ayarları Kaydet'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 2. POSTS TAB */}
            {activeTab === 'posts' && (
              <motion.div 
                key="posts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">Otonom Yayın Geçmişi</h3>
                      <p className="text-sm text-gray-500">Gemini 3.1 Pro tarafından üretilen ve haritalara gönderilen içerikler.</p>
                    </div>
                    {/* Ürün Veritabanı Bilgilendirmesi */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                      <FiPackage className="text-indigo-600" />
                      <span className="text-xs font-semibold text-indigo-700">Ürün Bağlantısı Aktif: {productCount} Ürün</span>
                    </div>
                  </div>
                  <button onClick={() => handleTriggerCron('post')} disabled={isGenerating} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-70">
                    {isGenerating ? <FiRefreshCw className="animate-spin" /> : <FiZap />}
                    Yapay Zekayı Tetikle (Manuel)
                  </button>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {posts.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                      Henüz otomatik bir gönderi oluşturulmamış.
                    </div>
                  ) : posts.map(post => (
                    <div key={post.id} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col ${post.status === 'FAILED' ? 'border-red-200 bg-red-50/30' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100 flex items-center gap-1.5">
                          <FiFileText /> AI Post
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <FiCalendar />
                          {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(post.created_at))}
                        </div>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-2">{post.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-4 flex-grow mb-4 leading-relaxed whitespace-pre-line">
                        {post.content}
                      </p>
                      
                      <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                        {post.status === 'PUBLISHED' ? (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FiCheckCircle className="text-green-500" /> <span className="text-green-600">Google'da Yayınlandı</span>
                          </div>
                        ) : post.status === 'SIMULATED' ? (
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <FiCheckCircle className="text-blue-500" /> <span className="text-blue-600">Simülasyon (Başarılı)</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <FiXCircle className="text-red-500" /> <span className="text-red-600">Yayınlanamadı</span>
                            </div>
                            {post.error_message && (
                              <div className="mt-1 p-2 bg-red-100 border border-red-200 rounded-lg text-xs text-red-800 break-words">
                                <strong>Hata Detayı:</strong> {post.error_message}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 3. REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <motion.div 
                key="reviews"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl border border-gray-200 shadow-sm gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Akıllı Yorum Paneli</h3>
                    <p className="text-sm text-gray-500">Müşteri yorumları ve Gemini'ın duygusal analize dayalı organik yanıtları.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSimulateReviews} disabled={isSimulating || isGenerating} className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-70">
                      {isSimulating ? <FiRefreshCw className="animate-spin" /> : <FiStar />}
                      AI Yanıt Simülasyonu Yap
                    </button>
                    <button onClick={() => handleTriggerCron('review')} disabled={isGenerating || isSimulating} className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-70">
                      {isGenerating ? <FiRefreshCw className="animate-spin" /> : <FiRefreshCw />}
                      Yorumları Senkronize Et
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {reviews.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                      Sistemde kayıtlı henüz bir yorum/yanıt bulunmuyor.
                    </div>
                  ) : reviews.map(review => (
                    <div key={review.id} className={`bg-white rounded-2xl border p-6 shadow-sm flex flex-col md:flex-row gap-6 ${review.id.startsWith('sim-') ? 'border-amber-200 bg-amber-50/20' : 'border-gray-200'}`}>
                      
                      {/* Müşteri Yorumu */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-gray-900 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                              {review.reviewer_name?.charAt(0).toUpperCase()}
                            </div>
                            {review.reviewer_name}
                          </h4>
                          <span className="text-xs text-gray-400">
                            {new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(review.created_at))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {renderStars(review.star_rating)}
                        </div>
                        <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">
                          "{review.comment || 'Puan verildi, ancak yazılı yorum bırakılmadı.'}"
                        </p>
                      </div>

                      {/* AI Yanıtı */}
                      <div className="flex-1 pl-0 md:pl-6 md:border-l border-gray-100 space-y-3 relative">
                        <div className="absolute -left-3 top-6 hidden md:flex w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center">
                          <FiMessageCircle className="w-3 h-3 text-gray-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 rounded-md text-[10px] font-bold tracking-wider uppercase flex items-center gap-1">
                            <FiZap className="w-3 h-3"/> Gemini AI Yanıtı
                          </div>
                          {review.id.startsWith('sim-') && (
                            <div className="px-2 py-1 bg-purple-50 text-purple-600 border border-purple-200 rounded-md text-[10px] font-bold tracking-wider uppercase">
                              SİMÜLASYON
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                          {review.reply_text}
                        </p>
                        <div className="text-xs text-green-600 font-medium flex items-center gap-1 mt-4">
                          <FiCheckCircle />
                          {review.id.startsWith('sim-') ? 'Simülasyon Tamamlandı' : `Google Haritalar'da Yayınlandı (${new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute:'2-digit' }).format(new Date(review.replied_at))})`}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
