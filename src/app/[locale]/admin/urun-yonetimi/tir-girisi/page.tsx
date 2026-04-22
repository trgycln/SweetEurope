export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import TirGirisiClient from './TirGirisiClient';
import { getSupplierOrderPlanRecordByIdAction } from '@/app/[locale]/admin/urun-yonetimi/tedarikci-siparis-plani/actions';

export default async function TirGirisiPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ planId?: string }>;
}) {
  const { locale } = await params;
  const { planId } = await searchParams;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin =
    profil?.rol === 'Yönetici' ||
    profil?.rol === 'Personel' ||
    profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  // Products with weight and logistics data
  let productResponse = await (supabase as any)
    .from('urunler')
    .select(
      'id, ad, stok_kodu, tedarikci_id, kategori_id, distributor_alis_fiyati, standart_inis_maliyeti_net, birim_agirlik_kg, lojistik_sinifi, teknik_ozellikler, aktif, urun_gami, koli_ici_kutu_adet, palet_ici_koli_adet',
    )
    .eq('aktif', true)
    .order('ad->tr', { ascending: true })
    .limit(800);

  if (
    productResponse.error &&
    (productResponse.error.code === '42703' ||
      `${productResponse.error?.message || ''}`.includes('birim_agirlik_kg') ||
      `${productResponse.error?.message || ''}`.includes('standart_inis_maliyeti_net'))
  ) {
    productResponse = await (supabase as any)
      .from('urunler')
      .select('id, ad, stok_kodu, tedarikci_id, distributor_alis_fiyati, teknik_ozellikler, aktif')
      .eq('aktif', true)
      .order('created_at', { ascending: false })
      .limit(800);
  }

  const products = productResponse.data || [];

  // Suppliers
  const { data: tedarikciler } = await (supabase as any)
    .from('tedarikciler')
    .select('id, unvan')
    .order('unvan', { ascending: true })
    .limit(500);

  // Recent batches (for reference / duplicate check)
  const { data: recentBatches } = await (supabase as any)
    .from('ithalat_partileri')
    .select(
      'id, referans_kodu, tedarikci_id, varis_tarihi, durum, navlun_soguk_eur, navlun_kuru_eur, gumruk_vergi_toplam_eur, created_at',
    )
    .order('created_at', { ascending: false })
    .limit(10);

  // Load linked order plan if planId provided
  let initialPlan: Awaited<ReturnType<typeof getSupplierOrderPlanRecordByIdAction>>['record'] = null;
  if (planId) {
    const planResult = await getSupplierOrderPlanRecordByIdAction(planId);
    if (planResult.success && planResult.record) {
      initialPlan = planResult.record;
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">🚛 TIR / İthalat Parti Girişi</h1>
        <p className="mt-1 text-sm text-slate-500">
          TIR başlık bilgilerini girin, ürünleri ekleyin. Sistem navlun ve gümrük maliyetlerini ağırlığa göre otomatik dağıtır ve her ürünün gerçek iniş maliyetini hesaplar.
        </p>
      </div>

      <TirGirisiClient
        locale={locale}
        products={products}
        suppliers={tedarikciler || []}
        recentBatches={recentBatches || []}
        initialPlan={initialPlan}
      />
    </div>
  );
}
