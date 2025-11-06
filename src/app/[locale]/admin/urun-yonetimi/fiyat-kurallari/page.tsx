import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { createPricingRuleAction, deletePricingRuleAction } from '@/app/actions/pricing-admin-actions';

export default async function FiyatKurallariPage({ params }: { params: Promise<{ locale: string }> }) {
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

  const { data: kategoriler } = await (supabase as any)
    .from('kategoriler')
    .select('id, ad')
    .order('created_at', { ascending: false })
    .limit(500);
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

  const { data: kurallar } = await (supabase as any)
    .from('fiyat_kurallari')
    .select('id, ad, kapsam, kategori_id, urun_id, kanal, firma_id, min_adet, yuzde_degisim, oncelik, baslangic_tarihi, bitis_tarihi, aciklama, created_at, kategoriler:kategori_id(ad), urunler:urun_id(ad), firmalar:firma_id(unvan)')
    .order('oncelik', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(200);

  function adFrom(p: any) {
    const name = (p?.ad as any)?.[locale] || (typeof p?.ad === 'string' ? p?.ad : '—');
    return name;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Fiyat Kuralları</h1>

      <div className="mb-6 rounded border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Yeni Kural Ekle</h2>
        <form action={async (formData: FormData) => {
          'use server';
          const ad = String(formData.get('ad') || '');
          const kanal = String(formData.get('kanal') || 'Müşteri') as 'Müşteri' | 'Alt Bayi';
          const kapsam = String(formData.get('kapsam') || 'global') as 'global' | 'kategori' | 'urun';
          const kategoriId = String(formData.get('kategoriId') || '') || null;
          const urunId = String(formData.get('urunId') || '') || null;
          const firmaId = String(formData.get('firmaId') || '') || null;
          const minAdetStr = String(formData.get('minAdet') || '0');
          const minAdet = minAdetStr ? parseInt(minAdetStr, 10) : 0;
          const yuzdeDegisim = parseFloat(String(formData.get('yuzdeDegisim') || '0'));
          const oncelikStr = String(formData.get('oncelik') || '100');
          const oncelik = oncelikStr ? parseInt(oncelikStr, 10) : 100;
          const baslangicTarihi = String(formData.get('baslangicTarihi') || '') || null;
          const bitisTarihi = String(formData.get('bitisTarihi') || '') || null;
          const aciklama = String(formData.get('aciklama') || '') || null;
          await createPricingRuleAction({ ad, kapsam, kanal, kategoriId, urunId, firmaId, minAdet, yuzdeDegisim, oncelik, baslangicTarihi, bitisTarihi, aciklama, locale });
        }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-sm">Ad</span>
            <input name="ad" type="text" className="border rounded p-2" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Kanal</span>
            <select name="kanal" className="border rounded p-2">
              <option value="Müşteri">Müşteri</option>
              <option value="Alt Bayi">Alt Bayi</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Kapsam</span>
            <select name="kapsam" className="border rounded p-2">
              <option value="global">Global</option>
              <option value="kategori">Kategori</option>
              <option value="urun">Ürün</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Kategori (opsiyonel)</span>
            <select name="kategoriId" className="border rounded p-2">
              <option value="">—</option>
              {(kategoriler ?? []).map((k: any) => (
                <option key={k.id} value={k.id}>{adFrom(k)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Ürün (opsiyonel)</span>
            <select name="urunId" className="border rounded p-2">
              <option value="">—</option>
              {(urunler ?? []).map((u: any) => (
                <option key={u.id} value={u.id}>{adFrom(u)}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Firma (opsiyonel)</span>
            <select name="firmaId" className="border rounded p-2">
              <option value="">—</option>
              {(firmalar ?? []).map((f: any) => (
                <option key={f.id} value={f.id}>{f.unvan}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Min. Adet</span>
            <input name="minAdet" type="number" min={0} step={1} className="border rounded p-2" defaultValue={0} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Yüzde Değişim (%)</span>
            <input name="yuzdeDegisim" type="number" step={0.01} className="border rounded p-2" required placeholder="Örn: -5 (indirim), 2 (artış)" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm">Öncelik</span>
            <input name="oncelik" type="number" step={1} className="border rounded p-2" defaultValue={100} />
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
              <th className="px-3 py-2">Ad</th>
              <th className="px-3 py-2">Kapsam</th>
              <th className="px-3 py-2">Hedef</th>
              <th className="px-3 py-2">Kanal</th>
              <th className="px-3 py-2">Firma</th>
              <th className="px-3 py-2">Min Adet</th>
              <th className="px-3 py-2">% Değişim</th>
              <th className="px-3 py-2">Öncelik</th>
              <th className="px-3 py-2">Geçerlilik</th>
              <th className="px-3 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {((kurallar ?? []) as any[]).length === 0 && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={10}>Kayıt yok.</td></tr>
            )}
            {((kurallar ?? []) as any[]).map((r: any) => {
              const hedef = r.kapsam === 'urun' ? adFrom(r.urunler) : (r.kapsam === 'kategori' ? adFrom(r.kategoriler) : 'Global');
              const firma = r.firmalar?.unvan || (r.firma_id || '—');
              const range = [r.baslangic_tarihi, r.bitis_tarihi].filter(Boolean).join(' → ') || '—';
              return (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2">{r.ad}</td>
                  <td className="px-3 py-2">{r.kapsam}</td>
                  <td className="px-3 py-2">{hedef}</td>
                  <td className="px-3 py-2">{r.kanal}</td>
                  <td className="px-3 py-2">{firma}</td>
                  <td className="px-3 py-2">{r.min_adet}</td>
                  <td className="px-3 py-2">{Number(r.yuzde_degisim).toFixed(2)}%</td>
                  <td className="px-3 py-2">{r.oncelik}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{range}</td>
                  <td className="px-3 py-2">
                    <form action={async () => {
                      'use server';
                      await deletePricingRuleAction(r.id as string, locale);
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
