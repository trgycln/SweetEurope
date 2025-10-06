// src/components/urun-duzenle-client.tsx

'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { FiArrowLeft, FiSave, FiPackage, FiDollarSign, FiImage, FiEdit, FiX, FiAlertCircle } from 'react-icons/fi';
import { urunGuncelleAction } from '@/app/actions/urun-actions'; // Bu Server Action'ı birazdan oluşturacağız

type UrunDuzenleClientProps = {
  urun: Tables<'urunler'>;
  userRole: Enums<'user_role'> | null;
};

// Bu bileşen bir İSTEMCİ BİLEŞENİ'dir.
// Görevi: "Okuma" ve "Düzenleme" modları arasındaki geçişi yönetmek ve formu göstermek.
export function UrunDuzenleClient({ urun: initialUrun, userRole }: UrunDuzenleClientProps) {
  const [editMode, setEditMode] = useState(false);
  const [urun, setUrun] = useState(initialUrun);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = await urunGuncelleAction(urun.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        // Başarılı güncelleme sonrası formu kapat ve hata mesajını temizle
        setEditMode(false);
        setError(null);
        // Sayfa Server Action içinde revalidate edildiği için otomatik güncellenecek.
      }
    });
  };

  const inputBaseClasses = "w-full bg-secondary border border-bg-subtle rounded-lg p-3 text-sm text-text-main focus:ring-2 focus:ring-accent focus:border-transparent transition-colors duration-200 placeholder:text-text-main/50";
  const disabledInputClasses = `${inputBaseClasses} bg-bg-subtle cursor-not-allowed`;

  return (
    <div className="space-y-8">
      {/* Sayfa Başlığı ve Eylem Butonları */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <Link href="/admin/operasyon/urunler" className="inline-flex items-center gap-2 text-sm text-text-main/80 hover:text-accent transition-colors mb-4">
                <FiArrowLeft /> Ürün Kataloğuna Geri Dön
            </Link>
            <h1 className="font-serif text-4xl font-bold text-primary">{urun.urun_adi}</h1>
            <p className="text-text-main/80 mt-1">{urun.urun_kodu}</p>
        </div>
        {userRole === 'Yönetici' && !editMode && (
          <button onClick={() => setEditMode(true)} className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm w-full sm:w-auto">
            <FiEdit size={16} /> Düzenle
          </button>
        )}
      </header>

      {/* Ana Form (Düzenleme modu aktif olduğunda form, değilse div gibi davranır) */}
      <form action={handleFormSubmit}>
        
        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-center gap-3 mb-6">
                <FiAlertCircle size={20} />
                <div>
                    <p className="font-bold">Bir hata oluştu</p>
                    <p>{error}</p>
                </div>
            </div>
        )}
        
        <div className="space-y-10">
          <fieldset className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg" disabled={isPending}>
            <legend className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-6"><FiPackage /> Temel Bilgiler</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="md:col-span-2">
                <label htmlFor="urun_adi" className="block text-sm font-bold text-text-main/80 mb-2">Ürün Adı <span className="text-red-500">*</span></label>
                {editMode ? <input type="text" id="urun_adi" name="urun_adi" required defaultValue={urun.urun_adi} className={inputBaseClasses} /> : <p className="text-primary">{urun.urun_adi}</p>}
              </div>
              <div>
                <label htmlFor="urun_kodu" className="block text-sm font-bold text-text-main/80 mb-2">Ürün Kodu <span className="text-red-500">*</span></label>
                {editMode ? <input type="text" id="urun_kodu" name="urun_kodu" required defaultValue={urun.urun_kodu} className={inputBaseClasses} /> : <p className="text-primary">{urun.urun_kodu}</p>}
              </div>
              <div className="md:col-span-2">
                <label htmlFor="aciklama" className="block text-sm font-bold text-text-main/80 mb-2">Açıklama</label>
                {editMode ? <textarea id="aciklama" name="aciklama" rows={3} defaultValue={urun.aciklama ?? ''} className={inputBaseClasses} /> : <p className="text-primary whitespace-pre-wrap">{urun.aciklama || '-'}</p>}
              </div>
            </div>
          </fieldset>

          <fieldset className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg" disabled={isPending}>
            <legend className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-6"><FiDollarSign /> Fiyatlandırma ve Stok</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
              <div>
                <label htmlFor="alis_fiyati" className="block text-sm font-bold text-text-main/80 mb-2">Alış Fiyatı (Maliyet)</label>
                {(userRole === 'Yönetici' && editMode) ? <input type="number" step="0.01" id="alis_fiyati" name="alis_fiyati" required defaultValue={urun.alis_fiyati} className={inputBaseClasses} /> : <p className={userRole !== 'Yönetici' ? 'italic text-gray-400' : 'text-primary'}>{userRole === 'Yönetici' ? `${urun.alis_fiyati} TL` : 'Yetkiniz yok'}</p>}
              </div>
              <div>
                <label htmlFor="temel_satis_fiyati" className="block text-sm font-bold text-text-main/80 mb-2">Temel Satış Fiyatı</label>
                {editMode ? <input type="number" step="0.01" id="temel_satis_fiyati" name="temel_satis_fiyati" required defaultValue={urun.temel_satis_fiyati} className={inputBaseClasses} /> : <p className="text-primary">{`${urun.temel_satis_fiyati} TL`}</p>}
              </div>
              <div>
                <label htmlFor="hedef_kar_marji" className="block text-sm font-bold text-text-main/80 mb-2">Hedef Kâr Marjı (%)</label>
                {(userRole === 'Yönetici' && editMode) ? <input type="number" step="0.1" id="hedef_kar_marji" name="hedef_kar_marji" defaultValue={urun.hedef_kar_marji} className={inputBaseClasses} /> : <p className={userRole !== 'Yönetici' ? 'italic text-gray-400' : 'text-primary'}>{userRole === 'Yönetici' ? `% ${urun.hedef_kar_marji}` : 'Yetkiniz yok'}</p>}
              </div>
              <div>
                <label htmlFor="stok_adeti" className="block text-sm font-bold text-text-main/80 mb-2">Stok Adedi</label>
                {editMode ? <input type="number" id="stok_adeti" name="stok_adeti" required defaultValue={urun.stok_adeti} className={inputBaseClasses} /> : <p className="text-primary">{urun.stok_adeti}</p>}
              </div>
              <div>
                <label htmlFor="stok_azaldi_esigi" className="block text-sm font-bold text-text-main/80 mb-2">"Stok Azaldı" Eşiği</label>
                {editMode ? <input type="number" id="stok_azaldi_esigi" name="stok_azaldi_esigi" defaultValue={urun.stok_azaldi_esigi} className={inputBaseClasses} /> : <p className="text-primary">{urun.stok_azaldi_esigi}</p>}
              </div>
              <div>
                <label htmlFor="stok_bitti_esigi" className="block text-sm font-bold text-text-main/80 mb-2">"Tükendi" Eşiği</label>
                {editMode ? <input type="number" id="stok_bitti_esigi" name="stok_bitti_esigi" defaultValue={urun.stok_bitti_esigi} className={inputBaseClasses} /> : <p className="text-primary">{urun.stok_bitti_esigi}</p>}
              </div>
            </div>
          </fieldset>
          
          <fieldset className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg" disabled={isPending}>
            <legend className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-6"><FiImage /> Ürün Görselleri</legend>
            {editMode ? (
                <div>
                    <input type="file" name="images" multiple accept="image/png, image/jpeg, image/webp" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"/>
                    <p className="text-xs text-text-main/60 mt-2">Yeni görseller seçmek, mevcut olanların üzerine yazacaktır.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {(urun.fotograf_url_listesi && urun.fotograf_url_listesi.length > 0) ? urun.fotograf_url_listesi.map((url, index) => (
                        <img key={index} src={url} alt={`${urun.urun_adi} görseli ${index + 1}`} className="aspect-square w-full h-full object-cover rounded-lg shadow-md" />
                    )) : <p className="text-sm text-text-main/70">Bu ürün için görsel bulunmamaktadır.</p>}
                </div>
            )}
          </fieldset>
        </div>

        {editMode && (
          <div className="pt-8 mt-6 border-t border-bg-subtle flex justify-end gap-4">
            <button type="button" onClick={() => { setEditMode(false); setError(null); }} disabled={isPending} className="px-6 py-3 bg-secondary hover:bg-bg-subtle text-text-main rounded-lg font-bold text-sm transition-colors">
              İptal
            </button>
            <button type="submit" disabled={isPending} className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 font-bold text-sm disabled:bg-gray-400 disabled:cursor-not-allowed">
              <FiSave size={18} />
              {isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}