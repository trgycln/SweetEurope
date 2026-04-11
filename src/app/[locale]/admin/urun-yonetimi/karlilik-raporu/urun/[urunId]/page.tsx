export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiBox,
  FiPackage,
  FiTrendingDown,
} from 'react-icons/fi';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LocalizedText = Record<string, string> | string | null | undefined;

type ProductInfo = {
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

type TrendRow = {
  id?: string;
  parti_id: string;
  miktar_adet?: number | null;
  toplam_agirlik_kg?: number | null;
  ciplak_maliyet_eur?: number | null;
  dagitilan_navlun_eur?: number | null;
  dagitilan_gumruk_eur?: number | null;
  dagitilan_ozel_gider_eur?: number | null;
  operasyon_ve_risk_yuku_eur?: number | null;
  gercek_inis_maliyeti_net?: number | null;
  standart_inis_maliyeti_net?: number | null;
  maliyet_sapma_yuzde?: number | null;
};

type BatchMeta = {
  id: string;
  referans_kodu: string;
  tedarikci_id?: string | null;
  varis_tarihi?: string | null;
  created_at?: string | null;
  durum?: string | null;
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

function SummaryCard({ title, value, hint, icon }: { title: string; value: string; hint: string; icon: React.ReactNode }) {
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

export default async function UrunVaryansTrendPage({
  params,
}: {
  params: Promise<{ locale: string; urunId: string }>;
}) {
  const { locale, urunId } = await params;
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const db = supabase as any;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect(`/${locale}/login`);
  }

  const { data: profil } = await db
    .from('profiller')
    .select('id, rol')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) {
    return redirect(`/${locale}/admin`);
  }

  const [productResponse, supplierResponse] = await Promise.all([
    db
      .from('urunler')
      .select('id, ad, stok_kodu, tedarikci_id, stok_miktari, standart_inis_maliyeti_net, son_gercek_inis_maliyeti_net, son_maliyet_sapma_yuzde, karlilik_alarm_aktif')
      .eq('id', urunId)
      .maybeSingle(),
    db.from('tedarikciler').select('id, unvan').order('unvan', { ascending: true }).limit(1000),
  ]);

  const product = (productResponse.data || null) as ProductInfo | null;
  if (productResponse.error || !product) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-bold">Ürün trendi bulunamadı</h1>
          <p className="mt-2 text-sm">İstenen ürün için geçmiş varyans kaydı bulunamadı.</p>
          <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">
            <FiArrowLeft size={16} />
            Rapor ekranına dön
          </Link>
        </div>
      </div>
    );
  }

  const supplierNameById = Object.fromEntries(((supplierResponse.data || []) as Array<any>).map((supplier) => [supplier.id, supplier.unvan || 'Bilinmiyor'])) as Record<string, string>;

  const trendResponse = await db
    .from('ithalat_parti_kalemleri')
    .select('id, parti_id, miktar_adet, toplam_agirlik_kg, ciplak_maliyet_eur, dagitilan_navlun_eur, dagitilan_gumruk_eur, dagitilan_ozel_gider_eur, operasyon_ve_risk_yuku_eur, gercek_inis_maliyeti_net, standart_inis_maliyeti_net, maliyet_sapma_yuzde')
    .eq('urun_id', urunId);

  const rawTrendRows = (trendResponse.data || []) as TrendRow[];
  const batchIds = rawTrendRows.map((row) => row.parti_id).filter(Boolean);

  let batchMetaById: Record<string, BatchMeta> = {};
  if (batchIds.length > 0) {
    const batchMetaResponse = await db
      .from('ithalat_partileri')
      .select('id, referans_kodu, tedarikci_id, varis_tarihi, created_at, durum')
      .in('id', batchIds);

    if (!batchMetaResponse.error) {
      batchMetaById = Object.fromEntries(((batchMetaResponse.data || []) as BatchMeta[]).map((batch) => [batch.id, batch]));
    }
  }

  const trendRows = rawTrendRows
    .map((row) => {
      const batch = batchMetaById[row.parti_id];
      const variance = Number(row.maliyet_sapma_yuzde || 0);
      return {
        ...row,
        batch,
        variance,
        effectiveDate: batch?.varis_tarihi || batch?.created_at || '',
        extraPerUnit:
          Number(row.dagitilan_navlun_eur || 0) +
          Number(row.dagitilan_gumruk_eur || 0) +
          Number(row.dagitilan_ozel_gider_eur || 0) +
          Number(row.operasyon_ve_risk_yuku_eur || 0),
      };
    })
    .sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)));

  const totalEntries = trendRows.length;
  const averageVariance = totalEntries > 0 ? trendRows.reduce((sum, row) => sum + Math.abs(Number(row.variance || 0)), 0) / totalEntries : 0;
  const peakVariance = trendRows.reduce((max, row) => Math.max(max, Math.abs(Number(row.variance || 0))), 0);
  const totalImportedQuantity = trendRows.reduce((sum, row) => sum + Number(row.miktar_adet || 0), 0);
  const alertCount = trendRows.filter((row) => Math.abs(Number(row.variance || 0)) >= 5).length;
  const latestEntry = trendRows[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-rose-700">Ürün bazlı varyans trendi</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{getLocalizedText(product.ad, locale)}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {product.stok_kodu || 'Kod yok'} • {supplierNameById[product.tedarikci_id || ''] || 'Tedarikçi belirtilmedi'} • Güncel stok {Number(product.stok_miktari || 0).toLocaleString('tr-TR')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FiArrowLeft size={16} />
            Rapor ekranına dön
          </Link>
          <Link href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
            <FiPackage size={16} />
            Fiyatlandırma merkezi
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Trend kaydı" value={String(totalEntries)} hint="Bu ürün için kayıtlı parti satırı" icon={<FiBox size={18} />} />
        <SummaryCard title="Ortalama sapma" value={formatVariance(averageVariance)} hint={`Tepe sapma ${formatVariance(peakVariance)}`} icon={<FiTrendingDown size={18} />} />
        <SummaryCard title="Toplam giriş" value={`${totalImportedQuantity.toLocaleString('tr-TR')} adet`} hint="Kaydedilen tüm parti satırları toplamı" icon={<FiPackage size={18} />} />
        <SummaryCard title="Alarm kaydı" value={String(alertCount)} hint={product.karlilik_alarm_aktif ? 'Ürün şu an alarmda' : 'Şu an aktif alarm yok'} icon={<FiAlertTriangle size={18} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Trend özeti</h2>
              <p className="text-sm text-slate-500">Zaman içinde standart ve reel maliyet farkı</p>
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(product.son_maliyet_sapma_yuzde)}`}>
              Güncel {formatVariance(product.son_maliyet_sapma_yuzde)}
            </span>
          </div>

          {latestEntry ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Son kayıt</p>
                <p className="mt-1 text-sm text-slate-600">{latestEntry.batch?.referans_kodu || 'Parti bilgisi yok'} • {latestEntry.batch?.varis_tarihi || latestEntry.batch?.created_at?.slice(0, 10) || '-'}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Standart iniş maliyeti</p>
                    <p className="font-semibold text-slate-900">{money(latestEntry.standart_inis_maliyeti_net || product.standart_inis_maliyeti_net)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Reel iniş maliyeti</p>
                    <p className="font-semibold text-slate-900">{money(latestEntry.gercek_inis_maliyeti_net || product.son_gercek_inis_maliyeti_net)}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Hızlı yorum</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                  <li>Son sapma {formatVariance(latestEntry.variance)} seviyesinde.</li>
                  <li>Ek yük birim başına yaklaşık {money(latestEntry.extraPerUnit)} oluşturmuş.</li>
                  <li>{Math.abs(latestEntry.variance) >= 5 ? 'Fiyat revizyonu veya maliyet kalemi incelemesi önerilir.' : 'Trend şu an kontrol altında görünüyor.'}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Bu ürün için henüz parti geçmişi bulunmuyor.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Son varyans akışı</h2>
              <p className="text-sm text-slate-500">En yeni kayıtlardan geriye doğru</p>
            </div>
            <FiBarChart2 size={18} className="text-slate-400" />
          </div>

          {trendRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Görüntülenecek trend kaydı yok.
            </div>
          ) : (
            <div className="space-y-3">
              {trendRows.slice(0, 8).map((row) => {
                const barWidth = Math.min(100, Math.max(6, Math.abs(Number(row.variance || 0)) * 4));
                const barClass = Math.abs(Number(row.variance || 0)) >= 15 ? 'bg-red-500' : Math.abs(Number(row.variance || 0)) >= 5 ? 'bg-amber-500' : 'bg-emerald-500';
                return (
                  <Link key={`${row.parti_id}-${row.id || 'row'}`} href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/parti/${row.parti_id}`} className="block rounded-xl border border-slate-200 bg-slate-50 p-3 hover:border-violet-300 hover:bg-violet-50/40">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{row.batch?.referans_kodu || 'Parti'}</p>
                        <p className="text-xs text-slate-500">{row.batch?.varis_tarihi || row.batch?.created_at?.slice(0, 10) || '-'} • {Number(row.miktar_adet || 0).toLocaleString('tr-TR')} adet</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(row.variance)}`}>
                        {formatVariance(row.variance)}
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className={`h-full rounded-full ${barClass}`} style={{ width: `${barWidth}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-600">Standart {money(row.standart_inis_maliyeti_net)} • Reel {money(row.gercek_inis_maliyeti_net)}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Detaylı maliyet geçmişi</h2>
            <p className="text-sm text-slate-500">Ürün için kaydedilen tüm parti satırları</p>
          </div>
        </div>

        {trendRows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Bu ürün için kayıtlı maliyet geçmişi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Parti</th>
                  <th className="px-3 py-2 font-semibold">Tarih</th>
                  <th className="px-3 py-2 font-semibold">Adet / Kg</th>
                  <th className="px-3 py-2 font-semibold">Çıplak</th>
                  <th className="px-3 py-2 font-semibold">Ek yük</th>
                  <th className="px-3 py-2 font-semibold">Standart</th>
                  <th className="px-3 py-2 font-semibold">Reel</th>
                  <th className="px-3 py-2 font-semibold">Sapma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trendRows.map((row) => (
                  <tr key={`${row.parti_id}-${row.id || 'row'}`} className={Math.abs(Number(row.variance || 0)) >= 5 ? 'bg-red-50/30' : 'bg-white'}>
                    <td className="px-3 py-3 align-top">
                      <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/parti/${row.parti_id}`} className="font-semibold text-violet-700 hover:underline">
                        {row.batch?.referans_kodu || 'Parti'}
                      </Link>
                      <p className="text-xs text-slate-500">{row.batch?.durum || 'Taslak'}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">{row.batch?.varis_tarihi || row.batch?.created_at?.slice(0, 10) || '-'}</td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>{Number(row.miktar_adet || 0).toLocaleString('tr-TR')} adet</p>
                      <p className="text-xs text-slate-500">{Number(row.toplam_agirlik_kg || 0).toFixed(2)} kg</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">{money(row.ciplak_maliyet_eur)}</td>
                    <td className="px-3 py-3 align-top text-slate-700">{money(row.extraPerUnit)}</td>
                    <td className="px-3 py-3 align-top text-slate-700">{money(row.standart_inis_maliyeti_net)}</td>
                    <td className="px-3 py-3 align-top text-slate-700">{money(row.gercek_inis_maliyeti_net)}</td>
                    <td className="px-3 py-3 align-top">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(row.variance)}`}>
                        {formatVariance(row.variance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
