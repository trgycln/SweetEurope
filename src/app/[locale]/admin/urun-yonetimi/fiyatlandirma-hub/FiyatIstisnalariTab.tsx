'use client';

import { createCustomerOverrideAction, deleteCustomerOverrideAction } from '@/app/actions/pricing-admin-actions';

interface Props {
  locale: string;
  istisnalar: any[];
  products: any[];
  firmalar: any[];
}

export default function FiyatIstisnalariTab({ locale, istisnalar, products, firmalar }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h2 className="font-medium text-purple-900 mb-2">🏷️ Fiyat İstisnaları (Sözleşmeli Fiyatlar)</h2>
        <p className="text-sm text-purple-700">
          Belirli bir firma için bir ürünün fiyatını sabitleyin. 
          Bu fiyat, tüm kuralları ve indirimleri geçersiz kılar (Override).
        </p>
      </div>

      {/* Yeni İstisna Ekleme */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Yeni İstisna Ekle</h2>
        <form action={async (formData: FormData) => {
          const urunId = String(formData.get('urunId') || '');
          const firmaId = String(formData.get('firmaId') || '');
          const kanal = String(formData.get('kanal') || 'Müşteri') as 'Müşteri' | 'Alt Bayi';
          const ozelFiyatNet = parseFloat(String(formData.get('ozelFiyatNet') || '0'));
          const baslangicTarihi = String(formData.get('baslangicTarihi') || '') || null;
          const bitisTarihi = String(formData.get('bitisTarihi') || '') || null;
          const aciklama = String(formData.get('aciklama') || '') || null;

          await createCustomerOverrideAction({
            urunId, firmaId, kanal, ozelFiyatNet, baslangicTarihi, bitisTarihi, aciklama, locale
          });
        }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma Seçin</label>
            <select name="firmaId" className="w-full border border-gray-300 rounded-md px-3 py-2" required>
              <option value="">Seçiniz...</option>
              {firmalar.map((f: any) => (
                <option key={f.id} value={f.id}>{f.unvan}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Seçin</label>
            <select name="urunId" className="w-full border border-gray-300 rounded-md px-3 py-2" required>
              <option value="">Seçiniz...</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{(p.ad as any)?.[locale] || p.ad}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kanal</label>
            <select name="kanal" className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="Müşteri">Müşteri (B2C)</option>
              <option value="Alt Bayi">Alt Bayi (B2B)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Özel Net Fiyat (€)</label>
            <input name="ozelFiyatNet" type="number" step="0.01" className="w-full border border-gray-300 rounded-md px-3 py-2" required placeholder="0.00" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input name="baslangicTarihi" type="date" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input name="bitisTarihi" type="date" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>

          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <input name="aciklama" type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Sözleşme no, notlar vb." />
          </div>

          <div className="lg:col-span-4">
            <button type="submit" className="bg-primary text-secondary px-6 py-2 rounded-md hover:bg-black/80 w-full md:w-auto">
              İstisna Ekle
            </button>
          </div>
        </form>
      </div>

      {/* Mevcut İstisnalar */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firma</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Özel Fiyat</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Geçerlilik</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Açıklama</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {istisnalar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">Henüz istisna tanımlanmamış.</td>
              </tr>
            )}
            {istisnalar.map((istisna: any) => (
              <tr key={istisna.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{istisna.firmalar?.unvan}</div>
                  <div className="text-xs text-gray-500">{istisna.kanal}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {(istisna.urunler?.ad as any)?.[locale] || istisna.urunler?.ad}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2 py-1 text-sm font-bold bg-purple-100 text-purple-800 rounded">
                    {istisna.ozel_fiyat_net} €
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {istisna.baslangic_tarihi ? new Date(istisna.baslangic_tarihi).toLocaleDateString() : '∞'} - 
                  {istisna.bitis_tarihi ? new Date(istisna.bitis_tarihi).toLocaleDateString() : '∞'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {istisna.aciklama || '-'}
                </td>
                <td className="px-6 py-4">
                  <form action={async () => {
                    await deleteCustomerOverrideAction(istisna.id, locale);
                  }}>
                    <button className="text-red-600 hover:text-red-900 text-sm font-medium">Sil</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
