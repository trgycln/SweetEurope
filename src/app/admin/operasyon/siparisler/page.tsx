// src/app/admin/operasyon/siparisler/page.tsx

import React from 'react';
import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Enums } from '@/lib/supabase/database.types';
import { FiPackage, FiFilter } from 'react-icons/fi';

type SiparisStatus = Enums<'siparis_durumu'>;

const STATUS_RENKLERI: Record<SiparisStatus, string> = {
    "Beklemede": "bg-gray-100 text-gray-800", "Hazırlanıyor": "bg-blue-100 text-blue-800",
    "Yola Çıktı": "bg-yellow-100 text-yellow-800", "Teslim Edildi": "bg-green-100 text-green-800",
    "İptal Edildi": "bg-red-100 text-red-800"
};

export default async function SiparislerListPage({ searchParams }: { searchParams: { status?: SiparisStatus, sortBy?: string } }) {
  const supabase = createSupabaseServerClient();

  let query = supabase.from('siparisler').select(`
    id, siparis_tarihi, toplam_tutar, siparis_statusu,
    firmalar (unvan)
  `);

  // Filtreleme
  if (searchParams.status) {
    query = query.eq('siparis_statusu', searchParams.status);
  }

  // Sıralama
  const [sortBy, sortOrder] = (searchParams.sortBy || 'tarih_desc').split('_');
  if (sortBy === 'tarih') {
    query = query.order('siparis_tarihi', { ascending: sortOrder === 'asc' });
  } else if (sortBy === 'tutar') {
    query = query.order('toplam_tutar', { ascending: sortOrder === 'asc' });
  }

  const { data: siparisler, error } = await query;

  if (error) {
    console.error("Siparişler çekilirken hata:", error);
    return <div>Siparişler yüklenemedi.</div>;
  }
  
  const formatFiyat = (fiyat: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(fiyat);
  const formatDate = (tarih: string) => new Date(tarih).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-4xl font-bold text-primary">Sipariş Yönetimi</h1>
        <p className="text-text-main/80 mt-1">{siparisler.length} adet sipariş listeleniyor.</p>
      </header>
      
      {/* TODO: Filtreleme ve Sıralama Arayüzü Eklenecek */}

      {siparisler.length === 0 ? (
        <div className="text-center mt-12"><FiPackage className="mx-auto text-5xl text-gray-300"/><h2 className="font-serif mt-4">Henüz Sipariş Yok</h2></div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full divide-y divide-bg-subtle">
            <thead className="bg-bg-subtle">
              <tr>
                {['Sipariş ID', 'Müşteri', 'Sipariş Tarihi', 'Tutar', 'Durum'].map(h => <th key={h} className="px-6 py-3 text-left text-xs font-bold text-text-main uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-bg-subtle">
              {siparisler.map(siparis => (
                <tr key={siparis.id} className="hover:bg-bg-subtle/50">
                  <td className="px-6 py-4 font-mono text-sm text-accent">
                    <Link href={`/admin/operasyon/siparisler/${siparis.id}`} className="hover:underline">#{siparis.id}</Link>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-primary">{siparis.firmalar?.unvan || 'Bilinmiyor'}</td>
                  <td className="px-6 py-4 text-sm text-text-main">{formatDate(siparis.siparis_tarihi)}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-text-main">{formatFiyat(siparis.toplam_tutar)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold leading-5 rounded-full ${STATUS_RENKLERI[siparis.siparis_statusu]}`}>{siparis.siparis_statusu}</span>
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