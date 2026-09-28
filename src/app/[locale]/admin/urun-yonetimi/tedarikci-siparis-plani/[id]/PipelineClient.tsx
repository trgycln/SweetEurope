'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Edit, Truck, Calculator, CheckCircle, FileText,
  Plus, Trash2, ArrowRight, AlertTriangle, Package, Info, Barcode, Image as ImageIcon
} from 'lucide-react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { completeBatchAction, saveImportBatchAction } from '@/app/actions/ithalat-parti-actions';
import {
  calculateDiscountedPrice,
  calculateLucidCost,
  calculateMiktarAdet,
  calculateToplamAgirlikKg,
  kaufmannRunden,
  toSafeNumber,
} from '@/lib/import-batch-utils';
import SmartUploadModal from '@/components/admin/documents/SmartUploadModal';
import ProductSearchSelect from '@/components/admin/ProductSearchSelect';
import { toast } from 'sonner';

// ─── Schema ────────────────────────────────────────────────────────────────
// Kullanıcı SADECE ürün seçer ve KOLİ miktarını girer.
// Diğer tüm alanlar master data'dan otomatik hesaplanır.
const schema = z.object({
  referansKodu: z.string().min(1, 'Referans kodu zorunludur'),
  tedarikciId: z.string().min(1, 'Tedarikçi seçimi zorunludur'),
  indirim1: z.number().min(0).max(100).default(0),
  indirim2: z.number().min(0).max(100).default(0),
  varisTarihi: z.string().optional(),
  navlunSogukEur: z.number().min(0).default(0),
  navlunKuruEur: z.number().min(0).default(0),
  gumrukVergiToplamEur: z.number().min(0).default(0),
  tracesNumuneArdiyeEur: z.number().min(0).default(0),
  items: z.array(
    z.object({
      urunId: z.string().min(1, 'Ürün seçiniz'),
      koliSayisi: z.number().min(1, 'En az 1 koli giriniz'),
      indirim1Iptal: z.boolean().optional(),
      indirim2Iptal: z.boolean().optional(),
      // NOT: miktarAdet ve toplamAgirlikKg kullanıcıdan alınmaz, otomatik hesaplanır
    })
  ).min(1, 'En az bir ürün eklemelisiniz'),
});

type FormValues = z.infer<typeof schema>;

