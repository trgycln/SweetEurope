'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Güvenli istemci (Yalnızca herkese açık RLS için veya kendi session'ını kullanması için)
// Ancak bu admin paneli olduğu için veriyi API üzerinden güncellemek en doğrusu.
// Şimdilik sadece Yayın Durumu ve basit başlıkları güncellemek için API kullanalım.

export default function BlogDuzenlePage({ params }: { params: Promise<{ id: string; locale: string }> }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const [id, setId] = useState<string>('');
  const [locale, setLocale] = useState<string>('');

  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      setLocale(p.locale);
      fetchBlog(p.id);
    });
  }, [params]);

  const fetchBlog = async (blogId: string) => {
    // RLS sebebiyle veriyi admin API'den çekmek daha garantili ama şimdilik doğrudan
    // get yapabiliriz eğer tablo SELECT'e açıksa. (Bloglar genellikle açıktır).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: blog, error } = await supabase
      .from('blog_yazilari')
      .select('*')
      .eq('id', blogId)
      .single();

    if (blog) {
      setData(blog);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/update-blog', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          is_published: data.is_published,
        }),
      });
      const result = await res.json();
      if (result.success) {
        alert('Başarıyla güncellendi!');
        router.push(`/${locale}/admin/pazarlama/blog`);
        router.refresh();
      } else {
        alert('Hata: ' + result.error);
      }
    } catch (e) {
      alert('Kayıt başarısız oldu.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Yükleniyor...</div>;
  if (!data) return <div className="p-8 text-red-500">Blog bulunamadı!</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold mb-6">Blog Yazısını Düzenle</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Almanca Başlık (Referans)
          </label>
          <input
            type="text"
            readOnly
            value={data.title?.de || ''}
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Türkçe Başlık (Referans)
          </label>
          <input
            type="text"
            readOnly
            value={data.title?.tr || ''}
            className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-500"
          />
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <strong>Not:</strong> Blog içerikleri AI tarafından JSON formatında çok dilli üretildiği için şu an manuel metin düzenlemesi (WYSIWYG) kapalıdır. İsterseniz yazıyı silebilir veya yayından kaldırabilirsiniz.
        </div>

        <div className="flex items-center gap-3 mt-4">
          <input
            type="checkbox"
            id="is_published"
            checked={data.is_published}
            onChange={(e) => setData({ ...data, is_published: e.target.checked })}
            className="w-5 h-5 text-accent rounded focus:ring-accent"
          />
          <label htmlFor="is_published" className="text-gray-900 font-medium cursor-pointer">
            Yazıyı Yayınla (Herkese Açık)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <button
            onClick={() => router.push(`/${locale}/admin/pazarlama/blog`)}
            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 text-white bg-accent hover:bg-accent/90 rounded-lg font-medium disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
