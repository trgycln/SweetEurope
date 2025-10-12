// src/app/admin/operasyon/urunler/urun-formu.tsx
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiArrowLeft, FiSave, FiX, FiInfo, FiClipboard, FiDollarSign, FiLoader, FiCheckCircle, FiTrash2 } from 'react-icons/fi';
import { createUrunAction, updateUrunAction, deleteUrunAction } from './actions'; // Silme action'ı import edildi
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner'; // Toaster import edildi

// Gerekli veri tipleri
type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

// Bileşenin alacağı props'lar
interface UrunFormuProps {
  mevcutUrun?: Urun;
  kategoriler: Kategori[];
  tedarikciler: Tedarikci[];
  birimler: Birim[];
}

const diller = [
  { kod: 'de', ad: 'Almanca' }, { kod: 'en', ad: 'İngilizce' },
  { kod: 'tr', ad: 'Türkçe' }, { kod: 'ar', ad: 'Arapça' },
];

export function UrunFormu({ mevcutUrun, kategoriler, tedarikciler, birimler }: UrunFormuProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isPending, startTransition] = useTransition();
  const [aktifDil, setAktifDil] = useState('de');
  
  const [seciliKategoriId, setSeciliKategoriId] = useState<string | null>(mevcutUrun?.kategori_id || null);
  const [aktifSablon, setAktifSablon] = useState<Sablon[]>([]);

  useEffect(() => {
    const fetchSablon = async () => {
      if (!seciliKategoriId) { setAktifSablon([]); return; }
      const { data } = await supabase.from('kategori_ozellik_sablonlari').select('*').eq('kategori_id', seciliKategoriId).order('sira');
      setAktifSablon(data || []);
    };
    fetchSablon();
  }, [seciliKategoriId, supabase]);

  const handleFormSubmit = (formData: FormData) => {
    startTransition(() => {
      const action = mevcutUrun 
        ? updateUrunAction.bind(null, mevcutUrun.id) 
        : createUrunAction;
      
      toast.promise(action(formData), {
        loading: mevcutUrun ? 'Ürün güncelleniyor...' : 'Yeni ürün oluşturuluyor...',
        success: (result) => {
          if (result.success) {
            // Yönlendirme için 1 saniye bekle, kullanıcı mesajı görsün.
            setTimeout(() => router.push('/admin/operasyon/urunler'), 1000); 
            return result.message;
          } else {
            throw new Error(result.message);
          }
        },
        error: (err) => err.message,
      });
    });
  };
  
  const handleDelete = () => {
    if (!mevcutUrun) return;

    toast.warning(`"${mevcutUrun.ad?.['tr'] || 'Bu ürün'}" kalıcı olarak silinecektir.`, {
        description: 'Bu işlem geri alınamaz. Emin misiniz?',
        action: {
            label: "Evet, Sil",
            onClick: () => {
                startTransition(() => {
                    toast.promise(deleteUrunAction(mevcutUrun.id), {
                        loading: 'Ürün siliniyor...',
                        success: (result) => {
                            if (result.success) {
                                setTimeout(() => router.push('/admin/operasyon/urunler'), 1000);
                                return result.message;
                            } else {
                                throw new Error(result.message);
                            }
                        },
                        error: (err) => err.message,
                    });
                });
            }
        },
        cancel: {
            label: "İptal",
        }
    });
  };

  const isEditMode = !!mevcutUrun;

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/operasyon/urunler" className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-gray-100 transition-colors">
            <FiArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="font-serif text-4xl font-bold text-primary">
              {isEditMode ? (mevcutUrun.ad?.['tr'] || 'Ürünü Düzenle') : 'Yeni Ürün Oluştur'}
            </h1>
            <p className="text-text-main/80 mt-1">
              {isEditMode ? 'Ürün detaylarını güncelleyin' : 'Yeni bir ürünü sisteme ekleyin'}
            </p>
          </div>
        </div>
        {/* Silme butonu sadece düzenleme modunda görünür */}
        {isEditMode && (
          <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-red-500 text-red-500 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50">
            <FiTrash2 /> Sil
          </button>
        )}
      </header>

      {/* Formun kendisi action'a değil, handleFormSubmit fonksiyonuna bağlanacak */}
      <form action={handleFormSubmit} className="space-y-10">
        
        {/* Temel Tanım Bölümü */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Temel Tanım</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="kategori_id" className="block text-sm font-bold text-gray-600 mb-1">Kategori</label>
              <select id="kategori_id" name="kategori_id" value={seciliKategoriId || ""} onChange={(e) => setSeciliKategoriId(e.target.value)} disabled={isEditMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed" required>
                <option value="" disabled>Bir kategori seçin...</option>
                {kategoriler.map(k => <option key={k.id} value={k.id}>{k.ad?.['tr']}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="tedarikci_id" className="block text-sm font-bold text-gray-600 mb-1">Tedarikçi</label>
              <select id="tedarikci_id" name="tedarikci_id" defaultValue={mevcutUrun?.tedarikci_id || ""} className="w-full p-2 border rounded-md bg-gray-50">
                  <option value="">Tedarikçi Seçilmedi</option>
                  {tedarikciler.map(t => <option key={t.id} value={t.id}>{t.unvan}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Ürün Bilgileri (Çok Dilli) Bölümü */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="font-serif text-2xl font-bold text-primary mb-2 flex items-center gap-3"><FiInfo />Ürün Bilgileri (Çok Dilli)</h2>
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              {diller.map((dil) => (<button key={dil.kod} type="button" onClick={() => setAktifDil(dil.kod)} className={`${ aktifDil === dil.kod ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{dil.ad}</button>))}
            </nav>
          </div>
          <div className="space-y-6">
            {diller.map((dil) => (
              <div key={dil.kod} className={aktifDil === dil.kod ? '' : 'hidden'}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Ürün Adı ({dil.kod.toUpperCase()})</label>
                    <input type="text" name={`ad_${dil.kod}`} defaultValue={mevcutUrun?.ad?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">Açıklama ({dil.kod.toUpperCase()})</label>
                    <textarea name={`aciklamalar_${dil.kod}`} rows={4} defaultValue={mevcutUrun?.aciklamalar?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operasyonel Bilgiler Bölümü */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiClipboard />Operasyonel Bilgiler</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Stok Kodu (SKU)</label><input type="text" name="stok_kodu" defaultValue={mevcutUrun?.stok_kodu || ''} className="w-full p-2 border rounded-md bg-gray-50 font-mono" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Stok Miktarı</label><input type="number" name="stok_miktari" defaultValue={mevcutUrun?.stok_miktari || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Stok Eşiği</label><input type="number" name="stok_esigi" defaultValue={mevcutUrun?.stok_esigi || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                <div><label htmlFor="ana_satis_birimi_id" className="block text-sm font-bold text-gray-600 mb-1">Ana Satış Birimi</label><select id="ana_satis_birimi_id" name="ana_satis_birimi_id" defaultValue={mevcutUrun?.ana_satis_birimi_id || ""} className="w-full p-2 border rounded-md bg-gray-50" required><option value="" disabled>Bir birim seçin...</option>{birimler.map(b => (<option key={b.id} value={b.id}>{b.ad?.['tr'] || 'İsimsiz Birim'}</option>))}</select></div>
                <div className="flex items-center pt-5"><input type="checkbox" id="aktif" name="aktif" defaultChecked={mevcutUrun?.aktif ?? true} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="aktif" className="ml-3 block text-sm font-bold text-gray-600">Ürün Satışa Aktif mi?</label></div>
             </div>
        </div>

        {/* Fiyatlandırma Bölümü */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiDollarSign />Fiyatlandırma (EUR)</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Distribütör Alış Fiyatı (Net)</label><input type="number" step="0.01" name="distributor_alis_fiyati" defaultValue={mevcutUrun?.distributor_alis_fiyati || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                 <div><label className="block text-sm font-bold text-gray-600 mb-1">Satış Fiyatı - Müşteri (Net)</label><input type="number" step="0.01" name="satis_fiyati_musteri" defaultValue={mevcutUrun?.satis_fiyati_musteri || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                 <div><label className="block text-sm font-bold text-gray-600 mb-1">Satış Fiyatı - Alt Bayi (Net)</label><input type="number" step="0.01" name="satis_fiyati_alt_bayi" defaultValue={mevcutUrun?.satis_fiyati_alt_bayi || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
             </div>
        </div>

        {/* Teknik Özellikler Bölümü */}
        {aktifSablon.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="font-serif text-2xl font-bold text-primary mb-6">Teknik Özellikler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aktifSablon.map(alan => (<div key={alan.id}><label className="block text-sm font-bold text-gray-600 mb-1">{alan.gosterim_adi}</label><input type={alan.alan_tipi === 'sayı' ? 'number' : 'text'} name={`teknik_${alan.alan_adi}`} defaultValue={mevcutUrun?.teknik_ozellikler?.[alan.alan_adi] || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>))}
            </div>
          </div>
        )}

        {/* Form Butonları */}
        <div className="flex justify-end gap-4 pt-6 border-t">
            <Link href="/admin/operasyon/urunler" passHref>
                <button type="button" className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold text-sm">İptal</button>
            </Link>
            <button type="submit" disabled={isPending} className="flex items-center gap-2 px-6 py-2 bg-accent text-white rounded-lg font-bold text-sm disabled:opacity-50 disabled:bg-accent/70">
                {isPending ? <FiLoader className="animate-spin" /> : <FiSave />}
                {isPending ? 'Kaydediliyor...' : (isEditMode ? 'Değişiklikleri Kaydet' : 'Yeni Ürünü Oluştur')}
            </button>
        </div>
      </form>
    </div>
  );
}