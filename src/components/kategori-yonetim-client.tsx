'use client';

import { saveKategori, deleteKategori } from '@/app/actions/kategori-actions';
import { getLocalizedName } from '@/lib/utils';
import { Tables } from '@/lib/supabase/database.types';
import { FiTrash2, FiPlus, FiAlertTriangle } from 'react-icons/fi';
import { useState, useTransition, useEffect } from 'react';

type Kategori = Tables<'kategoriler'>;
type Ozellik = { name: string; label: { de: string, en: string, tr: string, ar: string }; type: 'text' | 'number' | 'textarea'; };

export function KategoriYonetimClient({ serverKategoriler }: { serverKategoriler: Kategori[] }) {
    const [isPending, startTransition] = useTransition();
    const [seciliKategori, setSeciliKategori] = useState<Kategori | null>(null);
    const [sablonAlanlari, setSablonAlanlari] = useState<Ozellik[]>([]);

    useEffect(() => {
        if (seciliKategori && seciliKategori.teknik_ozellik_sablonu) {
            setSablonAlanlari(seciliKategori.teknik_ozellik_sablonu as Ozellik[]);
        } else {
            setSablonAlanlari([]);
        }
    }, [seciliKategori]);

    const handleYeniOzellik = () => {
        setSablonAlanlari([...sablonAlanlari, { name: '', label: { de: '', en: '', tr: '', ar: '' }, type: 'text' }]);
    };

    const handleOzellikChange = (index: number, field: keyof Ozellik | `label.${'de'|'en'|'tr'|'ar'}`, value: string) => {
        const yeniAlanlar = [...sablonAlanlari];
        if (field.startsWith('label.')) {
            const lang = field.split('.')[1] as 'de'|'en'|'tr'|'ar';
            yeniAlanlar[index].label[lang] = value;
        } else {
            (yeniAlanlar[index] as any)[field] = value;
        }
        setSablonAlanlari(yeniAlanlar);
    };

    const handleOzellikSil = (index: number) => {
        setSablonAlanlari(sablonAlanlari.filter((_, i) => i !== index));
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h2 className="font-bold text-lg mb-4">Mevcut Kategoriler</h2>
                <button onClick={() => setSeciliKategori(null)} className="w-full text-left p-2 mb-2 font-bold text-accent rounded-md hover:bg-gray-100">
                    + Yeni Kategori Oluştur
                </button>
                <ul className="space-y-1 max-h-96 overflow-y-auto">
                    {serverKategoriler.map(kat => (
                        <li key={kat.id}>
                           <button onClick={() => setSeciliKategori(kat)} className={`w-full text-left p-2 rounded-md ${seciliKategori?.id === kat.id ? 'bg-accent/10 text-accent' : 'hover:bg-gray-100'}`}>
                                {getLocalizedName(kat.ad, 'de')}
                           </button>
                        </li>
                    ))}
                </ul>
            </div>

            <form action={saveKategori} className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h2 className="font-bold text-lg mb-4">{seciliKategori ? 'Kategoriyi Düzenle' : 'Yeni Kategori Oluştur'}</h2>
                {seciliKategori && <input type="hidden" name="id" value={seciliKategori.id} />}
                <input type="hidden" name="sablon_data" value={JSON.stringify(sablonAlanlari)} />

                <div className="space-y-4">
                    {/* ... (Çok dilli ad giriş alanları - defaultValue'ları seciliKategori'den alacak şekilde güncellendi) ... */}
                    <div><label className="block text-sm font-medium">Ad (Almanca)</label><input type="text" name="ad_de" defaultValue={getLocalizedName(seciliKategori?.ad, 'de')} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" /></div>
                    {/* Diğer diller de benzer şekilde güncellenir */}
                </div>

                <div className="mt-8">
                    <h3 className="font-bold text-md mb-2">Teknik Özellik Şablonu</h3>
                    <div className="space-y-3">
                        {sablonAlanlari.map((alan, index) => (
                            <div key={index} className="p-3 border rounded-md grid grid-cols-2 gap-3">
                                <input placeholder="Veritabanı Adı (örn: hacim_ml)" value={alan.name} onChange={e => handleOzellikChange(index, 'name', e.target.value)} className="col-span-2 p-1 border rounded-md text-sm font-mono"/>
                                <input placeholder="Etiket (Almanca)" value={alan.label.de} onChange={e => handleOzellikChange(index, 'label.de', e.target.value)} className="p-1 border rounded-md text-sm"/>
                                {/* Diğer dil etiketleri için inputlar */}
                                <select value={alan.type} onChange={e => handleOzellikChange(index, 'type', e.target.value)} className="p-1 border rounded-md text-sm">
                                    <option value="text">Metin</option>
                                    <option value="number">Sayı</option>
                                    <option value="textarea">Uzun Metin</option>
                                </select>
                                <button type="button" onClick={() => handleOzellikSil(index)} className="text-red-500 justify-self-end"><FiTrash2/></button>
                            </div>
                        ))}
                        <button type="button" onClick={handleYeniOzellik} className="flex items-center gap-2 text-sm font-semibold text-accent"><FiPlus/> Yeni Özellik Ekle</button>
                    </div>
                </div>
                
                <div className="mt-6 flex justify-between items-center">
                    <button type="submit" disabled={isPending} className="px-4 py-2 bg-accent text-white rounded-md font-bold disabled:bg-gray-400">
                        {seciliKategori ? 'Değişiklikleri Kaydet' : 'Yeni Kategoriyi Kaydet'}
                    </button>
                    {seciliKategori && <button type="button" onClick={() => {if(confirm('Emin misiniz?')) deleteKategori(seciliKategori.id)}} className="text-sm text-red-600">Bu Kategoriyi Sil</button>}
                </div>
            </form>
        </div>
    );
}