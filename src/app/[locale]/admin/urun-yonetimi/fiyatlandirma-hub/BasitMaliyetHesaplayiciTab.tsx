'use client';

import SimpleSupplierCostPlatform from '@/components/admin/pricing/SimpleSupplierCostPlatform';
import { Tables } from '@/lib/supabase/database.types';

type ProductLite = Pick<
  Tables<'urunler'>,
  'id' | 'ad' | 'distributor_alis_fiyati' | 'aktif' | 'stok_miktari' | 'satis_fiyati_musteri' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_toptanci' | 'kategori_id' | 'tedarikci_id' | 'urun_gami' | 'stok_kodu' | 'teknik_ozellikler' | 'birim_agirlik_kg' | 'lojistik_sinifi' | 'gumruk_vergi_orani_yuzde' | 'almanya_kdv_orani' | 'gunluk_depolama_maliyeti_eur' | 'ortalama_stokta_kalma_suresi' | 'fire_zayiat_orani_yuzde' | 'standart_inis_maliyeti_net' | 'son_gercek_inis_maliyeti_net' | 'son_maliyet_sapma_yuzde' | 'karlilik_alarm_aktif'
>;

interface Props {
  locale: string;
  products: ProductLite[];
  categories?: Array<{ id: string; ad: any }>;
  companies?: Array<{ id: string; unvan: string }>;
  suppliers?: Array<{ id: string; unvan: string | null }>;
  recentBatches?: Array<any>;
  systemSettings?: Record<string, any>;
}

export default function BasitMaliyetHesaplayiciTab({ locale, products, categories, companies, suppliers, recentBatches, systemSettings }: Props) {
  return (
    <SimpleSupplierCostPlatform
      locale={locale}
      products={products}
      categories={categories}
      companies={companies}
      suppliers={suppliers}
      recentBatches={recentBatches}
      systemSettings={systemSettings}
    />
  );
}
