import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';
import { getSystemSettings } from '@/app/actions/system-settings-actions';
import CalculatorClient from './CalculatorClient';

type ProductLite = Pick<Tables<'urunler'>, 'id' | 'ad' | 'distributor_alis_fiyati' | 'satis_fiyati_alt_bayi' | 'satis_fiyati_musteri' | 'aktif'> & { stok_kodu?: string | null; teknik_ozellikler?: any | null };

export default async function FiyatHesaplamaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: urunler, error } = await supabase
    .from('urunler')
    .select('id, ad, kategori_id, distributor_alis_fiyati, satis_fiyati_alt_bayi, satis_fiyati_musteri, aktif, stok_kodu, teknik_ozellikler')
    .order(`ad->>${locale}`, { ascending: true })
    .limit(500);

  const { data: kategoriler } = await supabase
    .from('kategoriler')
    .select('id, ad')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Ürünler yüklenemedi:', error);
  }

  const products: ProductLite[] = (urunler ?? []) as unknown as ProductLite[];

  // Load system settings for default values
  const systemSettings = await getSystemSettings('pricing');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Basit Tedarik Maliyet Platformu</h1>
      <p className="text-secondary/70 mb-6">Soguk zincirli ve soguk zincir disi tedarik senaryolari icin ayni ekranda net maliyet ve hedef satis fiyatini hesaplayin.</p>
      <CalculatorClient locale={locale} products={products} categories={kategoriler || []} systemSettings={systemSettings} />
    </div>
  );
}
