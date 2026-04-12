import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfilAtamalariTab from '@/app/[locale]/admin/urun-yonetimi/fiyatlandirma-hub/ProfilAtamalariTab';

type FirmaItem = {
  id: string;
  unvan: string;
  kategori: string | null;
  status: string | null;
  musteri_profil_id: string | null;
  musteri_profilleri: {
    ad: string;
    genel_indirim_yuzdesi: number;
  } | null;
};

type MusteriProfiliItem = {
  id: string;
  ad: string;
  genel_indirim_yuzdesi: number;
};

export default async function CustomerProfileAssignmentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);

  const { data: profil } = await supabase
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profil?.rol === 'Yönetici';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  const { data: firmalar } = await supabase
    .from('firmalar')
    .select(`
      id,
      unvan,
      kategori,
      status,
      musteri_profil_id,
      musteri_profilleri:musteri_profil_id(ad, genel_indirim_yuzdesi)
    `)
    .order('unvan', { ascending: true });

  const { data: profiller } = await supabase
    .from('musteri_profilleri')
    .select('id, ad, genel_indirim_yuzdesi')
    .eq('aktif', true)
    .order('sira_no', { ascending: true })
    .order('created_at', { ascending: true });

  const firmaList = (firmalar ?? []) as FirmaItem[];
  const aktifProfiller = (profiller ?? []) as MusteriProfiliItem[];

  return (
    <div className="p-6 mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Müşteri Profil Atamaları</h1>
        <p className="mt-1 text-sm text-gray-600">
          Firmayı açın, uygun profili seçin ve kaydedin. Daha sade kullanım için liste kart/akordiyon yapısına dönüştürüldü.
        </p>
      </div>

      <ProfilAtamalariTab
        locale={locale}
        firmalar={firmaList}
        musteriProfilleri={aktifProfiller}
      />
    </div>
  );
}