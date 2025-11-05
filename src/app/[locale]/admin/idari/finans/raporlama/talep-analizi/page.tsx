// src/app/[locale]/admin/idari/finans/raporlama/talep-analizi/page.tsx
// Talep Analizi – Top ürünler, kategoriler, favoriler ve müşteri segmentleri

'use client';

export const dynamic = 'force-dynamic';

import React from 'react';
import Link from 'next/link';
import { createDynamicSupabaseClient } from '@/lib/supabase/client';
import { 
  FiArrowLeft, FiFilter, FiHeart, FiUsers
} from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';

type PageProps = { params: Promise<{ locale: string }> };

type TopProduct = {
  id: string;
  name: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
};

type TopCategory = {
  name: string;
  totalQty: number;
  totalRevenue: number;
  orderCount: number;
};

type FavoriteStat = {
  productId: string;
  name: string;
  slug?: string | null;
  favCount: number;
  orderedInPeriod: number; // kaç farklı siparişte geçti
};

type SegmentBuyer = {
  segment: 'Müşteri' | 'Alt Bayi' | 'Diğer';
  firmName: string;
  totalRevenue: number;
  orderCount: number;
};

// Tailwind paletiyle uyumlu renkler
const THEME = {
  primary: '#2B2B2B',
  accent: '#C69F6B',
  text: '#3D3D3D',
  bgSubtle: '#EAE8E1',
  secondary: '#FAF9F6',
};
const COLORS = [THEME.accent, THEME.primary, THEME.text, '#6B7280', '#9CA3AF', THEME.bgSubtle, '#7C6A43', '#A87F4F'];

const formatCurrency = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
const truncate = (s: string, n = 18) => (typeof s === 'string' && s.length > n ? `${s.slice(0, n - 1)}…` : s);

