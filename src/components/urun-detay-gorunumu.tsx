// src/components/urun-detay-gorunumu.tsx
import React from 'react';
import Image from 'next/image';
import { Tables } from '@/lib/supabase/database.types';
import { productSchemas } from '@/lib/product-schemas';
import { FiPackage, FiInfo } from 'react-icons/fi';

type Urun = Tables<'urunler'>;

// Teknik özellikleri dinamik olarak listeleyen yardımcı bileşen
const TeknikOzelliklerListesi = ({ urun }: { urun: Urun }) => {
    const schema = productSchemas[urun.ana_kategori || ''];
    if (!schema || !urun.teknik_ozellikler) return null;

    const allFields = [...schema.teknikDetaylar, ...schema.kullanimVeSaklama];

    return (
        <div className="space-y-4">
            {allFields.map(field => {
                const value = urun.teknik_ozellikler[field.id as keyof typeof urun.teknik_ozellikler];
                if (!value) return null;
                
                return (
                    <div key={field.id} className="flex justify-between border-b pb-2">
                        <span className="font-medium text-text-main/80">{field.label}</span>
                        <span className="font-bold text-primary">{value} {field.unit || ''}</span>
                    </div>
                );
            })}
        </div>
    );
};

// Ana Detay Görünümü Bileşeni
export function UrunDetayGorunumu({ urun, price }: { urun: Urun, price: number }) {
    const formatPrice = (p: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(p);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Sol Sütun: Resim Galerisi */}
            <div>
                <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-lg mb-4">
                    <Image src={urun.fotograf_url_listesi?.[0] || '/placeholder.png'} alt={urun.urun_adi} fill priority className="object-cover"/>
                </div>
                <div className="flex gap-4">
                    {urun.fotograf_url_listesi?.map((imgUrl, index) => (
                        <div key={index} className="relative w-24 h-24 rounded-md overflow-hidden">
                             <Image src={imgUrl} alt={`${urun.urun_adi} - ${index + 1}`} fill className="object-cover" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Sağ Sütun: Ürün Bilgileri */}
            <div className="space-y-6">
                <div>
                    <p className="font-sans text-sm text-gray-500 mb-2">{urun.ana_kategori} / {urun.alt_kategori}</p>
                    <h1 className="text-4xl md:text-5xl font-serif text-primary">{urun.urun_adi}</h1>
                    <p className="font-serif text-3xl text-accent mt-4">{formatPrice(price)}</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-4"><FiPackage /> Ürün Açıklaması</h2>
                    <p className="text-text-main leading-relaxed whitespace-pre-wrap">{urun.aciklama}</p>
                    {urun.icindekiler_listesi && (
                        <>
                            <h3 className="font-bold text-sm uppercase mt-6 mb-2">İçindekiler</h3>
                            <p className="text-sm text-text-main/80">{urun.icindekiler_listesi}</p>
                        </>
                    )}
                    {urun.alerjen_listesi && (
                         <>
                            <h3 className="font-bold text-sm uppercase mt-4 mb-2">Alerjenler</h3>
                            <p className="text-sm text-text-main/80">{urun.alerjen_listesi}</p>
                        </>
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-lg">
                    <h2 className="font-serif text-2xl font-bold text-primary flex items-center gap-3 mb-4"><FiInfo /> Teknik Detaylar</h2>
                    <TeknikOzelliklerListesi urun={urun} />
                </div>
            </div>
        </div>
    );
}