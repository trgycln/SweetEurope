export const dynamic = 'force-dynamic';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGlobalCachedUser } from '@/lib/admin/cache-utils';
import DahiliCikisClient from './DahiliCikisClient';

export default async function DahiliCikisPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await getGlobalCachedUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Personel' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  // Aktif ürünleri getir
  const { data: urunler } = await (supabase as any)
    .from('urunler')
    .select('id, ad, stok_kodu, stok_miktari')
    .eq('aktif', true)
    .order('ad->tr', { ascending: true });

  // Firmaları getir
  const { data: firmalar } = await (supabase as any)
    .from('firmalar')
    .select('id, unvan')
    .order('unvan', { ascending: true });

  // Son işlemleri (Geçmiş) getir
  const { data: gecmisIslemler } = await (supabase as any)
    .from('dahili_stok_hareketleri')
    .select(`
      id,
      miktar,
      neden_kodu,
      created_at,
      lexware_belge_no,
      aciklama,
      urunler ( ad, stok_kodu ),
      firmalar ( unvan )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto min-h-screen bg-slate-50/50">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">📦 Dahili Stok Yönetimi</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-2xl leading-relaxed">
          Saha numuneleri, ofis içi ikramlar ve kişisel kullanımlar için buradan ürün çıkışı yapabilirsiniz. 
          Çıktığınız ürünler anında stoktan düşülür ve muhasebeye <strong>(Lexware)</strong> resmi bir irsaliye (iç belge) olarak iletilir.
        </p>
      </div>

      <DahiliCikisClient 
        locale={locale} 
        products={urunler || []} 
        companies={firmalar || []} 
        history={gecmisIslemler || []}
      />
    </div>
  );
}
