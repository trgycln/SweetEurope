'use client';

import React, { useState } from 'react';
import { Tables, Enums } from '@/lib/supabase/database.types';
import { UrunFormu } from './urun-formu';
import { productSchemas } from '@/lib/product-schemas';
import { FiEdit, FiArrowLeft } from 'react-icons/fi';
import Link from 'next/link';
import Image from 'next/image';

type UrunDuzenleClientProps = {
  urun: Tables<'urunler'>;
  tedarikciler: Pick<Tables<'tedarikciler'>, 'id' | 'ad'>[];
  userRole: Enums<'user_role'> | null;
};

// Okuma modunda teknik özellikleri dinamik olarak gösteren bileşen
const DinamikOzellikGoster = ({ urun }: { urun: Tables<'urunler'> }) => {
    // ... (Bir önceki cevaptaki kodun aynısı)
};

export function UrunDetayClient({ urun, tedarikciler, userRole }: UrunDuzenleClientProps) {
  const [editMode, setEditMode] = useState(false);

  if (editMode) {
    // Düzenleme modundaysak, akıllı formu göster
    return <UrunFormu urun={urun} tedarikciler={tedarikciler} />;
  }

  // Değilse, zenginleştirilmiş okuma modunu göster
  return (
    <div className="space-y-8">
        <header>
             <Link href="/admin/operasyon/urunler" className="inline-flex items-center ..."><FiArrowLeft /> Ürün Kataloğuna Geri Dön</Link>
             <div className="flex justify-between items-center mt-4">
                <div>
                    <h1 className="font-serif text-4xl font-bold text-primary">{urun.urun_adi.de}</h1>
                    <p className="text-text-main/80 mt-1">{urun.urun_kodu}</p>
                </div>
                {userRole === 'Yönetici' && (
                    <button onClick={() => setEditMode(true)} className="flex items-center ...">
                        <FiEdit size={16} /> Düzenle
                    </button>
                )}
            </div>
        </header>
        
        {/* Okuma Modu Görünümü */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
                {/* Temel Bilgiler, Fiyat, Stok, Görseller vb. burada listelenecek */}
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                    {/* ... (urun.aciklama.de, urun.icindekiler_listesi.de gibi çok dilli alanlar gösterilir) ... */}
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-lg">
                     <h2 className="font-serif ...">Teknik Özellikler</h2>
                     <div className="grid grid-cols-2 gap-6 mt-4">
                        <DinamikOzellikGoster urun={urun} />
                     </div>
                </div>
            </div>
            <div className="space-y-8">
                {/* ... (Sağdaki kartlar) ... */}
            </div>
        </div>
    </div>
  );
}