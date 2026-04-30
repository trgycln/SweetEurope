'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';

type UnitType = 'kutu' | 'koli' | 'palet';

type PlanItem = {
  id: string;
  productId: string;
  unitType: UnitType;
  quantity: number;
  gercek_alis_fiyati?: number | null;   // satıra özel gerçek fiyat (adet başına)
  fiyat_duzenlendi?: boolean;            // true ise gercek_alis_fiyati kullan
  indirim_aciklamasi?: string | null;   // örn: "%20 + %8 çift kademeli"
};

type SavedPlanRecord = {
  id: string;
  name: string;
  createdAt: string;
  createdBy?: string | null;     // olusturanin adi (paylasimli gosterim icin)
  status?: 'sablon' | 'gonderildi' | 'teslim_alindi';
  sentAt?: string | null;
  receivedAt?: string | null;
  supplierId: string;
  search: string;
  selectedUnitType: UnitType;
  selectedQuantity: number;
  items: PlanItem[];
};

type DraftPayload = {
  draftName: string;
  selectedSupplierId: string;
  search: string;
  selectedProductId: string;
  selectedUnitType: UnitType;
  selectedQuantity: number;
  items: PlanItem[];
  savedAt: string;
};

async function getAuthedClientWithRole() {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  const serviceSupabase = createSupabaseServiceClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { supabase, serviceSupabase, user: null, role: null };
  }

  const { data: profile } = await (supabase as any)
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  return { supabase, serviceSupabase, user, role: profile?.rol ?? null };
}

function canUseModule(role: string | null) {
  return role === 'Yönetici' || role === 'Personel' || role === 'Ekip Üyesi';
}

function keysForUser(userId: string) {
  return {
    draftKey:   `supplier_order_plan_draft_${userId}`,   // taslak: kullanıcıya özel
    historyKey: `supplier_order_plan_shared_history`,    // geçmiş: tüm yetkili kullanıcılarda ortak
  };
}

export async function getSupplierOrderPlanStorageAction(): Promise<{
  success: boolean;
  draft: DraftPayload | null;
  history: SavedPlanRecord[];
  message?: string;
}> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) {
    return { success: false, draft: null, history: [], message: 'Yetkisiz' };
  }

  const { draftKey, historyKey } = keysForUser(user.id);

  const { data, error } = await (serviceSupabase as any)
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [draftKey, historyKey]);

  if (error) {
    return { success: false, draft: null, history: [], message: error.message };
  }

  const map = new Map<string, string>();
  for (const row of data || []) {
    map.set(row.setting_key, row.setting_value);
  }

  let draft: DraftPayload | null = null;
  let history: SavedPlanRecord[] = [];

  try {
    const draftRaw = map.get(draftKey);
    if (draftRaw) draft = JSON.parse(draftRaw) as DraftPayload;
  } catch {
    draft = null;
  }

  try {
    const historyRaw = map.get(historyKey);
    if (historyRaw) {
      const parsed = JSON.parse(historyRaw);
      if (Array.isArray(parsed)) history = parsed as SavedPlanRecord[];
    }
  } catch {
    history = [];
  }

  return { success: true, draft, history };
}

export async function saveSupplierOrderPlanDraftAction(payload: DraftPayload): Promise<{ success: boolean; message?: string }> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) {
    return { success: false, message: 'Yetkisiz' };
  }

  const { draftKey } = keysForUser(user.id);

  const { error } = await (serviceSupabase as any)
    .from('system_settings')
    .upsert(
      {
        setting_key: draftKey,
        setting_value: JSON.stringify(payload),
        setting_type: 'json',
        category: 'supplier_order_plan',
        description: 'Tedarikçi sipariş planı otomatik taslak kaydı',
        updated_by: user.id,
      },
      { onConflict: 'setting_key' }
    );

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function saveSupplierOrderPlanSnapshotAction(record: SavedPlanRecord): Promise<{ success: boolean; history: SavedPlanRecord[]; message?: string }> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) {
    return { success: false, history: [], message: 'Yetkisiz' };
  }

  const { historyKey } = keysForUser(user.id);

  const { data: row, error: readError } = await (serviceSupabase as any)
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', historyKey)
    .maybeSingle();

  if (readError) {
    return { success: false, history: [], message: readError.message };
  }

  let existing: SavedPlanRecord[] = [];
  try {
    if (row?.setting_value) {
      const parsed = JSON.parse(row.setting_value);
      if (Array.isArray(parsed)) existing = parsed as SavedPlanRecord[];
    }
  } catch {
    existing = [];
  }

  const existingIndex = existing.findIndex((r) => r.id === record.id);
  const isNewRecord = existingIndex < 0;

  // Yeni kayıt için oluşturanı tespit et
  let createdByName: string | null = record.createdBy ?? null;
  if (isNewRecord && !createdByName) {
    const { data: prof } = await (serviceSupabase as any)
      .from('profiller')
      .select('tam_ad')
      .eq('id', user.id)
      .maybeSingle();
    createdByName = prof?.tam_ad || user.email || null;
  } else if (!isNewRecord) {
    // Mevcut kaydın createdBy değerini koru
    createdByName = existing[existingIndex].createdBy ?? createdByName;
  }

  const mergedRecord: SavedPlanRecord = {
    ...record,
    createdAt:   isNewRecord ? record.createdAt : existing[existingIndex].createdAt,
    createdBy:   createdByName,
  };

  let nextHistory: SavedPlanRecord[];
  if (existingIndex >= 0) {
    nextHistory = [...existing];
    nextHistory[existingIndex] = mergedRecord;
  } else {
    nextHistory = [mergedRecord, ...existing];
  }

  nextHistory = nextHistory
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 200);

  const { error: writeError } = await (serviceSupabase as any)
    .from('system_settings')
    .upsert(
      {
        setting_key: historyKey,
        setting_value: JSON.stringify(nextHistory),
        setting_type: 'json',
        category: 'supplier_order_plan',
        description: 'Tedarikçi sipariş planı kayıt geçmişi',
        updated_by: user.id,
      },
      { onConflict: 'setting_key' }
    );

  if (writeError) {
    return { success: false, history: existing, message: writeError.message };
  }

  return { success: true, history: nextHistory };
}

