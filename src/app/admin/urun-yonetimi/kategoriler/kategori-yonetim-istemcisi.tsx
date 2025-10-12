// src/app/admin/urun-yonetimi/kategoriler/kategori-yonetim-istemcisi.tsx
'use client';

import { useState, useTransition, FormEvent } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlusCircle, FiEdit, FiTrash2, FiLoader, FiX, FiSave } from 'react-icons/fi';
import { createKategoriAction, updateKategoriAction, deleteKategoriAction } from './actions';
import { toast } from 'sonner'; // YENİ: toast fonksiyonunu import et

// Tipler
type Kategori = Tables<'kategoriler'>;

interface KategoriYonetimIstemcisiProps {
  serverKategoriler: Kategori[];
}

const diller = [
  { kod: 'de', ad: 'Almanca' }, { kod: 'en', ad: 'İngilizce' },
  { kod: 'tr', ad: 'Türkçe' }, { kod: 'ar', ad: 'Arapça' },
];

// Modal Form Bileşeni
function KategoriFormModal({
    isOpen,
    onClose,
    mevcutKategori,
    tumKategoriler
}: {
    isOpen: boolean;
    onClose: () => void;
    mevcutKategori?: Kategori | null;
    tumKategoriler: Kategori[];
}) {
    const [isPending, startTransition] = useTransition();
    const isEditMode = !!mevcutKategori;

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        
        startTransition(() => {
            const action = isEditMode
                ? updateKategoriAction.bind(null, mevcutKategori.id)
                : createKategoriAction;

            toast.promise(action(formData), {
                loading: isEditMode ? 'Kategori güncelleniyor...' : 'Yeni kategori oluşturuluyor...',
                success: (result) => {
                    if (result.success) {
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
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h3 className="text-xl font-bold text-primary">{isEditMode ? 'Kategoriyi Düzenle' : 'Yeni Kategori Oluştur'}</h3>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <label htmlFor="ust_kategori_id" className="block text-sm font-bold text-gray-600 mb-1">Üst Kategori (Opsiyonel)</label>
                            <select id="ust_kategori_id" name="ust_kategori_id" defaultValue={mevcutKategori?.ust_kategori_id || ""} className="w-full p-2 border rounded-md bg-gray-50">
                                <option value="">Ana Kategori</option>
                                {tumKategoriler.filter(k => k.id !== mevcutKategori?.id).map(k => <option key={k.id} value={k.id}>{k.ad?.['tr']}</option>)}
                            </select>
                        </div>
                        {diller.map(dil => (
                            <div key={dil.kod}>
                                <label htmlFor={`ad_${dil.kod}`} className="block text-sm font-bold text-gray-600 mb-1">Kategori Adı ({dil.ad})</label>
                                <input id={`ad_${dil.kod}`} name={`ad_${dil.kod}`} type="text" defaultValue={mevcutKategori?.ad?.[dil.kod] || ''} className="w-full p-2 border rounded-md" required={dil.kod === 'tr'} />
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm font-bold">İptal</button>
                        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-bold disabled:bg-accent/60">
                            {isPending ? <FiLoader className="animate-spin" /> : <FiSave />}
                            {isEditMode ? 'Değişiklikleri Kaydet' : 'Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Hiyerarşik Liste Bileşeni
function KategoriListesi({ kategoriler, parentId = null, seviye = 0, onDuzenle, onSil }: { kategoriler: Kategori[], parentId?: string | null, seviye?: number, onDuzenle: (k: Kategori) => void, onSil: (id: string, name: string) => void }) {
    const altKategoriler = kategoriler.filter(k => k.ust_kategori_id === parentId);
    if (altKategoriler.length === 0) return null;

    return (
        <ul className={seviye > 0 ? "pl-6 mt-2 space-y-2" : "space-y-2"}>
            {altKategoriler.map(kategori => (
                <li key={kategori.id}>
                    <div className="flex justify-between items-center p-3 bg-gray-50 border rounded-md hover:border-gray-300">
                        <span className="font-semibold text-gray-800">{kategori.ad?.['tr'] || 'İsimsiz'}</span>
                        <div className="flex gap-3">
                            <button onClick={() => onDuzenle(kategori)} className="p-1 text-gray-500 hover:text-blue-600" title="Düzenle"><FiEdit size={16} /></button>
                            <button onClick={() => onSil(kategori.id, kategori.ad?.['tr'] || 'bu kategoriyi')} className="p-1 text-gray-500 hover:text-red-600" title="Sil"><FiTrash2 size={16} /></button>
                        </div>
                    </div>
                    <KategoriListesi kategoriler={kategoriler} parentId={kategori.id} seviye={seviye + 1} onDuzenle={onDuzenle} onSil={onSil} />
                </li>
            ))}
        </ul>
    );
}

// Ana İstemci Bileşeni
export function KategoriYonetimIstemcisi({ serverKategoriler }: KategoriYonetimIstemcisiProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duzenlenecekKategori, setDuzenlenecekKategori] = useState<Kategori | null>(null);

  const handleYeniEkle = () => {
    setDuzenlenecekKategori(null);
    setIsModalOpen(true);
  };
  
  const handleDuzenle = (kategori: Kategori) => {
    setDuzenlenecekKategori(kategori);
    setIsModalOpen(true);
  };

  const handleSil = (kategoriId: string, kategoriAdi: string) => {
    // YENİ: `confirm` yerine `toast` ile onay alma
    toast.warning(`"${kategoriAdi}" kategorisini silmek istediğinizden emin misiniz?`, {
        description: 'Bu işlem geri alınamaz ve bu kategoriye bağlı ürünler varsa silme işlemi başarısız olur.',
        action: {
            label: "Evet, Sil",
            onClick: () => {
                toast.promise(deleteKategoriAction(kategoriId), {
                    loading: `"${kategoriAdi}" kategorisi siliniyor...`,
                    success: (result) => result.message,
                    error: (err) => err.message,
                });
            }
        },
        cancel: {
            label: "İptal",
        }
    });
  };

  return (
    <>
      <KategoriFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mevcutKategori={duzenlenecekKategori}
        tumKategoriler={serverKategoriler}
      />
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="font-serif text-2xl font-bold text-primary">Kategori Hiyerarşisi</h2>
            <button onClick={handleYeniEkle} className="flex items-center gap-2 px-4 py-2 bg-accent text-white text-sm font-bold rounded-lg hover:bg-opacity-90 transition-all shadow-sm">
                <FiPlusCircle size={16} />
                Yeni Kategori Ekle
            </button>
        </div>
        
        <KategoriListesi 
            kategoriler={serverKategoriler}
            onDuzenle={handleDuzenle}
            onSil={handleSil}
        />
        
        {serverKategoriler.length === 0 && (
            <p className="text-center text-gray-500 py-4">Henüz hiç kategori oluşturulmamış.</p>
        )}
      </div>
    </>
  );
}