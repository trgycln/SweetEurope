// @ts-nocheck
'use server';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { Tables } from '@/lib/supabase/database.types';

export type SavePricesPayload = {
  urunId: string;
  satis_fiyati_alt_bayi?: number | null;
  satis_fiyati_musteri?: number | null;
};

export type SavePricesResult = {
  success?: boolean;
  error?: string;
};

export async function saveProductPricesAction(payload: SavePricesPayload, locale?: string): Promise<SavePricesResult> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.' };

    // Only include fields that are provided
    const updateData: Partial<Tables<'urunler'>> = {};
    if (typeof payload.satis_fiyati_alt_bayi === 'number') {
      updateData.satis_fiyati_alt_bayi = payload.satis_fiyati_alt_bayi;
    }
    if (typeof payload.satis_fiyati_musteri === 'number') {
      updateData.satis_fiyati_musteri = payload.satis_fiyati_musteri;
    }

    if (Object.keys(updateData).length === 0) {
      return { error: 'Güncellenecek bir alan yok.' };
    }

    const { error } = await supabase
      .from('urunler')
      .update(updateData)
      .eq('id', payload.urunId);

    if (error) {
      console.error('Fiyat güncelleme hatası:', error);
      return { error: 'Veritabanı hatası.' };
    }

    // Revalidate products list and calculator page for the active locale
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/urunler`);
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyat-hesaplama`);

    return { success: true };
  } catch (e) {
    console.error('saveProductPricesAction beklenmeyen hata:', e);
    return { error: 'Sunucu hatası.' };
  }
}

// --- Approval workflow ---
export type CreatePriceChangeRequestPayload = {
  urunId: string;
  proposed_alt_bayi?: number | null;
  proposed_musteri?: number | null;
  notes?: string | null;
};

export async function createPriceChangeRequestAction(payload: CreatePriceChangeRequestPayload, locale?: string): Promise<SavePricesResult> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.' };

    if (!payload.proposed_alt_bayi && !payload.proposed_musteri) {
      return { error: 'Öneri için en az bir alan seçiniz.' };
    }

    // @ts-ignore - fiyat_degisim_talepleri table exists but not in type definitions
    const { error } = await supabase.from('fiyat_degisim_talepleri').insert({
      urun_id: payload.urunId,
      proposed_satis_fiyati_alt_bayi: payload.proposed_alt_bayi ?? null,
      proposed_satis_fiyati_musteri: payload.proposed_musteri ?? null,
      notlar: payload.notes ?? null,
      status: 'Beklemede',
      created_by: user.id,
    });

    if (error) {
      const err: any = error as any;
      console.error('Fiyat değişim talebi oluşturulamadı:', { message: err?.message, details: err?.details, hint: err?.hint, code: err?.code });
      if (err?.code === '42P01' || (err?.message || '').includes('relation') ) {
        return { error: 'Fiyat talep tablosu bulunamadı. Lütfen Supabase’te create_price_change_requests.sql ve update_price_change_policies.sql skriptlerini çalıştırın.' };
      }
      return { error: 'Veritabanı hatası.' };
    }

    // Revalidate a potential approvals page
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyat-talepleri`);
    return { success: true };
  } catch (e) {
    console.error('createPriceChangeRequestAction hata:', e);
    return { error: 'Sunucu hatası.' };
  }
}

export async function approvePriceChangeRequestAction(talepId: string, onay: 'Onaylandi' | 'Reddedildi', locale?: string): Promise<SavePricesResult> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.' };

    // Fetch request
    // @ts-ignore - fiyat_degisim_talepleri table exists but not in type definitions
    const { data: talep, error: fetchErr } = await supabase
      .from('fiyat_degisim_talepleri')
      .select('*')
      .eq('id', talepId)
      .single();

    if (fetchErr || !talep) {
      const e: any = fetchErr as any;
      console.error('Talep okunamadı:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
      return { error: 'Talep bulunamadı.' };
    }

    if (onay === 'Onaylandi') {
      // Apply to product
      // @ts-ignore - talep has correct fields
      const updateData: any = {};
      if (typeof talep.proposed_satis_fiyati_alt_bayi === 'number') {
        updateData.satis_fiyati_alt_bayi = talep.proposed_satis_fiyati_alt_bayi;
      }
      if (typeof talep.proposed_satis_fiyati_musteri === 'number') {
        updateData.satis_fiyati_musteri = talep.proposed_satis_fiyati_musteri;
      }
      if (Object.keys(updateData).length) {
        const { error: upErr } = await supabase.from('urunler').update(updateData).eq('id', talep.urun_id);
        if (upErr) return { error: 'Ürün güncelleme hatası.' };
      }
    }

    // @ts-ignore - fiyat_degisim_talepleri table exists but not in type definitions
    const { error: updErr } = await supabase
      .from('fiyat_degisim_talepleri')
      .update({ status: onay, approved_by: user.id, approved_at: new Date().toISOString() })
      .eq('id', talepId);

    if (updErr) {
      const ue: any = updErr as any;
      console.error('Talep güncellenemedi:', { message: ue?.message, details: ue?.details, hint: ue?.hint, code: ue?.code });
      return { error: 'Talep güncellenemedi.' };
    }

    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyat-talepleri`);
    return { success: true };
  } catch (e) {
    console.error('approvePriceChangeRequestAction hata:', e);
    return { error: 'Sunucu hatası.' };
  }
}