export async function deleteSupplierOrderPlanSnapshotAction(recordId: string): Promise<{ success: boolean; history: SavedPlanRecord[]; message?: string }> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) {
    return { success: false, history: [], message: 'Yetkisiz' };
  }

  const { historyKey } = keysForUser(user.id);

  const { data: row, error: readError } = await (serviceSupabase as any)
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', historyKey)
    .maybeSingle();

  if (readError) {
    return { success: false, history: [], message: readError.message };
  }

  let existing: SavedPlanRecord[] = [];
  try {
    if (row?.setting_value) {
      const parsed = JSON.parse(row.setting_value);
      if (Array.isArray(parsed)) existing = parsed as SavedPlanRecord[];
    }
  } catch {
    existing = [];
  }

  const nextHistory = existing.filter((r) => r.id !== recordId);

  const { error: writeError } = await (serviceSupabase as any)
    .from('system_settings')
    .upsert(
      {
        setting_key: historyKey,
        setting_value: JSON.stringify(nextHistory),
        setting_type: 'json',
        category: 'supplier_order_plan',
        description: 'Tedarikçi sipariş planı kayıt geçmişi',
        updated_by: user.id,
      },
      { onConflict: 'setting_key' }
    );

  if (writeError) {
    return { success: false, history: existing, message: writeError.message };
  }

  return { success: true, history: nextHistory };
}

function calcUnitMultiplier(
  product: { koli_ici_kutu_adet?: number | null; palet_ici_koli_adet?: number | null },
  unitType: UnitType
) {
  const boxesPerCase = Math.max(1, Number(product.koli_ici_kutu_adet || 1));
  const casesPerPallet = Math.max(1, Number(product.palet_ici_koli_adet || 1));

  if (unitType === 'koli') return boxesPerCase;
  if (unitType === 'palet') return boxesPerCase * casesPerPallet;
  return 1;
}

