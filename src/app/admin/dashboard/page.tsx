// src/app/admin/dashboard/page.tsx (DOĞRU ANA PANEL KODU)

import React from 'react';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/database.types';
import Link from 'next/link';
import { FiClipboard, FiBox, FiAlertTriangle } from 'react-icons/fi';

// Tip Tanımları
const MetricCard = ({ title, value, color, icon }: { title: string, value: number | string, color: string, icon: React.ReactNode }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-lg border-l-4 ${color} flex items-center gap-4`}>
    <div className={`p-3 rounded-full ${color.replace('border-', 'bg-').replace('500', '100').replace('accent', 'accent/20')}`}>
        {icon}
    </div>
    <div>
        <p className="text-sm font-medium text-text-main/70">{title}</p>
        <p className="text-3xl font-bold text-primary mt-1">{value}</p>
    </div>
  </div>
);

type SonGorev = Pick<Tables<'gorevler'>, 'id' | 'baslik' | 'son_tarih' | 'oncelik'>;

export default async function AdminDashboardPage() {
  const supabase = createSupabaseServerClient();

  const [
    gorevlerResponse,
    kritikStokResponse,
    urunlerResponse,
    sonGorevlerResponse
  ] = await Promise.all([
    supabase.from('gorevler').select('id', { count: 'exact' }).eq('tamamlandi', false),
    supabase.rpc('get_kritik_stok_count'),
    supabase.from('urunler').select('id', { count: 'exact' }),
    supabase.from('gorevler').select('id, baslik, son_tarih, oncelik').eq('tamamlandi', false).order('son_tarih', { ascending: true }).limit(5)
  ]);

  const errors = [gorevlerResponse.error, kritikStokResponse.error, urunlerResponse.error, sonGorevlerResponse.error].filter(Boolean);
  if (errors.length > 0) {
    console.error("Dashboard veri çekme hataları:", errors);
    return <div className="p-6 text-red-500 font-serif">Ana Panel verileri yüklenirken bir hata oluştu.</div>;
  }

  const aktifGorevSayisi = gorevlerResponse.count ?? 0;
  const kritikStokCount = kritikStokResponse.data ?? 0;
  const toplamUrun = urunlerResponse.count ?? 0;
  const sonBesGorev: SonGorev[] = sonGorevlerResponse.data ?? [];

  const getOncelikStili = (oncelik: SonGorev['oncelik']) => {
    switch (oncelik) {
      case 'Yüksek': return 'bg-red-100 text-red-800';
      case 'Orta': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-4xl font-bold text-primary">Ana Panel</h1>
        <p className="text-text-main/80 mt-1">İşletmenizin genel durumuna hoş geldiniz.</p>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Aktif Görevler" value={aktifGorevSayisi} color="border-accent" icon={<FiClipboard className="text-accent"/>} />
        <MetricCard title="Toplam Ürün" value={toplamUrun} color="border-blue-500" icon={<FiBox className="text-blue-500"/>} />
        <MetricCard title="Kritik Stok" value={kritikStokCount} color="border-red-500" icon={<FiAlertTriangle className="text-red-500"/>} />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <div className="flex justify-between items-center mb-4">
            <h2 className="font-serif text-2xl font-bold text-primary">Yaklaşan Görevler</h2>
            <Link href="/admin/gorevler" className="text-sm font-bold text-accent hover:underline">Tümünü Gör</Link>
        </div>
        
        {sonBesGorev.length === 0 ? (
          <p className="text-text-main/70">Yaklaşan önemli bir görev yok. Harika iş!</p>
        ) : (
          <ul className="divide-y divide-bg-subtle">
            {sonBesGorev.map((gorev) => (
              <li key={gorev.id} className="py-4 flex justify-between items-center">
                <div>
                    <p className="text-primary font-bold">{gorev.baslik}</p>
                    <p className="text-sm text-text-main/60 mt-1">
                        Son Tarih: {gorev.son_tarih ? new Date(gorev.son_tarih).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
                    </p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getOncelikStili(gorev.oncelik)}`}>
                  {gorev.oncelik}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}