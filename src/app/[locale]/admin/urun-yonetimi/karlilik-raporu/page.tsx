export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiChevronDown,
  FiPackage,
  FiTruck,
  FiTrendingDown,
} from 'react-icons/fi';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LocalizedText = Record<string, string> | string | null | undefined;

type AlertProduct = {
  id: string;
  ad: LocalizedText;
  stok_kodu?: string | null;
  tedarikci_id?: string | null;
  stok_miktari?: number | null;
  standart_inis_maliyeti_net?: number | null;
  son_gercek_inis_maliyeti_net?: number | null;
  son_maliyet_sapma_yuzde?: number | null;
  karlilik_alarm_aktif?: boolean | null;
};

type BatchRow = {
  id: string;
  referans_kodu: string;
  tedarikci_id?: string | null;
  para_birimi?: string | null;
  kur_orani?: number | null;
  navlun_soguk_eur?: number | null;
  navlun_kuru_eur?: number | null;
  gumruk_vergi_toplam_eur?: number | null;
  traces_numune_ardiye_eur?: number | null;
  varis_tarihi?: string | null;
  durum?: string | null;
  created_at?: string | null;
  itemCount?: number;
  totalQuantity?: number;
  averageVariancePct?: number;
  alertLineCount?: number;
};

function money(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function getLocalizedText(raw: LocalizedText, locale: string, fallback = 'Ürün') {
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    const candidate = raw[locale] || raw.tr || raw.de || Object.values(raw).find((value) => typeof value === 'string' && value.trim());
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return fallback;
}

function formatVariance(value: number | null | undefined) {
  const variance = Number(value ?? 0);
  if (!Number.isFinite(variance)) return '%0.0';
  return `%${variance.toFixed(1)}`;
}

function getVarianceTone(value: number | null | undefined) {
  const variance = Math.abs(Number(value ?? 0));
  if (variance >= 15) return 'bg-red-100 text-red-700 border-red-200';
  if (variance >= 5) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-emerald-100 text-emerald-700 border-emerald-200';
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function normalizeDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function SummaryCard({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <div className="rounded-full bg-slate-100 p-2 text-slate-700">{icon}</div>
      </div>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function ExpandableSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="mb-3 flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700">
          <span className="hidden sm:inline">Aç / Kapat</span>
          <FiChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="space-y-4">{children}</div>
    </details>
  );
}

export default async function KarlilikRaporuPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ supplier?: string; minVariance?: string; from?: string; to?: string }>;
}) {
  const { locale } = await params;
  const filters = (await searchParams) || {};
  const selectedSupplierId = filters.supplier || 'all';
  const minVariance = Math.max(0, Number(filters.minVariance || 5));
  const fromDate = filters.from || '';
  const toDate = filters.to || '';
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/${locale}/login`);
  }

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) {
    return redirect(`/${locale}/admin`);
  }

  const { data: suppliers } = await (supabase as any)
    .from('tedarikciler')
    .select('id, unvan')
    .order('unvan', { ascending: true })
    .limit(1000);

  const supplierNameById = Object.fromEntries(((suppliers || []) as Array<any>).map((supplier) => [supplier.id, supplier.unvan || 'Bilinmiyor']));

  let alertProducts: AlertProduct[] = [];
  let alertResponse = await (supabase as any)
    .from('urunler')
    .select('id, ad, stok_kodu, tedarikci_id, stok_miktari, standart_inis_maliyeti_net, son_gercek_inis_maliyeti_net, son_maliyet_sapma_yuzde, karlilik_alarm_aktif')
    .eq('karlilik_alarm_aktif', true)
    .order('son_maliyet_sapma_yuzde', { ascending: false })
    .limit(100);

  if (
    alertResponse.error &&
    ['karlilik_alarm_aktif', 'son_maliyet_sapma_yuzde', 'standart_inis_maliyeti_net'].some((field) => `${alertResponse.error?.message || ''}`.includes(field))
  ) {
    alertResponse = await (supabase as any)
      .from('urunler')
      .select('id, ad, stok_kodu, tedarikci_id, stok_miktari, son_maliyet_sapma_yuzde, son_gercek_inis_maliyeti_net')
      .not('son_maliyet_sapma_yuzde', 'is', null)
      .order('son_maliyet_sapma_yuzde', { ascending: false })
      .limit(100);
  }

  if (!alertResponse.error) {
    alertProducts = (alertResponse.data || []) as AlertProduct[];
  }

  let recentBatches: BatchRow[] = [];
  const recentBatchResponse = await (supabase as any)
    .from('ithalat_partileri')
    .select('id, referans_kodu, tedarikci_id, para_birimi, kur_orani, navlun_soguk_eur, navlun_kuru_eur, gumruk_vergi_toplam_eur, traces_numune_ardiye_eur, varis_tarihi, durum, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentBatchResponse.error && recentBatchResponse.data?.length) {
    recentBatches = recentBatchResponse.data as BatchRow[];

    const batchIds = recentBatches.map((batch) => batch.id);
    const batchItemsResponse = await (supabase as any)
      .from('ithalat_parti_kalemleri')
      .select('parti_id, miktar_adet, gercek_inis_maliyeti_net, standart_inis_maliyeti_net, maliyet_sapma_yuzde')
      .in('parti_id', batchIds);

    if (!batchItemsResponse.error && batchItemsResponse.data) {
      const summaryByBatch = (batchItemsResponse.data as Array<any>).reduce((acc, item) => {
        const key = item.parti_id;
        if (!acc[key]) {
          acc[key] = { itemCount: 0, totalQuantity: 0, totalVariance: 0, varianceCount: 0, alertLineCount: 0 };
        }
        const variancePct = Number(item.maliyet_sapma_yuzde ?? 0);
        acc[key].itemCount += 1;
        acc[key].totalQuantity += Number(item.miktar_adet || 0);
        acc[key].totalVariance += Math.abs(variancePct);
        acc[key].varianceCount += 1;
        if (Math.abs(variancePct) >= minVariance) acc[key].alertLineCount += 1;
        return acc;
      }, {} as Record<string, { itemCount: number; totalQuantity: number; totalVariance: number; varianceCount: number; alertLineCount: number }>);

      recentBatches = recentBatches.map((batch) => ({
        ...batch,
        itemCount: summaryByBatch[batch.id]?.itemCount || 0,
        totalQuantity: summaryByBatch[batch.id]?.totalQuantity || 0,
        averageVariancePct: summaryByBatch[batch.id]?.varianceCount
          ? Number((summaryByBatch[batch.id].totalVariance / summaryByBatch[batch.id].varianceCount).toFixed(1))
          : 0,
        alertLineCount: summaryByBatch[batch.id]?.alertLineCount || 0,
      }));
    }
  }

  const filteredAlertProducts = alertProducts.filter((product) => {
    const matchesSupplier = selectedSupplierId === 'all' || product.tedarikci_id === selectedSupplierId;
    const matchesVariance = Math.abs(Number(product.son_maliyet_sapma_yuzde ?? 0)) >= minVariance;
    return matchesSupplier && matchesVariance;
  });

  const filteredRecentBatches = recentBatches.filter((batch) => {
    const matchesSupplier = selectedSupplierId === 'all' || batch.tedarikci_id === selectedSupplierId;
    const effectiveDate = normalizeDate(batch.varis_tarihi || batch.created_at);
    const matchesFrom = !fromDate || !effectiveDate || effectiveDate >= fromDate;
    const matchesTo = !toDate || !effectiveDate || effectiveDate <= toDate;
    return matchesSupplier && matchesFrom && matchesTo;
  });

  const alertCount = filteredAlertProducts.length;
  const averageVariance = alertCount > 0
    ? filteredAlertProducts.reduce((sum, product) => sum + Math.abs(Number(product.son_maliyet_sapma_yuzde ?? 0)), 0) / alertCount
    : 0;
  const highestVariance = filteredAlertProducts.reduce((max, product) => Math.max(max, Math.abs(Number(product.son_maliyet_sapma_yuzde ?? 0))), 0);
  const totalIncomingQuantity = filteredRecentBatches.reduce((sum, batch) => sum + Number(batch.totalQuantity || 0), 0);
  const totalAlertLines = filteredRecentBatches.reduce((sum, batch) => sum + Number(batch.alertLineCount || 0), 0);

  const csvLines = [
    ['BOLUM', 'KAYIT', 'TEDARIKCI', 'STOK_KODU', 'STOK', 'STANDART_MALIYET', 'SON_REEL_MALIYET', 'SAPMA_YUZDE', 'TARIH', 'EK_MALIYET', 'ALARM_KALEM'],
    ...filteredAlertProducts.map((product) => [
      'ALARM_URUN',
      getLocalizedText(product.ad, locale),
      supplierNameById[product.tedarikci_id || ''] || 'Belirtilmedi',
      product.stok_kodu || '',
      Number(product.stok_miktari || 0).toLocaleString('tr-TR'),
      Number(product.standart_inis_maliyeti_net || 0).toFixed(2),
      Number(product.son_gercek_inis_maliyeti_net || 0).toFixed(2),
      Number(product.son_maliyet_sapma_yuzde || 0).toFixed(2),
      '',
      '',
      '',
    ]),
    ...filteredRecentBatches.map((batch) => [
      'PARTI',
      batch.referans_kodu,
      supplierNameById[batch.tedarikci_id || ''] || 'Belirtilmedi',
      '',
      Number(batch.totalQuantity || 0).toLocaleString('tr-TR'),
      '',
      '',
      Number(batch.averageVariancePct || 0).toFixed(1),
      normalizeDate(batch.varis_tarihi || batch.created_at),
      Number((batch.navlun_soguk_eur || 0) + (batch.navlun_kuru_eur || 0) + (batch.gumruk_vergi_toplam_eur || 0) + (batch.traces_numune_ardiye_eur || 0)).toFixed(2),
      String(batch.alertLineCount || 0),
    ]),
  ];

  const csvContent = `\uFEFF${csvLines.map((row) => row.map(csvEscape).join(';')).join('\n')}`;
  const csvDownloadHref = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-700">Kârlılık ve varyans raporu</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Detaylı alarm ve parti performansı</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Reel iniş maliyeti ile standart maliyet sapmalarını, alarmdaki ürünleri ve son tır/parti performansını tek ekranda izleyin.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FiArrowLeft size={16} />
            Fiyatlandırma merkezine dön
          </Link>
        </div>
      </div>

      <form className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Tedarikçi / Marka</label>
            <select name="supplier" defaultValue={selectedSupplierId} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="all">Tümü</option>
              {(suppliers || []).map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>{supplier.unvan || 'Bilinmiyor'}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Min. sapma %</label>
            <select name="minVariance" defaultValue={String(minVariance)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {[0, 3, 5, 10, 15, 20].map((option) => (
                <option key={option} value={option}>%{option} ve üzeri</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Başlangıç tarihi</label>
            <input type="date" name="from" defaultValue={fromDate} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">Bitiş tarihi</label>
            <input type="date" name="to" defaultValue={toDate} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Filtrele</button>
          <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Temizle
          </Link>
          <a href={csvDownloadHref} download={`karlilik-raporu-${new Date().toISOString().slice(0, 10)}.csv`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
            CSV indir
          </a>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Aktif alarmdaki ürün"
          value={String(alertCount)}
          hint="Kârlılık alarmı aktif ürün sayısı"
          icon={<FiAlertTriangle size={18} />}
        />
        <SummaryCard
          title="Ortalama sapma"
          value={formatVariance(averageVariance)}
          hint={`En yüksek sapma ${formatVariance(highestVariance)}`}
          icon={<FiTrendingDown size={18} />}
        />
        <SummaryCard
          title="Son partilerde giriş"
          value={`${totalIncomingQuantity.toLocaleString('tr-TR')} adet`}
          hint="Son 20 partiye göre toplam stok girişi"
          icon={<FiPackage size={18} />}
        />
        <SummaryCard
          title="Alarm üreten kalem"
          value={String(totalAlertLines)}
          hint="Son partilerde %5+ sapma veren satırlar"
          icon={<FiBarChart2 size={18} />}
        />
      </div>

      <ExpandableSection
        title="Alarm analizi ve aksiyonlar"
        description="Uzun modulleri ihtiyaca gore acip kapatarak daha rahat takip edin."
        defaultOpen
      >
        <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Alarmdaki ürünler</h2>
              <p className="text-sm text-slate-500">Maliyet sapmasına göre öncelikli inceleme listesi</p>
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">{alertCount} ürün</span>
          </div>

          {filteredAlertProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Aktif kârlılık alarmı görünmüyor.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Ürün</th>
                    <th className="px-3 py-2 font-semibold">Tedarikçi</th>
                    <th className="px-3 py-2 font-semibold">Stok</th>
                    <th className="px-3 py-2 font-semibold">Standart</th>
                    <th className="px-3 py-2 font-semibold">Son reel</th>
                    <th className="px-3 py-2 font-semibold">Sapma</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAlertProducts.map((product) => {
                    const variance = Number(product.son_maliyet_sapma_yuzde ?? 0);
                    return (
                      <tr key={product.id} className="bg-white">
                        <td className="px-3 py-3 align-top">
                          <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/urun/${product.id}`} className="font-semibold text-violet-700 hover:underline">
                            {getLocalizedText(product.ad, locale)}
                          </Link>
                          <p className="text-xs text-slate-500">{product.stok_kodu || 'Kod yok'}</p>
                          <p className="text-xs font-semibold text-violet-700">Trend detayı →</p>
                        </td>
                        <td className="px-3 py-3 align-top text-slate-700">{supplierNameById[product.tedarikci_id || ''] || 'Belirtilmedi'}</td>
                        <td className="px-3 py-3 align-top text-slate-700">{Number(product.stok_miktari || 0).toLocaleString('tr-TR')}</td>
                        <td className="px-3 py-3 align-top text-slate-700">{money(product.standart_inis_maliyeti_net)}</td>
                        <td className="px-3 py-3 align-top text-slate-700">{money(product.son_gercek_inis_maliyeti_net)}</td>
                        <td className="px-3 py-3 align-top">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(variance)}`}>
                            {formatVariance(variance)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Yönetim aksiyon özeti</h2>
              <p className="text-sm text-slate-500">Hızlı karar için öne çıkan sinyaller</p>
            </div>
            <FiTruck className="text-slate-400" size={18} />
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">1) Acil fiyat revizyonu</p>
              <p className="mt-1">%15 üzeri sapma olan ürünleri önce `fiyatlandırma hub` üzerinden güncelleyin.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">2) Parti bazlı inceleme</p>
              <p className="mt-1">Alarm üreten kalem sayısı yüksek partilerde navlun, gümrük ve özel gider dağılımını kontrol edin.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="font-semibold text-slate-900">3) Stok koruma</p>
              <p className="mt-1">Alarmdaki ürünlerde mevcut stok seviyesi yüksekse satış fiyatını gecikmeden revize edin.</p>
            </div>
          </div>
        </section>
      </div>
      </ExpandableSection>

      <ExpandableSection
        title="Son tır / parti geçmişi"
        description="Parti bazli performans detaylarini sadece ihtiyac oldugunda acin."
        defaultOpen={false}
      >
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Son tır / parti geçmişi</h2>
            <p className="text-sm text-slate-500">Son 20 kayıtta miktar, sapma ve alarm yoğunluğu</p>
          </div>
          <Link
            href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`}
            className="text-sm font-semibold text-violet-700 hover:underline"
          >
            Parti giriş ekranını aç →
          </Link>
        </div>

        {filteredRecentBatches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Henüz kayıtlı tır / parti bulunmuyor.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRecentBatches.map((batch) => {
              const extraCost = Number(batch.navlun_soguk_eur || 0) + Number(batch.navlun_kuru_eur || 0) + Number(batch.gumruk_vergi_toplam_eur || 0) + Number(batch.traces_numune_ardiye_eur || 0);
              return (
                <Link key={batch.id} href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/parti/${batch.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-300 hover:bg-violet-50/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{batch.referans_kodu}</p>
                      <p className="text-xs text-slate-500">{supplierNameById[batch.tedarikci_id || ''] || 'Kaynak belirtilmedi'}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(batch.averageVariancePct)}`}>
                      {formatVariance(batch.averageVariancePct)}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <p>Tarih: {batch.varis_tarihi || batch.created_at?.slice(0, 10) || '-'}</p>
                    <p>Durum: {batch.durum || 'Taslak'}</p>
                    <p>{batch.itemCount || 0} kalem • {Number(batch.totalQuantity || 0).toLocaleString('tr-TR')} adet</p>
                    <p>Alarmlı kalem: {batch.alertLineCount || 0}</p>
                    <p>Ek maliyet toplamı: {money(extraCost)}</p>
                    <p>Kur: {Number(batch.kur_orani || 1).toFixed(4)} {batch.para_birimi || 'EUR'}</p>
                    <p className="pt-1 font-semibold text-violet-700">Detayı aç →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      </ExpandableSection>
    </div>
  );
}
