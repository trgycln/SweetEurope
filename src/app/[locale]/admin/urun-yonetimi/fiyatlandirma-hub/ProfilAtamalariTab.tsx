'use client';

import { useEffect, useMemo, useState } from 'react';
import { FiChevronDown, FiSearch } from 'react-icons/fi';

import ProfileAssignmentForm from '@/components/ProfileAssignmentForm';

type FirmaItem = {
  id: string;
  unvan: string;
  kategori: string | null;
  status: string | null;
  musteri_profil_id: string | null;
  musteri_profilleri?: {
    ad: string;
    genel_indirim_yuzdesi: number;
  } | Array<{
    ad: string;
    genel_indirim_yuzdesi: number;
  }> | null;
};

type MusteriProfiliItem = {
  id: string;
  ad: string;
  genel_indirim_yuzdesi: number;
};

interface Props {
  locale: string;
  firmalar: FirmaItem[];
  musteriProfilleri: MusteriProfiliItem[];
}

type FilterType = 'tum' | 'atanmis' | 'atamasiz';

function getKategoriBadgeClass(kategori: string | null) {
  const normalized = (kategori || '').toLocaleLowerCase('tr');
  if (normalized.includes('müşteri')) return 'bg-blue-100 text-blue-800';
  if (normalized.includes('alt bayi')) return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}

function getDurumBadgeClass(status: string | null) {
  const normalized = (status || '').toLocaleLowerCase('tr');
  if (normalized.includes('müşteri')) return 'bg-green-100 text-green-800';
  if (normalized.includes('temas')) return 'bg-blue-100 text-blue-800';
  if (normalized.includes('numune')) return 'bg-purple-100 text-purple-800';
  if (normalized.includes('redd')) return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-800';
}

function getCurrentProfile(firma: FirmaItem) {
  return Array.isArray(firma.musteri_profilleri)
    ? (firma.musteri_profilleri[0] ?? null)
    : (firma.musteri_profilleri ?? null);
}

