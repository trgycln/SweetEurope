import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { FiArrowLeft, FiLayers } from 'react-icons/fi';
import Link from 'next/link';
import TopluGorselYuklemeIstemci from './TopluGorselYuklemeIstemci';

export const dynamic = 'force-dynamic';

export default async function TopluGorselYuklemePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  const allowed = ['Yönetici', 'Personel', 'Ekip Üyesi'];
  if (!profile || !allowed.includes(profile.rol)) {
    redirect(`/${locale}/admin/dashboard`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Başlık */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${locale}/admin/urun-yonetimi/urunler`}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          aria-label="Ürün listesine dön"
        >
          <FiArrowLeft size={16} />
        </Link>
        <div className="flex items-center gap-2">
          <FiLayers size={22} className="text-slate-500" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 leading-tight">
              Toplu Görsel Yükleme
            </h1>
            <p className="text-xs text-slate-500">
              Dosya adlarını stok kodu kuralına göre hazırlayıp toplu yükleyin
            </p>
          </div>
        </div>
      </div>

      {/* İsim Kuralı Örneği */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800 mb-2">Örnek dosya isimleri:</p>
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>PASTA001-main.jpg</span>
            <span className="text-slate-400">→ Ana Görsel</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
            <span>PASTA001-1.jpg</span>
            <span className="text-slate-400">→ Galeri Görsel 1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
            <span>PASTA001-2.jpg</span>
            <span className="text-slate-400">→ Galeri Görsel 2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>ICEKAHVE001-main.webp</span>
            <span className="text-slate-400">→ Ana Görsel</span>
          </div>
        </div>
      </div>

      {/* Ana İstemci Bileşeni */}
      <TopluGorselYuklemeIstemci />
    </div>
  );
}
