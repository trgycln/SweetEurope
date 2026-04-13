// src/app/[locale]/admin/urun-yonetimi/kategoriler/page.tsx

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { KategoriYonetimIstemcisi } from './kategori-yonetim-istemcisi';
import { cookies } from 'next/headers';
import { Locale } from '@/i18n-config';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

interface KategoriYonetimPageProps {
  params: { locale: Locale };
}

export default async function KategoriYonetimPage({ params }: KategoriYonetimPageProps) {
  noStore();
  const locale = params.locale;

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/' + locale + '/login?next=/admin/urun-yonetimi/kategoriler');
  }

  const [{ data: kategoriler, error: katError }, { data: sablonlar }] = await Promise.all([
    supabase.from('kategoriler').select('*').order('created_at', { ascending: true }),
    supabase.from('kategori_ozellik_sablonlari').select('*').order('sira', { ascending: true }),
  ]);

  if (katError) {
    return <div className="p-6 text-red-500 bg-red-50 rounded-lg">Kategoriler yuklenemedi: {katError.message}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl font-bold text-primary">Kategori Yonetimi</h1>
        <p className="text-text-main/80 mt-1">
          Kategori hiyerarsisini ve her kategorinin urun ozellik sablonlarini tek yerden yonetin.
        </p>
      </header>

      <KategoriYonetimIstemcisi
        serverKategoriler={kategoriler || []}
        serverSablonlar={sablonlar || []}
        locale={locale}
      />
    </div>
  );
}