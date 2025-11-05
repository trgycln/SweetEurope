// src/app/admin/ayarlar/sablonlar/sablon-yonetim-istemcisi.tsx
'use client';

// @ts-nocheck - JSON type casting için geçici

import { useState, useEffect, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlusCircle, FiEdit, FiTrash2, FiLoader, FiX, FiSave } from 'react-icons/fi';
import { createSablonAction, updateSablonAction, deleteSablonAction } from './actions';
import { toast } from 'sonner';

// Tipler
type Kategori = Pick<Tables<'kategoriler'>, 'id' | 'ad' | 'ust_kategori_id'>; // ust_kategori_id eklendi
type Sablon = Tables<'kategori_ozellik_sablonlari'>;

// Miras gelen şablon için tip
type MirasSablon = Sablon & {
  miras_gelen?: boolean;
  miras_kategori_adi?: string;
};

interface SablonYonetimIstemcisiProps {
  serverKategoriler: Kategori[];
  locale: string;
}

const diller = [
  { kod: 'de', ad: 'Almanca' }, { kod: 'en', ad: 'İngilizce' },
  { kod: 'tr', ad: 'Türkçe' }, { kod: 'ar', ad: 'Arapça' },
];

// Modal Form Bileşeni
function SablonFormModal({
    isOpen,
    onClose,
    mevcutSablon,
    kategoriId,
    kategoriAdi,
    onSuccess
}: {
    isOpen: boolean;
    onClose: () => void;
    mevcutSablon?: Sablon | null;
    kategoriId: string;
    kategoriAdi: string;
    onSuccess: () => void;
}) {
    const [isPending, startTransition] = useTransition();
    const isEditMode = !!mevcutSablon;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        startTransition(() => {
            const action = isEditMode
                ? updateSablonAction.bind(null, mevcutSablon.id)
                : createSablonAction;
            
            toast.promise(action(formData), {
                loading: isEditMode ? 'Özellik güncelleniyor...' : 'Yeni özellik oluşturuluyor...',
                success: (result) => {
                    if (result.success) {
                        onSuccess();
                        onClose();
                        return result.message;
                    } else {
                        throw new Error(result.message);
                    }
                },
                error: (err) => err.message,
            });
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-bold text-primary">
                            {isEditMode ? 'Özelliği Düzenle' : 'Yeni Özellik Ekle'}
                        </h3>
                        <p className="text-sm text-gray-500">Kategori: <span className="font-semibold">{kategoriAdi}</span></p>
                        <input type="hidden" name="kategori_id" value={kategoriId} />
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        
                        <div className="p-4 border rounded-md">
                            <p className="text-sm font-bold text-gray-600 mb-2">Gösterim Adı (Çok Dilli)</p>
                            <div className="space-y-2">
                                {diller.map(dil => (
                                    <div key={dil.kod}>
                                        <label htmlFor={`gosterim_adi_${dil.kod}`} className="text-xs text-gray-500">{dil.ad}</label>
                                        <input 
                                            id={`gosterim_adi_${dil.kod}`}
                                            name={`gosterim_adi_${dil.kod}`}
                                            defaultValue={mevcutSablon?.gosterim_adi?.[dil.kod] || ''}
                                            className="w-full p-2 border rounded-md text-sm" 
                                            required={dil.kod === 'tr'}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                                <label htmlFor="alan_adi" className="block text-sm font-bold text-gray-600 mb-1">Veritabanı Alan Adı (Boşluksuz)</label>
                                <input id="alan_adi" name="alan_adi" defaultValue={mevcutSablon?.alan_adi || ''} className="w-full p-2 border rounded-md font-mono" pattern="^[a-z0-9_]+$" title="Sadece küçük harf, rakam ve alt çizgi (_) kullanın." required />
                            </div>
                             <div>
                                <label htmlFor="sira" className="block text-sm font-bold text-gray-600 mb-1">Gösterim Sırası</label>
                                <input id="sira" type="number" name="sira" defaultValue={mevcutSablon?.sira || 0} className="w-full p-2 border rounded-md" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="alan_tipi" className="block text-sm font-bold text-gray-600 mb-1">Alan Tipi</label>
                            <select id="alan_tipi" name="alan_tipi" defaultValue={mevcutSablon?.alan_tipi || 'metin'} className="w-full p-2 border rounded-md bg-gray-50">
                                <option value="metin">Metin</option>
                                <option value="sayı">Sayı</option>
                            </select>
                        </div>
                        <div className="pt-4 space-y-3">
                            <p className="text-sm font-bold text-gray-600">Görünürlük Ayarları</p>
                            <div className="flex items-center"><input type="checkbox" id="public_gorunur" name="public_gorunur" defaultChecked={mevcutSablon?.public_gorunur || false} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="public_gorunur" className="ml-2 text-sm text-gray-700">Public Portal'da Göster</label></div>
                            <div className="flex items-center"><input type="checkbox" id="musteri_gorunur" name="musteri_gorunur" defaultChecked={mevcutSablon?.musteri_gorunur || false} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="musteri_gorunur" className="ml-2 text-sm text-gray-700">Müşteri Portal'ında Göster</label></div>
                            <div className="flex items-center"><input type="checkbox" id="alt_bayi_gorunur" name="alt_bayi_gorunur" defaultChecked={mevcutSablon?.alt_bayi_gorunur || false} className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" /><label htmlFor="alt_bayi_gorunur" className="ml-2 text-sm text-gray-700">Alt Bayi Portal'ında Göster</label></div>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-bold">İptal</button>
                        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold disabled:bg-accent/60">
                            {isPending ? <FiLoader className="animate-spin" /> : <FiSave />}
                            {isEditMode ? 'Değişiklikleri Kaydet' : 'Yeni Özelliği Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ANA İSTEMCİ BİLEŞENİ
export function SablonYonetimIstemcisi({ serverKategoriler, locale }: SablonYonetimIstemcisiProps) {
  const router = useRouter();
  const supabase = createDynamicSupabaseClient(true);
  const [seciliKategoriId, setSeciliKategoriId] = useState<string | null>(serverKategoriler[0]?.id || null);
  const [sablonlar, setSablonlar] = useState<MirasSablon[]>([]);
  const [isListPending, startListTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duzenlenecekSablon, setDuzenlenecekSablon] = useState<Sablon | null>(null);

  useEffect(() => {
    const fetchSablonlar = async () => {
      if (!seciliKategoriId) {
        setSablonlar([]);
        return;
      }
      startListTransition(async () => {
        // Seçili kategorinin kendi şablonları
        const { data: kendi } = await supabase
          .from('kategori_ozellik_sablonlari')
          .select('*')
          .eq('kategori_id', seciliKategoriId)
          .order('sira');

        // Üst kategorinin şablonlarını getir (miras)
        const seciliKategori = serverKategoriler.find(k => k.id === seciliKategoriId);
        let miras: MirasSablon[] = [];
        
        if (seciliKategori?.ust_kategori_id) {
          const { data: mirasData } = await supabase
            .from('kategori_ozellik_sablonlari')
            .select('*')
            .eq('kategori_id', seciliKategori.ust_kategori_id)
            .order('sira');
          
          // Üst kategori adını bul
          const ustKategori = serverKategoriler.find(k => k.id === seciliKategori.ust_kategori_id);
          const ustKategoriAd = ustKategori?.ad as Record<string, string> | undefined;
          
          miras = (mirasData || []).map(s => ({
            ...s,
            miras_gelen: true,
            miras_kategori_adi: ustKategoriAd?.[locale] || ustKategoriAd?.tr || 'Üst Kategori'
          }));
        }

        // Önce miras gelen, sonra kendi şablonları
        setSablonlar([...miras, ...(kendi || [])]);
      });
    };
    fetchSablonlar();
  }, [seciliKategoriId, supabase, serverKategoriler, locale]);

  const handleYeniEkle = () => {
    setDuzenlenecekSablon(null);
    setIsModalOpen(true);
  };

  const handleDuzenle = (sablon: Sablon) => {
    setDuzenlenecekSablon(sablon);
    setIsModalOpen(true);
  };
  
  const handleSil = (sablonId: string, sablonAdi: string) => {
    toast.warning(`"${sablonAdi}" özelliğini silmek istediğinizden emin misiniz?`, {
        description: 'Bu işlem geri alınamaz.',
        action: {
            label: "Evet, Sil",
            onClick: () => {
                toast.promise(deleteSablonAction(sablonId), {
                    loading: `"${sablonAdi}" özelliği siliniyor...`,
                    success: (result) => {
                        if (result.success) {
                            router.refresh();
                            return result.message;
                        } else {
                            throw new Error(result.message);
                        }
                    },
                    error: (err) => err.message,
                });
            }
        },
        cancel: { 
            label: "İptal",
            onClick: () => {} // Boş onClick handler
        }
    });
  };

  const seciliKategori = serverKategoriler.find(k => k.id === seciliKategoriId);
  const seciliKategoriAd = seciliKategori?.ad as Record<string, string> | undefined;

  return (
    <>
      <SablonFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mevcutSablon={duzenlenecekSablon}
        kategoriId={seciliKategoriId || ''}
        kategoriAdi={seciliKategoriAd?.[locale] || seciliKategoriAd?.tr || ''}
        onSuccess={() => router.refresh()}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 sticky top-24">
            <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
              <h2 className="font-serif text-xl font-bold text-primary mb-4 border-b pb-2">Kategoriler</h2>
              <ul className="space-y-1">
                {serverKategoriler
                  .filter(k => !k.ust_kategori_id) // Önce üst kategoriler
                  .map(ustKategori => {
                    const ustKategoriAd = ustKategori.ad as Record<string, string> | undefined;
                    const altKategoriler = serverKategoriler.filter(k => k.ust_kategori_id === ustKategori.id);
                    
                    return (
                      <li key={ustKategori.id} className="space-y-1">
                        {/* ÜST KATEGORİ */}
                        <button 
                          onClick={() => setSeciliKategoriId(ustKategori.id)} 
                          className={`w-full text-left p-3 rounded-md transition-colors text-sm font-bold border-l-4 ${
                            seciliKategoriId === ustKategori.id 
                              ? 'bg-accent text-white shadow-sm border-accent' 
                              : 'text-primary hover:bg-gray-100 border-primary/30'
                          }`}
                        >
                          📁 {ustKategoriAd?.[locale] || ustKategoriAd?.tr || 'İsimsiz Kategori'}
                        </button>
                        
                        {/* ALT KATEGORİLER */}
                        {altKategoriler.length > 0 && (
                          <ul className="ml-4 space-y-1 border-l-2 border-gray-200 pl-2">
                            {altKategoriler.map(altKategori => {
                              const altKategoriAd = altKategori.ad as Record<string, string> | undefined;
                              return (
                                <li key={altKategori.id}>
                                  <button 
                                    onClick={() => setSeciliKategoriId(altKategori.id)} 
                                    className={`w-full text-left p-2 px-3 rounded-md transition-colors text-xs font-medium ${
                                      seciliKategoriId === altKategori.id 
                                        ? 'bg-accent/90 text-white shadow-sm' 
                                        : 'text-gray-700 hover:bg-gray-100'
                                    }`}
                                  >
                                    └ {altKategoriAd?.[locale] || altKategoriAd?.tr || 'İsimsiz Kategori'}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 border-b pb-4">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary">
                  "{seciliKategoriAd?.[locale] || seciliKategoriAd?.tr || ''}" Özellikleri
                </h2>
                <p className="text-sm text-gray-500 mt-1">Bu kategori için ürün detay alanlarını yönetin.</p>
              </div>
              <button onClick={handleYeniEkle} className="flex items-center gap-2 mt-4 sm:mt-0 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm">
                <FiPlusCircle size={16} />
                Yeni Özellik Ekle
              </button>
            </div>
            
            {isListPending ? (
               <div className="flex justify-center items-center p-10"><FiLoader className="animate-spin text-4xl text-accent"/></div>
            ) : (
              <div className="space-y-3">
                {sablonlar.map(sablon => (
                  <div 
                    key={sablon.id} 
                    className={`p-4 border rounded-md flex justify-between items-center transition-all ${
                      sablon.miras_gelen 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-gray-50 border-gray-200 hover:border-accent'
                    }`}
                  >
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-main">{sablon.gosterim_adi?.['tr']}</p>
                          {sablon.miras_gelen && (
                            <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                              ← {sablon.miras_kategori_adi}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                          <span>Veritabanı: <code className="font-mono bg-gray-200 px-1 rounded">{sablon.alan_adi}</code></span>
                          <span>Tip: <code className="font-mono bg-gray-200 px-1 rounded">{sablon.alan_tipi}</code></span>
                        </div>
                        {sablon.miras_gelen && (
                          <p className="text-xs text-blue-600 mt-1 italic">
                            Bu özellik üst kategoriden miras alınmıştır ve düzenlenemez.
                          </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                      {!sablon.miras_gelen && (
                        <>
                          <button 
                            onClick={() => handleDuzenle(sablon)} 
                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors" 
                            title="Düzenle"
                          >
                            <FiEdit size={16} />
                          </button>
                          <button 
                            onClick={() => handleSil(sablon.id, sablon.gosterim_adi?.['tr'] || 'bu özelliği')} 
                            className="p-2 text-gray-500 hover:text-red-600 transition-colors" 
                            title="Sil"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </>
                      )}
                      {sablon.miras_gelen && (
                        <div className="text-xs text-gray-400 px-3 py-2">
                          Miras alınmış
                        </div>
                      )}
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
    </>
  );
}