export default function ProfilAtamalariTab({ locale, firmalar, musteriProfilleri }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('atamasiz');
  const [selectedFirmaId, setSelectedFirmaId] = useState<string>(firmalar[0]?.id ?? '');

  const stats = useMemo(() => ({
    toplam: firmalar.length,
    atanmis: firmalar.filter((firma) => Boolean(firma.musteri_profil_id)).length,
    atamasiz: firmalar.filter((firma) => !firma.musteri_profil_id).length,
  }), [firmalar]);

  const filteredFirmalar = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase('tr');

    return firmalar.filter((firma) => {
      const matchesSearch = normalizedSearch.length === 0
        || [firma.unvan, firma.kategori, firma.status, getCurrentProfile(firma)?.ad]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('tr')
          .includes(normalizedSearch);

      const matchesFilter = activeFilter === 'tum'
        || (activeFilter === 'atanmis' && Boolean(firma.musteri_profil_id))
        || (activeFilter === 'atamasiz' && !firma.musteri_profil_id);

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, firmalar, searchTerm]);

  useEffect(() => {
    if (filteredFirmalar.length === 0) {
      setSelectedFirmaId('');
      return;
    }

    const selectedStillExists = filteredFirmalar.some((firma) => firma.id === selectedFirmaId);
    if (!selectedStillExists) {
      setSelectedFirmaId(filteredFirmalar[0].id);
    }
  }, [filteredFirmalar, selectedFirmaId]);

  const selectedFirma = filteredFirmalar.find((firma) => firma.id === selectedFirmaId) ?? null;
  const currentProfile = selectedFirma ? getCurrentProfile(selectedFirma) : null;
  const discountValue = currentProfile?.genel_indirim_yuzdesi;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-2xl font-bold text-slate-800">{stats.toplam}</div>
          <div className="text-sm text-slate-600">Toplam firma</div>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="text-2xl font-bold text-blue-700">{stats.atanmis}</div>
          <div className="text-sm text-blue-700">Profili atanmış</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-2xl font-bold text-amber-700">{stats.atamasiz}</div>
          <div className="text-sm text-amber-700">Profil bekleyen</div>
        </div>
      </div>

      <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" open>
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-900">
          <span>Hızlı kullanım başlıkları</span>
          <FiChevronDown className="text-gray-400 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <p><strong>1.</strong> Önce sekmeden listeyi daraltın.</p>
          <p><strong>2.</strong> Soldan firmayı seçin.</p>
          <p><strong>3.</strong> Sağ panelde profili atayıp kaydedin.</p>
        </div>
      </details>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Sekmeli görünüm</h2>
            <p className="text-sm text-gray-600">Uzun sayfa yerine buton ve seçili detay paneli kullanılır.</p>
          </div>

          <div className="relative w-full lg:max-w-xs">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Firma veya profil ara..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { key: 'atamasiz', label: `Profil Bekleyenler (${stats.atamasiz})` },
            { key: 'atanmis', label: `Profili Olanlar (${stats.atanmis})` },
            { key: 'tum', label: `Tüm Firmalar (${stats.toplam})` },
          ].map((option) => {
            const isActive = activeFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setActiveFilter(option.key as FilterType)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="font-semibold text-gray-900">Firma listesi</h3>
            <p className="text-xs text-gray-500">Bir firmaya tıklayarak detay alanını açın.</p>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-2">
            {filteredFirmalar.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                Bu filtreye uygun firma bulunamadı.
              </div>
            ) : (
              filteredFirmalar.map((firma) => {
                const isSelected = firma.id === selectedFirmaId;
                const profile = getCurrentProfile(firma);

                return (
                  <button
                    key={firma.id}
                    type="button"
                    onClick={() => setSelectedFirmaId(firma.id)}
                    className={`mb-2 w-full rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{firma.unvan}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${getKategoriBadgeClass(firma.kategori)}`}>
                        {firma.kategori || 'Kategori yok'}
                      </span>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                        {profile?.ad || 'Profil yok'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4">
          {!selectedFirma ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
              Devam etmek için soldan bir firma seçin.
            </div>
          ) : (
            <>
              <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" open>
                <summary className="cursor-pointer list-none text-sm font-semibold text-gray-900">
                  Seçili firma özeti
                </summary>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-lg font-semibold text-gray-900">{selectedFirma.unvan}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getKategoriBadgeClass(selectedFirma.kategori)}`}>
                        {selectedFirma.kategori || 'Kategori yok'}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getDurumBadgeClass(selectedFirma.status)}`}>
                        {selectedFirma.status || 'Durum yok'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3 text-sm">
                    <div className="font-medium text-gray-800">Mevcut profil</div>
                    <div className="mt-1 text-gray-700">{currentProfile?.ad || 'Profil yok / standart fiyatlandırma'}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {discountValue !== undefined && discountValue !== null
                        ? `${discountValue > 0 ? '+' : ''}${discountValue}% genel etki`
                        : 'Bu firmaya henüz profil atanmadı.'}
                    </div>
                  </div>
                </div>
              </details>

              <details className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm" open>
                <summary className="cursor-pointer list-none text-sm font-semibold text-blue-900">
                  Profil ata / değiştir
                </summary>
                <div className="mt-4">
                  <ProfileAssignmentForm
                    firma={{
                      id: selectedFirma.id,
                      firma_adi: selectedFirma.unvan,
                      musteri_profil_id: selectedFirma.musteri_profil_id,
                    }}
                    profiller={musteriProfilleri}
                    locale={locale}
                  />
                </div>
              </details>

              <details className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <summary className="cursor-pointer list-none text-sm font-semibold text-amber-900">
                  Atama önerileri
                </summary>
                <div className="mt-3 space-y-2 text-sm text-amber-800">
                  <p>• Normal müşterilerde profil yok bırakabilirsiniz.</p>
                  <p>• VIP veya kampanyalı müşterilerde uygun indirim profili seçin.</p>
                  <p>• Kaydetmeden önce seçili yüzde etkisini kontrol edin.</p>
                </div>
              </details>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
