'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function YeniBlogEklePage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleGenerate = async () => {
    if (!topic) return;
    setLoading(true);
    setMessage('🤖 AI makaleyi 4 dilde (DE, EN, TR, AR) yazıyor, lütfen bekleyin (yaklaşık 15-30 saniye)...');

    try {
      const res = await fetch('/api/admin/generate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✅ Makale başarıyla üretildi ve veritabanına kaydedildi!');
        setTopic('');
        // 2 saniye sonra blog listesine geri dön
        setTimeout(() => {
          router.push('/tr/admin/pazarlama/blog');
          router.refresh();
        }, 2000);
      } else {
        setMessage('❌ Hata: ' + data.error);
      }
    } catch (error) {
      setMessage('❌ Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Yapay Zeka ile Blog Üret</h1>
          <p className="text-gray-500 mt-1">Konuyu belirleyin, AI sizin için 4 dilde SEO uyumlu makale yazsın.</p>
        </div>
        <Link 
          href="/tr/admin/pazarlama/blog"
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          ← Listeye Dön
        </Link>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col gap-4">
          <label className="font-medium text-gray-700 dark:text-gray-300">
            Makale Konusu (Trend veya Sektörel Soru)
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Örn: Kafeler için içecek maliyeti nasıl hesaplanır ve kâr marjı nasıl artırılır?"
            className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
            disabled={loading}
          />
          
          <button
            onClick={handleGenerate}
            disabled={loading || !topic}
            className="mt-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-4 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Yapay Zeka İçeriği Üretiyor...
              </span>
            ) : (
              '✨ AI ile Üret ve Yayınla'
            )}
          </button>
        </div>

        {message && (
          <div className={`mt-6 p-4 rounded-lg border ${message.includes('✅') ? 'bg-green-50 border-green-200 text-green-800' : message.includes('❌') ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
