import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import FiyatlandirmaHubClient from './FiyatlandirmaHubClient';

export default async function FiyatlandirmaHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);
  
  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol, tam_ad')
    .eq('id', user.id)
    .maybeSingle();
  
  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Personel' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  let productResponse = await (supabase as any)
    .from('urunler')
    .select('id, ad, kategori_id, tedarikci_id, distributor_alis_fiyati, satis_fiyati_alt_bayi, satis_fiyati_toptanci, satis_fiyati_musteri, aktif, stok_miktari, teknik_ozellikler, urun_gami, stok_kodu, birim_agirlik_kg, lojistik_sinifi, gumruk_vergi_orani_yuzde, almanya_kdv_orani, gunluk_depolama_maliyeti_eur, ortalama_stokta_kalma_suresi, fire_zayiat_orani_yuzde, standart_inis_maliyeti_net, son_gercek_inis_maliyeti_net, son_maliyet_sapma_yuzde, karlilik_alarm_aktif')
    .order('created_at', { ascending: false })
    .limit(500);

  if (
    productResponse.error
    && (
      productResponse.error.code === '42703'
      || ['urun_gami', 'satis_fiyati_toptanci', 'birim_agirlik_kg', 'lojistik_sinifi', 'standart_inis_maliyeti_net']
        .some((column) => `${productResponse.error?.message || ''}`.includes(column))
    )
  ) {
    productResponse = await (supabase as any)
      .from('urunler')
      .select('id, ad, kategori_id, tedarikci_id, distributor_alis_fiyati, satis_fiyati_alt_bayi, satis_fiyati_musteri, aktif, stok_miktari, teknik_ozellikler, stok_kodu')
      .order('created_at', { ascending: false })
      .limit(500);
  }

  const products = productResponse.data || [];

  let categoryResponse = await (supabase as any)
    .from('kategoriler')
    .select('id, ad, slug, ust_kategori_id, urun_gami')
    .order('created_at', { ascending: false });

  if (categoryResponse.error && (categoryResponse.error.code === '42703' || `${categoryResponse.error.message || ''}`.includes('urun_gami'))) {
    categoryResponse = await (supabase as any)
      .from('kategoriler')
      .select('id, ad, slug, ust_kategori_id')
      .order('created_at', { ascending: false });
  }

  const kategoriler = categoryResponse.data || [];

  const { data: systemSettingsRaw } = await (supabase as any)
    .from('system_settings')
    .select('setting_key, setting_value');
  
  const systemSettings: Record<string, any> = {};
  (systemSettingsRaw || []).forEach((s: any) => {
    try {
      systemSettings[s.setting_key] = JSON.parse(s.setting_value);
    } catch {
      systemSettings[s.setting_key] = s.setting_value;
    }
  });

  const { data: firmalar } = await (supabase as any)
    .from('firmalar')
    .select('id, unvan')
    .order('unvan', { ascending: true })
    .limit(1000);

  const { data: tedarikciler } = await (supabase as any)
    .from('tedarikciler')
    .select('id, unvan')
    .order('unvan', { ascending: true })
    .limit(1000);

  let recentBatches: Array<any> = [];
  const recentBatchResponse = await (supabase as any)
    .from('ithalat_partileri')
    .select('id, referans_kodu, tedarikci_id, supplier_order_plan_record_id, navlun_soguk_eur, navlun_kuru_eur, gumruk_vergi_toplam_eur, traces_numune_ardiye_eur, varis_tarihi, durum, created_at')
    .order('created_at', { ascending: false })
    .limit(8);

  if (!recentBatchResponse.error && recentBatchResponse.data?.length) {
    recentBatches = recentBatchResponse.data;

    const partiIds = recentBatches.map((batch) => batch.id);
    const batchItemsResponse = await (supabase as any)
      .from('ithalat_parti_kalemleri')
      .select('parti_id, miktar_adet')
      .in('parti_id', partiIds);

    if (!batchItemsResponse.error && batchItemsResponse.data) {
      const summaryByBatch = (batchItemsResponse.data as Array<any>).reduce((acc, item) => {
        const key = item.parti_id;
        if (!acc[key]) acc[key] = { itemCount: 0, totalQuantity: 0 };
        acc[key].itemCount += 1;
        acc[key].totalQuantity += Number(item.miktar_adet || 0);
        return acc;
      }, {} as Record<string, { itemCount: number; totalQuantity: number }>);

      recentBatches = recentBatches.map((batch) => ({
        ...batch,
        itemCount: summaryByBatch[batch.id]?.itemCount || 0,
        totalQuantity: summaryByBatch[batch.id]?.totalQuantity || 0,
      }));
    }
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-main mb-2">🏷️ Basit Fiyatlandirma Merkezi</h1>
        <p className="text-sm text-text-main/70">
          Donuk ve kuru gida icin temel parametreleri ayarlayin, fiyatlari hizlica kontrol edin ve urunlere toplu olarak uygulayin.
        </p>
      </div>

      <FiyatlandirmaHubClient
        locale={locale}
        products={products || []}
        categories={kategoriler || []}
        companies={firmalar || []}
        suppliers={tedarikciler || []}
        recentBatches={recentBatches}
        systemSettings={systemSettings}
      />
    </div>
  );
}