// --- Bulk operations ---
export type BulkSavePricesPayload = {
  items: Array<{
    urunId: string;
    satis_fiyati_alt_bayi?: number;
    satis_fiyati_musteri?: number;
  }>;
};

export type BulkSavePricesResult = {
  success?: boolean;
  updatedCount?: number;
  skipped?: Array<{ urunId: string; reason: string }>;
  error?: string;
};

export async function bulkSaveProductPricesAction(
  payload: BulkSavePricesPayload,
  locale?: string
): Promise<BulkSavePricesResult> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.' };

    if (!payload.items || payload.items.length === 0) {
      return { error: 'Güncellenecek ürün yok.' };
    }

    const skipped: Array<{ urunId: string; reason: string }> = [];
    let updatedCount = 0;

    // Process each item
    for (const item of payload.items) {
      const updateData: Partial<Tables<'urunler'>> = {};
      
      if (typeof item.satis_fiyati_alt_bayi === 'number') {
        updateData.satis_fiyati_alt_bayi = item.satis_fiyati_alt_bayi;
      }
      if (typeof item.satis_fiyati_musteri === 'number') {
        updateData.satis_fiyati_musteri = item.satis_fiyati_musteri;
      }

      if (Object.keys(updateData).length === 0) {
        skipped.push({ urunId: item.urunId, reason: 'Güncellenecek alan yok' });
        continue;
      }

      const { error } = await supabase
        .from('urunler')
        .update(updateData)
        .eq('id', item.urunId);

      if (error) {
        console.error(`Ürün ${item.urunId} güncellenemedi:`, error);
        skipped.push({ urunId: item.urunId, reason: 'Veritabanı hatası' });
      } else {
        updatedCount++;
      }
    }

    // Revalidate once after all updates
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/urunler`);
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);

    return { 
      success: true, 
      updatedCount,
      skipped: skipped.length > 0 ? skipped : undefined
    };
  } catch (e) {
    console.error('bulkSaveProductPricesAction hata:', e);
    return { error: 'Sunucu hatası.' };
  }
}

export type BulkCreatePriceChangeRequestsPayload = {
  items: Array<{
    urunId: string;
    proposed_alt_bayi?: number;
    proposed_musteri?: number;
  }>;
  notes?: string;
};

export type BulkCreatePriceChangeRequestsResult = {
  success?: boolean;
  createdCount?: number;
  skipped?: Array<{ urunId: string; reason: string }>;
  error?: string;
};

export async function bulkCreatePriceChangeRequestsAction(
  payload: BulkCreatePriceChangeRequestsPayload,
  locale?: string
): Promise<BulkCreatePriceChangeRequestsResult> {
  try {
    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient(cookieStore);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nicht authentifiziert.' };

    if (!payload.items || payload.items.length === 0) {
      return { error: 'Talep oluşturulacak ürün yok.' };
    }

    const skipped: Array<{ urunId: string; reason: string }> = [];
    const requests: any[] = [];

    // Prepare bulk insert data
    for (const item of payload.items) {
      if (!item.proposed_alt_bayi && !item.proposed_musteri) {
        skipped.push({ urunId: item.urunId, reason: 'Öneri fiyat eksik' });
        continue;
      }

      requests.push({
        urun_id: item.urunId,
        proposed_satis_fiyati_alt_bayi: item.proposed_alt_bayi ?? null,
        proposed_satis_fiyati_musteri: item.proposed_musteri ?? null,
        notlar: payload.notes ?? null,
        status: 'Beklemede',
        created_by: user.id,
      });
    }

    if (requests.length === 0) {
      return { error: 'Geçerli talep bulunamadı.' };
    }

    // Bulk insert
    const { error, count } = await (supabase as any)
      .from('fiyat_degisim_talepleri')
      .insert(requests);

    if (error) {
      const err: any = error as any;
      console.error('Toplu talep oluşturulamadı:', { message: err?.message, details: err?.details, hint: err?.hint, code: err?.code });
      if (err?.code === '42P01' || (err?.message || '').includes('relation')) {
        return { error: 'Fiyat talep tablosu bulunamadı. Lütfen Supabase\'te create_price_change_requests.sql skriptini çalıştırın.' };
      }
      return { error: 'Veritabanı hatası.' };
    }

    // Revalidate
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyat-talepleri`);
    revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);

    return {
      success: true,
      createdCount: requests.length,
      skipped: skipped.length > 0 ? skipped : undefined,
    };
  } catch (e) {
    console.error('bulkCreatePriceChangeRequestsAction hata:', e);
    return { error: 'Sunucu hatası.' };
  }
}
