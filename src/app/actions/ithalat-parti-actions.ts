// @ts-nocheck
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { buildBatchItemInsertRows, buildProductSnapshotUpdate, round4, summarizeIncomingStock, toSafeNumber } from '@/lib/import-batch-utils';

export type SaveImportBatchPayload = {
  id?: string;
  referansKodu?: string;
  tedarikciId?: string | null;
  supplierOrderPlanRecordId?: string | null;
  sogukKg?: number;
  kuruKg?: number;
  navlunSogukEur?: number;
  navlunKuruEur?: number;
  gumrukVergiToplamEur?: number;
  tracesNumuneArdiyeEur?: number;
  ekNotlar?: string | null;
  varisTarihi?: string | null;
  indirim1?: number;
  indirim2?: number;
  items: Array<{
    urunId: string;
    koliSayisi?: number;           // Master data driven: koli adedi
    miktarAdet: number;            // Otomatik: koliSayisi × koli_ici_adet
    toplamAgirlikKg: number;       // Otomatik: miktarAdet × birim_agirlik_kg
    birimAlisFiyatiOrijinal: number; // Master data (değişmez)
    indirimliAlisFiyati?: number;  // Hesaplanan
    ciplakMaliyetEur: number;
    dagitilanNavlunEur: number;
    dagitilanGumrukEur: number;
    dagitilanOzelGiderEur: number;
    operasyonVeRiskYukuEur: number;
    gercekInisMaliyetiNet: number;
    standartInisMaliyetiNet: number;
    maliyetSapmaYuzde: number;
  }>;
};

export type SaveImportBatchResult = {
  success?: boolean;
  error?: string;
  partiId?: string;
  savedItemCount?: number;
  updatedProductCount?: number;
  totalStockAdded?: number;
};

function isMissingBatchTableError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  if (error.code === '23505') return false; // Unique constraint violation is NOT a missing table
  const message = `${error.message || ''}`;
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || message.includes('relation "ithalat_partileri" does not exist')
    || message.includes('relation "ithalat_parti_kalemleri" does not exist');
}

function isUnsupportedSnapshotColumnError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  const message = `${error.message || ''}`;
  return error.code === '42703'
    || error.code === 'PGRST204'
    || message.includes('son_gercek_inis_maliyeti_net')
    || message.includes('son_maliyet_sapma_yuzde')
    || message.includes('karlilik_alarm_aktif')
    || message.includes('standart_inis_maliyeti_net');
}

