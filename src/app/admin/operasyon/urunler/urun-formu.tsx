// src/app/admin/operasyon/urunler/urun-formu.tsx
'use client';

import { useState, useTransition, useEffect, ChangeEvent, FormEvent } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import Image from 'next/image';
import { FiArrowLeft, FiSave, FiX, FiInfo, FiClipboard, FiDollarSign, FiLoader, FiCheckCircle, FiTrash2, FiImage, FiUploadCloud } from 'react-icons/fi';
import { createUrunAction, updateUrunAction, deleteUrunAction } from './actions';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { slugify } from '@/lib/utils';

// Tipler
type Urun = Tables<'urunler'>;
type Kategori = Tables<'kategoriler'>;
type Tedarikci = Pick<Tables<'tedarikciler'>, 'id' | 'unvan'>;
type Birim = Tables<'birimler'>;
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

interface UrunFormuProps {
  mevcutUrun?: Urun;
  kategoriler: Kategori[];
  tedarikciler: Tedarikci[];
  birimler: Birim[];
  serverSablon?: Sablon[];
}

const diller = [
  { kod: 'de', ad: 'Almanca' }, { kod: 'en', ad: 'İngilizce' },
  { kod: 'tr', ad: 'Türkçe' }, { kod: 'ar', ad: 'Arapça' },
];

