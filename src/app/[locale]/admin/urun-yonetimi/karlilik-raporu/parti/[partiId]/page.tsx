export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBarChart2,
  FiPackage,
  FiTruck,
  FiTrendingDown,
} from 'react-icons/fi';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type LocalizedText = Record<string, string> | string | null | undefined;

type BatchHeader = {
  id: string;
  referans_kodu: string;
  tedarikci_id?: string | null;
  supplier_order_plan_record_id?: string | null;
  soguk_kg?: number | null;
  kuru_kg?: number | null;
  navlun_soguk_eur?: number | null;
  navlun_kuru_eur?: number | null;
  gumruk_vergi_toplam_eur?: number | null;
  traces_numune_ardiye_eur?: number | null;
  ek_notlar?: string | null;
  varis_tarihi?: string | null;
  durum?: string | null;
  created_at?: string | null;
};

type BatchItem = {
  id?: string;
  urun_id: string;
  miktar_adet?: number | null;
  toplam_agirlik_kg?: number | null;
  birim_alis_fiyati_orijinal?: number | null;
  ciplak_maliyet_eur?: number | null;
  dagitilan_navlun_eur?: number | null;
  dagitilan_gumruk_eur?: number | null;
  dagitilan_ozel_gider_eur?: number | null;
  operasyon_ve_risk_yuku_eur?: number | null;
  gercek_inis_maliyeti_net?: number | null;
  standart_inis_maliyeti_net?: number | null;
  maliyet_sapma_yuzde?: number | null;
};

