'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveImportBatchAction } from '@/app/actions/ithalat-parti-actions';

// ─── Types ───────────────────────────────────────────────────────────────────

type ProductLite = {
  id: string;
  ad: Record<string, string> | string | null;
  stok_kodu?: string | null;
  tedarikci_id?: string | null;
  distributor_alis_fiyati?: number | null;
  standart_inis_maliyeti_net?: number | null;
  birim_agirlik_kg?: number | null;
  lojistik_sinifi?: string | null;
  teknik_ozellikler?: Record<string, unknown> | null;
  urun_gami?: string | null;
  koli_ici_kutu_adet?: number | null;
  palet_ici_koli_adet?: number | null;
};

type PlanItemLite = {
  productId: string;
  unitType: 'kutu' | 'koli' | 'palet';
  quantity: number;
};

type InitialPlan = {
  id: string;
  name: string;
  supplierId: string;
  items: PlanItemLite[];
} | null;

type SupplierLite = {
  id: string;
  unvan: string | null;
};

type RecentBatch = {
  id: string;
  referans_kodu: string;
  tedarikci_id?: string | null;
  varis_tarihi?: string | null;
  durum?: string | null;
  navlun_soguk_eur?: number | null;
  navlun_kuru_eur?: number | null;
  gumruk_vergi_toplam_eur?: number | null;
  created_at?: string | null;
};

type ItemRow = {
  id: string; // client-only key
  urunId: string;
  miktarAdet: number;
  toplamAgirlikKg: number;
  birimAlisFiyatiOrijinal: number;
};

