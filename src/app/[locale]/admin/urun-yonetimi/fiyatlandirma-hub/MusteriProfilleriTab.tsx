'use client';

import { createCustomerProfileAction, deleteCustomerProfileAction, updateCustomerProfileAction } from '@/app/actions/customer-profile-actions';

interface Props {
  locale: string;
  musteriProfilleri: any[];
  profilKullanimSayisi: Record<string, number>;
}

export default function MusteriProfilleriTab({ locale, musteriProfilleri, profilKullanimSayisi }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-medium text-blue-900 mb-2">💡 Hybrid Fiyatlandırma Sistemi</h2>
        <p className="text-sm text-blue-700">
          Müşteri profilleri, firmalara otomatik indirim uygulamak için kullanılır. 
          Profil indirimi + kategori kuralları + özel ürün fiyatları kombine edilir.
        </p>
      </div>

      {/* Yeni Profil Ekleme */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Yeni Profil Ekle</h2>
        <form action={async (formData: FormData) => {
          const ad = String(formData.get('ad') || '');
          const aciklama = String(formData.get('aciklama') || '') || null;
          const genelIndirimYuzdesi = parseFloat(String(formData.get('genelIndirimYuzdesi') || '0'));
          const siraNo = parseInt(String(formData.get('siraNo') || '0'), 10);
          
          await createCustomerProfileAction({ 
            ad, aciklama, genelIndirimYuzdesi, siraNo, locale 
          });
        }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Profil Adı
            </label>
            <input
              name="ad"
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="VIP, Toptan, vb."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Genel İndirim (%)
            </label>
            <input
              name="genelIndirimYuzdesi"
              type="number"
              step="0.01"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="-5.00 (indirim), +2.00 (artış)"
              defaultValue="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sıra No
            </label>
            <input
              name="siraNo"
              type="number"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              defaultValue="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Açıklama
            </label>
            <input
              name="aciklama"
              type="text"
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="İsteğe bağlı"
            />
          </div>
          <div className="md:col-span-2 lg:col-span-4">
            <button 
              type="submit"
              className="bg-primary text-secondary px-6 py-2 rounded-md hover:bg-black/80"
            >
              Profil Ekle
            </button>
          </div>
        </form>
      </div>

      {/* Mevcut Profiller */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profil</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Genel İndirim</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanan Firmalar</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {((musteriProfilleri ?? []) as any[]).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-sm text-gray-500 text-center">
                  Henüz profil eklenmemiş.
                </td>
              </tr>
            )}
            {((musteriProfilleri ?? []) as any[]).map((profil: any) => (
              <tr key={profil.id}>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{profil.ad}</div>
                    {profil.aciklama && (
                      <div className="text-sm text-gray-500">{profil.aciklama}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profil.genel_indirim_yuzdesi < 0 
                      ? 'bg-green-100 text-green-800' 
                      : profil.genel_indirim_yuzdesi > 0
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profil.genel_indirim_yuzdesi > 0 ? '+' : ''}{profil.genel_indirim_yuzdesi}%
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <span className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {profilKullanimSayisi[profil.id] || 0} firma
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    profil.aktif 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {profil.aktif ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <form action={async () => {
                      await updateCustomerProfileAction(profil.id, { aktif: !profil.aktif }, locale);
                    }}>
                      <button className={`px-3 py-1 text-xs rounded ${
                        profil.aktif 
                          ? 'bg-gray-600 text-white hover:bg-gray-700' 
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}>
                        {profil.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                    </form>
                    {(profilKullanimSayisi[profil.id] || 0) === 0 && (
                      <form action={async () => {
                        await deleteCustomerProfileAction(profil.id, locale);
                      }}>
                        <button className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                          Sil
                        </button>
                      </form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kullanım Kılavuzu */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-3">📖 Nasıl Çalışır?</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>1. Profil İndirimi:</strong> Tüm ürünlerde otomatik uygulanır</p>
          <p><strong>2. Kategori Kuralları:</strong> Belirli kategorilerde ek indirim</p>
          <p><strong>3. Özel Ürün Fiyatları:</strong> En yüksek öncelik</p>
          <p><strong>Örnek:</strong> VIP müşteri (-5%) + Pasta kategorisi (-3%) = %8 toplam indirim</p>
        </div>
      </div>
    </div>
  );
}