export async function saveImportBatchAction(payload: SaveImportBatchPayload, locale = 'tr'): Promise<SaveImportBatchResult> {
  try {
    if (!payload?.items?.length) {
      return { error: 'Kaydedilecek parti kalemi yok.' };
    }

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const db = supabase as any;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Oturum bulunamadi.' };

    const { data: profile } = await db
      .from('profiller')
      .select('rol')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.rol !== 'Yönetici' && profile?.rol !== 'Personel' && profile?.rol !== 'Ekip Üyesi') {
      return { error: 'Bu islem icin yetki gerekiyor.' };
    }

    const referansKodu = String(payload.referansKodu || '').trim() || `TIR-${new Date().toISOString().slice(0, 10)}`;

    const batchData = {
      referans_kodu: referansKodu,
      tedarikci_id: payload.tedarikciId || null,
      supplier_order_plan_record_id: payload.supplierOrderPlanRecordId || null,
      soguk_kg: round4(payload.sogukKg),
      kuru_kg: round4(payload.kuruKg),
      indirim_1_yuzde: round4(payload.indirim1),
      indirim_2_yuzde: round4(payload.indirim2),
      navlun_soguk_eur: round4(payload.navlunSogukEur),
      navlun_kuru_eur: round4(payload.navlunKuruEur),
      gumruk_vergi_toplam_eur: round4(payload.gumrukVergiToplamEur),
      traces_numune_ardiye_eur: round4(payload.tracesNumuneArdiyeEur),
      ek_notlar: payload.ekNotlar || null,
      varis_tarihi: payload.varisTarihi || null,
      durum: 'Taslak',
    };

    let partiInsert;
    if (payload.id) {
      partiInsert = await db.from('ithalat_partileri').update(batchData).eq('id', payload.id).select('id').single();
    } else {
      partiInsert = await db.from('ithalat_partileri').insert(batchData).select('id').single();
    }

    if (partiInsert.error) {
      if (isMissingBatchTableError(partiInsert.error)) {
        return {
          error: 'Tir/parti tablolari henuz veritabaninda yok. Simulasyon calisir, kayit icin migration dosyasini Supabase tarafinda calistirmak gerekiyor.',
        };
      }

      if (partiInsert.error.code === '23505') {
        return { error: 'Bu referans kodu zaten kullaniliyor. Lutfen farkli bir tir referansi girin.' };
      }

      console.error('ithalat_partileri insert error:', partiInsert.error);
      return { error: 'Parti kaydi olusturulamadi.' };
    }

    const partiId = partiInsert.data?.id;
    if (!partiId) {
      return { error: 'Parti ID olusturulamadi.' };
    }

    if (payload.id) {
      await db.from('ithalat_parti_kalemleri').delete().eq('parti_id', partiId);
    }

    // ─── MASTER DATA DRIVEN KURAL ───────────────────────────────────────────
    // Frontend'den gelen miktarAdet, toplamAgirlikKg ve birimAlisFiyatiOrijinal
    // değerlerine GÜVENİLMEZ. Sunucuda urunler tablosundan yeniden hesaplanır.
    // Bu bir güvenlik katmanıdır — payload manipülasyonunu engeller.
    const urunIds = payload.items.map(i => i.urunId).filter(Boolean);
    const { data: masterDataRows } = await db
      .from('urunler')
      .select('id, distributor_alis_fiyati, koli_ici_adet, birim_agirlik_kg, standart_inis_maliyeti_net')
      .in('id', urunIds);

    const masterDataById: Record<string, any> = {};
    for (const row of (masterDataRows || [])) {
      masterDataById[row.id] = row;
    }

    // Her kalemi Master Data ile yeniden hesapla
    const { calculateMiktarAdet: calcMiktar, calculateToplamAgirlikKg: calcAgirlik } =
      await import('@/lib/import-batch-utils');

    const verifiedItems = payload.items.map((item) => {
      const master = masterDataById[item.urunId];
      if (!master) return item; // Master data yoksa orijinal item ile devam

      const koliSayisi = toSafeNumber((item as any).koliSayisi, 1);
      const gercekMiktar = calcMiktar(koliSayisi, master.koli_ici_adet);
      const gercekAgirlik = calcAgirlik(gercekMiktar, master.birim_agirlik_kg);
      const gercekBazFiyat = toSafeNumber(master.distributor_alis_fiyati, 0);

      return {
        ...item,
        miktarAdet: gercekMiktar,              // Sunucuda hesaplanan
        toplamAgirlikKg: gercekAgirlik,         // Sunucuda hesaplanan
        birimAlisFiyatiOrijinal: gercekBazFiyat, // Master Data'dan (değişmez)
        standartInisMaliyetiNet: toSafeNumber(master.standart_inis_maliyeti_net, item.standartInisMaliyetiNet),
      };
    });

    const itemRows = buildBatchItemInsertRows(partiId, verifiedItems as any);
    const normalizedRows = (itemRows as any[]).map((r) => {
      const { ithalat_partisi_id, ...rest } = r;
      return { ...rest, parti_id: ithalat_partisi_id ?? partiId };
    });

    const { error: itemsError } = await db
      .from('ithalat_parti_kalemleri')
      .insert(normalizedRows);

    if (itemsError) {
      console.error('ithalat_parti_kalemleri insert error:', itemsError);
      return { error: 'Parti kalemleri kaydedilemedi.' };
    }

    return {
      success: true,
      partiId,
      savedItemCount: itemRows.length,
      updatedProductCount: 0,
      totalStockAdded: 0,
    };
  } catch (error) {
    console.error('saveImportBatchAction error:', error);
    return {
      error: error instanceof Error ? error.message : 'Tir/parti kaydi sirasinda beklenmeyen bir hata oldu.',
    };
  }
}

export async function completeBatchAction(batchId: string, locale = 'tr') {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Oturum bulunamadı.' };

    const { error } = await supabase.rpc('complete_import_batch', {
      p_batch_id: batchId,
      p_user_id: user.id
    });

    if (error) {
      console.error('complete_import_batch rpc error:', error);
      return { error: error.message || 'Mal kabul tamamlanırken bir hata oluştu.' };
    }

    revalidatePath(`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani`);
    revalidatePath(`/${locale}/admin/urun-yonetimi/tedarikci-siparis-plani/${batchId}`);
    return { success: true };
  } catch (error: any) {
    console.error('completeBatchAction error:', error);
    return { error: error.message || 'Beklenmeyen bir hata oluştu.' };
  }
}