interface Props {
  locale: string;
  products: ProductLite[];
  suppliers: SupplierLite[];
  recentBatches: RecentBatch[];
  initialPlan?: InitialPlan;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toN(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function r2(v: number) {
  return Math.round(v * 100) / 100;
}

function r4(v: number) {
  return Math.round(v * 10000) / 10000;
}

function money(v: number) {
  return `${v.toFixed(2)} €`;
}

function productName(p: ProductLite, locale: string) {
  if (typeof p.ad === 'string') return p.ad;
  if (p.ad && typeof p.ad === 'object') {
    return (p.ad as Record<string, string>)[locale] || (p.ad as Record<string, string>).tr || (p.ad as Record<string, string>).de || Object.values(p.ad).find((v) => typeof v === 'string' && v.trim()) || 'Ürün';
  }
  return 'Ürün';
}

let _idCounter = 0;
function newId() {
  return `row-${++_idCounter}`;
}

// ─── Calculation ─────────────────────────────────────────────────────────────

type CalcItem = {
  weightShare: number;
  ciplakMaliyetEur: number;
  dagitilanNavlunEur: number;
  dagitilanGumrukEur: number;
  dagitilanOzelGiderEur: number;
  operasyonVeRiskYukuEur: number;
  gercekInisMaliyetiNet: number; // per unit
  standartInisMaliyetiNet: number; // per unit
  maliyetSapmaYuzde: number;
};

function calculateItems(
  items: ItemRow[],
  products: Record<string, ProductLite>,
  totalNavlunEur: number,
  gumrukVergiToplamEur: number,
  tracesNumuneArdiyeEur: number,
): CalcItem[] {
  const totalWeightKg = items.reduce((sum, it) => sum + Math.max(0, it.toplamAgirlikKg), 0);

  return items.map((it) => {
    const weightShare = totalWeightKg > 0 ? it.toplamAgirlikKg / totalWeightKg : 0;
    const adet = Math.max(1, Math.floor(it.miktarAdet));
    const ciplakMaliyetEur = r4(it.birimAlisFiyatiOrijinal * adet);
    const dagitilanNavlunEur = r4(weightShare * totalNavlunEur);
    const dagitilanGumrukEur = r4(weightShare * gumrukVergiToplamEur);
    const dagitilanOzelGiderEur = r4(weightShare * tracesNumuneArdiyeEur);
    const operasyonVeRiskYukuEur = 0;
    const toplamMaliyet = ciplakMaliyetEur + dagitilanNavlunEur + dagitilanGumrukEur + dagitilanOzelGiderEur;
    const gercekInisMaliyetiNet = r4(toplamMaliyet / adet);
    const product = products[it.urunId];
    const standart = toN(product?.standart_inis_maliyeti_net, 0);
    const standartInisMaliyetiNet = standart > 0 ? r4(standart) : gercekInisMaliyetiNet;
    const maliyetSapmaYuzde =
      standartInisMaliyetiNet > 0
        ? r2(((gercekInisMaliyetiNet - standartInisMaliyetiNet) / standartInisMaliyetiNet) * 100)
        : 0;

    return {
      weightShare,
      ciplakMaliyetEur,
      dagitilanNavlunEur,
      dagitilanGumrukEur,
      dagitilanOzelGiderEur,
      operasyonVeRiskYukuEur,
      gercekInisMaliyetiNet,
      standartInisMaliyetiNet,
      maliyetSapmaYuzde,
    };
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

// Helper: convert plan item unit to box count
function planItemToBoxCount(item: PlanItemLite, product: ProductLite): number {
  if (item.unitType === 'kutu') return item.quantity;
  if (item.unitType === 'koli') return item.quantity * (product.koli_ici_kutu_adet || 1);
  if (item.unitType === 'palet')
    return item.quantity * (product.palet_ici_koli_adet || 1) * (product.koli_ici_kutu_adet || 1);
  return item.quantity;
}

export default function TirGirisiClient({ locale, products, suppliers, recentBatches, initialPlan }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const productById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])) as Record<string, ProductLite>,
    [products],
  );

  // Header
  const [referansKodu, setReferansKodu] = useState('');
  const [tedarikciId, setTedarikciId] = useState(initialPlan?.supplierId || '');
  const [varisTarihi, setVarisTarihi] = useState('');
  const [navlunSogukEur, setNavlunSogukEur] = useState(0);
  const [navlunKuruEur, setNavlunKuruEur] = useState(0);
  const [gumrukVergiToplamEur, setGumrukVergiToplamEur] = useState(0);
  const [tracesNumuneArdiyeEur, setTracesNumuneArdiyeEur] = useState(0);
  const [ekNotlar, setEkNotlar] = useState('');
  const [supplierOrderPlanRecordId] = useState(initialPlan?.id || '');

  // Product rows — pre-populate from plan if available
  const [rows, setRows] = useState<ItemRow[]>(() => {
    if (!initialPlan?.items?.length) return [];
    return initialPlan.items
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const miktarAdet = planItemToBoxCount(item, product);
        const toplamAgirlikKg = miktarAdet * (product.birim_agirlik_kg || 0);
        return {
          id: `plan-${item.productId}`,
          urunId: item.productId,
          miktarAdet,
          toplamAgirlikKg,
          birimAlisFiyatiOrijinal: product.distributor_alis_fiyati || 0,
        } satisfies ItemRow;
      })
      .filter((r): r is ItemRow => r !== null);
  });
  const [productSearch, setProductSearch] = useState('');

  const supplierById = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s.unvan || s.id])) as Record<string, string>,
    [suppliers],
  );

  const filteredProducts = useMemo(() => {
    const raw = productSearch.trim();
    if (!raw) return products;
    const isEAN = /^\d{13}$/.test(raw);
    if (isEAN) return products.filter((p) => String((p as any).ean_gtin || '') === raw);

    // Normalize: Türkçe karakter bağımsız, tüm diller
    const norm = (s: string) => s.toLowerCase()
      .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİ]/g, 'i')
      .replace(/[şŞ]/g, 's').replace(/[öÖ]/g, 'o').replace(/[üÜ]/g, 'u')
      .replace(/[âÂäÄ]/g, 'a').replace(/[ß]/g, 'ss');

    const q = norm(raw);
    return products.filter((p) => {
      const ad = (p as any).ad;
      const names: string[] = ad && typeof ad === 'object'
        ? Object.values(ad as Record<string, string>).filter(Boolean)
        : [productName(p, locale)];
      const haystack = norm([...names, String(p.stok_kodu || ''), String((p as any).ean_gtin || '')].join(' '));
      return haystack.includes(q);
    });
  }, [products, productSearch, locale]);

  const totalNavlunEur = navlunSogukEur + navlunKuruEur;

  const calcItems = useMemo(
    () =>
      calculateItems(
        rows,
        productById,
        totalNavlunEur,
        gumrukVergiToplamEur,
        tracesNumuneArdiyeEur,
      ),
    [rows, productById, totalNavlunEur, gumrukVergiToplamEur, tracesNumuneArdiyeEur],
  );

  const totalWeightKg = rows.reduce((s, r) => s + Math.max(0, r.toplamAgirlikKg), 0);
  const totalAdet = rows.reduce((s, r) => s + Math.max(0, r.miktarAdet), 0);
  const totalCiplakMaliyet = calcItems.reduce((s, c) => s + c.ciplakMaliyetEur, 0);
  const totalToplamMaliyet = calcItems.reduce(
    (s, c) => s + c.ciplakMaliyetEur + c.dagitilanNavlunEur + c.dagitilanGumrukEur + c.dagitilanOzelGiderEur,
    0,
  );
  const totalExtraCost = totalNavlunEur + gumrukVergiToplamEur + tracesNumuneArdiyeEur;

  function addRow(urunId: string) {
    const product = productById[urunId];
    const defaultWeightKg = toN(product?.birim_agirlik_kg, 0);
    const defaultPurchase = toN(product?.distributor_alis_fiyati, 0);
    setRows((prev) => [
      ...prev,
      {
        id: newId(),
        urunId,
        miktarAdet: 1,
        toplamAgirlikKg: defaultWeightKg,
        birimAlisFiyatiOrijinal: defaultPurchase,
      },
    ]);
    setProductSearch('');
  }

  function updateRow(id: string, patch: Partial<Omit<ItemRow, 'id'>>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleSave() {
    if (!rows.length) {
      toast.error('En az bir ürün satırı ekleyin.');
      return;
    }

    const missing = rows.findIndex((r) => !r.urunId || r.miktarAdet < 1 || r.toplamAgirlikKg <= 0 || r.birimAlisFiyatiOrijinal < 0);
    if (missing !== -1) {
      toast.error(`${missing + 1}. satırda eksik bilgi var. Ağırlık ve miktarları kontrol edin.`);
      return;
    }

    const payload = {
      referansKodu: referansKodu.trim() || undefined,
      tedarikciId: tedarikciId || null,
      varisTarihi: varisTarihi || null,
      navlunSogukEur,
      navlunKuruEur,
      gumrukVergiToplamEur,
      tracesNumuneArdiyeEur,
      ekNotlar: ekNotlar.trim() || null,
      supplierOrderPlanRecordId: supplierOrderPlanRecordId || null,
      items: rows.map((row, i) => {
        const calc = calcItems[i];
        return {
          urunId: row.urunId,
          miktarAdet: Math.max(1, Math.floor(row.miktarAdet)),
          toplamAgirlikKg: row.toplamAgirlikKg,
          birimAlisFiyatiOrijinal: row.birimAlisFiyatiOrijinal,
          ciplakMaliyetEur: calc.ciplakMaliyetEur,
          dagitilanNavlunEur: calc.dagitilanNavlunEur,
          dagitilanGumrukEur: calc.dagitilanGumrukEur,
          dagitilanOzelGiderEur: calc.dagitilanOzelGiderEur,
          operasyonVeRiskYukuEur: calc.operasyonVeRiskYukuEur,
          gercekInisMaliyetiNet: calc.gercekInisMaliyetiNet,
          standartInisMaliyetiNet: calc.standartInisMaliyetiNet,
          maliyetSapmaYuzde: calc.maliyetSapmaYuzde,
        };
      }),
    };

    startTransition(async () => {
      const result = await saveImportBatchAction(payload, locale);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(
        `TIR kaydedildi. ${result.savedItemCount} kalem, ${result.updatedProductCount} ürün güncellendi.`,
      );
      router.push(`/${locale}/admin/urun-yonetimi/karlilik-raporu`);
    });
  }

  return (
    <div className="space-y-6">
      {/* ─── Linked plan banner ─────────────────────────────────────────────── */}
      {initialPlan && (
        <div className="flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
          <span className="text-lg">📋</span>
          <div>
            <span className="font-semibold">Sipariş Planından TIR: </span>
            <span className="font-medium">{initialPlan.name}</span>
            <span className="ml-2 text-indigo-600">· {initialPlan.items.length} ürün aktarıldı</span>
          </div>
          <Link
            href={`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani`}
            className="ml-auto text-xs font-medium text-indigo-600 underline hover:text-indigo-900"
          >
            Plana Dön
          </Link>
        </div>
      )}

      {/* ─── Header card ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          TIR Başlık Bilgileri
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Referans Kodu
            </label>
            <input
              type="text"
              placeholder="TIR-2026-001"
              value={referansKodu}
              onChange={(e) => setReferansKodu(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Tedarikçi
            </label>
            <select
              value={tedarikciId}
              onChange={(e) => setTedarikciId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">— Seçin —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.unvan || s.id}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Varış Tarihi
            </label>
            <input
              type="date"
              value={varisTarihi}
              onChange={(e) => setVarisTarihi(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Notlar
            </label>
            <input
              type="text"
              placeholder="İsteğe bağlı not..."
              value={ekNotlar}
              onChange={(e) => setEkNotlar(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Navlun — Donuk (€)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={navlunSogukEur || ''}
              onChange={(e) => setNavlunSogukEur(toN(e.target.value, 0))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Navlun — Kuru (€)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={navlunKuruEur || ''}
              onChange={(e) => setNavlunKuruEur(toN(e.target.value, 0))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Gümrük Vergisi Toplam (€)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={gumrukVergiToplamEur || ''}
              onChange={(e) => setGumrukVergiToplamEur(toN(e.target.value, 0))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              TRACES / Numune / Ardiye (€)
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={tracesNumuneArdiyeEur || ''}
              onChange={(e) => setTracesNumuneArdiyeEur(toN(e.target.value, 0))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Cost summary bar */}
        <div className="mt-4 flex flex-wrap gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs">
          <span className="font-medium text-slate-600">
            Toplam navlun:{' '}
            <strong className="text-slate-900">{money(totalNavlunEur)}</strong>
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-medium text-slate-600">
            Gümrük:{' '}
            <strong className="text-slate-900">{money(gumrukVergiToplamEur)}</strong>
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-medium text-slate-600">
            TRACES/Diğer:{' '}
            <strong className="text-slate-900">{money(tracesNumuneArdiyeEur)}</strong>
          </span>
          <span className="text-slate-400">·</span>
          <span className="font-semibold text-indigo-700">
            Ekstra toplam:{' '}
            <strong>{money(totalExtraCost)}</strong>
          </span>
        </div>
      </div>

      {/* ─── Product lines ─────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-700">
            Ürün Kalemleri
            {rows.length > 0 && (
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {rows.length} satır · {totalAdet} adet · {totalWeightKg.toFixed(1)} kg
              </span>
            )}
          </h2>
          <div className="relative w-72">
            <input
              type="search"
              placeholder="Ürün adı, stok kodu veya EAN barkod"
              value={productSearch}
              onChange={(e) => {
                setProductSearch(e.target.value);
                // EAN barkod → otomatik ekle
                if (/^\d{13}$/.test(e.target.value.trim())) {
                  const found = products.find((p) => (p as any).ean_gtin === e.target.value.trim());
                  if (found) { addRow(found.id); setProductSearch(''); }
                }
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            {productSearch.trim() && (
              <div className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {filteredProducts.length === 0 && (
                  <div className="px-3 py-2 text-xs text-slate-400">Ürün bulunamadı</div>
                )}
                {filteredProducts.slice(0, 30).map((p) => {
                  const alreadyAdded = rows.some((r) => r.urunId === p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (!alreadyAdded) addRow(p.id);
                        else {
                          // allow adding same product multiple times (different batch lines)
                          addRow(p.id);
                        }
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <div>
                        <span className="font-medium text-slate-900">
                          {productName(p, locale)}
                        </span>
                        {p.stok_kodu && (
                          <span className="ml-2 text-xs text-slate-400">{p.stok_kodu}</span>
                        )}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {p.birim_agirlik_kg ? `${p.birim_agirlik_kg} kg` : ''}
                        {alreadyAdded && (
                          <span className="ml-1 text-emerald-600">✓ eklendi</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            Yukarıdan ürün arayıp ekleyin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2.5">Ürün</th>
                  <th className="px-3 py-2.5 text-right w-24">Miktar (adet)</th>
                  <th className="px-3 py-2.5 text-right w-28">Toplam Ağırlık (kg)</th>
                  <th className="px-3 py-2.5 text-right w-32">Birim Alış Fiyatı (€)</th>
                  <th className="px-3 py-2.5 text-right w-28 text-amber-700">Çıplak Maliyet</th>
                  <th className="px-3 py-2.5 text-right w-28 text-blue-700">Dağ. Navlun</th>
                  <th className="px-3 py-2.5 text-right w-28 text-orange-700">Dağ. Gümrük</th>
                  <th className="px-3 py-2.5 text-right w-28 text-purple-700">Diğer</th>
                  <th className="px-3 py-2.5 text-right w-32 text-emerald-700">Gerçek İniş / Adet</th>
                  <th className="px-3 py-2.5 text-right w-24 text-slate-500">Sapma %</th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => {
                  const calc = calcItems[i];
                  const product = productById[row.urunId];
                  const sapmaColor =
                    Math.abs(calc.maliyetSapmaYuzde) >= 15
                      ? 'text-red-700'
                      : Math.abs(calc.maliyetSapmaYuzde) >= 5
                        ? 'text-amber-700'
                        : 'text-emerald-700';

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 leading-snug">
                            {product ? productName(product, locale) : row.urunId}
                          </span>
                          {product?.stok_kodu && (
                            <span className="text-[11px] text-slate-400">{product.stok_kodu}</span>
                          )}
                          {product?.tedarikci_id && (
                            <span className="text-[11px] text-slate-400">
                              {supplierById[product.tedarikci_id] || ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={row.miktarAdet}
                          onChange={(e) =>
                            updateRow(row.id, { miktarAdet: Math.max(1, Math.floor(toN(e.target.value, 1))) })
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.001"
                          value={row.toplamAgirlikKg || ''}
                          onChange={(e) =>
                            updateRow(row.id, { toplamAgirlikKg: toN(e.target.value, 0) })
                          }
                          className={`w-full rounded-md border px-2 py-1.5 text-sm text-right ${
                            row.toplamAgirlikKg <= 0
                              ? 'border-rose-300 bg-rose-50'
                              : 'border-slate-200'
                          }`}
                          placeholder="kg"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step="0.0001"
                          value={row.birimAlisFiyatiOrijinal || ''}
                          onChange={(e) =>
                            updateRow(row.id, { birimAlisFiyatiOrijinal: toN(e.target.value, 0) })
                          }
                          className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-right"
                          placeholder="€"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-amber-800 font-medium">
                        {money(calc.ciplakMaliyetEur)}
                      </td>
                      <td className="px-3 py-2 text-right text-blue-700">
                        {money(calc.dagitilanNavlunEur)}
                        {totalWeightKg > 0 && (
                          <div className="text-[10px] text-slate-400">
                            {(calc.weightShare * 100).toFixed(1)}% ağırlık
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-700">
                        {money(calc.dagitilanGumrukEur)}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-700">
                        {money(calc.dagitilanOzelGiderEur)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-800">
                        {money(calc.gercekInisMaliyetiNet)}
                        {product?.standart_inis_maliyeti_net && (
                          <div className="text-[10px] text-slate-400">
                            Std: {money(toN(product.standart_inis_maliyeti_net, 0))}
                          </div>
                        )}
                      </td>
                      <td className={`px-3 py-2 text-right font-semibold ${sapmaColor}`}>
                        {calc.maliyetSapmaYuzde > 0 ? '+' : ''}
                        {calc.maliyetSapmaYuzde.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          title="Sil"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-sm">
                  <td className="px-4 py-2.5 text-slate-700">Toplam</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{totalAdet} adet</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {totalWeightKg.toFixed(3)} kg
                  </td>
                  <td />
                  <td className="px-3 py-2.5 text-right text-amber-800">
                    {money(totalCiplakMaliyet)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-blue-700">{money(totalNavlunEur)}</td>
                  <td className="px-3 py-2.5 text-right text-orange-700">
                    {money(gumrukVergiToplamEur)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-purple-700">
                    {money(tracesNumuneArdiyeEur)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-emerald-800">
                    {money(totalToplamMaliyet)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ─── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || rows.length === 0}
          className="rounded-lg bg-indigo-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-800 disabled:opacity-50"
        >
          {isPending ? 'Kaydediliyor...' : `TIR Kaydet (${rows.length} kalem)`}
        </button>
        <Link
          href={`/${locale}/admin/urun-yonetimi/karlilik-raporu`}
          className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Vazgeç
        </Link>
        {rows.length > 0 && (
          <span className="ml-auto text-xs text-slate-500">
            Toplam maliyet:{' '}
            <strong className="text-slate-800">{money(totalToplamMaliyet)}</strong>
            {' · '}Eklenen ekstra:{' '}
            <strong className="text-indigo-700">{money(totalExtraCost)}</strong>
          </span>
        )}
      </div>

      {/* ─── Recent batches reference ──────────────────────────────────────── */}
      {recentBatches.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white">
          <summary className="cursor-pointer px-5 py-3 text-sm font-medium text-slate-600 hover:text-slate-900">
            Son TIR Kayıtları (referans)
          </summary>
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Referans</th>
                  <th className="px-3 py-2">Tedarikçi</th>
                  <th className="px-3 py-2">Varış</th>
                  <th className="px-3 py-2 text-right">Navlun Donuk</th>
                  <th className="px-3 py-2 text-right">Navlun Kuru</th>
                  <th className="px-3 py-2 text-right">Gümrük</th>
                  <th className="px-3 py-2">Durum</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2 font-medium text-slate-900">{b.referans_kodu}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {b.tedarikci_id ? supplierById[b.tedarikci_id] || '—' : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
                      {b.varis_tarihi ? b.varis_tarihi.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {b.navlun_soguk_eur ? money(toN(b.navlun_soguk_eur)) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {b.navlun_kuru_eur ? money(toN(b.navlun_kuru_eur)) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700">
                      {b.gumruk_vergi_toplam_eur
                        ? money(toN(b.gumruk_vergi_toplam_eur))
                        : '—'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        {b.durum || 'Hesaplandi'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <Link
                        href={`/${locale}/admin/urun-yonetimi/karlilik-raporu/parti/${b.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        Detay ↗
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
