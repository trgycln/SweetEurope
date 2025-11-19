'use client';

import { useState } from 'react';
import { Tables } from '@/lib/supabase/database.types';
import TopluGuncellemeTab from './TopluGuncellemeTab';
import BasitMaliyetHesaplayiciTab from './BasitMaliyetHesaplayiciTab';

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

type TabId = 'toplu' | 'hesap' | 'kurallar' | 'istisnalar' | 'talepler' | 'profiller';

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
    { id: 'toplu' as TabId, label: '📊 Toplu Güncelleme', icon: '📊' },
    { id: 'hesap' as TabId, label: '🧮 Basit Hesaplayıcı', icon: '🧮' },
    { id: 'kurallar' as TabId, label: '📜 Fiyat Kuralları', icon: '📜' },
    { id: 'istisnalar' as TabId, label: '🏷️ Fiyat İstisnaları', icon: '🏷️' },
    { id: 'talepler' as TabId, label: '📥 Fiyat Talepleri', icon: '📥' },
    { id: 'profiller' as TabId, label: '👥 Müşteri Profilleri', icon: '👥' },
  ];

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-secondary border-b-2 border-primary'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
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
          <KurallarTab
            locale={locale}
            kurallar={kurallar}
            kategoriler={kategoriler}
            products={products}
            firmalar={firmalar}
          />
        )}

        {activeTab === 'istisnalar' && (
          <IstisnalarTab
            locale={locale}
            istisnalar={istisnalar}
            products={products}
            firmalar={firmalar}
          />
        )}

        {activeTab === 'talepler' && (
          <TaleplerTab
            locale={locale}
            talepler={talepler}
            profillerById={profillerById}
            isAdmin={isAdmin}
          />
        )}

        {activeTab === 'profiller' && (
          <ProfillerTab
            locale={locale}
            musteriProfilleri={musteriProfilleri}
            profilKullanimSayisi={profilKullanimSayisi}
          />
        )}
      </div>
    </div>
  );
}

// Placeholder tab components (will be fully implemented next)
function KurallarTab({ locale, kurallar, kategoriler, products, firmalar }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Fiyat Kuralları</h2>
      <p className="text-sm text-gray-600 mb-4">
        {kurallar.length} kural tanımlı. Kurallar yönetimi entegre edilecek.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          🚧 Mevcut fiyat-kurallari sayfasının içeriği buraya taşınacak.
        </p>
      </div>
    </div>
  );
}

function IstisnalarTab({ locale, istisnalar, products, firmalar }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Fiyat İstisnaları</h2>
      <p className="text-sm text-gray-600 mb-4">
        {istisnalar.length} istisna tanımlı. İstisnalar yönetimi entegre edilecek.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          🚧 Mevcut fiyat-istisnalari sayfasının içeriği buraya taşınacak.
        </p>
      </div>
    </div>
  );
}

function TaleplerTab({ locale, talepler, profillerById, isAdmin }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Fiyat Değişim Talepleri</h2>
      <p className="text-sm text-gray-600 mb-4">
        {talepler.length} talep mevcut. Talepler yönetimi entegre edilecek.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          🚧 Mevcut fiyat-talepleri sayfasının içeriği buraya taşınacak.
        </p>
      </div>
    </div>
  );
}

function ProfillerTab({ locale, musteriProfilleri, profilKullanimSayisi }: any) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Müşteri Profilleri</h2>
      <p className="text-sm text-gray-600 mb-4">
        {musteriProfilleri.length} profil tanımlı. Profil yönetimi entegre edilecek.
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800">
          🚧 CRM'deki musteri-profilleri sayfasının içeriği buraya taşınacak.
        </p>
      </div>
    </div>
  );
}
