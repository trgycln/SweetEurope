'use client';

import { useState } from 'react';
import { createPricingRuleAction, deletePricingRuleAction } from '@/app/actions/pricing-admin-actions';

interface Props {
  locale: string;
  kurallar: any[];
  kategoriler: any[];
  products: any[];
  firmalar: any[];
}

export default function FiyatKurallariTab({ locale, kurallar, kategoriler, products, firmalar }: Props) {
  const [kapsam, setKapsam] = useState<'global' | 'kategori' | 'urun'>('global');

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-medium text-blue-900 mb-2">📜 Fiyatlandırma Kuralları</h2>
        <p className="text-sm text-blue-700">
          Belirli koşullara göre otomatik fiyat değişiklikleri tanımlayın. 
          Örn: "Tüm pastalarda %10 indirim" veya "X firmasına özel %5 indirim".
        </p>
      </div>

      {/* Yeni Kural Ekleme */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-4">Yeni Kural Ekle</h2>
        <form action={async (formData: FormData) => {
          const ad = String(formData.get('ad') || '');
          const kapsam = String(formData.get('kapsam') || 'global') as 'global' | 'kategori' | 'urun';
          const kanal = String(formData.get('kanal') || 'Müşteri') as 'Müşteri' | 'Alt Bayi';
          const firmaId = String(formData.get('firmaId') || '') || null;
          const kategoriId = String(formData.get('kategoriId') || '') || null;
          const urunId = String(formData.get('urunId') || '') || null;
          const minAdet = parseInt(String(formData.get('minAdet') || '0'), 10) || null;
          const yuzdeDegisim = parseFloat(String(formData.get('yuzdeDegisim') || '0'));
          const oncelik = parseInt(String(formData.get('oncelik') || '100'), 10);
          const baslangicTarihi = String(formData.get('baslangicTarihi') || '') || null;
          const bitisTarihi = String(formData.get('bitisTarihi') || '') || null;
          const aciklama = String(formData.get('aciklama') || '') || null;

          await createPricingRuleAction({
            ad, kapsam, kanal, firmaId, kategoriId, urunId, minAdet, yuzdeDegisim, oncelik, baslangicTarihi, bitisTarihi, aciklama, locale
          });
        }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Kural Adı</label>
            <input name="ad" type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" required placeholder="Örn: Yaz Kampanyası" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kapsam</label>
            <select 
              name="kapsam" 
              value={kapsam} 
              onChange={(e) => setKapsam(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="global">Tüm Ürünler</option>
              <option value="kategori">Kategori Bazlı</option>
              <option value="urun">Ürün Bazlı</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hedef Kanal</label>
            <select name="kanal" className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="Müşteri">Müşteri (B2C)</option>
              <option value="Alt Bayi">Alt Bayi (B2B)</option>
            </select>
          </div>

          {kapsam === 'kategori' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori Seçin</label>
              <select name="kategoriId" className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">Seçiniz...</option>
                {kategoriler.map((k: any) => (
                  <option key={k.id} value={k.id}>{(k.ad as any)?.[locale] || k.ad}</option>
                ))}
              </select>
            </div>
          )}

          {kapsam === 'urun' && (
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ürün Seçin</label>
              <select name="urunId" className="w-full border border-gray-300 rounded-md px-3 py-2">
                <option value="">Seçiniz...</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{(p.ad as any)?.[locale] || p.ad}</option>
                ))}
              </select>
            </div>
          )}

          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Firma (Opsiyonel)</label>
            <select name="firmaId" className="w-full border border-gray-300 rounded-md px-3 py-2">
              <option value="">Tüm Firmalar</option>
              {firmalar.map((f: any) => (
                <option key={f.id} value={f.id}>{f.unvan}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Yüzde Değişim (%)</label>
            <input name="yuzdeDegisim" type="number" step="0.01" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="-10 (indirim) veya +5 (zam)" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Min. Adet (Opsiyonel)</label>
            <input name="minAdet" type="number" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç Tarihi</label>
            <input name="baslangicTarihi" type="date" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş Tarihi</label>
            <input name="bitisTarihi" type="date" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Öncelik (1-1000)</label>
            <input name="oncelik" type="number" defaultValue="100" className="w-full border border-gray-300 rounded-md px-3 py-2" />
          </div>

          <div className="lg:col-span-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <input name="aciklama" type="text" className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Kural hakkında notlar..." />
          </div>

          <div className="lg:col-span-4">
            <button type="submit" className="bg-primary text-secondary px-6 py-2 rounded-md hover:bg-black/80 w-full md:w-auto">
              Kuralı Kaydet
            </button>
          </div>
        </form>
      </div>

      {/* Mevcut Kurallar */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kural Adı</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapsam</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hedef</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Değişim</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {kurallar.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center">Henüz kural tanımlanmamış.</td>
              </tr>
            )}
            {kurallar.map((kural: any) => (
              <tr key={kural.id}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{kural.ad}</div>
                  <div className="text-xs text-gray-500">{kural.aciklama}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {kural.kapsam === 'global' && <span className="bg-gray-100 px-2 py-1 rounded">Tüm Ürünler</span>}
                  {kural.kapsam === 'kategori' && <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{(kural.kategoriler?.ad as any)?.[locale] || kural.kategoriler?.ad}</span>}
                  {kural.kapsam === 'urun' && <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">{(kural.urunler?.ad as any)?.[locale] || kural.urunler?.ad}</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div>{kural.kanal}</div>
                  {kural.firmalar && <div className="text-xs text-indigo-600">{kural.firmalar.unvan}</div>}
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    kural.yuzde_degisim < 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {kural.yuzde_degisim > 0 ? '+' : ''}{kural.yuzde_degisim}%
                  </span>
                  {kural.min_adet > 0 && <div className="text-xs text-gray-500 mt-1">Min: {kural.min_adet} adet</div>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {kural.baslangic_tarihi ? new Date(kural.baslangic_tarihi).toLocaleDateString() : '∞'} - 
                  {kural.bitis_tarihi ? new Date(kural.bitis_tarihi).toLocaleDateString() : '∞'}
                </td>
                <td className="px-6 py-4">
                  <form action={async () => {
                    await deletePricingRuleAction(kural.id, locale);
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
