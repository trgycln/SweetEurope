// src/app/admin/gorevler/page.tsx (YENİDEN TASARLANMIŞ HALİ)

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';
import { FiPlus, FiClipboard, FiCalendar, FiFlag, FiCheckCircle, FiCircle } from 'react-icons/fi'; // İkonlar eklendi

// Typdefinition für die Gorev-Daten mit dem gejointen Firmennamen
type GorevRow = Tables<'gorevler'> & {
  firmalar: {
    unvan: string | null;
  } | null;
};

// Konstanten für die Farbgebung (Mevcut tanım korundu)
const PRIORITAT_FARBEN: { [key: string]: string } = {
  'Düşük': 'bg-blue-100 text-blue-800',
  'Orta': 'bg-yellow-100 text-yellow-800',
  'Yüksek': 'bg-red-100 text-red-800',
};

const STATUS_FARBEN = {
    true: 'bg-green-100 text-green-800', // Tamamlandı
    false: 'bg-accent/20 text-accent' // Açık (Vurgu renginin açığı)
}

// Aufgabenliste Seite - Server Component
export default async function GorevlerListPage() {
  
  const supabase = createSupabaseServerClient();

  const { data: gorevler, error } = await supabase
    .from('gorevler')
    .select('*, firmalar(unvan)')
    .order('son_tarih', { ascending: true });

  if (error) {
    console.error('Aufgaben (Gorevler) konnten nicht geladen werden:', error);
    return (
        <div className="flex h-full items-center justify-center p-6 text-red-600 bg-secondary">
            <div className="text-center">
                <h2 className="font-serif text-2xl text-primary">Bir Hata Oluştu</h2>
                <p className="text-text-main">Görevler yüklenirken bir sorunla karşılaşıldı.</p>
            </div>
        </div>
    );
  }

  const gorevListe = gorevler as GorevRow[];
  const anzahlAufgaben = gorevListe.length;

  const formatDate = (date: string | null) => {
    if (!date) return 'Belirtilmemiş';
    return new Date(date).toLocaleDateString('de-DE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
  }

  return (
    // Ana kapsayıcı: Sayfanın genel boşluklarını ve maksimum genişliğini ayarlar.
    <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 font-sans text-text-main bg-secondary min-h-screen">
      
      {/* Sayfa Başlığı ve Yeni Görev Butonu */}
      <header className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="font-serif text-4xl font-bold text-primary">Görev Yönetimi</h1>
            <p className="text-text-main/80 mt-1">{anzahlAufgaben} adet görev listeleniyor.</p>
        </div>
        <Link href="/admin/gorevler/ekle" passHref>
          <button className="flex items-center justify-center gap-2 px-5 py-3 bg-accent text-white rounded-lg shadow-md hover:bg-opacity-90 transition-all duration-200 font-bold text-sm w-full sm:w-auto">
            <FiPlus size={18} />
            Yeni Görev Ekle
          </button>
        </Link>
      </header>

      {/* İçerik: Liste veya Boş Durum Mesajı */}
      {anzahlAufgaben === 0 ? (
        <div className="mt-12 text-center p-10 border-2 border-dashed border-bg-subtle rounded-lg bg-secondary shadow-sm">
            <FiClipboard className="mx-auto text-5xl text-gray-300 mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-primary">Henüz Görev Yok</h2>
            <p className="mt-2 text-text-main/70">Başlamak için yeni bir görev ekleyin.</p>
        </div>
      ) : (
        // Duyarlı yapı: Mobilde kart, masaüstünde tablo görünümü
        <div className="space-y-4">
            {/* MOBİL & TABLET GÖRÜNÜMÜ: KART LİSTESİ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-6">
                {gorevListe.map((gorev) => (
                    <div key={gorev.id} className="bg-white rounded-lg shadow-lg p-5 flex flex-col justify-between border-l-4" style={{ borderColor: gorev.oncelik === 'Yüksek' ? '#ef4444' : gorev.oncelik === 'Orta' ? '#f59e0b' : '#3b82f6' }}>
                        <div>
                            <p className="text-sm text-gray-500">{gorev.firmalar?.unvan ?? 'Firma Belirtilmemiş'}</p>
                            <h3 className="font-serif text-xl font-bold text-primary mt-1">{gorev.baslik}</h3>
                        </div>
                        <div className="mt-4 space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-text-main">
                                <FiCalendar className="text-gray-400"/>
                                <span>Son Tarih: {formatDate(gorev.son_tarih)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-text-main">
                                {gorev.tamamlandi ? <FiCheckCircle className="text-green-500"/> : <FiCircle className="text-accent"/>}
                                <span>Durum: {gorev.tamamlandi ? 'Tamamlandı' : 'Açık'}</span>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-bg-subtle">
                             <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${PRIORITAT_FARBEN[gorev.oncelik] || 'bg-gray-100 text-gray-800'}`}>
                                {gorev.oncelik} Öncelik
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* MASAÜSTÜ GÖRÜNÜMÜ: TABLO */}
            <div className="hidden lg:block overflow-x-auto bg-white rounded-lg shadow-md">
              <table className="min-w-full divide-y divide-bg-subtle">
                <thead className="bg-bg-subtle">
                  <tr>
                    {['Görev Başlığı', 'İlgili Firma', 'Öncelik', 'Son Tarih', 'Durum'].map(header => (
                        <th key={header} scope="col" className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-bg-subtle">
                  {gorevListe.map((gorev) => (
                    <tr key={gorev.id} className="hover:bg-bg-subtle/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-primary">{gorev.baslik}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{gorev.firmalar?.unvan ?? '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${PRIORITAT_FARBEN[gorev.oncelik] || 'bg-gray-100 text-gray-800'}`}>{gorev.oncelik}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-main">{formatDate(gorev.son_tarih)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold leading-5 rounded-full ${STATUS_FARBEN[gorev.tamamlandi.toString()]}`}>
                          {gorev.tamamlandi ? <FiCheckCircle /> : <FiCircle />}
                          {gorev.tamamlandi ? 'Tamamlandı' : 'Açık'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}
    </main>
  );
}