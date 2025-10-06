// src/app/admin/urunler/page.tsx (DÜZELTİLMİŞ VE ÜRÜN EKLEME BUTONU BAĞLANDI)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link'; // <--- Next.js Link bileşeni eklendi

// Typdefinition für die Produkt-Daten
type UrunRow = Tables<'urunler'>;

// Produktübersicht Seite - Server Component
export default async function UrunlerListPage() {
  
  const supabase = createSupabaseServerClient();

  // Kolon adlarını doğru kullanmak ve yazım hatalarını önlemek için '*' ile tüm veriyi çekiyoruz.
  const { data: urunler, error } = await supabase
    .from('urunler')
    .select('*');

  if (error) {
    console.error('Produktdaten (Urunler) konnten nicht geladen werden:', error);
    return <div className="p-6 text-red-600">Fehler beim Laden der Produkte.</div>;
  }

  const urunListe: UrunRow[] = urunler || [];
  const anzahlProdukte = urunListe.length;

  // Hilfsfunktion zur Formatierung des Preises (z.B. 1.234,50 €)
  const formatFiyat = (fiyat: number | null) => {
    if (fiyat === null || fiyat === undefined) return '-'; // undefined kontrolü eklendi
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    }).format(fiyat);
  };

  return (
    <div className="p-6 space-y-6">
      
      {/* Überschrift und Neuer Produkt Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">🍰 Produktkatalog ({anzahlProdukte} Produkte)</h1>
        
        {/* + Neues Produkt Hinzufügen Butonu: Link bileşeni ile /admin/urunler/ekle sayfasına yönlendirildi */}
        <Link href="/admin/urunler/ekle" passHref legacyBehavior={false}>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-md hover:bg-indigo-700 transition duration-150">
            + Neues Produkt Ekle
          </button>
        </Link>
      </div>

      {/* Inhalt: Liste oder Leermeldung */}
      {anzahlProdukte === 0 ? (
        <div className="mt-12 text-center p-10 border-2 border-dashed border-gray-300 rounded-lg bg-white shadow-sm">
          <p className="text-xl font-semibold text-gray-600">Keine Produkte im Katalog gefunden.</p>
          <p className="mt-2 text-gray-500">Bitte fügen Sie ein neues Produkt hinzu, um zu beginnen.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produktname (Ürün Adı)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kategorie
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preis (Satış Fiyatı)
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bestand (Stok Adeti)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {urunListe.map((urun) => (
                <tr key={urun.id} className="hover:bg-indigo-50/50 transition">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {urun.urun_adi}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {urun.kategori}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-700">
                    {formatFiyat(urun.temel_satis_fiyati)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${
                      // Stok adeti kontrolü
                      urun.stok_adeti !== null && urun.stok_adeti > (urun.stok_kritik_esik ?? 10) ? 'bg-green-100 text-green-800' :
                      urun.stok_adeti !== null && urun.stok_adeti > 0 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800' // Bestand 0
                    }`}>
                      {urun.stok_adeti ?? 0}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}