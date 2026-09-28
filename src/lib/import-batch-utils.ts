// ============================================================
// Supply Chain Pipeline — Maliyet Hesaplama Motoru
// Master Data Driven: Ağırlık ve adet bilgileri urunler
// tablosundaki kayıtlardan otomatik hesaplanır, kullanıcıdan
// istenmez.
// ============================================================

export type ImportBatchItemInput = {
  urunId: string;
  koliSayisi: number;           // Kullanıcı girer (KESİNLİKLE SADECE BU)
  miktarAdet: number;           // Otomatik: koliSayisi × koli_ici_adet
  toplamAgirlikKg: number;      // Otomatik: miktarAdet × birim_agirlik_kg
  birimAlisFiyatiOrijinal: number;  // Master data: distributor_alis_fiyati (DOKUNULMAZ)
  indirimliAlisFiyati: number;  // Hesaplanan: basePrice × (1-d1) × (1-d2)
  ciplakMaliyetEur: number;     // = indirimliAlisFiyati (birim bazında)
  dagitilanNavlunEur: number;
  dagitilanGumrukEur: number;
  dagitilanOzelGiderEur: number; // TRACES + LUCID payı birleşik
  operasyonVeRiskYukuEur: number;
  gercekInisMaliyetiNet: number;
  standartInisMaliyetiNet: number;
  maliyetSapmaYuzde: number;
};

export type ProductMasterData = {
  id: string;
  distributor_alis_fiyati: number;
  koli_ici_adet: number | null;
  birim_agirlik_kg: number | null;
  standart_inis_maliyeti_net?: number | null;
};

export type ProductBatchSnapshot = {
  id: string;
  stok_miktari?: number | null;
  standart_inis_maliyeti_net?: number | null;
};

export function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function round4(value: unknown) {
  return Number(toSafeNumber(value, 0).toFixed(4));
}

export function normalizeBatchQuantity(value: unknown) {
  return Math.max(1, Math.floor(toSafeNumber(value, 1)));
}

/**
 * Ticari yuvarlama (Kaufmännisches Runden)
 * JavaScript floating point hatalarını önlemek için.
 * Kurala göre: her adımda Math.round((val + Number.EPSILON) * 100) / 100
 */
