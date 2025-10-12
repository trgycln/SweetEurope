// src/app/admin/ayarlar/sablonlar/sablon-yonetim-istemcisi.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlusCircle, FiEdit, FiTrash2, FiLoader } from 'react-icons/fi';

// Gerekli veri tiplerini tanımlıyoruz
type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

interface SablonYonetimIstemcisiProps {
  serverKategoriler: Kategori[];
  locale: string; // Çoklu dil desteği için locale bilgisi
}

export function SablonYonetimIstemcisi({ serverKategoriler, locale }: SablonYonetimIstemcisiProps) {
  const supabase = createSupabaseBrowserClient();
  
  const [seciliKategoriId, setSeciliKategoriId] = useState<string | null>(serverKategoriler[0]?.id || null);
  const [sablonlar, setSablonlar] = useState<Sablon[]>([]);
  const [isPending, startTransition] = useTransition();

  // Kategori değiştiğinde o kategoriye ait şablonları çeken fonksiyon
  useEffect(() => {
    const fetchSablonlar = async () => {
      if (!seciliKategoriId) {
        setSablonlar([]);
        return;
      }

      startTransition(async () => {
        const { data } = await supabase
          .from('kategori_ozellik_sablonlari')
          .select('*')
          .eq('kategori_id', seciliKategoriId)
          .order('sira', { ascending: true });
        setSablonlar(data || []);
      });
    };

    fetchSablonlar();
  }, [seciliKategoriId, supabase]);

  const seciliKategori = serverKategoriler.find(k => k.id === seciliKategoriId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Sol Taraf: Kategori Listesi */}
      <div className="lg:col-span-1 sticky top-24">
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <h2 className="font-serif text-xl font-bold text-primary mb-4 border-b pb-2">Kategoriler</h2>
          <ul className="space-y-1">
            {serverKategoriler.map(kategori => (
              <li key={kategori.id}>
                <button
                  onClick={() => setSeciliKategoriId(kategori.id)}
                  className={`w-full text-left p-3 rounded-md transition-colors text-sm font-semibold ${
                    seciliKategoriId === kategori.id 
                    ? 'bg-accent text-white shadow-sm' 
                    : 'text-text-main hover:bg-gray-100'
                  }`}
                >
                  {/* @ts-ignore */}
                  {kategori.ad?.[locale] || kategori.ad?.tr || 'İsimsiz Kategori'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Sağ Taraf: Seçili Kategorinin Şablonları */}
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b pb-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-primary">
                {/* @ts-ignore */}
                "{seciliKategori?.ad?.[locale] || seciliKategori?.ad?.tr || ''}" Özellikleri
              </h2>
              <p className="text-sm text-gray-500 mt-1">Bu kategori için ürün detay alanlarını yönetin.</p>
            </div>
            <button className="flex items-center gap-2 mt-4 sm:mt-0 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm">
              <FiPlusCircle size={16} />
              Yeni Özellik Ekle
            </button>
          </div>
          
          {isPending ? (
             <div className="flex justify-center items-center p-10">
                <FiLoader className="animate-spin text-4xl text-accent"/>
             </div>
          ) : (
            <div className="space-y-3">
              {sablonlar.map(sablon => (
                <div key={sablon.id} className="p-4 bg-gray-50 border border-gray-200 rounded-md flex justify-between items-center hover:border-accent transition-all">
                  <div>
                    <p className="font-semibold text-text-main">{sablon.gosterim_adi}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span>Veritabanı: <code className="font-mono bg-gray-200 px-1 rounded">{sablon.alan_adi}</code></span>
                      <span>Tip: <code className="font-mono bg-gray-200 px-1 rounded">{sablon.alan_tipi}</code></span>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button className="p-2 text-gray-500 hover:text-blue-600"><FiEdit size={16} /></button>
                    <button className="p-2 text-gray-500 hover:text-red-600"><FiTrash2 size={16} /></button>
                  </div>
                </div>
              ))}
              {sablonlar.length === 0 && (
                <div className="text-center text-gray-500 py-8 border-2 border-dashed rounded-lg">
                  <p className="font-semibold">Bu kategori için özellik tanımlanmamış.</p>
                  <p className="text-sm">Başlamak için "Yeni Özellik Ekle" butonunu kullanın.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}