// ─── Sabitler ──────────────────────────────────────────────────────────────
const STAGES = [
  { id: 'draft',     label: 'Sipariş (Draft)',       icon: Edit },
  { id: 'transit',   label: 'Yolda (In Transit)',     icon: Truck },
  { id: 'costing',   label: 'Maliyetlendirme',        icon: Calculator },
  { id: 'documents', label: 'Belgeler (Smart DMS)',   icon: FileText },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function getProductName(ad: any, locale = 'en'): string {
  if (!ad) return 'İsimsiz Ürün';
  if (typeof ad === 'string') return ad;
  return ad.en || ad.tr || ad.de || Object.values(ad)[0] || 'İsimsiz Ürün';
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function PipelineClient({
  locale,
  id,
  products,
  suppliers,
  initialBatch,
  initialItems,
  lucidRate,
}: {
  locale: string;
  id: string;
  products: any[];
  suppliers: any[];
  initialBatch: any;
  initialItems: any[];
  lucidRate: number;
}) {
  const router = useRouter();
  const isNew = id === 'yeni';
  const currentStatus: string = initialBatch?.durum || 'Taslak';
  const isCompleted = currentStatus === 'Tamamlandı';

  const [activeTab, setActiveTab] = useState(() => {
    if (currentStatus === 'Yolda') return 'transit';
    if (currentStatus === 'Hesaplandı' || currentStatus === 'Tamamlandı') return 'costing';
    return 'draft';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDmsModal, setShowDmsModal] = useState(false);

  // ── Default values ────────────────────────────────────────────────────────
  const defaultValues: FormValues = useMemo(() => ({
    referansKodu: initialBatch?.referans_kodu ?? `TIR-${new Date().toISOString().slice(0, 10)}`,
    tedarikciId:  initialBatch?.tedarikci_id ?? '',
    indirim1:     toSafeNumber(initialBatch?.indirim_1_yuzde, 0),
    indirim2:     toSafeNumber(initialBatch?.indirim_2_yuzde, 0),
    varisTarihi:  initialBatch?.varis_tarihi ? String(initialBatch.varis_tarihi).slice(0, 10) : '',
    navlunSogukEur:        toSafeNumber(initialBatch?.navlun_soguk_eur, 0),
    navlunKuruEur:         toSafeNumber(initialBatch?.navlun_kuru_eur, 0),
    gumrukVergiToplamEur:  toSafeNumber(initialBatch?.gumruk_vergi_toplam_eur, 0),
    tracesNumuneArdiyeEur: toSafeNumber(initialBatch?.traces_numune_ardiye_eur, 0),
    items: initialItems?.length > 0
      ? initialItems.map((item: any) => ({
          urunId:     item.urun_id,
          // koli_sayisi DB'den geliyorsa kullan, yoksa miktar_adet / koli_ici_adet ile hesapla
          koliSayisi: toSafeNumber(item.koli_sayisi, 1) > 0
            ? toSafeNumber(item.koli_sayisi, 1)
            : (() => {
                const p = products.find((pr: any) => pr.id === item.urun_id);
                const ppc = Math.max(1, toSafeNumber(p?.koli_ici_adet, 1));
                return Math.max(1, Math.round(toSafeNumber(item.miktar_adet, 1) / ppc));
              })(),
          // indirim 1/2 iptal durumunu tersine muhendislik ile cikar
          ...(() => {
            const basePrice = toSafeNumber(item.birim_alis_fiyati_orijinal, 0);
            const d1 = toSafeNumber(initialBatch?.indirim_1_yuzde, 0);
            const d2 = toSafeNumber(initialBatch?.indirim_2_yuzde, 0);
            const priceWithNone = basePrice;
            const priceWithOnlyD1 = calculateDiscountedPrice(basePrice, d1, 0);
            const priceWithOnlyD2 = calculateDiscountedPrice(basePrice, 0, d2);
            const currentPrice = toSafeNumber(item.indirimli_alis_fiyati, 0);

            let i1 = false;
            let i2 = false;
            if (basePrice > 0) {
              if (Math.abs(currentPrice - priceWithNone) < 0.001) {
                i1 = true; i2 = true;
              } else if (d2 > 0 && Math.abs(currentPrice - priceWithOnlyD2) < 0.001) {
                i1 = true;
              } else if (d1 > 0 && Math.abs(currentPrice - priceWithOnlyD1) < 0.001) {
                i2 = true;
              }
            }
            return { indirim1Iptal: i1, indirim2Iptal: i2 };
          })(),
        }))
      : [],
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);

  // ── Form ─────────────────────────────────────────────────────────────────
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const formValues = watch();

  // ── Ürün lookup ──────────────────────────────────────────────────────────
  const getProduct = useCallback(
    (productId: string) => products.find((p: any) => p.id === productId),
    [products]
  );

  const watchItems = watch('items') || [];
  const serializedItems = JSON.stringify(formValues.items);

  // Kullanıcı koli miktarını değiştirir → tüm değerler OTOMATIK güncellenir.
  const calculatedItems = useMemo(() => {
    return fields.map((field, index) => {
      const item = formValues.items?.[index] || field;
      const product = getProduct(item.urunId);
      if (!product || !item.urunId) return null;

      const koliSayisi     = Math.max(1, Math.floor(toSafeNumber(item.koliSayisi, 1)));
      const koliIciAdet    = Math.max(1, toSafeNumber(product.koli_ici_adet, 1));
      const birimAgirlikKg = toSafeNumber(product.birim_agirlik_kg, 0);

      // Kullanıcıdan ALINMAZ — master data ile hesaplanır
      const miktarAdet      = calculateMiktarAdet(koliSayisi, koliIciAdet);
      const toplamAgirlikKg = calculateToplamAgirlikKg(miktarAdet, birimAgirlikKg);

      // Liste fiyatı (master data, dokunulmaz)
      const basePrice = toSafeNumber(product.distributor_alis_fiyati, 0);

      // Çift kademeli indirim — eğer kullanıcı iptal etmediyse
      const isIndirim1Iptal = !!item.indirim1Iptal;
      const isIndirim2Iptal = !!item.indirim2Iptal;
      
      const r_indirim1 = isIndirim1Iptal ? 0 : toSafeNumber(formValues.indirim1, 0);
      const r_indirim2 = isIndirim2Iptal ? 0 : toSafeNumber(formValues.indirim2, 0);

      const indirimliAlisFiyati = calculateDiscountedPrice(
        basePrice,
        r_indirim1,
        r_indirim2
      );

      // LUCID payı — ağırlık × oran
      const lucidMaliyetiEur = calculateLucidCost(toplamAgirlikKg, lucidRate);

      // Palet Sayısı (Veritabanındaki palet_ici_adet aslında palet içi KOLİ sayısını ifade ediyor)
      const paletIciKoli = toSafeNumber(product.palet_ici_adet, 0);
      const paletSayisi = paletIciKoli > 0 ? koliSayisi / paletIciKoli : 0;

      // Toplam çıplak (satır bazında)
      const toplamCiplakMaliyet = kaufmannRunden(indirimliAlisFiyati * miktarAdet);

      return {
        ...item,
        product,
        koliSayisi,
        miktarAdet,
        toplamAgirlikKg,
        basePrice,
        indirimliAlisFiyati,
        lucidMaliyetiEur,
        paletSayisi,
        toplamCiplakMaliyet,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, serializedItems, formValues.indirim1, formValues.indirim2, products, lucidRate, getProduct]);


  // Dummy type for filter
  type CalculatedItemType = NonNullable<(typeof calculatedItems)[0]>;

  // Sadece geçerli ürünleri içeren hesaplanmış kalemler
  const validCalculatedItems = useMemo(
    () => calculatedItems.filter(Boolean) as CalculatedItemType[],
    [calculatedItems]
  );

  // ── Toplamlar ────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let totalKuruKg  = 0;
    let totalCiplak  = 0;
    let totalLucid   = 0;
    let totalMiktar  = 0;
    let totalPalet   = 0;
    validCalculatedItems.forEach((item) => {
      totalKuruKg  += item.toplamAgirlikKg;
      totalCiplak  += item.toplamCiplakMaliyet;
      totalLucid   += item.lucidMaliyetiEur;
      totalMiktar  += item.miktarAdet;
      totalPalet   += item.paletSayisi || 0;
    });
    return { totalKuruKg, totalCiplak, totalLucid, totalMiktar, totalPalet };
  }, [validCalculatedItems]);

  // ── Form Gönder (Kaydet) ─────────────────────────────────────────────────
  const handleSaveDraft = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const totalKg = totals.totalKuruKg;

      const itemsPayload = validCalculatedItems.map((item) => {
        const weightRatio = totalKg > 0 ? item.toplamAgirlikKg / totalKg : 0;
        const dagitilanNavlunEur  = kaufmannRunden((toSafeNumber(data.navlunKuruEur) + toSafeNumber(data.navlunSogukEur)) * weightRatio);
        const dagitilanGumrukEur  = kaufmannRunden(toSafeNumber(data.gumrukVergiToplamEur) * weightRatio);
        const dagitilanTracesEur  = kaufmannRunden(toSafeNumber(data.tracesNumuneArdiyeEur) * weightRatio);

        // Birim bazında dağıtım (koli değil, adet bazında)
        const n = item.miktarAdet > 0 ? item.miktarAdet : 1;
        const birimNavlun  = dagitilanNavlunEur / n;
        const birimGumruk  = dagitilanGumrukEur / n;
        const birimTraces  = dagitilanTracesEur / n;
        const birimLucid   = item.lucidMaliyetiEur / n;

        const gercekInisMaliyetiNet = kaufmannRunden(
          item.indirimliAlisFiyati + birimNavlun + birimGumruk + birimTraces + birimLucid
        );

        return {
          urunId: item.urunId,
          koliSayisi: item.koliSayisi,
          miktarAdet: item.miktarAdet,
          toplamAgirlikKg: item.toplamAgirlikKg,
          birimAlisFiyatiOrijinal: item.basePrice,
          indirimliAlisFiyati: item.indirimliAlisFiyati,
          ciplakMaliyetEur: item.indirimliAlisFiyati, // birim bazında
          dagitilanNavlunEur,
          dagitilanGumrukEur,
          dagitilanOzelGiderEur: kaufmannRunden(dagitilanTracesEur + item.lucidMaliyetiEur),
          operasyonVeRiskYukuEur: 0,
          gercekInisMaliyetiNet,
          standartInisMaliyetiNet: toSafeNumber(item.product.standart_inis_maliyeti_net, 0),
          maliyetSapmaYuzde: 0,
        };
      });

      const res = await saveImportBatchAction({
        id: isNew ? undefined : id,
        referansKodu: data.referansKodu,
        tedarikciId:  data.tedarikciId,
        sogukKg: 0,
        kuruKg:  totals.totalKuruKg,
        indirim1: data.indirim1,
        indirim2: data.indirim2,
        navlunSogukEur:        data.navlunSogukEur,
        navlunKuruEur:         data.navlunKuruEur,
        gumrukVergiToplamEur:  data.gumrukVergiToplamEur,
        tracesNumuneArdiyeEur: data.tracesNumuneArdiyeEur,
        varisTarihi: data.varisTarihi,
        items: itemsPayload,
      }, locale);

      if (res.error) throw new Error(res.error);
      toast.success('Sipariş başarıyla kaydedildi.');
      if (isNew) {
        router.push(`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani/${res.partiId}`);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      toast.error(e.message || 'Hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Mal Kabulü Tamamla ───────────────────────────────────────────────────
  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const res = await completeBatchAction(id, locale);
      if (res.error) throw new Error(res.error);
      toast.success('Mal kabulü tamamlandı! Stoklar başarıyla güncellendi.');
      setShowConfirmModal(false);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || 'Hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 flex flex-col min-h-[800px]">

      {/* ── Header & Stepper ─────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-800 to-indigo-900 p-6 px-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isNew ? '🆕 Yeni Sipariş Planı' : `📦 ${initialBatch?.referans_kodu}`}
          </h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {!isNew && (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                isCompleted
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {currentStatus}
              </span>
            )}
            <span className="text-slate-400 text-xs">
              LUCID: {lucidRate}€/kg • Otomatik hesaplanır
            </span>
          </div>
        </div>

        {/* Sekme butonları */}
        <div className="flex bg-white/10 rounded-2xl p-1 gap-1 flex-wrap">
          {STAGES.map((stage) => {
            const Icon  = stage.icon;
            const isAct = activeTab === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveTab(stage.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isAct
                    ? 'bg-white text-slate-800 shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{stage.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="p-6 md:p-8 flex-1 bg-gray-50/40">
        <form onSubmit={handleSubmit(handleSaveDraft)} className="space-y-6">

          {/* ═══════════════════════════════════════════════════════════════
              SEKME 1: SİPARİŞ (DRAFT)
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'draft' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-400">

              {/* Üst bilgi: referans, tedarikçi, indirimler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Referans Kodu
                  </label>
                  <input
                    {...register('referansKodu')}
                    disabled={isCompleted}
                    placeholder="TIR-2026-001"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all bg-white disabled:bg-gray-50"
                  />
                  {errors.referansKodu && <p className="text-red-500 text-xs mt-1">{errors.referansKodu.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Tedarikçi
                  </label>
                  <select
                    {...register('tedarikciId')}
                    disabled={isCompleted}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none bg-white transition-all disabled:bg-gray-50"
                  >
                    <option value="">Seçiniz...</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.unvan}</option>
                    ))}
                  </select>
                  {errors.tedarikciId && <p className="text-red-500 text-xs mt-1">{errors.tedarikciId.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Çift Kademeli İndirim
                  </label>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type="number" step="0.01" min="0" max="100"
                        {...register('indirim1', { valueAsNumber: true })}
                        disabled={isCompleted}
                        placeholder="0"
                        className="w-full px-4 py-2.5 pr-8 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-blue-50/30 disabled:bg-gray-50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 text-sm font-bold">%</span>
                    </div>
                    <span className="flex items-center text-gray-400 font-bold">+</span>
                    <div className="flex-1 relative">
                      <input
                        type="number" step="0.01" min="0" max="100"
                        {...register('indirim2', { valueAsNumber: true })}
                        disabled={isCompleted}
                        placeholder="0"
                        className="w-full px-4 py-2.5 pr-8 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 outline-none transition-all bg-purple-50/30 disabled:bg-gray-50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-500 text-sm font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Ürün Tablosu */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800">Sipariş Kalemleri</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Info size={12} />
                      Sadece ürünü seçin ve koli miktarını girin — adet, ağırlık ve fiyatlar otomatik hesaplanır.
                    </p>
                  </div>
                  {!isCompleted && (
                    <button
                      type="button"
                      onClick={() => append({ urunId: '', koliSayisi: 1 })}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                    >
                      <Plus size={16} /> Ürün Ekle
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto border border-gray-300 rounded shadow-sm bg-white">
                  <table className="w-full text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm border-b border-gray-300">
                      <tr className="text-slate-600 uppercase tracking-wider text-[10px]">
                        <th className="px-2 py-1.5 text-left font-bold border-r border-gray-200">Ürün</th>
                        <th className="px-2 py-1.5 text-center font-bold border-r border-gray-200 w-20">
                          Koli
                        </th>
                        <th className="px-2 py-1.5 text-right font-bold text-slate-500 border-r border-gray-200">Adet</th>
                        <th className="px-2 py-1.5 text-right font-bold text-emerald-700 border-r border-gray-200" title="Koli / Palet (Hacim)">Palet</th>
                        <th className="px-2 py-1.5 text-right font-bold text-slate-500 border-r border-gray-200">KG</th>
                        <th className="px-2 py-1.5 text-right font-bold text-slate-500 border-r border-gray-200">Liste Fiy.</th>
                        <th className="px-2 py-1.5 text-right font-bold text-indigo-700 border-r border-gray-200">İnd. Fiyat</th>
                        <th className="px-2 py-1.5 text-right font-bold text-slate-800 border-r border-gray-200">Toplam</th>
                        {!isCompleted && <th className="px-1 py-1.5 w-6" />}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {fields.map((field, index) => {
                        const calc = calculatedItems[index];
                        const isProductSelected = !!watchItems[index]?.urunId;
                        return (
                          <tr key={field.id} className="hover:bg-indigo-50/40 transition-colors group">
                            {/* Ürün seçimi */}
                            <td className="px-2 py-1 border-r border-gray-100">
                              {isProductSelected ? (
                                <div className="flex items-center gap-2">
                                  <Link 
                                    href={`/${locale}/admin/urun-yonetimi/urunler/${calc?.product?.id}`}
                                    className="w-6 h-6 rounded bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                                  >
                                    {calc?.product?.ana_resim_url ? (
                                      <img src={calc.product.ana_resim_url} alt={getProductName(calc?.product?.ad)} className="w-full h-full object-cover" />
                                    ) : (
                                      <ImageIcon size={14} className="opacity-50" />
                                    )}
                                  </Link>
                                  <div className="flex flex-col min-w-[200px]">
                                    <Link 
                                      href={`/${locale}/admin/urun-yonetimi/urunler/${calc?.product?.id}`}
                                      className="font-bold text-slate-800 text-[11px] hover:text-indigo-600 truncate max-w-[280px]"
                                    >
                                      {getProductName(calc?.product?.ad)}
                                    </Link>
                                    
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      {calc?.product?.stok_kodu && (
                                        <span className="font-mono text-[9px] text-slate-500">
                                          {calc.product.stok_kodu}
                                        </span>
                                      )}
                                      {calc?.product?.ean_gtin && (
                                        <span className="flex items-center gap-0.5 font-mono text-[9px] text-slate-400">
                                          <Barcode size={8} /> {calc.product.ean_gtin}
                                        </span>
                                      )}
                                    </div>
                                    <input type="hidden" {...register(`items.${index}.urunId`)} />
                                  </div>
                                </div>
                              ) : (
                                <Controller
                                  control={control}
                                  name={`items.${index}.urunId`}
                                  render={({ field: controllerField }) => (
                                    <ProductSearchSelect
                                      products={products}
                                      value={controllerField.value || ''}
                                      onChange={controllerField.onChange}
                                      disabled={isCompleted}
                                      getProductName={getProductName}
                                    />
                                  )}
                                />
                              )}
                            </td>

                            {/* KOLİ miktarı — tek editable alan */}
                            <td className="px-0 py-0 border-r border-gray-100 bg-indigo-50/30 group-hover:bg-indigo-100/50 transition-colors relative">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                {...register(`items.${index}.koliSayisi`, { valueAsNumber: true })}
                                defaultValue={field.koliSayisi}
                                disabled={isCompleted}
                                className="w-full h-full min-h-[28px] px-1 py-0.5 bg-transparent focus:bg-white text-center font-bold text-indigo-900 outline-none focus:ring-2 inset-0 focus:ring-indigo-500 transition-all text-xs"
                              />
                            </td>

                            {/* Otomatik hesaplanan — read-only */}
                            <td className="px-2 py-1 text-right border-r border-gray-100 text-slate-700">
                              <span className="font-semibold">{calc?.miktarAdet ?? '—'}</span>
                              <span className="text-[8px] text-slate-400 ml-0.5">ad</span>
                            </td>
                            <td className="px-2 py-1 text-right border-r border-gray-100 text-emerald-700 font-medium">
                              {calc && calc.paletSayisi > 0 ? calc.paletSayisi.toFixed(2) : '—'} <span className="text-[8px] text-emerald-600/70">plt</span>
                            </td>
                            <td className="px-2 py-1 text-right border-r border-gray-100 text-slate-600">
                              {calc ? calc.toplamAgirlikKg.toFixed(2) : '—'} <span className="text-[8px] text-slate-400">kg</span>
                            </td>
                            <td className="px-2 py-1 text-right border-r border-gray-100 text-slate-400">
                              €{calc ? calc.basePrice.toFixed(4) : '—'}
                            </td>
                            <td className="px-2 py-1 text-right border-r border-gray-100 font-bold text-indigo-600 group/discount align-middle">
                              <div className="flex flex-col items-end justify-center">
                                <span>€{calc ? calc.indirimliAlisFiyati.toFixed(3) : '—'}</span>
                                {!isCompleted && (
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <label className="flex items-center gap-0.5 text-[8px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="1. İndirimi İptal Et">
                                      <input 
                                        type="checkbox" 
                                        {...register(`items.${index}.indirim1Iptal`)}
                                        className="w-2.5 h-2.5 rounded-sm border-gray-300 text-red-400 focus:ring-red-500 cursor-pointer"
                                      />
                                      İnd.1 Yok
                                    </label>
                                    <label className="flex items-center gap-0.5 text-[8px] font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer" title="2. İndirimi İptal Et">
                                      <input 
                                        type="checkbox" 
                                        {...register(`items.${index}.indirim2Iptal`)}
                                        className="w-2.5 h-2.5 rounded-sm border-gray-300 text-red-400 focus:ring-red-500 cursor-pointer"
                                      />
                                      İnd.2 Yok
                                    </label>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-1 text-right border-r border-gray-100 font-extrabold text-slate-800">
                              €{calc ? calc.toplamCiplakMaliyet.toFixed(2) : '—'}
                            </td>

                            {!isCompleted && (
                              <td className="px-1 py-1 text-center">
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="p-1 text-slate-300 hover:text-red-600 rounded transition-all opacity-0 group-hover:opacity-100"
                                  title="Satırı Sil"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Boş durum */}
                      {fields.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-12 text-center">
                            <Package size={40} className="mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">Henüz ürün eklenmedi.</p>
                            {!isCompleted && (
                              <button
                                type="button"
                                onClick={() => append({ urunId: '', koliSayisi: 1 })}
                                className="mt-4 text-indigo-600 text-sm font-semibold hover:underline"
                              >
                                + İlk ürünü ekle
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>

                    {/* Özet Satırı */}
                    {calculatedItems.length > 0 && (
                      <tfoot className="bg-slate-100 border-t-2 border-gray-300 sticky bottom-0 z-10 shadow-sm">
                        <tr className="font-bold text-[11px]">
                          <td className="px-3 py-2 text-slate-700 border-r border-gray-200">
                            {calculatedItems.length} ürün
                          </td>
                          <td className="px-3 py-2 text-center text-gray-400 border-r border-gray-200">—</td>
                          <td className="px-3 py-2 text-right text-slate-700 tabular-nums border-r border-gray-200">
                            {totals.totalMiktar} <span className="text-[9px] text-slate-500 font-normal">ad</span>
                          </td>
                          <td className="px-3 py-2 text-right text-emerald-800 tabular-nums border-r border-gray-200">
                            {totals.totalPalet.toFixed(2)} <span className="text-[9px] text-emerald-600/80 font-normal">plt</span>
                          </td>
                          <td className="px-3 py-2 text-right text-slate-700 tabular-nums border-r border-gray-200">
                            {totals.totalKuruKg.toFixed(2)} <span className="text-[9px] text-slate-500 font-normal">kg</span>
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-right text-slate-500 border-r border-gray-200 flex-col flex items-end justify-center">
                            <span className="text-emerald-600 font-semibold leading-tight">
                              + LUCID: €{totals.totalLucid.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-gray-400 font-normal">
                              Tüm Ürünler
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-indigo-800 text-sm border-r border-gray-200">
                            €{totals.totalCiplak.toFixed(2)}
                          </td>
                          {!isCompleted && <td className="px-2 py-2" />}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Kaydet butonu */}
              {!isCompleted && (
                <div className="flex justify-end gap-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 bg-gradient-to-r from-slate-800 to-indigo-800 text-white px-8 py-3 rounded-xl font-bold hover:from-slate-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Kaydediliyor...' : 'Siparişi Kaydet'}
                    <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SEKME 2: YOLDA
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'transit' && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 flex flex-col items-center justify-center py-16">
              <div className="w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600 shadow-inner">
                <Truck size={52} className="animate-bounce" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Ürünler Yolda</h3>
              <p className="text-gray-500 max-w-md text-center mb-8">
                Bu sipariş onaylandı ve tedarikçiden yola çıktı. Tahmini varış tarihini güncelleyebilirsiniz.
              </p>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tahmini Varış Tarihi</label>
                <input
                  type="date"
                  {...register('varisTarihi')}
                  disabled={isCompleted}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              {!isCompleted && (
                <div className="mt-6 flex gap-3">
                  <button type="submit" className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-medium shadow-sm hover:bg-gray-50 transition-colors">
                    Tarihi Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('costing')}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                  >
                    Maliyetlendirmeye Geç <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SEKME 3: MALİYETLENDİRME
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'costing' && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 space-y-6">

              {/* Masraf formu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                {[
                  { label: 'Navlun (Donuk) €', key: 'navlunSogukEur', color: 'blue' },
                  { label: 'Navlun (Kuru) €',  key: 'navlunKuruEur',  color: 'amber' },
                  { label: 'Gümrük Vergisi €', key: 'gumrukVergiToplamEur', color: 'red' },
                  { label: 'TRACES / Ardiye €', key: 'tracesNumuneArdiyeEur', color: 'purple' },
                ].map(({ label, key, color }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
                    <input
                      type="number" step="0.01" min="0"
                      {...register(key as any, { valueAsNumber: true })}
                      disabled={isCompleted}
                      className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 outline-none transition-all disabled:bg-gray-50 bg-${color}-50/30 border-${color}-200 focus:ring-${color}-500/20`}
                    />
                  </div>
                ))}
              </div>

              {/* Maliyet dağılımı tablosu */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-gray-50">
                  <h3 className="font-bold text-gray-800 text-lg">Maliyet Dağılımı — Landed Cost</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Masraflar ağırlık oranına göre dağıtılır. LUCID ({lucidRate}€/kg) otomatik olarak her ürüne eklenir.
                  </p>
                </div>
                <div className="overflow-x-auto border border-gray-300 rounded shadow-sm bg-white">
                  <table className="w-full text-[11px] whitespace-nowrap">
                    <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm border-b border-gray-300">
                      <tr className="text-slate-600 uppercase tracking-wider">
                        <th className="px-3 py-2 text-left font-bold border-r border-gray-200">Ürün</th>
                        <th className="px-3 py-2 text-right font-bold text-slate-500 border-r border-gray-200">Koli × Adet</th>
                        <th className="px-3 py-2 text-right font-bold text-emerald-700 border-r border-gray-200">Palet</th>
                        <th className="px-3 py-2 text-right font-bold text-slate-500 border-r border-gray-200">Ağırlık</th>
                        <th className="px-3 py-2 text-right font-bold text-slate-800 border-r border-gray-200">Çıplak Toplam</th>
                        <th className="px-3 py-2 text-right font-bold text-orange-600 border-r border-gray-200">Dağıtılan Masraf</th>
                        <th className="px-3 py-2 text-right font-bold text-emerald-600 border-r border-gray-200">Oto LUCID Payı</th>
                        <th className="px-3 py-2 text-right font-bold text-indigo-700">Landed Cost / Birim</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {calculatedItems.map((item, idx) => {
                        const totalKg     = totals.totalKuruKg;
                        const weightRatio = totalKg > 0 ? item.toplamAgirlikKg / totalKg : 0;
                        const navlunPay   = kaufmannRunden((toSafeNumber(formValues.navlunKuruEur) + toSafeNumber(formValues.navlunSogukEur)) * weightRatio);
                        const gumrukPay   = kaufmannRunden(toSafeNumber(formValues.gumrukVergiToplamEur) * weightRatio);
                        const tracesPay   = kaufmannRunden(toSafeNumber(formValues.tracesNumuneArdiyeEur) * weightRatio);
                        const toplamMasraf = navlunPay + gumrukPay + tracesPay;
                        const n           = item.miktarAdet > 0 ? item.miktarAdet : 1;
                        const landedCostBirim = kaufmannRunden(
                          item.indirimliAlisFiyati
                          + toplamMasraf / n
                          + item.lucidMaliyetiEur / n
                        );
                        return (
                          <tr key={idx} className="hover:bg-indigo-50/40 transition-colors group">
                            <td className="px-3 py-1 border-r border-gray-100">
                              <div className="flex items-center gap-2">
                                <Link 
                                  href={`/${locale}/admin/urun-yonetimi/urunler/${item.product.id}`}
                                  className="w-7 h-7 rounded bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-200 flex-shrink-0 overflow-hidden hover:opacity-80 transition-opacity"
                                >
                                  {item.product.ana_resim_url ? (
                                    <img src={item.product.ana_resim_url} alt={getProductName(item.product.ad)} className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon size={14} className="opacity-50" />
                                  )}
                                </Link>
                                <div className="flex flex-col min-w-[200px]">
                                  <Link 
                                    href={`/${locale}/admin/urun-yonetimi/urunler/${item.product.id}`}
                                    className="font-bold text-slate-800 text-[11px] hover:text-indigo-600 truncate max-w-[280px]"
                                  >
                                    {getProductName(item.product.ad)}
                                  </Link>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {item.product.stok_kodu && (
                                      <span className="font-mono text-[9px] text-slate-500">
                                        {item.product.stok_kodu}
                                      </span>
                                    )}
                                    {item.product.ean_gtin && (
                                      <span className="flex items-center gap-0.5 font-mono text-[9px] text-slate-400">
                                        <Barcode size={8} /> {item.product.ean_gtin}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-100 text-slate-700">
                              <span className="font-semibold">{item.koliSayisi}</span> <span className="text-[9px] text-slate-400">koli</span> <span className="text-slate-400 px-1">×</span> {Math.max(1, toSafeNumber(item.product.koli_ici_adet, 1))} <span className="text-slate-400 px-1">=</span> <span className="font-bold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{item.miktarAdet}</span>
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-100 text-emerald-700 font-medium">
                              {item.paletSayisi > 0 ? item.paletSayisi.toFixed(2) : '—'} <span className="text-[9px] text-emerald-600/70">plt</span>
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-100 text-slate-600">
                              {item.toplamAgirlikKg.toFixed(2)} <span className="text-[9px] text-slate-400">kg</span>
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-100 font-extrabold text-slate-800">
                              €{item.toplamCiplakMaliyet.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-100 font-bold text-orange-600 bg-orange-50/30">
                              €{toplamMasraf.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-right border-r border-gray-100 font-bold text-emerald-600 bg-emerald-50/30">
                              + €{item.lucidMaliyetiEur.toFixed(2)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-extrabold text-indigo-700 text-sm">
                              €{landedCostBirim.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                      {calculatedItems.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-5 py-10 text-center text-gray-400">
                            Sipariş sekmesinde ürün ekleyin.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mal Kabulü Butonu */}
              {!isCompleted && (
                <div className="flex flex-col items-center pt-6 pb-2 border-t border-gray-100 gap-3">
                  <p className="text-gray-500 text-sm text-center max-w-lg">
                    Maliyetleri onaylıyorsanız ve ürünler depoya fiziksel olarak girdiyse mal kabulünü tamamlayın.
                    <strong className="text-red-500"> Bu işlem geri alınamaz.</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(true)}
                    className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-12 py-5 rounded-2xl font-extrabold text-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-2xl shadow-emerald-500/30 hover:shadow-emerald-500/40 active:scale-95"
                  >
                    <CheckCircle size={30} />
                    Mal Kabulü Tamamla (Stoğa Al)
                  </button>
                </div>
              )}

              {isCompleted && (
                <div className="flex items-center justify-center gap-3 py-6 text-emerald-600 font-bold text-lg">
                  <CheckCircle size={24} /> Bu sipariş tamamlandı. Stoklar güncellendi.
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SEKME 4: BELGELER
          ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'documents' && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-400 flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400">
                <FileText size={44} />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Smart DMS — Belge Yönetimi</h3>
              <p className="text-gray-500 max-w-md text-center mb-8">
                Bu siparişe ait fatura, gümrük beyannamesi ve diğer belgeleri yükleyin.
              </p>
              {!isNew ? (
                <button
                  type="button"
                  onClick={() => setShowDmsModal(true)}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all hover:-translate-y-0.5 active:scale-95"
                >
                  Belgeleri Yönet
                </button>
              ) : (
                <p className="text-amber-600 font-medium bg-amber-50 px-6 py-3 rounded-lg border border-amber-100">
                  Belge yüklemek için önce siparişi kaydetmelisiniz.
                </p>
              )}
            </div>
          )}

        </form>
      </div>

      {/* ── Onay Modal ───────────────────────────────────────────────────── */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5 text-red-600">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-2xl font-extrabold text-center text-gray-900 mb-2">
              Mal Kabulünü Onaylayın
            </h3>
            <p className="text-center text-gray-600 mb-2">
              Bu işlem <strong className="text-red-600">geri alınamaz.</strong>
            </p>
            <ul className="text-sm text-gray-500 space-y-1 mb-8 list-disc list-inside">
              <li>Ürün stokları artırılacak (veritabanı seviyesinde, atomik)</li>
              <li>Gerçek iniş maliyetleri kaydedilecek</li>
              <li>Stok hareket logları oluşturulacak</li>
            </ul>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
              💡 Eksik veya hasarlı ürünler varsa, önce <strong>Sipariş sekmesine</strong> dönüp koli miktarını güncelleyin.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                İptal
              </button>
              <button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="flex-1 px-6 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isSubmitting ? 'İşleniyor...' : '✓ Evet, Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SmartUploadModal ─────────────────────────────────────────────── */}
      {showDmsModal && !isNew && (
        <SmartUploadModal
          isOpen={showDmsModal}
          onClose={() => setShowDmsModal(false)}
          defaultValues={{
            iliskiTipi: 'tir',
            iliskiId: id,
            kategori: 'gelen_evrak',
            altKategori: 'fatura',
          }}
          onSuccess={() => toast.success('Belge başarıyla yüklendi.')}
        />
      )}
    </div>
  );
}
