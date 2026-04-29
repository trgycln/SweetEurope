// @ts-nocheck
'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseServiceClient } from '@/lib/supabase/service';
import { buildBatchItemInsertRows, buildProductSnapshotUpdate, round4, summarizeIncomingStock, toSafeNumber } from '@/lib/import-batch-utils';

export type SaveImportBatchPayload = {
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
  items: Array<{
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
  const message = `${error.message || ''}`;
  return error.code === '42P01'
    || error.code === 'PGRST205'
    || message.includes('ithalat_partileri')
    || message.includes('ithalat_parti_kalemleri');
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

    let partiInsert = await db
      .from('ithalat_partileri')
      .insert({
        referans_kodu: referansKodu,
        tedarikci_id: payload.tedarikciId || null,
        supplier_order_plan_record_id: payload.supplierOrderPlanRecordId || null,
        soguk_kg: round4(payload.sogukKg),
        kuru_kg: round4(payload.kuruKg),
        navlun_soguk_eur: round4(payload.navlunSogukEur),
        navlun_kuru_eur: round4(payload.navlunKuruEur),
        gumruk_vergi_toplam_eur: round4(payload.gumrukVergiToplamEur),
        traces_numune_ardiye_eur: round4(payload.tracesNumuneArdiyeEur),
        ek_notlar: payload.ekNotlar || null,
        varis_tarihi: payload.varisTarihi || null,
        durum: 'Hesaplandi',
      })
      .select('id')
      .single();

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

    const itemRows = buildBatchItemInsertRows(partiId, payload.items);

    const { error: itemsError } = await db
      .from('ithalat_parti_kalemleri')
      .insert(itemRows);

    if (itemsError) {
      console.error('ithalat_parti_kalemleri insert error:', itemsError);
      return { error: 'Parti kalemleri kaydedilemedi.' };
    }

    const { data: thresholdSetting } = await db
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'pricing_variance_alert_threshold_percent')
      .maybeSingle();

    const varianceThreshold = toSafeNumber(thresholdSetting?.setting_value, 5);
    const incomingSummary = summarizeIncomingStock(payload.items);

    const productIds = payload.items.map((item) => item.urunId);
    const { data: productRows } = await db
      .from('urunler')
      .select('id, stok_miktari, standart_inis_maliyeti_net')
      .in('id', productIds);

    const productById = Object.fromEntries(((productRows || []) as Array<{ id: string; stok_miktari?: number | null; standart_inis_maliyeti_net?: number | null }>).map((product) => [product.id, product]));

    let updatedProductCount = 0;
    for (const item of payload.items) {
      const snapshotUpdate = buildProductSnapshotUpdate(productById[item.urunId], item, varianceThreshold);

      let { error: updateError } = await db
        .from('urunler')
        .update(snapshotUpdate)
        .eq('id', item.urunId);

      if (updateError && isUnsupportedSnapshotColumnError(updateError)) {
        ({ error: updateError } = await db
          .from('urunler')
          .update({ stok_miktari: snapshotUpdate.stok_miktari })
          .eq('id', item.urunId));
      }

      if (updateError) {
        console.error('urun stok/snapshot guncelleme hatasi:', updateError);
        continue;
      }

      updatedProductCount += 1;
    }

    revalidatePath(`/${locale}/admin/urun-yonetimi/fiyatlandirma-hub`);
    revalidatePath(`/${locale}/admin/urun-yonetimi/fiyat-hesaplama`);
    revalidatePath(`/${locale}/admin/urun-yonetimi/urunler`);

    // Otomatik gümrük belgesi kaydı oluştur (dosya_url boş, kullanıcı sonradan yükleyecek)
    try {
      await db.from('belgeler').insert({
        ad: `TIR ${referansKodu} - Gümrük Belgesi`,
        kategori: 'gelen_evrak',
        alt_kategori: 'gumruk_tir',
        iliski_tipi: 'tir',
        iliski_id: partiId,
        tir_id: partiId,
        aciklama: `${payload.varisTarihi ? `Varış: ${new Date(payload.varisTarihi).toLocaleDateString('tr-TR')} • ` : ''}Gümrük vergisi: €${round4(payload.gumrukVergiToplamEur)} • Otomatik oluşturuldu`,
        dosya_url: null,
        otomatik_eklendi: true,
        yukleyen_id: user.id,
        gizli: false,
      });
    } catch (belgeErr) {
      // Belge kaydı başarısız olsa da TIR kaydedildi, sessizce geç
      console.error('Otomatik TIR belgesi kaydı hatası:', belgeErr);
    }

    // TIR maliyetlerini giderler tablosuna otomatik aktar
    try {
      const tirTarih = payload.varisTarihi
        ? String(payload.varisTarihi).substring(0, 10)
        : new Date().toISOString().substring(0, 10);

      const tirKalemler = [
        {
          aciklama: `${referansKodu} — Navlun (Donuk)`,
          tutar: round4(payload.navlunSogukEur),
        },
        {
          aciklama: `${referansKodu} — Navlun (Kuru)`,
          tutar: round4(payload.navlunKuruEur),
        },
        {
          aciklama: `${referansKodu} — Gümrük Vergisi`,
          tutar: round4(payload.gumrukVergiToplamEur),
        },
        {
          aciklama: `${referansKodu} — TRACES / Ardiye`,
          tutar: round4(payload.tracesNumuneArdiyeEur),
        },
      ].filter((k) => (k.tutar ?? 0) > 0);

      for (const kalem of tirKalemler) {
        try {
          // Yeni kolonlarla dene
          await db.from('giderler').insert({
            tarih: tirTarih,
            tutar: kalem.tutar,
            aciklama: kalem.aciklama,
            durum: 'Onaylandı',
            islem_yapan_kullanici_id: user.id,
            kaynak: 'tir',
            tir_id: partiId,
            otomatik_eklendi: true,
            tekrar_tipi: 'tek_seferlik',
          });
        } catch {
          // Yeni kolonlar henüz migrate edilmediyse eski yapıyla kaydet
          try {
            await db.from('giderler').insert({
              tarih: tirTarih,
              tutar: kalem.tutar,
              aciklama: kalem.aciklama,
              durum: 'Onaylandı',
              islem_yapan_kullanici_id: user.id,
            });
          } catch (fallbackErr) {
            console.error('TIR gider kalemi kaydı hatası (fallback):', fallbackErr);
          }
        }
      }

      revalidatePath(`/${locale}/admin/idari/finans/giderler`);
      revalidatePath(`/${locale}/admin/idari/finans/raporlama`);
      revalidatePath(`/${locale}/admin/dashboard`);
    } catch (tirGiderErr) {
      console.error('TIR gider aktarımı hatası:', tirGiderErr);
    }

    return {
      success: true,
      partiId,
      savedItemCount: itemRows.length,
      updatedProductCount,
      totalStockAdded: incomingSummary.totalQuantity,
    };
  } catch (error) {
    console.error('saveImportBatchAction error:', error);
    return {
      error: error instanceof Error ? error.message : 'Tir/parti kaydi sirasinda beklenmeyen bir hata oldu.',
    };
  }
}
