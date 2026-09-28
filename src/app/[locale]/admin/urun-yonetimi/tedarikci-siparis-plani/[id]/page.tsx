import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import PipelineClient from './PipelineClient';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';

interface PageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export default async function PipelinePage({ params }: PageProps) {
  const { locale, id } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user }, error: userError } = await getGlobalCachedUser();
  if (!user || userError) {
    redirect(`/${locale}/login?next=/admin/urun-yonetimi/tedarikci-siparis-plani/${id}`);
  }

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole = profile?.rol;
  if (userRole !== 'Yönetici' && userRole !== 'Personel' && userRole !== 'Ekip Üyesi') {
    redirect(`/${locale}/login`);
  }

  const isNew = id === 'yeni';

  const [productsRes, suppliersRes, batchRes, batchItemsRes, settingsRes] = await Promise.all([
    supabase
      .from('urunler')
      .select('id, ad, stok_kodu, ean_gtin, distributor_alis_fiyati, koli_ici_adet, palet_ici_adet, birim_agirlik_kg, tedarikci_id, aktif, ana_resim_url')
      .order('ad->>en', { ascending: true })
      .limit(5000),
    supabase.from('tedarikciler').select('id, unvan').order('unvan', { ascending: true }).limit(1000),
    isNew ? Promise.resolve({ data: null, error: null }) : supabase.from('ithalat_partileri').select('*').eq('id', id).single(),
    isNew ? Promise.resolve({ data: [], error: null }) : supabase.from('ithalat_parti_kalemleri').select('*').eq('parti_id', id),
    supabase.from('system_settings').select('setting_key, setting_value').eq('setting_key', 'pricing_lucid_per_kg_eur').maybeSingle()
  ]);

  if (batchRes.error && !isNew) {
    console.error('Batch fetch error:', batchRes.error);
    redirect(`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani`);
  }

  const products = productsRes.data || [];
  const suppliers = suppliersRes.data || [];
  const batch = batchRes.data || null;
  const batchItems = batchItemsRes.data || [];
  const lucidRate = settingsRes.data?.setting_value ? parseFloat(settingsRes.data.setting_value) : 0.02;

  return (
    <div className="w-full max-w-[1720px] mx-auto space-y-4">
      <PipelineClient 
        locale={locale} 
        id={id} 
        products={products} 
        suppliers={suppliers}
        initialBatch={batch}
        initialItems={batchItems}
        lucidRate={lucidRate}
      />
    </div>
  );
}
