'use client';

import { Tables } from '@/lib/supabase/database.types';
import BasitMaliyetHesaplayiciTab from './BasitMaliyetHesaplayiciTab';

type ProductLite = Pick<Tables<'urunler'>, 'id' | 'ad' | 'kategori_id' | 'tedarikci_id' | 'distributor_alis_fiyati' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_toptanci' | 'satis_fiyati_musteri' | 'aktif' | 'stok_miktari' | 'teknik_ozellikler' | 'urun_gami' | 'stok_kodu' | 'birim_agirlik_kg' | 'lojistik_sinifi' | 'gumruk_vergi_orani_yuzde' | 'almanya_kdv_orani' | 'gunluk_depolama_maliyeti_eur' | 'ortalama_stokta_kalma_suresi' | 'fire_zayiat_orani_yuzde' | 'standart_inis_maliyeti_net' | 'son_gercek_inis_maliyeti_net' | 'son_maliyet_sapma_yuzde' | 'karlilik_alarm_aktif'>;

interface Props {
  locale: string;
  products: ProductLite[];
  categories: Array<{ id: string; ad: Record<string, string> | string | null; slug?: string | null; ust_kategori_id?: string | null; urun_gami?: string | null }>;
  companies: Array<{ id: string; unvan: string }>;
  suppliers: Array<{ id: string; unvan: string | null }>;
  recentBatches: Array<any>;
  systemSettings: Record<string, unknown>;
}

export default function FiyatlandirmaHubClient({
  locale,
  products,
  categories,
  companies,
  suppliers,
  recentBatches,
  systemSettings,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[600px]">
        <BasitMaliyetHesaplayiciTab
          locale={locale}
          products={products}
          categories={categories}
          companies={companies}
          suppliers={suppliers}
          recentBatches={recentBatches}
          systemSettings={systemSettings}
        />
      </div>
    </div>
  );
}




