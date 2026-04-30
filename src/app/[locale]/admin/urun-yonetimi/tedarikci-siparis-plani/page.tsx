import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Locale } from '@/i18n-config';
import TedarikciSiparisPlaniClient from './TedarikciSiparisPlaniClient';

interface PageProps {
  params: Promise<{ locale: Locale }>;
}

type ProductRow = {
  id: string;
  ad: Record<string, string> | string | null;
  stok_kodu: string | null;
  distributor_alis_fiyati: number;
  kutu_ici_adet: number | null;
  koli_ici_kutu_adet: number | null;
  palet_ici_koli_adet: number | null;
  tedarikci_id: string | null;
  aktif: boolean;
};

type SupplierRow = {
  id: string;
  unvan: string | null;
};

export default async function TedarikciSiparisPlaniPage({ params }: PageProps) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    redirect(`/${locale}/login?next=/admin/urun-yonetimi/tedarikci-siparis-plani`);
  }

  const { data: profile } = await supabase.from('profiller').select('rol').eq('id', user.id).single();
  const userRole = profile?.rol;

  if (userRole !== 'Yönetici' && userRole !== 'Personel' && userRole !== 'Ekip Üyesi') {
    redirect(`/${locale}/login`);
  }

  const [productsRes, suppliersRes] = await Promise.all([
    supabase
      .from('urunler')
      .select('id, ad, stok_kodu, ean_gtin, distributor_alis_fiyati, kutu_ici_adet, koli_ici_kutu_adet, palet_ici_koli_adet, tedarikci_id, aktif')
      .order(`ad->>${locale}`, { ascending: true })
      .limit(5000),
    supabase.from('tedarikciler').select('id, unvan').order('unvan', { ascending: true }).limit(1000),
  ]);

  if (productsRes.error) {
    console.error('Tedarikçi sipariş planı için ürünler yüklenemedi:', productsRes.error);
  }

  if (suppliersRes.error) {
    console.error('Tedarikçi sipariş planı için tedarikçiler yüklenemedi:', suppliersRes.error);
  }

  const products = (productsRes.data || []) as ProductRow[];
  const suppliers = (suppliersRes.data || []) as SupplierRow[];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="font-serif text-4xl font-bold text-primary mb-2">📦 Tedarikçi Sipariş Planı</h1>
        <p className="text-gray-600">
          Tedarikçiye verilecek sipariş listesini koli, palet veya kutu bazında oluşturun. Bu ekran yalnızca planlama
          içindir, stok kayıtlarını değiştirmez.
        </p>
      </header>

      <TedarikciSiparisPlaniClient locale={locale} products={products} suppliers={suppliers} />
    </div>
  );
}