export function UrunFormu({ mevcutUrun, kategoriler, tedarikciler, birimler, serverSablon }: UrunFormuProps) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [isPending, startTransition] = useTransition();
  const [aktifDil, setAktifDil] = useState('de');
  const [seciliKategoriId, setSeciliKategoriId] = useState<string | null>(mevcutUrun?.kategori_id || null);
  const [aktifSablon, setAktifSablon] = useState<Sablon[]>(serverSablon || []);
  const [slug, setSlug] = useState(mevcutUrun?.slug || '');

  const [anaResimDosyasi, setAnaResimDosyasi] = useState<File | null>(null);
  const [anaResimOnizleme, setAnaResimOnizleme] = useState<string | null>(mevcutUrun?.ana_resim_url || null);
  const [galeriDosyalari, setGaleriDosyalari] = useState<File[]>([]);
  const [galeriOnizlemeler, setGaleriOnizlemeler] = useState<string[]>(mevcutUrun?.galeri_resim_urls || []);
  const [silinecekGaleriResimleri, setSilinecekGaleriResimleri] = useState<string[]>([]);

  useEffect(() => {
    if (!mevcutUrun) {
      const fetchSablon = async () => {
        if (!seciliKategoriId) { setAktifSablon([]); return; }
        const { data } = await supabase.from('kategori_ozellik_sablonlari').select('*').eq('kategori_id', seciliKategoriId).order('sira');
        setAktifSablon(data || []);
      };
      fetchSablon();
    }
  }, [seciliKategoriId, supabase, mevcutUrun]);

  const handleAdChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!mevcutUrun || !mevcutUrun.slug) {
      setSlug(slugify(event.target.value));
    }
  };

  const handleAnaResimChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnaResimDosyasi(file);
      const reader = new FileReader();
      reader.onloadend = () => { setAnaResimOnizleme(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };
  
  const handleGaleriResimleriChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const yeniDosyalar = Array.from(files);
      setGaleriDosyalari(prev => [...prev, ...yeniDosyalar]);
      yeniDosyalar.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGaleriOnizlemeler(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleGaleriResimSil = (index: number, url: string) => {
    if (mevcutUrun?.galeri_resim_urls?.includes(url)) {
      setSilinecekGaleriResimleri(prev => [...prev, url]);
    }
    const yeniOnizlemeler = galeriOnizlemeler.filter((_, i) => i !== index);
    setGaleriOnizlemeler(yeniOnizlemeler);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    startTransition(() => {
        const promise = new Promise(async (resolve, reject) => {
            try {
                let anaResimUrl = mevcutUrun?.ana_resim_url || null;
                if (anaResimDosyasi) {
                    const dosyaAdi = `${Date.now()}-ana-${slugify(anaResimDosyasi.name)}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('urun-gorselleri')
                        .upload(dosyaAdi, anaResimDosyasi, { upsert: true });
                    if (uploadError) throw uploadError;
                    anaResimUrl = supabase.storage.from('urun-gorselleri').getPublicUrl(uploadData.path).data.publicUrl;
                }
                formData.set('ana_resim_url', anaResimUrl || '');

                const yuklenenGaleriUrlListesi: string[] = [];
                for (const file of galeriDosyalari) {
                    const dosyaAdi = `${Date.now()}-galeri-${slugify(file.name)}`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('urun-gorselleri')
                        .upload(dosyaAdi, file, { upsert: true });
                    if (uploadError) continue;
                    yuklenenGaleriUrlListesi.push(supabase.storage.from('urun-gorselleri').getPublicUrl(uploadData.path).data.publicUrl);
                }
                
                const mevcutGaleri = mevcutUrun?.galeri_resim_urls || [];
                const kalanEskiResimler = mevcutGaleri.filter(url => !silinecekGaleriResimleri.includes(url));
                const sonGaleriListesi = [...kalanEskiResimler, ...yuklenenGaleriUrlListesi];
                
                formData.delete('galeri_resim_urls[]');
                sonGaleriListesi.forEach(url => formData.append('galeri_resim_urls[]', url));

                const action = mevcutUrun ? updateUrunAction.bind(null, mevcutUrun.id) : createUrunAction;
                const result = await action(formData);

                if (result.success) {
                    resolve(result);
                } else {
                    reject(new Error(result.message));
                }
            } catch (error: any) {
                reject(new Error("İşlem sırasında bir hata oluştu: " + error.message));
            }
        });

        toast.promise(promise, {
            loading: mevcutUrun ? 'Ürün güncelleniyor...' : 'Yeni ürün oluşturuluyor...',
            success: (result: any) => {
                setTimeout(() => router.push('/admin/operasyon/urunler'), 1000);
                return result.message;
            },
            error: (err) => err.message,
        });
    });
  };
  
const handleDelete = () => {
        // Düzenleme modunda değilse silme işlemi yapılamaz.
        if (!mevcutUrun) return; 

        // 1. Kullanıcıdan onay alınması gerekiyor
        const isConfirmed = window.confirm(`"${mevcutUrun.ad?.['tr'] || 'Ürün'}" adlı ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!`);
        
        if (!isConfirmed) {
            return; // Onaylanmadıysa işlemi durdur
        }

        // 2. Silme işlemini başlatma
        startTransition(() => {
            const promise = new Promise(async (resolve, reject) => {
                try {
                    // Server Action'ı çağır
                    const result = await deleteUrunAction(mevcutUrun.id);

                    if (result.success) {
                        resolve(result);
                    } else {
                        // İşlem Server Action'da başarısız olursa (örn: siparişe bağlıysa)
                        reject(new Error(result.message));
                    }
                } catch (error: any) {
                    reject(new Error("Beklenmedik bir silme hatası oluştu: " + error.message));
                }
            });

            // 3. Sonuçları toast ile gösterme ve yönlendirme
            toast.promise(promise, {
                loading: 'Ürün siliniyor...',
                success: (result: any) => {
                    // Silme başarılıysa listeleme sayfasına yönlendir
                    setTimeout(() => router.push('/admin/operasyon/urunler'), 1000); 
                    return result.message;
                },
                error: (err) => err.message,
            });
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
        {isEditMode && (<button type="button" onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-transparent border-2 border-red-500 text-red-500 rounded-lg font-bold text-sm hover:bg-red-500 hover:text-white transition-colors disabled:opacity-50"><FiTrash2 /> Sil</button>)}
      </header>

      <form onSubmit={handleFormSubmit} className="space-y-10">
        
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiImage />Ürün Görselleri</h2>
            <div className='space-y-8'>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-2">Ana Resim</label>
                    <div className="flex items-center gap-6">
                        <div className="w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden">
                            {anaResimOnizleme ? (
                                <Image src={anaResimOnizleme} alt="Ürün Önizleme" width={128} height={128} className="object-cover w-full h-full" />
                            ) : (
                                <FiImage className="text-gray-300 text-4xl" />
                            )}
                        </div>
                        <div>
                            <input type="file" id="ana-resim-input" className="hidden" onChange={handleAnaResimChange} accept="image/png, image/jpeg, image/webp" />
                            <label htmlFor="ana-resim-input" className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm">
                                <FiUploadCloud /> {anaResimOnizleme ? 'Değiştir' : 'Yükle'}
                            </label>
                            <p className="text-xs text-gray-500 mt-2">PNG, JPG, WEBP. Maks. 2MB.</p>
                        </div>
                    </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-600 mb-2">Galeri Resimleri</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                    {galeriOnizlemeler.map((url, index) => (
                      <div key={url+index} className="relative aspect-square group">
                        <Image src={url} alt={`Galeri Önizleme ${index+1}`} layout="fill" className="object-cover rounded-lg border" />
                        <button type="button" onClick={() => handleGaleriResimSil(index, url)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100">
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                     <div>
                        <input type="file" id="galeri-resim-input" className="hidden" onChange={handleGaleriResimleriChange} accept="image/png, image/jpeg, image/webp" multiple />
                        <label htmlFor="galeri-resim-input" className="cursor-pointer aspect-square w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 hover:border-accent transition-colors">
                            <FiUploadCloud className="text-gray-400 text-3xl" />
                            <span className="text-xs text-center text-gray-500 mt-2">Daha fazla resim ekle</span>
                        </label>
                    </div>
                  </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="font-serif text-2xl font-bold text-primary mb-4">Temel Tanım</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="kategori_id" className="block text-sm font-bold text-gray-600 mb-1">Kategori</label>
              <select id="kategori_id" name="kategori_id" value={seciliKategoriId || ""} onChange={(e) => setSeciliKategoriId(e.target.value)} disabled={isEditMode} className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed" required>
                <option value="" disabled>Bir kategori seçin...</option>
                {kategoriler.map(k => (<option key={k.id} value={k.id}>{k.ad?.['tr'] || 'İsimsiz Kategori'}</option>))}
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
                    <input type="text" name={`ad_${dil.kod}`} defaultValue={mevcutUrun?.ad?.[dil.kod] || ''} className="w-full p-2 border rounded-md bg-gray-50" onChange={dil.kod === 'tr' ? handleAdChange : undefined} />
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

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiClipboard />Operasyonel Bilgiler</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Stok Kodu (SKU)</label><input type="text" name="stok_kodu" defaultValue={mevcutUrun?.stok_kodu || ''} className="w-full p-2 border rounded-md bg-gray-50 font-mono" /></div>
                <div>
                    <label className="block text-sm font-bold text-gray-600 mb-1">URL (Slug)</label>
                    <input type="text" name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full p-2 border rounded-md bg-gray-50 font-mono" required />
                </div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Stok Miktarı</label><input type="number" name="stok_miktari" defaultValue={mevcutUrun?.stok_miktari || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Stok Eşiği</label><input type="number" name="stok_esigi" defaultValue={mevcutUrun?.stok_esigi || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                <div><label htmlFor="ana_satis_birimi_id" className="block text-sm font-bold text-gray-600 mb-1">Ana Satış Birimi</label><select id="ana_satis_birimi_id" name="ana_satis_birimi_id" defaultValue={mevcutUrun?.ana_satis_birimi_id || ""} className="w-full p-2 border rounded-md bg-gray-50" required><option value="" disabled>Bir birim seçin...</option>{birimler.map(b => (<option key={b.id} value={b.id}>{b.ad?.['tr'] || 'İsimsiz Birim'}</option>))}</select></div>
                <div className="flex items-center pt-5"><input type="checkbox" id="aktif" name="aktif" defaultChecked={mevcutUrun?.aktif ?? true} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="aktif" className="ml-3 block text-sm font-bold text-gray-600">Ürün Satışa Aktif mi?</label></div>
             </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
             <h2 className="font-serif text-2xl font-bold text-primary mb-6 flex items-center gap-3"><FiDollarSign />Fiyatlandırma (EUR)</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div><label className="block text-sm font-bold text-gray-600 mb-1">Distribütör Alış Fiyatı (Net)</label><input type="number" step="0.01" name="distributor_alis_fiyati" defaultValue={mevcutUrun?.distributor_alis_fiyati || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                 <div><label className="block text-sm font-bold text-gray-600 mb-1">Satış Fiyatı - Müşteri (Net)</label><input type="number" step="0.01" name="satis_fiyati_musteri" defaultValue={mevcutUrun?.satis_fiyati_musteri || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
                 <div><label className="block text-sm font-bold text-gray-600 mb-1">Satış Fiyatı - Alt Bayi (Net)</label><input type="number" step="0.01" name="satis_fiyati_alt_bayi" defaultValue={mevcutUrun?.satis_fiyati_alt_bayi || 0} className="w-full p-2 border rounded-md bg-gray-50" /></div>
             </div>
        </div>

        {aktifSablon.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="font-serif text-2xl font-bold text-primary mb-6">Teknik Özellikler</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {aktifSablon.map(alan => (<div key={alan.id}><label className="block text-sm font-bold text-gray-600 mb-1">{alan.gosterim_adi?.['tr']}</label><input type={alan.alan_tipi === 'sayı' ? 'number' : 'text'} name={`teknik_${alan.alan_adi}`} defaultValue={mevcutUrun?.teknik_ozellikler?.[alan.alan_adi] || ''} className="w-full p-2 border rounded-md bg-gray-50" /></div>))}
            </div>
          </div>
        )}

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