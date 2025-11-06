import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { approvePriceChangeRequestAction } from '@/app/actions/urun-fiyat-actions';
import { redirect } from 'next/navigation';

export default async function FiyatTalepleriPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // Kullanıcı ve rol
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);
  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol, tam_ad')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Ekip Üyesi';

  // Talep sorgusu (admin tümünü görür, aksi halde sadece kendi kayıtları)
  let baseQuery = (supabase as any)
    .from('fiyat_degisim_talepleri')
    .select(`id, created_at, urun_id, created_by, notlar, proposed_satis_fiyati_alt_bayi, proposed_satis_fiyati_musteri, status, urunler:urun_id(ad)`)
    .order('created_at', { ascending: false })
    .limit(100);
  if (!isAdmin) {
    baseQuery = baseQuery.eq('created_by', user.id);
  }
  const { data: talepler, error } = await baseQuery;

  if (error != null) {
    const { message, details, hint, code } = (error as any) || {};
    console.error('Fiyat talepleri yüklenemedi:', { message, details, hint, code });
  }

  // Oluşturan kişi adını göstermek için profiller tablosundan isimleri yükle
  const byId: Record<string, string> = {};
  try {
    const userIds = Array.from(new Set(((talepler ?? []) as any[]).map(t => t.created_by).filter(Boolean)));
    if (userIds.length > 0) {
      const { data: profs, error: profErr } = await (supabase as any)
        .from('profiller')
        .select('id, tam_ad')
        .in('id', userIds);
      if (!profErr && Array.isArray(profs)) {
        for (const p of profs) {
          byId[p.id] = p.tam_ad || p.id;
        }
      }
    }
  } catch {}

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Fiyat Değişim Talepleri</h1>
      <div className="overflow-x-auto rounded-md border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Ürün</th>
              <th className="px-3 py-2">Oluşturan</th>
              <th className="px-3 py-2">Tarih</th>
              <th className="px-3 py-2">Alt Bayi (öneri)</th>
              <th className="px-3 py-2">Müşteri (öneri)</th>
              <th className="px-3 py-2">Notlar</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {((talepler ?? []) as any[]).length === 0 && (
              <tr className="border-t">
                <td className="px-3 py-4 text-sm text-gray-500" colSpan={8}>Kayıt bulunamadı.</td>
              </tr>
            )}
            {((talepler ?? []) as any[]).map((t) => {
              const u: any = (t as any).urunler;
              const name = (u?.ad as any)?.[locale] || (typeof u?.ad === 'string' ? u?.ad : 'Ürün');
              const creator = byId[t.created_by] || t.created_by || '-';
              const createdAt = t.created_at ? new Date(t.created_at).toLocaleString() : '-';
              return (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2">{creator}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{createdAt}</td>
                  <td className="px-3 py-2">{fmt(t.proposed_satis_fiyati_alt_bayi)} €</td>
                  <td className="px-3 py-2">{fmt(t.proposed_satis_fiyati_musteri)} €</td>
                  <td className="px-3 py-2 max-w-xs truncate" title={t.notlar || ''}>{t.notlar || '-'}</td>
                  <td className="px-3 py-2">{t.status}</td>
                  <td className="px-3 py-2">
                    {t.status === 'Beklemede' ? (
                      <div className="flex gap-2">
                        <form action={async () => {
                          'use server';
                          await approvePriceChangeRequestAction(t.id as string, 'Onaylandi', locale);
                        }}>
                          <button className="rounded bg-green-600 text-white px-3 py-1">Onayla</button>
                        </form>
                        <form action={async () => {
                          'use server';
                          await approvePriceChangeRequestAction(t.id as string, 'Reddedildi', locale);
                        }}>
                          <button className="rounded bg-red-600 text-white px-3 py-1">Reddet</button>
                        </form>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n?: number | null) {
  if (n == null) return '-';
  return Number(n).toFixed(2);
}
