export type ImportBatchItemInput = {
  urunId: string;
  miktarAdet: number;
  toplamAgirlikKg: number;
  birimAlisFiyatiOrijinal: number;
  ciplakMaliyetEur: number;
  dagitilanNavlunEur: number;
  dagitilanGumrukEur: number;
  dagitilanOzelGiderEur: number;
  operasyonVeRiskYukuEur: number;
  gercekInisMaliyetiNet: number;
  standartInisMaliyetiNet: number;
  maliyetSapmaYuzde: number;
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

export function computeVariancePct(standardCost: unknown, actualCost: unknown) {
  const standard = toSafeNumber(standardCost, 0);
  const actual = toSafeNumber(actualCost, 0);
  if (standard <= 0) return 0;
  return Number((((actual - standard) / standard) * 100).toFixed(2));
}

export function shouldTriggerVarianceAlert(variancePct: unknown, thresholdPct = 5) {
  return Math.abs(toSafeNumber(variancePct, 0)) >= Math.max(0, toSafeNumber(thresholdPct, 5));
}

export function buildBatchItemInsertRows(partiId: string, items: ImportBatchItemInput[]) {
  return items.map((item) => ({
    parti_id: partiId,
    urun_id: item.urunId,
    miktar_adet: normalizeBatchQuantity(item.miktarAdet),
    toplam_agirlik_kg: round4(item.toplamAgirlikKg),
    birim_alis_fiyati_orijinal: round4(item.birimAlisFiyatiOrijinal),
    ciplak_maliyet_eur: round4(item.ciplakMaliyetEur),
    dagitilan_navlun_eur: round4(item.dagitilanNavlunEur),
    dagitilan_gumruk_eur: round4(item.dagitilanGumrukEur),
    dagitilan_ozel_gider_eur: round4(item.dagitilanOzelGiderEur),
    operasyon_ve_risk_yuku_eur: round4(item.operasyonVeRiskYukuEur),
    gercek_inis_maliyeti_net: round4(item.gercekInisMaliyetiNet),
    standart_inis_maliyeti_net: round4(item.standartInisMaliyetiNet),
    maliyet_sapma_yuzde: computeVariancePct(item.standartInisMaliyetiNet, item.gercekInisMaliyetiNet),
  }));
}

export function buildProductSnapshotUpdate(
  product: ProductBatchSnapshot | undefined,
  item: ImportBatchItemInput,
  thresholdPct = 5
) {
  const currentStock = toSafeNumber(product?.stok_miktari, 0);
  const standardCost = toSafeNumber(product?.standart_inis_maliyeti_net, 0) > 0
    ? toSafeNumber(product?.standart_inis_maliyeti_net, 0)
    : round4(item.standartInisMaliyetiNet);
  const variancePct = computeVariancePct(standardCost, item.gercekInisMaliyetiNet);

  return {
    stok_miktari: currentStock + normalizeBatchQuantity(item.miktarAdet),
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
      summary.totalQuantity += normalizeBatchQuantity(item.miktarAdet);
      summary.totalWeightKg += round4(item.toplamAgirlikKg);
      return summary;
    },
    { totalLines: 0, totalQuantity: 0, totalWeightKg: 0 }
  );
}
