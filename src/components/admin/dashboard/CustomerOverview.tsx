// src/components/admin/dashboard/CustomerOverview.tsx
// Müşteri istatistikleri özeti - status ve kategori bazlı

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FiUsers, FiUserCheck, FiUserX } from 'react-icons/fi';

export async function CustomerOverview() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  // Tüm müşteri statülerini tek sorguyla çek
  // KRITIS: CRM listesiyle aynı filtreleri uygulamak
  const { data: statusRows } = await supabase
    .from('firmalar')
    .select('status')
    .or('ticari_tip.eq.musteri,ticari_tip.is.null')
    .not('kategori', 'eq', 'Alt Bayi')  // Alt Bayi kategorisini dışla
    .is('sahip_id', null);  // Alt bayiye ait olmayan müşterileri al

  const normalizeStatus = (value: any) => (value ?? 'Belirsiz').toString().trim().toLowerCase();

  const canonicalLabel = (normalized: string) => {
    const map: Record<string, string> = {
      'müşteri': 'Müşteri',
      'musteri': 'Müşteri',
      'aday': 'Aday',
      'isitiliyor': 'Aday',
      'ısıtılıyor': 'Aday',
      'takipte': 'Aday',
      'iletisimde': 'Aday',
      'iletişimde': 'Aday',
      'potansiyel': 'Aday',
      'temas edildi': 'Temas Edildi',
      'temas edıldı': 'Temas Edildi',
      'temas edildi̇': 'Temas Edildi',
      'temas kuruldu': 'Temas Edildi',
      'temas kuruldü': 'Temas Edildi',
      'temas kuruldu̇': 'Temas Edildi',
      'numune verildi': 'Numune Verildi',
      'numune verildi̇': 'Numune Verildi',
      'pasif': 'Reddedildi',
      'reddedildi': 'Reddedildi',
      'reddedildi̇': 'Reddedildi',
    };
    return map[normalized] || 'Diğer';
  };

  const canonicalCounts: Record<string, number> = {};
  const unmappedDetails: Record<string, number> = {};
  const normalizedCounts: Record<string, number> = {};
  
  (statusRows || []).forEach((row: any) => {
    const raw = row?.status || 'Belirsiz';
    const normalizedKey = normalizeStatus(raw);
    normalizedCounts[normalizedKey] = (normalizedCounts[normalizedKey] || 0) + 1;
    const label = canonicalLabel(normalizedKey);
    canonicalCounts[label] = (canonicalCounts[label] || 0) + 1;
    
    // Eğer "Diğer" kategorisine düştüyse ne olduğunu kaydet
    if (label === 'Diğer') {
      const rawLabel = raw?.toString().trim() || 'Boş';
      unmappedDetails[rawLabel] = (unmappedDetails[rawLabel] || 0) + 1;
    }
  });

  const musteriCount = canonicalCounts['Müşteri'] || 0;
  const adayCount = canonicalCounts['Aday'] || 0;
  const reddedildiCount = canonicalCounts['Reddedildi'] || 0;
  const totalCount = statusRows?.length || 0;

  // Tüm kanoniks statüleri sırala
  const statüSıralamasi = [
    'Müşteri',
    'Aday',
    'Temas Edildi',
    'Numune Verildi',
    'Reddedildi',
    'Diğer'
  ];
  const sıralanmışStatüler = statüSıralamasi
    .filter(s => canonicalCounts[s] && canonicalCounts[s] > 0)
    .map(s => ({ label: s, count: canonicalCounts[s] }));

  // Kategori bazlı dağılım (sadece aktif müşteriler)
  const { data: categoryBreakdown } = await supabase
    .from('firmalar')
    .select('kategori')
    .or('ticari_tip.eq.musteri,ticari_tip.is.null')
    .eq('status', 'MÜŞTERİ')
    .not('kategori', 'eq', 'Alt Bayi')
    .is('sahip_id', null);

  // Kategori sayımı
  const categoryCounts: Record<string, number> = {};
  (categoryBreakdown || []).forEach((firma: any) => {
    const cat = firma.kategori || 'Diğer';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-primary">Müşteri Portföyü</h3>
          <p className="text-xs text-gray-500">Toplam: {totalCount}</p>
        </div>
        <FiUsers size={24} className="text-primary" />
      </div>

      {/* Statü Dağılımı - Tüm Statüler */}
      {sıralanmışStatüler.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-600 mb-2 font-semibold">Statü Dağılımı (Toplam: {totalCount})</p>
          <div className="flex flex-wrap gap-2">
            {sıralanmışStatüler.map(({ label, count }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
              >
                <span>{label}:</span>
                <span className="text-primary font-bold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* "Diğer" Kategorisinde Neler Var? */}
      {unmappedDetails && Object.keys(unmappedDetails).length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700 mb-2 font-semibold">⚠️ Diğer Kategorisindekiler:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(unmappedDetails)
              .sort(([, a], [, b]) => b - a)
              .map(([status, count]) => (
                <span
                  key={status}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-white text-amber-800 border border-amber-300"
                >
                  <span className="font-mono text-[10px]">{status}:</span>
                  <span className="font-bold">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}

      {/* Aktif Müşteri Kategorileri */}
      {Object.keys(categoryCounts).length > 0 && (
        <div>
          <p className="text-xs text-gray-600 mb-2 font-semibold">Aktif Müşteri Kategorileri</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(categoryCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([category, count]) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                >
                  <span className="font-medium">{category}:</span>
                  <span className="text-primary font-bold">{count}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
