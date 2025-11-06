import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createCustomerOverrideAction, deleteCustomerOverrideAction } from '@/app/actions/pricing-admin-actions';

export default async function FiyatIstisnalariPage({ params }: { params: Promise<{ locale: string }> }) {
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
  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) return redirect(`/${locale}/admin`);

  const { data: urunler } = await (supabase as any)
    .from('urunler')
    .select('id, ad')
    .order('created_at', { ascending: false })
    .limit(500);
  const { data: firmalar } = await (supabase as any)
    .from('firmalar')
    .select('id, unvan')
    .order('unvan', { ascending: true })
    .limit(500);
  const { data: istisnalar } = await (supabase as any)
    .from('musteri_fiyat_istisnalari')
    .select('id, urun_id, firma_id, kanal, ozel_fiyat_net, baslangic_tarihi, bitis_tarihi, aciklama, created_at, urunler:urun_id(ad), firmalar:firma_id(unvan)')
    .order('created_at', { ascending: false })
    .limit(200);

  function adFrom(p: any) {
    const name = (p?.ad as any)?.[locale] || (typeof p?.ad === 'string' ? p?.ad : 'Ürün');
    return name;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Müşteri Fiyat İstisnaları</h1>

      <div className="mb-6 rounded border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Yeni İstisna Ekle</h2>
        <form action={async (formData: FormData) => {
          'use server';
          const urunId = String(formData.get('urunId') || '');
          const firmaId = String(formData.get('firmaId') || '');
          const kanal = String(formData.get('kanal') || 'Müşteri') as 'Müşteri' | 'Alt Bayi';
          const ozelFiyatNet = parseFloat(String(formData.get('ozelFiyatNet') || '0'));
          const baslangicTarihi = String(formData.get('baslangicTarihi') || '') || null;
          const bitisTarihi = String(formData.get('bitisTarihi') || '') || null;
          const aciklama = String(formData.get('aciklama') || '') || null;
          await createCustomerOverrideAction({ urunId, firmaId, kanal, ozelFiyatNet, baslangicTarihi, bitisTarihi, aciklama, locale });
        }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Ürün</span>
            <select name="urunId" className="border rounded p-2">
              {(urunler ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>{adFrom(u)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Firma</span>
            <select name="firmaId" className="border rounded p-2">
              {(firmalar ?? []).map((f: any) => (
                <option key={f.id} value={f.id}>{f.unvan}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Kanal</span>
            <select name="kanal" className="border rounded p-2">
              <option value="Müşteri">Müşteri</option>
              <option value="Alt Bayi">Alt Bayi</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Özel Fiyat (Net, €)</span>
            <input name="ozelFiyatNet" type="number" step="0.01" className="border rounded p-2" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Başlangıç Tarihi</span>
            <input name="baslangicTarihi" type="date" className="border rounded p-2" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Bitiş Tarihi</span>
            <input name="bitisTarihi" type="date" className="border rounded p-2" />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-sm">Açıklama</span>
            <input name="aciklama" type="text" className="border rounded p-2" placeholder="Opsiyonel" />
          </label>
          <div className="md:col-span-2">
            <button className="rounded bg-primary text-secondary px-4 py-2">Ekle</button>
          </div>
        </form>
      </div>

      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Ürün</th>
              <th className="px-3 py-2">Firma</th>
              <th className="px-3 py-2">Kanal</th>
              <th className="px-3 py-2">Özel Fiyat (€)</th>
              <th className="px-3 py-2">Geçerlilik</th>
              <th className="px-3 py-2">Açıklama</th>
              <th className="px-3 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {((istisnalar ?? []) as any[]).length === 0 && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={7}>Kayıt yok.</td></tr>
            )}
            {((istisnalar ?? []) as any[]).map((r: any) => {
              const name = adFrom(r.urunler);
              const firma = r.firmalar?.unvan || r.firma_id;
              const range = [r.baslangic_tarihi, r.bitis_tarihi].filter(Boolean).join(' → ') || '-';
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2">{firma}</td>
                  <td className="px-3 py-2">{r.kanal}</td>
                  <td className="px-3 py-2">{Number(r.ozel_fiyat_net).toFixed(2)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{range}</td>
                  <td className="px-3 py-2">{r.aciklama || '-'}</td>
                  <td className="px-3 py-2">
                    <form action={async () => {
                      'use server';
                      await deleteCustomerOverrideAction(r.id as string, locale);
                    }}>
                      <button className="rounded bg-red-600 text-white px-3 py-1">Sil</button>
                    </form>
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
