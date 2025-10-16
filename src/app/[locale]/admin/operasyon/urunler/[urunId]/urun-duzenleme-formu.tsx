// src/app/admin/operasyon/urunler/[urunId]/urun-duzenleme-formu.tsx
'use client';

import { useState, useTransition } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiArrowLeft, FiEdit, FiSave, FiX, FiInfo, FiClipboard, FiDollarSign, FiLoader, FiCheckCircle } from 'react-icons/fi';
import { updateUrunAction } from '../actions';

type Urun = Tables<'urunler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

interface UrunDuzenlemeFormuProps {
  serverUrun: Urun;
  serverSablon: Sablon[];
}

// YENİ: Dilleri ve gösterim adlarını yönetmek için bir dizi
const diller = [
  { kod: 'de', ad: 'Almanca' },
  { kod: 'en', ad: 'İngilizce' },
  { kod: 'tr', ad: 'Türkçe' },
  { kod: 'ar', ad: 'Arapça' },
];

export function UrunDuzenlemeFormu({ serverUrun, serverSablon }: UrunDuzenlemeFormuProps) {
  const [editMode, setEditMode] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [aktifDil, setAktifDil] = useState('de'); // YENİ: Aktif dil sekmesini tutan state

  const handleFormSubmit = (formData: FormData) => {
    setFormMessage(null);
    startTransition(async () => {
      const result = await updateUrunAction(serverUrun.id, formData);
      if (result.success) {
        setFormMessage({ type: 'success', text: result.message });
        setEditMode(false);
      } else {
        setFormMessage({ type: 'error', text: result.message });
      }
    });
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/operasyon/urunler" className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 transition-colors">
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="font-serif text-4xl font-bold text-primary">{serverUrun.ad?.['tr'] || 'İsimsiz Ürün'}</h1>
            <p className="text-text-main/80 mt-1">Ürün Detayları ve Düzenleme</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          {editMode ? (
            <>
              <button onClick={() => setEditMode(false)} disabled={isPending} className="flex w-full justify-center items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold text-sm disabled:opacity-50">
                <FiX /> İptal
              </button>
              <button type="submit" form="urun-formu" disabled={isPending} className="flex w-full justify-center items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:bg-green-400">
                {isPending ? <FiLoader className="animate-spin" /> : <FiSave />}
                {isPending ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </>
          ) : (
            <button onClick={() => { setEditMode(true); setFormMessage(null); }} className="flex w-full justify-center items-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md font-bold text-sm">
              <FiEdit /> Düzenle
            </button>
          )}
        </div>
      </header>

      {formMessage && (
        <div className={`p-4 rounded-md text-sm font-semibold flex items-center gap-3 ${formMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <FiCheckCircle />
          {formMessage.text}
        </div>
      )}

      <form id="urun-formu" action={handleFormSubmit} className="space-y-10">
        
        {/* YENİ: Çok Dilli İçerik Bölümü (Sekmeli Yapı) */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="font-serif text-2xl font-bold text-primary mb-2 flex items-center gap-3"><FiInfo />Ürün Bilgileri</h2>
          {/* Sekme Butonları */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              {diller.map((dil) => (
                <button
                  key={dil.kod}
                  type="button"
                  onClick={() => setAktifDil(dil.kod)}
                  className={`${
                    aktifDil === dil.kod
                      ? 'border-accent text-accent'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {dil.ad}
                </button>
              ))}
            </nav>
          </div>

          {/* Sekme İçerikleri */}
          <div className="space-y-6">
            {diller.map((dil) => (
              <div key={dil.kod} className={aktifDil === dil.kod ? '' : 'hidden'}>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Ürün Adı ({dil.kod.toUpperCase()})</label>
                    <input type="text" name={`ad_${dil.kod}`} defaultValue={serverUrun.ad?.[dil.kod] || ''} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Açıklama ({dil.kod.toUpperCase()})</label>
                    <textarea name={`aciklamalar_${dil.kod}`} rows={4} defaultValue={serverUrun.aciklamalar?.[dil.kod] || ''} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Çekirdek Bilgiler (Dilden Bağımsız) */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiClipboard />Operasyonel Bilgiler</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Stok Kodu (SKU)</label>
                    <input type="text" name="stok_kodu" defaultValue={serverUrun.stok_kodu || ''} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 font-mono disabled:text-gray-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Stok Miktarı</label>
                    <input type="number" name="stok_miktari" defaultValue={serverUrun.stok_miktari} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Stok Eşiği</label>
                    <input type="number" name="stok_esigi" defaultValue={serverUrun.stok_esigi || 0} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Satış Birimi</label>
                    <input type="text" name="birim" defaultValue={serverUrun.birim || ''} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                </div>
             </div>
        </div>

        {/* Fiyatlandırma (Euro) */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiDollarSign />Fiyatlandırma (EUR)</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Distribütör Alış Fiyatı (Net)</label>
                    <input type="number" step="0.01" name="distributor_alis_fiyati" defaultValue={serverUrun.distributor_alis_fiyati || 0} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Satış Fiyatı - Müşteri (Net)</label>
                    <input type="number" step="0.01" name="satis_fiyati_musteri" defaultValue={serverUrun.satis_fiyati_musteri || 0} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Satış Fiyatı - Alt Bayi (Net)</label>
                    <input type="number" step="0.01" name="satis_fiyati_alt_bayi" defaultValue={serverUrun.satis_fiyati_alt_bayi || 0} disabled={!editMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500" />
                </div>
             </div>
        </div>

        {/* Dinamik Teknik Özellikler */}
        {serverSablon.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiClipboard />Teknik Özellikler</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {serverSablon.map(alan => (
                        <div key={alan.id}>
                            <label className="block text-sm font-bold text-gray-600 mb-1">{alan.gosterim_adi}</label>
                            <input 
                                type={alan.alan_tipi === 'sayı' ? 'number' : 'text'}
                                name={`teknik_${alan.alan_adi}`}
                                defaultValue={serverUrun.teknik_ozellikler?.[alan.alan_adi] || ''}
                                disabled={!editMode}
                                className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500"
                            />
                        </div>
                    ))}
                </div>
            </div>
        )}
      </form>
    </div>
  );
}