export async function receiveSupplierOrderAndUpdateStockAction(
  recordId: string
): Promise<{ success: boolean; history: SavedPlanRecord[]; updatedLines?: number; totalStockAdded?: number; message?: string }> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) {
    return { success: false, history: [], message: 'Yetkisiz' };
  }

  const { historyKey } = keysForUser(user.id);

  const { data: row, error: readError } = await (serviceSupabase as any)
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', historyKey)
    .maybeSingle();

  if (readError) {
    return { success: false, history: [], message: readError.message };
  }

  let existing: SavedPlanRecord[] = [];
  try {
    if (row?.setting_value) {
      const parsed = JSON.parse(row.setting_value);
      if (Array.isArray(parsed)) existing = parsed as SavedPlanRecord[];
    }
  } catch {
    existing = [];
  }

  const target = existing.find((r) => r.id === recordId);
  if (!target) {
    return { success: false, history: existing, message: 'Kayıt bulunamadı' };
  }

  if (target.status === 'teslim_alindi') {
    return { success: true, history: existing, updatedLines: 0, totalStockAdded: 0 };
  }

  if ((target.status || 'sablon') !== 'gonderildi') {
    return { success: false, history: existing, message: 'Sadece gonderildi durumundaki kayıtlar teslim alınabilir' };
  }

  const productIds = Array.from(new Set((target.items || []).map((i) => i.productId).filter(Boolean)));
  if (productIds.length === 0) {
    return { success: false, history: existing, message: 'Teslim alınacak ürün satırı bulunamadı' };
  }

  const { data: productRows, error: productReadError } = await (serviceSupabase as any)
    .from('urunler')
    .select('id, stok_miktari, koli_ici_kutu_adet, palet_ici_koli_adet')
    .in('id', productIds);

  if (productReadError) {
    return { success: false, history: existing, message: productReadError.message };
  }

  const productById = new Map<string, { id: string; stok_miktari?: number | null; koli_ici_kutu_adet?: number | null; palet_ici_koli_adet?: number | null }>();
  for (const p of productRows || []) {
    productById.set(p.id, p);
  }

  let updatedLines = 0;
  let totalStockAdded = 0;

  const { data: actorProfile } = await (serviceSupabase as any)
    .from('profiller')
    .select('tam_ad')
    .eq('id', user.id)
    .maybeSingle();

  const actorName = actorProfile?.tam_ad || null;
  const actorEmail = user.email || null;

  for (const item of target.items || []) {
    const product = productById.get(item.productId);
    if (!product) continue;

    const quantity = Math.max(0, Number(item.quantity || 0));
    if (!quantity) continue;

    const multiplier = calcUnitMultiplier(product, item.unitType);
    const stockToAdd = quantity * multiplier;
    if (!stockToAdd) continue;

    const currentStock = Number(product.stok_miktari || 0);
    const nextStock = currentStock + stockToAdd;

    const { error: updateError } = await (serviceSupabase as any)
      .from('urunler')
      .update({ stok_miktari: nextStock })
      .eq('id', product.id);

    if (updateError) {
      return { success: false, history: existing, message: updateError.message };
    }

    const { error: logError } = await (serviceSupabase as any)
      .from('urun_stok_hareket_loglari')
      .insert({
        urun_id: product.id,
        hareket_tipi: 'stok_artisi',
        kaynak: 'supplier_order_receipt',
        miktar: stockToAdd,
        birim: 'kutu',
        birim_miktar: quantity,
        onceki_stok: currentStock,
        sonraki_stok: nextStock,
        referans_kayit_id: target.id,
        tedarikci_id: target.supplierId || null,
        yapan_user_id: user.id,
        yapan_user_adi: actorName,
        yapan_user_email: actorEmail,
        aciklama: `${target.name} kaydi teslim alindi, stok artisi islendi.`,
        extra: {
          unitType: item.unitType,
          quantity,
          multiplier,
          stockToAdd,
        },
      });

    if (logError) {
      return { success: false, history: existing, message: logError.message };
    }

    product.stok_miktari = nextStock;

    updatedLines += 1;
    totalStockAdded += stockToAdd;
  }

  const nowIso = new Date().toISOString();
  const nextHistory = existing.map((record) => {
    if (record.id !== recordId) return record;
    return {
      ...record,
      status: 'teslim_alindi' as const,
      receivedAt: nowIso,
    };
  });

  const { error: writeError } = await (serviceSupabase as any)
    .from('system_settings')
    .upsert(
      {
        setting_key: historyKey,
        setting_value: JSON.stringify(nextHistory),
        setting_type: 'json',
        category: 'supplier_order_plan',
        description: 'Tedarikçi sipariş planı kayıt geçmişi',
        updated_by: user.id,
      },
      { onConflict: 'setting_key' }
    );

  if (writeError) {
    return { success: false, history: existing, message: writeError.message };
  }

  return { success: true, history: nextHistory, updatedLines, totalStockAdded };
}

export async function getSupplierOrderPlanRecordByIdAction(recordId: string): Promise<{
  success: boolean;
  record: SavedPlanRecord | null;
  message?: string;
}> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) {
    return { success: false, record: null, message: 'Yetkisiz' };
  }

  const { historyKey } = keysForUser(user.id);

  const { data: row, error } = await (serviceSupabase as any)
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', historyKey)
    .maybeSingle();

  if (error) {
    return { success: false, record: null, message: error.message };
  }

  let history: SavedPlanRecord[] = [];
  try {
    if (row?.setting_value) {
      const parsed = JSON.parse(row.setting_value);
      if (Array.isArray(parsed)) history = parsed as SavedPlanRecord[];
    }
  } catch {
    history = [];
  }

  const record = history.find((r) => r.id === recordId) ?? null;
  return { success: true, record };
}

