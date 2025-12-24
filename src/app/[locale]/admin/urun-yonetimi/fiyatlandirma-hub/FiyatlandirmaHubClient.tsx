'use client';

import { useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import TopluGuncellemeTab from './TopluGuncellemeTab';
import BasitMaliyetHesaplayiciTab from './BasitMaliyetHesaplayiciTab';
import MusteriProfilleriTab from './MusteriProfilleriTab';
import ProfilAtamalariTab from './ProfilAtamalariTab';
import FiyatKurallariTab from './FiyatKurallariTab';
import FiyatIstisnalariTab from './FiyatIstisnalariTab';

type ProductLite = Pick<Tables<'urunler'>, 'id' | 'ad' | 'kategori_id' | 'distributor_alis_fiyati' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_musteri' | 'aktif'>;

interface Props {
  locale: string;
  products: ProductLite[];
  kategoriler: any[];
  systemSettings: Record<string, any>;
  kurallar: any[];
  istisnalar: any[];
  talepler: any[];
  profillerById: Record<string, string>;
  musteriProfilleri: any[];
  profilKullanimSayisi: Record<string, number>;
  firmalar: any[];
  isAdmin: boolean;
  userId: string;
}

type TabId = 'toplu' | 'hesap' | 'kurallar' | 'istisnalar' | 'profiller' | 'atamalar';

export default function FiyatlandirmaHubClient({
  locale,
  products,
  kategoriler,
  systemSettings,
  kurallar,
  istisnalar,
  talepler,
  profillerById,
  musteriProfilleri,
  profilKullanimSayisi,
  firmalar,
  isAdmin,
  userId,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('toplu');

  const tabs = [
    { id: 'toplu' as TabId, label: '📊 Toplu Güncelleme', description: 'Fiyatları listeden hızlıca düzenle' },
    { id: 'hesap' as TabId, label: '🧮 Basit Hesaplayıcı', description: 'Maliyet ve kâr analizi yap' },
    { id: 'kurallar' as TabId, label: '📜 Fiyat Kuralları', description: 'Otomatik indirim/kampanya tanımla' },
    { id: 'istisnalar' as TabId, label: '🏷️ Fiyat İstisnaları', description: 'Firmaya özel sabit fiyat ver' },
    { id: 'profiller' as TabId, label: '👥 Müşteri Profilleri', description: 'Müşteri grupları oluştur (VIP vb.)' },
    { id: 'atamalar' as TabId, label: '👤 Profil Atamaları', description: 'Firmaları gruplara yerleştir' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex flex-col items-center justify-center gap-0.5 min-w-[140px] ${
              activeTab === tab.id
                ? 'bg-primary text-secondary border-b-2 border-primary'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-sm font-semibold">{tab.label}</span>
            <span className="text-[10px] opacity-80 font-normal">{tab.description}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[600px]">
        {activeTab === 'toplu' && (
          <TopluGuncellemeTab
            locale={locale}
            products={products}
            kategoriler={kategoriler}
            systemSettings={systemSettings}
            kurallar={kurallar}
            istisnalar={istisnalar}
          />
        )}

        {activeTab === 'hesap' && (
          <BasitMaliyetHesaplayiciTab
            locale={locale}
            products={products as any}
            systemSettings={systemSettings}
          />
        )}

        {activeTab === 'kurallar' && (
          <FiyatKurallariTab
            locale={locale}
            kurallar={kurallar}
            kategoriler={kategoriler}
            products={products}
            firmalar={firmalar}
          />
        )}

        {activeTab === 'istisnalar' && (
          <FiyatIstisnalariTab
            locale={locale}
            istisnalar={istisnalar}
            products={products}
            firmalar={firmalar}
          />
        )}

        {activeTab === 'profiller' && (
          <MusteriProfilleriTab
            locale={locale}
            musteriProfilleri={musteriProfilleri}
            profilKullanimSayisi={profilKullanimSayisi}
          />
        )}

        {activeTab === 'atamalar' && (
          <ProfilAtamalariTab
            locale={locale}
            firmalar={firmalar}
            musteriProfilleri={musteriProfilleri}
          />
        )}
      </div>
    </div>
  );
}