type ProductRow = {
  id: string;
  ad: LocalizedText;
  stok_kodu?: string | null;
  tedarikci_id?: string | null;
  stok_miktari?: number | null;
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

function getLocalizedText(raw: LocalizedText, locale: string, fallback = 'Ürün') {
  if (typeof raw === 'string' && raw.trim()) return raw;
  if (raw && typeof raw === 'object') {
    const candidate = raw[locale] || raw.tr || raw.de || Object.values(raw).find((value) => typeof value === 'string' && value.trim());
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return fallback;
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

export default async function PartiDetayPage({
  params,
}: {
  params: Promise<{ locale: string; partiId: string }>;
}) {
  const { locale, partiId } = await params;
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

  const isAdmin = profil?.rol === 'Yönetici' || profil?.rol === 'Personel' || profil?.rol === 'Ekip Üyesi';
  if (!isAdmin) {
    return redirect(`/${locale}/admin`);
  }

  const [batchResponse, suppliersResponse] = await Promise.all([
    db
      .from('ithalat_partileri')
      .select('id, referans_kodu, tedarikci_id, supplier_order_plan_record_id, soguk_kg, kuru_kg, navlun_soguk_eur, navlun_kuru_eur, gumruk_vergi_toplam_eur, traces_numune_ardiye_eur, ek_notlar, varis_tarihi, durum, created_at')
      .eq('id', partiId)
      .maybeSingle(),
    db.from('tedarikciler').select('id, unvan').order('unvan', { ascending: true }).limit(1000),
  ]);

  const batch = (batchResponse.data || null) as BatchHeader | null;
  if (batchResponse.error || !batch) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <h1 className="text-xl font-bold">Parti detayı bulunamadı</h1>
          <p className="mt-2 text-sm">İstenen tır / parti kaydı görüntülenemedi. Veri tabanı migrationları henüz uygulanmamış olabilir.</p>
          <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold">
            <FiArrowLeft size={16} />
            Rapor ekranına dön
          </Link>
        </div>
      </div>
    );
  }

  const supplierNameById = Object.fromEntries(((suppliersResponse.data || []) as Array<any>).map((supplier) => [supplier.id, supplier.unvan || 'Bilinmiyor'])) as Record<string, string>;

  const itemsResponse = await db
    .from('ithalat_parti_kalemleri')
    .select('id, urun_id, miktar_adet, toplam_agirlik_kg, birim_alis_fiyati_orijinal, ciplak_maliyet_eur, dagitilan_navlun_eur, dagitilan_gumruk_eur, dagitilan_ozel_gider_eur, operasyon_ve_risk_yuku_eur, gercek_inis_maliyeti_net, standart_inis_maliyeti_net, maliyet_sapma_yuzde')
    .eq('parti_id', partiId);

  const batchItems = (itemsResponse.data || []) as BatchItem[];
  const productIds = batchItems.map((item) => item.urun_id).filter(Boolean);

  let productsById: Record<string, ProductRow> = {};
  if (productIds.length > 0) {
    let productResponse = await db
      .from('urunler')
      .select('id, ad, stok_kodu, tedarikci_id, stok_miktari')
      .in('id', productIds);

    if (!productResponse.error) {
      productsById = Object.fromEntries(((productResponse.data || []) as ProductRow[]).map((product) => [product.id, product]));
    }
  }

  const rows = batchItems.map((item) => {
    const product = productsById[item.urun_id];
    const variance = Number(item.maliyet_sapma_yuzde || 0);
    const perUnitExtra = Number(item.dagitilan_navlun_eur || 0) + Number(item.dagitilan_gumruk_eur || 0) + Number(item.dagitilan_ozel_gider_eur || 0) + Number(item.operasyon_ve_risk_yuku_eur || 0);
    return {
      ...item,
      product,
      variance,
      shouldAlert: Math.abs(variance) >= 5,
      perUnitExtra,
    };
  });

  const totalQuantity = rows.reduce((sum, row) => sum + Number(row.miktar_adet || 0), 0);
  const totalWeight = rows.reduce((sum, row) => sum + Number(row.toplam_agirlik_kg || 0), 0);
  const avgVariance = rows.length > 0 ? rows.reduce((sum, row) => sum + Math.abs(Number(row.variance || 0)), 0) / rows.length : 0;
  const alertLineCount = rows.filter((row) => row.shouldAlert).length;
  const totalExtraCost = Number(batch.navlun_soguk_eur || 0) + Number(batch.navlun_kuru_eur || 0) + Number(batch.gumruk_vergi_toplam_eur || 0) + Number(batch.traces_numune_ardiye_eur || 0);
  const topVarianceRows = [...rows].sort((a, b) => Math.abs(Number(b.variance || 0)) - Math.abs(Number(a.variance || 0))).slice(0, 5);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">Tır / parti detay inceleme</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{batch.referans_kodu}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {supplierNameById[batch.tedarikci_id || ''] || 'Kaynak belirtilmedi'} • {batch.varis_tarihi || batch.created_at?.slice(0, 10) || '-'} • {batch.durum || 'Taslak'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FiArrowLeft size={16} />
            Rapor ekranına dön
          </Link>
          <Link href={`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`} className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100">
            <FiTruck size={16} />
            Fiyatlandırma merkezi
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Parti kalemi" value={String(rows.length)} hint="Bu tırdaki ürün satırı" icon={<FiPackage size={18} />} />
        <SummaryCard title="Toplam giriş" value={`${totalQuantity.toLocaleString('tr-TR')} adet`} hint={`${totalWeight.toFixed(2)} kg toplam ağırlık`} icon={<FiTruck size={18} />} />
        <SummaryCard title="Ortalama sapma" value={formatVariance(avgVariance)} hint={`${alertLineCount} kalem alarm üretiyor`} icon={<FiTrendingDown size={18} />} />
        <SummaryCard title="Ek maliyet toplamı" value={money(totalExtraCost)} hint="Para birimi: EUR" icon={<FiBarChart2 size={18} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Parti özeti</h2>
              <p className="text-sm text-slate-500">Üst seviye lojistik ve maliyet bilgileri</p>
            </div>
            <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(avgVariance)}`}>
              {formatVariance(avgVariance)}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p><strong>Tedarikçi:</strong> {supplierNameById[batch.tedarikci_id || ''] || 'Belirtilmedi'}</p>
              <p className="mt-1"><strong>Varış tarihi:</strong> {batch.varis_tarihi || '-'}</p>
              <p className="mt-1"><strong>Durum:</strong> {batch.durum || 'Taslak'}</p>
              {batch.supplier_order_plan_record_id ? <p className="mt-1"><strong>Kaynak sipariş kaydı:</strong> {batch.supplier_order_plan_record_id}</p> : null}
              <p className="mt-1"><strong>Sıcaklık profili:</strong> Soğuk {Number(batch.soguk_kg || 0).toFixed(2)} kg • Kuru {Number(batch.kuru_kg || 0).toFixed(2)} kg</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p><strong>Soğuk navlun:</strong> {money(batch.navlun_soguk_eur)}</p>
              <p className="mt-1"><strong>Kuru navlun:</strong> {money(batch.navlun_kuru_eur)}</p>
              <p className="mt-1"><strong>Gümrük:</strong> {money(batch.gumruk_vergi_toplam_eur)}</p>
              <p className="mt-1"><strong>TRACES / ardiye:</strong> {money(batch.traces_numune_ardiye_eur)}</p>
            </div>
          </div>

          {batch.ek_notlar ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold">Operasyon notu</p>
              <p className="mt-1 whitespace-pre-wrap">{batch.ek_notlar}</p>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">En yüksek sapmalar</h2>
              <p className="text-sm text-slate-500">Önce incelenmesi gereken kalemler</p>
            </div>
            <FiAlertTriangle className="text-rose-500" size={18} />
          </div>

          {topVarianceRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Bu partide henüz detay kalem yok.
            </div>
          ) : (
            <div className="space-y-3">
              {topVarianceRows.map((row) => (
                <div key={`${row.urun_id}-${row.id || 'row'}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/urun/${row.urun_id}`} className="font-semibold text-violet-700 hover:underline">
                        {getLocalizedText(row.product?.ad, locale)}
                      </Link>
                      <p className="text-xs text-slate-500">{row.product?.stok_kodu || 'Kod yok'} • {supplierNameById[row.product?.tedarikci_id || ''] || 'Belirtilmedi'}</p>
                      <p className="text-xs font-semibold text-violet-700">Trend detayı →</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getVarianceTone(row.variance)}`}>
                      {formatVariance(row.variance)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Standart {money(row.standart_inis_maliyeti_net)} • Reel {money(row.gercek_inis_maliyeti_net)} • Adet {Number(row.miktar_adet || 0).toLocaleString('tr-TR')}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Ürün bazlı maliyet dağılımı</h2>
            <p className="text-sm text-slate-500">Her kalem için standart ve reel iniş maliyeti karşılaştırması</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Bu parti için kayıtlı ürün kalemi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Ürün</th>
                  <th className="px-3 py-2 font-semibold">Adet / Kg</th>
                  <th className="px-3 py-2 font-semibold">Alış</th>
                  <th className="px-3 py-2 font-semibold">Ek yük</th>
                  <th className="px-3 py-2 font-semibold">Standart</th>
                  <th className="px-3 py-2 font-semibold">Reel</th>
                  <th className="px-3 py-2 font-semibold">Sapma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={`${row.urun_id}-${row.id || 'row'}`} className={row.shouldAlert ? 'bg-red-50/40' : 'bg-white'}>
                    <td className="px-3 py-3 align-top">
                      <Link href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/urun/${row.urun_id}`} className="font-semibold text-violet-700 hover:underline">
                        {getLocalizedText(row.product?.ad, locale)}
                      </Link>
                      <p className="text-xs text-slate-500">{row.product?.stok_kodu || 'Kod yok'} • {supplierNameById[row.product?.tedarikci_id || ''] || 'Belirtilmedi'}</p>
                      <p className="text-xs text-slate-500">Güncel stok: {Number(row.product?.stok_miktari || 0).toLocaleString('tr-TR')}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>{Number(row.miktar_adet || 0).toLocaleString('tr-TR')} adet</p>
                      <p className="text-xs text-slate-500">{Number(row.toplam_agirlik_kg || 0).toFixed(2)} kg</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>Birim alış: {money(row.birim_alis_fiyati_orijinal)}</p>
                      <p className="text-xs text-slate-500">Çıplak maliyet: {money(row.ciplak_maliyet_eur)}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>Navlun: {money(row.dagitilan_navlun_eur)}</p>
                      <p className="text-xs text-slate-500">Gümrük: {money(row.dagitilan_gumruk_eur)}</p>
                      <p className="text-xs text-slate-500">Özel gider: {money(row.dagitilan_ozel_gider_eur)}</p>
                      <p className="text-xs text-slate-500">Operasyon/risk: {money(row.operasyon_ve_risk_yuku_eur)}</p>
                    </td>
                    <td className="px-3 py-3 align-top text-slate-700">{money(row.standart_inis_maliyeti_net)}</td>
                    <td className="px-3 py-3 align-top text-slate-700">
                      <p>{money(row.gercek_inis_maliyeti_net)}</p>
                      <p className="text-xs text-slate-500">Toplam ek yük: {money(row.perUnitExtra)}</p>
                    </td>
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
