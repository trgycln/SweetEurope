import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ProfileAssignmentForm from '@/components/ProfileAssignmentForm';

export default async function CustomerProfileAssignmentPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return redirect(`/${locale}/login`);
  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();
  const isAdmin = profil?.rol === 'Yönetici';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  // Tüm firmalar ve mevcut profil atamaları
  const { data: firmalar } = await (supabase as any)
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

  // Aktif profiler
  const { data: profiller } = await (supabase as any)
    .from('musteri_profilleri')
    .select('id, ad, genel_indirim_yuzdesi')
    .eq('aktif', true)
    .order('sira_no', { ascending: true })
    .order('created_at', { ascending: true });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Müşteri Profil Atamaları</h1>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <h2 className="font-medium text-amber-900 mb-2">⚠️ Önemli Bilgiler</h2>
        <div className="text-sm text-amber-700 space-y-1">
          <p>• Profil ataması tüm ürünlerde otomatik indirim uygular</p>
          <p>• Kategori kuralları ve özel fiyatlar profil indirimini geçersiz kılar</p>
          <p>• Pasif firmalar için profil değişikliği önerilmez</p>
        </div>
      </div>

      {/* Firma Listesi */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-medium">Müşteri Firmaları</h2>
          <p className="text-sm text-gray-600">Firmalara profil atayarak otomatik indirim uygulayabilirsiniz</p>
        </div>
        
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mevcut Profil</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Genel İndirim</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profil Değiştir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {((firmalar ?? []) as any[]).length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">
                  Firma bulunamadı.
                </td>
              </tr>
            )}
            {((firmalar ?? []) as any[]).map((firma: any) => (
              <tr key={firma.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{firma.unvan}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    firma.kategori === 'Müşteri'
                      ? 'bg-blue-100 text-blue-800'
                      : firma.kategori === 'Alt Bayi'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {firma.kategori}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {firma.musteri_profilleri ? (
                    <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {firma.musteri_profilleri.ad}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">Profil yok</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {firma.musteri_profilleri?.genel_indirim_yuzdesi !== undefined ? (
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      firma.musteri_profilleri.genel_indirim_yuzdesi < 0 
                        ? 'bg-green-100 text-green-800' 
                        : firma.musteri_profilleri.genel_indirim_yuzdesi > 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {firma.musteri_profilleri.genel_indirim_yuzdesi > 0 ? '+' : ''}{firma.musteri_profilleri.genel_indirim_yuzdesi}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">-</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    firma.status === 'Müşteri'
                      ? 'bg-green-100 text-green-800' 
                      : firma.status === 'Aday'
                      ? 'bg-gray-100 text-gray-800'
                      : firma.status === 'Takipte'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {firma.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <ProfileAssignmentForm 
                    firma={{
                      id: firma.id,
                      firma_adi: firma.unvan,
                      musteri_profil_id: firma.musteri_profil_id
                    }}
                    profiller={profiller as any[]}
                    locale={locale}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* İstatistikler */}
      {((firmalar ?? []) as any[]).length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-600">
              {((firmalar ?? []) as any[]).filter((f: any) => f.musteri_profil_id).length}
            </div>
            <div className="text-sm text-blue-700">Profili Olan Firmalar</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-600">
              {((firmalar ?? []) as any[]).filter((f: any) => !f.musteri_profil_id).length}
            </div>
            <div className="text-sm text-gray-700">Profili Olmayan Firmalar</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-600">
              {((firmalar ?? []) as any[]).filter((f: any) => f.status === 'Müşteri').length}
            </div>
            <div className="text-sm text-green-700">Müşteri Firmalar</div>
          </div>
        </div>
      )}

      {/* Kullanım Kılavuzu */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">📖 Profil Atama Rehberi</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>• Normal Müşteriler:</strong> Profil atamayın, standart fiyat uygulansın</p>
          <p><strong>• VIP Müşteriler:</strong> VIP profili (-5%) atayın</p>
          <p><strong>• Toptan Müşteriler:</strong> Toptan profili (-8%) atayın</p>
          <p><strong>• Yeni Müşteriler:</strong> Geçici indirim için Yeni Müşteri profili (-3%) atayın</p>
          <p><strong>Not:</strong> Profil değişiklikleri anında etkili olur, sipariş verilmeden önce kontrol edin</p>
        </div>
      </div>
    </div>
  );
}