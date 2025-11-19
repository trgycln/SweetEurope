// src/app/[locale]/portal/finanslarim/satislar/yeni/YeniSatisFormu.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FiPlus, FiTrash2, FiSend, FiLoader, FiArrowLeft, FiPackage, FiAlertCircle } from 'react-icons/fi';
import { addSatisAction } from '../../actions';
import { toast } from 'sonner';
import { Locale } from '@/i18n-config';

// Prop tipleri
type Firma = {
  id: string;
  unvan: string;
};

type Urun = {
  id: string;
  ad: any;
  satis_fiyati_alt_bayi: number;
  mevcut_stok: number;
};

interface YeniSatisFormuProps {
  locale: Locale;
  bayiFirmaId: string;
  firmalar: Firma[];
  urunler: Urun[];
  preSelectedFirmaId?: string;
}

// Sepetteki ürünün tipi
type SepetUrunu = {
  urun_id: string;
  adet: number;
  birim_fiyat_net: number;
  urun_adi: string;
  mevcut_stok: number;
};

export default function YeniSatisFormu({ 
  locale, 
  bayiFirmaId, 
  firmalar, 
  urunler, 
  preSelectedFirmaId 
}: YeniSatisFormuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const [sepet, setSepet] = useState<SepetUrunu[]>([]);
  const [seciliUrun, setSeciliUrun] = useState<string>('');
  const [seciliMusteri, setSeciliMusteri] = useState<string>(preSelectedFirmaId || '');

  const handleUrunEkle = () => {
    if (!seciliUrun) return;
    
    const urun = urunler.find(u => u.id === seciliUrun);
    if (!urun) {
      toast.error('Ürün bulunamadı.');
      return;
    }

    // Sepette zaten varsa miktar artır
    const mevcutUrunIndex = sepet.findIndex(item => item.urun_id === urun.id);
    if (mevcutUrunIndex !== -1) {
      const yeniSepet = [...sepet];
      // Stok kontrolü
      if (yeniSepet[mevcutUrunIndex].adet + 1 > urun.mevcut_stok) {
        toast.error(`Yetersiz stok! Maksimum ${urun.mevcut_stok} adet eklenebilir.`);
        return;
      }
      yeniSepet[mevcutUrunIndex].adet += 1;
      setSepet(yeniSepet);
    } else {
      // Yeni ürün ekle
      setSepet(prev => [
        ...prev,
        {
          urun_id: urun.id,
          adet: 1,
          birim_fiyat_net: urun.satis_fiyati_alt_bayi,
          urun_adi: typeof urun.ad === 'object' ? urun.ad?.tr || urun.ad?.de || 'Bilinmeyen Ürün' : String(urun.ad || 'Bilinmeyen Ürün'),
          mevcut_stok: urun.mevcut_stok,
        }
      ]);
    }
    
    setSeciliUrun('');
  };

  const handleAdetDegistir = (urun_id: string, yeniAdet: number) => {
    if (yeniAdet < 1) return;
    
    const sepetItem = sepet.find(item => item.urun_id === urun_id);
    if (!sepetItem) return;
    
    // Stok kontrolü
    if (yeniAdet > sepetItem.mevcut_stok) {
      toast.error(`Yetersiz stok! Maksimum ${sepetItem.mevcut_stok} adet.`);
      return;
    }
    
    setSepet(sepet.map(item => 
      item.urun_id === urun_id ? { ...item, adet: yeniAdet } : item
    ));
  };

  const handleUrunSil = (urun_id: string) => {
    setSepet(sepet.filter(item => item.urun_id !== urun_id));
  };

  const handleSubmit = () => {
    if (!seciliMusteri) {
      toast.error('Lütfen müşteri seçin.');
      return;
    }
    
    if (sepet.length === 0) {
      toast.error('Sepete en az bir ürün ekleyin.');
      return;
    }

    const payloadItems = sepet.map(({ urun_id, adet, birim_fiyat_net }) => ({
      urun_id,
      adet,
      birim_fiyat_net,
    }));

    startTransition(async () => {
      const result = await addSatisAction({
        bayiFirmaId,
        musteriId: seciliMusteri,
        items: payloadItems,
        locale,
      });

      if (result?.success) {
        toast.success('Satış başarıyla oluşturuldu!');
        router.push(`/${locale}/portal/finanslarim`);
      } else if (result?.error) {
        toast.error(result.error);
      }
    });
  };

  // Hesaplamalar
  const toplamNet = sepet.reduce((acc, item) => acc + (item.adet * item.birim_fiyat_net), 0);
  const kdvOrani = 0.07; // %7
  const kdvTutari = toplamNet * kdvOrani;
  const toplamBrut = toplamNet + kdvTutari;

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-accent transition-colors mb-2"
        >
          <FiArrowLeft /> Geri Dön
        </button>
        <h1 className="font-serif text-4xl font-bold text-primary">Yeni Satış Oluştur</h1>
        <p className="text-gray-600 mt-1">Müşterinize ürün bazlı satış faturası oluşturun</p>
      </div>

      {/* Form */}
      <div className="bg-white p-8 rounded-2xl shadow-lg space-y-8">
        
        {/* Müşteri Seçimi */}
        <div>
          <label htmlFor="musteri" className="block text-sm font-bold text-gray-700 mb-2">
            Müşteri <span className="text-red-500">*</span>
          </label>
          <select
            id="musteri"
            value={seciliMusteri}
            onChange={(e) => setSeciliMusteri(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
            required
          >
            <option value="">-- Müşteri Seçin --</option>
            {firmalar.map(firma => (
              <option key={firma.id} value={firma.id}>
                {firma.unvan}
              </option>
            ))}
          </select>
          {firmalar.length === 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <FiAlertCircle size={14} /> Henüz müşteriniz yok. Önce müşteri ekleyin.
            </p>
          )}
        </div>

        {/* Ürün Ekleme */}
        <div>
          <label htmlFor="urun" className="block text-sm font-bold text-gray-700 mb-2">
            Ürün Ekle
          </label>
          <div className="flex gap-2">
            <select
              id="urun"
              value={seciliUrun}
              onChange={(e) => setSeciliUrun(e.target.value)}
              className="flex-1 bg-white border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="">-- Ürün Seçin --</option>
              {urunler.map(urun => {
                const urunAdi = typeof urun.ad === 'object' 
                  ? urun.ad?.tr || urun.ad?.de || 'Bilinmeyen Ürün'
                  : String(urun.ad || 'Bilinmeyen Ürün');
                return (
                  <option key={urun.id} value={urun.id}>
                    {urunAdi} ({formatCurrency(urun.satis_fiyati_alt_bayi)}) - Stok: {urun.mevcut_stok}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={handleUrunEkle}
              disabled={!seciliUrun}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent/90 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <FiPlus /> Ekle
            </button>
          </div>
          {urunler.length === 0 && (
            <p className="text-sm text-amber-600 mt-2 flex items-center gap-1">
              <FiPackage size={14} /> Stoğunuzda ürün yok. Önce sipariş verin.
            </p>
          )}
        </div>

        {/* Sepet */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4">Sepet</h3>
          {sepet.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <FiPackage size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Sepetiniz boş</p>
              <p className="text-sm text-gray-400 mt-1">Yukarıdan ürün ekleyin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Başlık */}
              <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-semibold text-sm text-gray-700">
                <div className="col-span-5">Ürün</div>
                <div className="col-span-2 text-center">Miktar</div>
                <div className="col-span-2 text-right">Birim Fiyat</div>
                <div className="col-span-2 text-right">Toplam</div>
                <div className="col-span-1"></div>
              </div>

              {/* Satırlar */}
              {sepet.map(item => (
                <div key={item.urun_id} className="grid grid-cols-12 gap-4 items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <div className="col-span-5">
                    <p className="font-semibold text-gray-900">{item.urun_adi}</p>
                    <p className="text-xs text-gray-500">Stok: {item.mevcut_stok}</p>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <input
                      type="number"
                      value={item.adet}
                      onChange={(e) => handleAdetDegistir(item.urun_id, parseInt(e.target.value) || 1)}
                      className="w-20 text-center border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-accent focus:border-transparent"
                      min="1"
                      max={item.mevcut_stok}
                    />
                  </div>
                  <div className="col-span-2 text-right text-gray-700">
                    {formatCurrency(item.birim_fiyat_net)}
                  </div>
                  <div className="col-span-2 text-right font-semibold text-gray-900">
                    {formatCurrency(item.adet * item.birim_fiyat_net)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleUrunSil(item.urun_id)}
                      className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Özet */}
              <div className="border-t-2 border-gray-300 pt-4 mt-4 space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Ara Toplam (Net):</span>
                  <span className="font-semibold">{formatCurrency(toplamNet)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>KDV (%7):</span>
                  <span className="font-semibold">{formatCurrency(kdvTutari)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
                  <span>Genel Toplam (Brüt):</span>
                  <span className="text-green-600">{formatCurrency(toplamBrut)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-6 border-t flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || sepet.length === 0 || !seciliMusteri}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed transition"
          >
            {isPending ? (
              <>
                <FiLoader className="animate-spin" />
                Kaydediliyor...
              </>
            ) : (
              <>
                <FiSend />
                Satışı Oluştur
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
