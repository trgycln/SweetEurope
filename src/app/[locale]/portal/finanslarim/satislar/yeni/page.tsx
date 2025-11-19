// src/app/[locale]/portal/finanslarim/satislar/yeni/page.tsx
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { redirect } from 'next/navigation';
import YeniSatisFormu from './YeniSatisFormu';
import { getDictionary } from '@/dictionaries';

export const dynamic = 'force-dynamic';

export default async function YeniSatisPage({
  params,
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { firmaId?: string };
}) {
  const { locale } = params;
  const { firmaId: preSelectedFirmaId } = searchParams;
  const dict = await getDictionary(locale);

  const cookieStore = cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/${locale}/giris`);
  }

  // Bayinin kendi firmaId'sini profilinden al
  const { data: profil, error: profilError } = await supabase
    .from('profiller')
    .select('firma_id')
    .eq('id', user.id)
    .single();

  if (profilError || !profil?.firma_id) {
    console.error('Hata: Bayi profili veya firma ID bulunamadı.', profilError);
    return <div>{dict.satis.profil_yuklenemedi}</div>;
  }
  const bayiFirmaId = profil.firma_id;

  // Bayinin müşteri firmalarının listesini al
  const { data: firmalar, error: firmalarError } = await supabase
    .from('firmalar')
    .select('id, unvan')
    .eq('sahip_id', user.id)
    .order('unvan', { ascending: true });

  if (firmalarError) {
    console.error('Hata: Müşteri firmalar alınamadı.', firmalarError);
  }

  // Bayinin satabileceği stoktaki ürünleri al
  const { data: stoklar, error: stoklarError } = await supabase
    .from('alt_bayi_stoklari')
    .select('urun_id, miktar, urun:urunler(id, ad, satis_fiyati_alt_bayi)')
    .eq('sahip_id', user.id)
    .gt('miktar', 0);

  if (stoklarError) {
    console.error('Hata: Bayi stokları alınamadı.', stoklarError);
  }

  // Gelen veriyi client component'in beklediği formata dönüştür
  const urunler = (stoklar || [])
    .filter(s => s.urun) // urun bilgisi olmayan stokları filtrele
    .map(s => ({
      id: s.urun!.id,
      ad: s.urun!.ad,
      satis_fiyati_alt_bayi: s.urun!.satis_fiyati_alt_bayi || 0,
      mevcut_stok: s.miktar || 0,
    }));

  return (
    <YeniSatisFormu
      locale={locale}
      dict={dict}
      bayiFirmaId={bayiFirmaId}
      firmalar={firmalar || []}
      urunler={urunler}
      preSelectedFirmaId={preSelectedFirmaId}
    />
  );
}
