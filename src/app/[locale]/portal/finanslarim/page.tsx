// src/app/[locale]/portal/finanslarim/page.tsx
import React from 'react';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Locale } from '@/i18n-config';
import { addGiderAction, addSatisAction } from './actions';
import Link from 'next/link';
import { FiPlus, FiTrendingUp, FiTrendingDown, FiDollarSign, FiEdit, FiTrash2 } from 'react-icons/fi';

export const dynamic = 'force-dynamic';

const formatCurrency = (v: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'EUR' }).format(v || 0);
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

export default async function FinanslarimPage({ params }: { params: { locale: Locale } }) {
  const { locale } = params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div className="p-6 text-red-500">Oturum bulunamadı.</div>;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

  // Satışlardan gelir hesapla (alt_bayi_satislar tablosundan)
  const { data: satislar } = await supabase
    .from('alt_bayi_satislar')
    .select(`
      *,
      firmalar!alt_bayi_satislar_firma_id_fkey(firma_adi)
    `)
    .eq('sahip_id', user.id)
    .gte('satis_tarihi', startOfMonth)
    .lt('satis_tarihi', startOfNextMonth)
    .order('satis_tarihi', { ascending: false });

  // Giderleri getir
  const { data: giderler } = await supabase
    .from('alt_bayi_giderleri')
    .select('*')
    .eq('sahip_id', user.id)
    .gte('tarih', startOfMonth)
    .lt('tarih', startOfNextMonth)
    .order('tarih', { ascending: false });

  const gelirToplam = (satislar || []).reduce((s, r: any) => s + Number(r.toplam_tutar || 0), 0);
  const giderToplam = (giderler || []).reduce((s, r: any) => s + Number(r.tutar || 0), 0);
  const net = gelirToplam - giderToplam;
  const ciro = gelirToplam;

  // Server Action wrapper for gider form
  async function onAddGider(fd: FormData) {
    'use server';
    await addGiderAction(fd, locale);
  }

  return (
    <div className="space-y-8">
      {/* Header ile KPI Kartları */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-primary">Finanslarım</h1>
            <p className="text-sm text-gray-600 mt-1">Satış ve gider kayıtlarınızı yönetin</p>
          </div>
          <div className="text-sm text-gray-500">
            {now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-90">Ciro</p>
              <FiTrendingUp size={20} />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(ciro)}</p>
            <p className="text-xs opacity-75 mt-1">{(satislar || []).length} satış</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-90">Giderler</p>
              <FiTrendingDown size={20} />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(giderToplam)}</p>
            <p className="text-xs opacity-75 mt-1">{(giderler || []).length} gider</p>
          </div>

          <div className={`bg-gradient-to-br ${net >= 0 ? 'from-green-500 to-green-600' : 'from-orange-500 to-orange-600'} p-6 rounded-xl shadow-lg text-white`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-90">Net Kar/Zarar</p>
              <FiDollarSign size={20} />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(net)}</p>
            <p className="text-xs opacity-75 mt-1">{net >= 0 ? 'Kâr' : 'Zarar'}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm opacity-90">Kâr Marjı</p>
              <span className="text-xs opacity-75">%</span>
            </div>
            <p className="text-2xl font-bold">
              {ciro > 0 ? ((net / ciro) * 100).toFixed(1) : '0.0'}%
            </p>
            <p className="text-xs opacity-75 mt-1">Kar/Ciro oranı</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <a href={`/${locale}/portal/finanslarim#satislar`} className="pb-3 border-b-2 border-primary text-primary font-semibold">
            Satışlar (Ön Fatura)
          </a>
          <a href={`/${locale}/portal/finanslarim#giderler`} className="pb-3 border-b-2 border-transparent text-gray-600 hover:text-gray-900">
            Giderler
          </a>
        </nav>
      </div>

      {/* Satışlar Bölümü */}
      <div id="satislar" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-primary">Satışlar (Ön Fatura)</h2>
          <Link 
            href={`/${locale}/portal/finanslarim/satislar/yeni`}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow hover:bg-opacity-90 font-bold text-sm transition"
          >
            <FiPlus size={16} /> Yeni Satış Ekle
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {(satislar || []).length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar</th>
                  <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {satislar.map((satis: any) => (
                  <tr key={satis.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(satis.satis_tarihi)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link 
                        href={`/${locale}/portal/musterilerim/${satis.firma_id}`}
                        className="text-sm font-semibold text-accent hover:underline"
                      >
                        {satis.firmalar?.firma_adi || 'Müşteri'}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {satis.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(satis.toplam_tutar)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <Link 
                          href={`/${locale}/portal/finanslarim/satislar/${satis.id}`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Düzenle"
                        >
                          <FiEdit size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    Toplam Gelir:
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-green-700">
                    {formatCurrency(gelirToplam)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-12 text-center">
              <FiTrendingUp className="mx-auto text-5xl text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">Henüz satış kaydı bulunmuyor</p>
              <Link 
                href={`/${locale}/portal/finanslarim/satislar/yeni`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg shadow hover:bg-opacity-90 font-bold text-sm"
              >
                <FiPlus size={16} /> İlk Satışı Ekle
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Giderler Bölümü */}
      <div id="giderler" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-primary">Giderler</h2>
        </div>

        {/* Gider Ekle Formu */}
        <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
          <h3 className="font-semibold text-lg text-gray-800 mb-4">Yeni Gider Ekle</h3>
          <form action={onAddGider} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="gider_tarih" className="block text-sm font-medium text-gray-700 mb-1">Tarih</label>
              <input 
                type="date" 
                id="gider_tarih"
                name="gider_tarih" 
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent" 
                required 
              />
            </div>
            <div>
              <label htmlFor="gider_kategori" className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
              <select
                id="gider_kategori"
                name="gider_kategori"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="Kira">Kira</option>
                <option value="Personel">Personel</option>
                <option value="Nakliye">Nakliye</option>
                <option value="Malzeme">Malzeme</option>
                <option value="Pazarlama">Pazarlama</option>
                <option value="Diğer">Diğer</option>
              </select>
            </div>
            <div>
              <label htmlFor="gider_aciklama" className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <input 
                id="gider_aciklama"
                name="gider_aciklama" 
                placeholder="Açıklama giriniz" 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent" 
              />
            </div>
            <div>
              <label htmlFor="gider_tutar" className="block text-sm font-medium text-gray-700 mb-1">Tutar (€)</label>
              <input 
                type="number" 
                step="0.01" 
                id="gider_tutar"
                name="gider_tutar" 
                placeholder="0.00" 
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-accent focus:border-transparent" 
                required 
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-accent text-white rounded-lg font-bold hover:bg-opacity-90 transition">
                Gider Ekle
              </button>
            </div>
          </form>
        </div>

        {/* Giderler Tablosu */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {(giderler || []).length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Kategori</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Açıklama</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tutar</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {giderler.map((gider: any) => (
                  <tr key={gider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {formatDate(gider.tarih)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {gider.kategori || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {gider.aciklama || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(gider.tutar || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-right text-sm font-bold text-gray-700">
                    Toplam Gider:
                  </td>
                  <td className="px-6 py-4 text-right text-lg font-bold text-red-700">
                    {formatCurrency(giderToplam)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <div className="p-12 text-center">
              <FiTrendingDown className="mx-auto text-5xl text-gray-300 mb-4" />
              <p className="text-gray-500">Henüz gider kaydı bulunmuyor</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