export function kaufmannRunden(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Çift kademeli indirim hesabı — Master Data fiyatına uygulanır,
 * distributor_alis_fiyati KESİNLİKLE DEĞİŞTİRİLMEZ.
 * indirimliFiyat = basePrice * (1 - indirim1/100) * (1 - indirim2/100)
 */
export function calculateDiscountedPrice(
  basePrice: number,
  indirim1: number,
  indirim2: number
): number {
  const p = toSafeNumber(basePrice, 0);
  const d1 = toSafeNumber(indirim1, 0);
  const d2 = toSafeNumber(indirim2, 0);
  const afterD1 = kaufmannRunden(p * (1 - d1 / 100));
  const afterD2 = kaufmannRunden(afterD1 * (1 - d2 / 100));
  return afterD2;
}

/**
 * LUCID (Ambalaj Sicili) maliyeti — otomatik hesaplanır.
 * Kullanıcıdan ağırlık bilgisi istenmez; urunler.birim_agirlik_kg'dan gelir.
 */
export function calculateLucidCost(weightKg: number, lucidPerKgRate: number): number {
  return kaufmannRunden(toSafeNumber(weightKg, 0) * toSafeNumber(lucidPerKgRate, 0));
}

/**
 * Master Data'dan toplam adet hesabı.
 * Kullanıcı koli sayısı girer; sistem koli_ici_adet ile çarpar.
 * MANUEL AĞIRLIK / ADET GİRİŞİ KESİNLİKLE YASAK.
 */
export function calculateMiktarAdet(
  koliSayisi: number,
  koliIciAdet: number | null
): number {
  const koli = normalizeBatchQuantity(koliSayisi);
  const ppc = Math.max(1, toSafeNumber(koliIciAdet, 1));
  return koli * ppc;
}

/**
 * Master Data'dan toplam ağırlık hesabı.
 */
export function calculateToplamAgirlikKg(
  miktarAdet: number,
  birimAgirlikKg: number | null
): number {
  return kaufmannRunden(toSafeNumber(miktarAdet) * toSafeNumber(birimAgirlikKg, 0));
}

export function computeVariancePct(standardCost: unknown, actualCost: unknown) {
  const standard = toSafeNumber(standardCost, 0);
  const actual = toSafeNumber(actualCost, 0);
  if (standard <= 0) return 0;
  return Number((((actual - standard) / standard) * 100).toFixed(2));
}

export function shouldTriggerVarianceAlert(variancePct: unknown, thresholdPct = 5) {
  return Math.abs(toSafeNumber(variancePct, 0)) >= Math.max(0, toSafeNumber(thresholdPct, 5));
}

/**
 * DB insert satırları oluşturur.
 * toplam_agirlik_kg dışarıdan ALINMAZ — koliSayisi ve master data ile hesaplanır.
 * LUCID payı dagitilan_ozel_gider_eur içine otomatik eklenir.
 */
export function buildBatchItemInsertRows(
  partiId: string,
  items: ImportBatchItemInput[],
  lucidPerKgRateEur = 0.02
) {
  return items.map((item) => {
    const lucidMaliyeti = calculateLucidCost(item.toplamAgirlikKg, lucidPerKgRateEur);
    return {
      // parti_id yerine ithalat_partisi_id (tablo schema'sına göre)
      ithalat_partisi_id: partiId,
      urun_id: item.urunId,
      miktar_adet: item.miktarAdet,
      koli_sayisi: normalizeBatchQuantity(item.koliSayisi),
      toplam_agirlik_kg: round4(item.toplamAgirlikKg),          // hesaplanan, kullanıcıdan alınmaz
      birim_alis_fiyati_orijinal: round4(item.birimAlisFiyatiOrijinal), // master data, değişmez
      indirimli_alis_fiyati: round4(item.indirimliAlisFiyati),
      ciplak_maliyet_eur: round4(item.indirimliAlisFiyati * item.miktarAdet), // toplam çıplak
      dagitilan_navlun_eur: round4(item.dagitilanNavlunEur),
      dagitilan_gumruk_eur: round4(item.dagitilanGumrukEur),
      dagitilan_ozel_gider_eur: round4(item.dagitilanOzelGiderEur + lucidMaliyeti),
      operasyon_ve_risk_yuku_eur: round4(item.operasyonVeRiskYukuEur),
      gercek_inis_maliyeti_net: round4(item.gercekInisMaliyetiNet),
      standart_inis_maliyeti_net: round4(item.standartInisMaliyetiNet),
      maliyet_sapma_yuzde: computeVariancePct(item.standartInisMaliyetiNet, item.gercekInisMaliyetiNet),
    };
  });
}

export function buildProductSnapshotUpdate(
  product: ProductBatchSnapshot | undefined,
  item: ImportBatchItemInput,
  thresholdPct = 5
) {
  const currentStock = toSafeNumber(product?.stok_miktari, 0);
  const standardCost =
    toSafeNumber(product?.standart_inis_maliyeti_net, 0) > 0
      ? toSafeNumber(product?.standart_inis_maliyeti_net, 0)
      : round4(item.standartInisMaliyetiNet);
  const variancePct = computeVariancePct(standardCost, item.gercekInisMaliyetiNet);

  return {
    stok_miktari: currentStock + item.miktarAdet,
    standart_inis_maliyeti_net: standardCost,
    son_gercek_inis_maliyeti_net: round4(item.gercekInisMaliyetiNet),
    son_maliyet_sapma_yuzde: variancePct,
    karlilik_alarm_aktif: shouldTriggerVarianceAlert(variancePct, thresholdPct),
  };
}

export function summarizeIncomingStock(items: ImportBatchItemInput[]) {
  return items.reduce(
    (summary, item) => {
      summary.totalLines += 1;
      summary.totalQuantity += item.miktarAdet;
      summary.totalWeightKg += round4(item.toplamAgirlikKg);
      return summary;
    },
    { totalLines: 0, totalQuantity: 0, totalWeightKg: 0 }
  );
}