// ── Gider + fiyat logu: sipariş onaylanınca çağrılır ────────────────────────
export async function confirmOrderCreateGiderAndLogAction(
  recordId: string,
  supplierName: string,
): Promise<{ success: boolean; message?: string }> {
  const { serviceSupabase, user, role } = await getAuthedClientWithRole();
  if (!user || !canUseModule(role)) return { success: false, message: 'Yetkisiz' };

  const { historyKey } = keysForUser(user.id);

  const { data: row } = await (serviceSupabase as any)
    .from('system_settings').select('setting_value').eq('setting_key', historyKey).maybeSingle();

  let history: SavedPlanRecord[] = [];
  try { if (row?.setting_value) { const p = JSON.parse(row.setting_value); if (Array.isArray(p)) history = p; } } catch {}

  const record = history.find((r) => r.id === recordId);
  if (!record) return { success: false, message: 'Kayıt bulunamadı' };

  // Ürün bilgilerini toplu çek
  const productIds = [...new Set(record.items.map((i) => i.productId).filter(Boolean))];
  const { data: products } = await (serviceSupabase as any)
    .from('urunler').select('id, distributor_alis_fiyati, kutu_ici_adet, koli_ici_kutu_adet, palet_ici_koli_adet, stok_kodu, ad')
    .in('id', productIds);
  const prodById = new Map<string, any>((products || []).map((p: any) => [p.id, p]));

  const piecesPerBox   = (p: any) => Math.max(1, Number(p.kutu_ici_adet    || 1));
  const boxesPerCase   = (p: any) => Math.max(1, Number(p.koli_ici_kutu_adet || 1));
  const casesPerPallet = (p: any) => Math.max(1, Number(p.palet_ici_koli_adet || 1));
  const priceMultiplier = (p: any, unitType: UnitType) => {
    if (unitType === 'kutu')  return piecesPerBox(p);
    if (unitType === 'koli')  return piecesPerBox(p) * boxesPerCase(p);
    if (unitType === 'palet') return piecesPerBox(p) * boxesPerCase(p) * casesPerPallet(p);
    return piecesPerBox(p);
  };

  // Toplam gerçek maliyet hesapla
  let grandTotal = 0;
  for (const item of record.items) {
    const prod = prodById.get(item.productId);
    if (!prod) continue;
    const mul  = priceMultiplier(prod, item.unitType);
    const base = Number(prod.distributor_alis_fiyati || 0);
    const real = item.fiyat_duzenlendi && item.gercek_alis_fiyati != null
      ? Number(item.gercek_alis_fiyati)
      : base;
    grandTotal += real * mul * item.quantity;
  }

  if (grandTotal <= 0) return { success: true }; // miktar yoksa gider ekleme

  // Gider kalemi ID bul: "mal_alim" kategorisi altında uygun kalem ara
  const { data: kalemRows } = await (serviceSupabase as any)
    .from('gider_kalemleri')
    .select('id')
    .limit(1);
  const kalemId = kalemRows?.[0]?.id ?? null;

  // giderler INSERT
  const giderPayload: Record<string, unknown> = {
    tarih:            new Date().toISOString().split('T')[0],
    tutar:            Math.round(grandTotal * 100) / 100,
    aciklama:         `Satın Alma #${record.name} — ${supplierName} Mal Alımı`,
    durum:            'Onaylandı',
    kaynak:           'satin_alma_siparisi',
    kaynak_id:        record.id,
    otomatik_eklendi: true,
    islem_yapan_kullanici_id: user.id,
  };
  if (kalemId) giderPayload.gider_kalemi_id = kalemId;

  const { error: giderErr } = await (serviceSupabase as any).from('giderler').insert(giderPayload);
  if (giderErr) return { success: false, message: 'Gider kaydı hatası: ' + giderErr.message };

  // tedarikci_fiyat_loglari INSERT (her satır için)
  const logRows: Record<string, unknown>[] = [];
  for (const item of record.items) {
    const prod = prodById.get(item.productId);
    if (!prod) continue;
    const mul      = priceMultiplier(prod, item.unitType);
    const base     = Number(prod.distributor_alis_fiyati || 0);
    const real     = item.fiyat_duzenlendi && item.gercek_alis_fiyati != null
      ? Number(item.gercek_alis_fiyati)
      : base;
    const stdTotal = base * mul;
    const relTotal = real * mul;
    const fark     = stdTotal > 0 ? ((relTotal - stdTotal) / stdTotal) * 100 : 0;

    logRows.push({
      urun_id:             item.productId,
      siparis_id:          record.id,
      standart_fiyat:      Math.round(stdTotal * 10000) / 10000,
      gercek_fiyat:        Math.round(relTotal * 10000) / 10000,
      fark_yuzde:          Math.round(fark * 100) / 100,
      indirim_aciklamasi:  item.indirim_aciklamasi || null,
      tedarikci_id:        record.supplierId || null,
      birim_turu:          item.unitType,
      miktar:              item.quantity,
    });
  }
  if (logRows.length > 0) {
    await (serviceSupabase as any).from('tedarikci_fiyat_loglari').insert(logRows);
  }

  return { success: true };
}