export default function DemandAnalysisPage({ params }: PageProps) {
  const [locale, setLocale] = React.useState<string>('de');
  const [period, setPeriod] = React.useState<'last-month' | 'last-6-months' | 'this-year' | 'last-year'>('this-year');
  const [loading, setLoading] = React.useState(true);

  const [topProductsByQty, setTopProductsByQty] = React.useState<TopProduct[]>([]);
  const [topProductsByRevenue, setTopProductsByRevenue] = React.useState<TopProduct[]>([]);
  const [topCategories, setTopCategories] = React.useState<TopCategory[]>([]);
  const [favorites, setFavorites] = React.useState<FavoriteStat[]>([]);
  const [segmentTopBuyers, setSegmentTopBuyers] = React.useState<SegmentBuyer[]>([]);
  const [favoriteScope, setFavoriteScope] = React.useState<'lifetime' | 'period'>('lifetime');

  React.useEffect(() => {
    params.then(p => setLocale(p.locale));
  }, [params]);

  React.useEffect(() => {
    fetchAll();
  }, [period, locale]);

  const getDateRange = (p: string) => {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    switch (p) {
      case 'last-month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'last-6-months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        endDate = new Date();
        break;
      case 'last-year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'this-year':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
    }
    return {
      start: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    };
  };

  const resolveName = (ad: any): string => {
    if (!ad) return 'Diğer';
    if (typeof ad === 'string') return ad;
    if (typeof ad === 'object') {
      return ad?.[locale] || ad?.de || ad?.en || ad?.tr || Object.values(ad)[0] || 'Diğer';
    }
    return 'Diğer';
  };

  const fetchAll = async () => {
    setLoading(true);
    const supabase = createDynamicSupabaseClient(false);
    const { start, end } = getDateRange(period);

    // 1) Sipariş detaylarından ürün ve kategori istatistikleri (sadece join'li yol, ilk çalışan haliyle)
    // İlk çalışan, basit join'li select (Supabase syntax'ı ile)
    const orderItemsRes = await supabase
      .from('siparis_detay')
      .select(`
        id,
        siparis_id,
        miktar,
        birim_fiyat,
        toplam_fiyat,
        siparisler!inner(siparis_tarihi),
        urunler!inner(
          id,
          ad,
          slug,
          kategori_id,
          kategoriler(ad)
        )
      `)
      .gte('siparisler.siparis_tarihi', start)
      .lte('siparisler.siparis_tarihi', end);
    console.log('orderItemsRes:', orderItemsRes);
    const orderItems = orderItemsRes.data;

    const productMap = new Map<string, { name: string; qty: number; revenue: number; orders: Set<string> }>();
    const categoryMap = new Map<string, { qty: number; revenue: number; orders: Set<string> }>();

    if (orderItems) {
      (orderItems as any[]).forEach((row) => {
        const pid = row?.urunler?.id as string;
        const pname = resolveName(row?.urunler?.ad);
        const catName = resolveName(row?.urunler?.kategoriler?.ad);
        const qty = Number(row?.miktar || 0);
        const lineTotal = Number(row?.toplam_fiyat ?? ((row?.miktar || 0) * (row?.birim_fiyat || 0)));
        const orderId = row?.siparis_id as string | undefined;

        if (pid) {
          const p = productMap.get(pid) || { name: pname, qty: 0, revenue: 0, orders: new Set<string>() };
          p.qty += qty;
          p.revenue += lineTotal;
          if (orderId) p.orders.add(orderId);
          productMap.set(pid, p);
        }
        const c = categoryMap.get(catName) || { qty: 0, revenue: 0, orders: new Set<string>() };
        c.qty += qty;
        c.revenue += lineTotal;
        if (orderId) c.orders.add(orderId);
        categoryMap.set(catName, c);
      });
    }
    // Ürünler için mapping ve state set
    const productsArr: TopProduct[] = Array.from(productMap.entries()).map(([id, v]) => ({
      id,
      name: v.name,
      totalQty: v.qty,
      totalRevenue: v.revenue,
      orderCount: v.orders.size,
    }));
    setTopProductsByQty(productsArr.slice().sort((a,b) => b.totalQty - a.totalQty));
    setTopProductsByRevenue(productsArr.slice().sort((a,b) => b.totalRevenue - a.totalRevenue));

    const categoriesArr: TopCategory[] = Array.from(categoryMap.entries()).map(([name, v]) => ({
      name,
      totalQty: v.qty,
      totalRevenue: v.revenue,
      orderCount: v.orders.size,
    })).sort((a,b) => b.totalRevenue - a.totalRevenue);
    setTopCategories(categoriesArr);

    // 2) Favoriler – view ve join ile aggregate veri
    let favStats: FavoriteStat[] = [];
    const { data: favAgg } = await supabase
      .from('favori_urunler_istatistik')
      .select('urun_id, fav_count')
      .order('fav_count', { ascending: false });
    if (favAgg && favAgg.length > 0) {
      // Ürün ad ve slug'larını topluca çek
      const productIds = favAgg.map(f => f.urun_id);
      const { data: productRows } = await supabase
        .from('urunler')
        .select('id, ad, slug')
        .in('id', productIds);
      const prodById = new Map<string, any>((productRows || []).map(p => [p.id, p]));
      // Favori ürünlerin dönemde kaç farklı siparişte geçtiğini bul
      let orderedByProduct = new Map<string, number>();
      if (orderItems && Array.isArray(orderItems)) {
        const orderedMap = new Map<string, Set<string>>();
        orderItems.forEach((row) => {
          const pid = row?.urunler?.id as string;
          const orderId = row?.siparis_id as string | undefined;
          if (pid && orderId) {
            const s = orderedMap.get(pid) || new Set<string>();
            s.add(orderId);
            orderedMap.set(pid, s);
          }
        });
        orderedByProduct = new Map<string, number>(Array.from(orderedMap.entries()).map(([pid, set]) => [pid, set.size]));
      }
      favStats = favAgg.map(f => {
        const prod = prodById.get(f.urun_id) || {};
        return {
          productId: f.urun_id,
          name: resolveName(prod.ad),
          slug: prod.slug,
          favCount: Number(f.fav_count),
          orderedInPeriod: orderedByProduct.get(f.urun_id) || 0,
        };
      }).sort((a,b) => b.favCount - a.favCount).slice(0, 10);
    }
    setFavorites(favStats);

    // 3) Müşteri segmentlerine göre en çok alanlar (ayrı sorgularla, RLS'e dayanıklı)
    const { data: orders } = await supabase
      .from('siparisler')
      .select('id, firma_id, toplam_tutar_net, olusturan_kullanici_id')
      .gte('siparis_tarihi', start)
      .lte('siparis_tarihi', end);
    console.log('Segment orders:', orders);

    const segMap = new Map<string, { segment: SegmentBuyer['segment']; firmId: string; firmName: string; revenue: number; count: number }>();
    if (orders && (orders as any[]).length > 0) {
      const firmaIds = Array.from(new Set((orders as any[]).map(o => o.firma_id).filter(Boolean)));
      const userIds = Array.from(new Set((orders as any[]).map(o => o.olusturan_kullanici_id).filter(Boolean)));

      const { data: firmRows } = await supabase
        .from('firmalar')
        .select('id, unvan')
        .in('id', firmaIds);
      const firmNameById = new Map<string, string>((firmRows || []).map(r => [r.id as string, r.unvan as string]));

      const { data: profileRows } = await supabase
        .from('kullanici_segment_bilgileri')
        .select('id, rol')
        .in('id', userIds);
      console.log('Profile rows for segments:', profileRows);
      const roleByUserId = new Map<string, string>((profileRows || []).map(r => [r.id as string, r.rol as string]));

      (orders as any[]).forEach(o => {
        const role = roleByUserId.get(o.olusturan_kullanici_id) as 'Müşteri' | 'Alt Bayi' | undefined;
        const seg: SegmentBuyer['segment'] = role === 'Alt Bayi' ? 'Alt Bayi' : (role === 'Müşteri' ? 'Müşteri' : 'Diğer');
        const firmName = firmNameById.get(o.firma_id) || 'Bilinmeyen Firma';
        const key = `${seg}::${o.firma_id}`;
        const item = segMap.get(key) || { segment: seg, firmId: o.firma_id, firmName, revenue: 0, count: 0 };
        item.revenue += Number(o?.toplam_tutar_net || 0);
        item.count += 1;
        segMap.set(key, item);
      });

      const segArr: SegmentBuyer[] = Array.from(segMap.values())
        .sort((a,b) => b.revenue - a.revenue)
        .map(x => ({ segment: x.segment, firmName: x.firmName, totalRevenue: x.revenue, orderCount: x.count }));
      console.log('Segment mapping result:', segArr);
      setSegmentTopBuyers(segArr);
    } else {
      console.log('No orders found for segments');
      setSegmentTopBuyers([]);
    }

    setLoading(false);
  }; // fetchAll fonksiyonu burada biter

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <Link 
          href={`/${locale}/admin/idari/finans/raporlama`}
          className="inline-flex items-center gap-2 text-primary hover:text-accent mb-4 font-semibold"
        >
          <FiArrowLeft /> Raporlara Dön
        </Link>
        <h1 className="font-serif text-4xl font-bold text-primary">Talep Analizi</h1>
        <p className="text-text-main/80 mt-1">En çok talep gören ürünler, kategoriler, favoriler ve müşteri segmentleri</p>
      </header>

      {/* Filtreler */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <FiFilter className="text-accent" />
          <p className="font-bold text-primary">Dönem:</p>
          {[
            { label: 'Geçen Ay', value: 'last-month' },
            { label: 'Son 6 Ay', value: 'last-6-months' },
            { label: 'Bu Yıl', value: 'this-year' },
            { label: 'Geçen Yıl', value: 'last-year' },
          ].map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value as any)}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-colors ${
                period === (p.value as any)
                  ? 'bg-accent text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      ) : (
        <>
          {/* Top Ürünler */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-secondary p-6 rounded-2xl shadow-lg border border-bg-subtle">
              <h3 className="font-serif text-xl font-bold text-primary mb-6">En Çok Satılan Ürünler (Adet)</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topProductsByQty}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} interval={0} tickFormatter={(v: string) => truncate(v, 18)} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="totalQty" name="Adet" fill={THEME.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-secondary p-6 rounded-2xl shadow-lg border border-bg-subtle">
              <h3 className="font-serif text-xl font-bold text-primary mb-6">En Çok Ciro Yapan Ürünler</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={topProductsByRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-35} interval={0} tickFormatter={(v: string) => truncate(v, 18)} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="totalRevenue" name="Ciro" fill={THEME.accent} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Kategoriler */}
          {topCategories.length > 0 && (
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-200">
                <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Dağılımı (Ciro)</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={topCategories} dataKey="totalRevenue" nameKey="name" cx="50%" cy="50%" outerRadius={110}
                      label={(entry: any) => `${entry.name}`}
                    >
                      {topCategories.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-secondary p-6 rounded-2xl shadow-lg border border-bg-subtle">
                <h3 className="font-serif text-xl font-bold text-primary mb-6">Kategori Karşılaştırma</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topCategories}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip formatter={(v: any) => formatCurrency(Number(v))} />
                    <Legend />
                    <Bar dataKey="totalRevenue" name="Ciro" fill={THEME.accent} />
                    <Bar dataKey="totalQty" name="Adet" fill={THEME.primary} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {/* Favoriler */}
          <section className="bg-secondary p-6 rounded-2xl shadow-lg border border-bg-subtle">
            <div className="flex items-center gap-2 mb-4"><FiHeart className="text-rose-500" /><h3 className="font-serif text-xl font-bold text-primary">Favoriler</h3></div>
            <div className="mb-4 flex items-center gap-3">
              <span className="text-sm text-text-main">Zaman:</span>
              <div className="inline-flex rounded-full border border-bg-subtle overflow-hidden">
                <button onClick={() => setFavoriteScope('lifetime')} className={`px-3 py-1 text-sm ${favoriteScope==='lifetime'?'bg-accent text-white':'bg-secondary text-text-main'}`}>Tüm Zamanlar</button>
                <button onClick={() => setFavoriteScope('period')} className={`px-3 py-1 text-sm ${favoriteScope==='period'?'bg-accent text-white':'bg-secondary text-text-main'}`}>Seçili Dönem</button>
              </div>
            </div>
            {favorites.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                          <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Ürün</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Favori Sayısı</th>
                      <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Dönemde Sipariş Edilen</th>
                          <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Konversiyon (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {favorites.map((f, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                              {f.slug ? (
                                <Link href={`/${locale}/(public)/products/${f.slug}`} className="text-primary hover:text-accent underline-offset-2 hover:underline">{f.name}</Link>
                              ) : (
                                f.name
                              )}
                            </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">{f.favCount}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">{f.orderedInPeriod}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">{f.favCount>0 ? ((f.orderedInPeriod/f.favCount)*100).toFixed(1): '0.0'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">Seçilen dönemde favori eklenmemiş.</p>
            )}
          </section>

          {/* Segmentlere göre en çok alan firmalar */}
          <section className="bg-secondary p-6 rounded-2xl shadow-lg border border-bg-subtle">
            <div className="flex items-center gap-2 mb-4"><FiUsers className="text-accent" /><h3 className="font-serif text-xl font-bold text-primary">Müşteri Segmentleri – En Çok Alanlar</h3></div>
            {segmentTopBuyers.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Müşteri */}
                <div className="overflow-x-auto">
                  <h4 className="font-serif font-bold text-primary mb-2">Müşteriler</h4>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Firma</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Sipariş</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Net Ciro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {segmentTopBuyers.filter(b=>b.segment==='Müşteri').map((b, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{b.firmName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">{b.orderCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">{formatCurrency(b.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Alt Bayi */}
                <div className="overflow-x-auto">
                  <h4 className="font-serif font-bold text-primary mb-2">Alt Bayiler</h4>
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Firma</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Sipariş</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Net Ciro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {segmentTopBuyers.filter(b=>b.segment==='Alt Bayi').map((b, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{b.firmName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">{b.orderCount}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-primary">{formatCurrency(b.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Bu dönemde sipariş kaydı bulunamadı.</p>
            )}
          </section>

        </>
      )}
    </div>
  );
}
