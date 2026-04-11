"use server";

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateSystemSettingAction(settingKey: string, value: string, locale?: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı', success: false };

  // Admin check
  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  if (profil?.rol !== 'Yönetici') {
    return { error: 'Yetki bulunamadı', success: false };
  }

  const { error } = await (supabase as any)
    .from('system_settings')
    .update({ 
      setting_value: value,
      updated_by: user.id 
    })
    .eq('setting_key', settingKey);

  if (error) {
    const e: any = error;
    console.error('Sistem ayarı güncellenemedi:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
    return { error: 'Veritabanı hatası', success: false };
  }

  revalidatePath(`/${locale ?? ''}/admin/ayarlar/sistem-ayarlari`);
  // Also revalidate pricing calculator
  revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyat-hesaplama`);
  
  return { success: true, message: 'Ayar başarıyla güncellendi' };
}

export async function getSystemSettings(category?: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);
  
  let query = (supabase as any)
    .from('system_settings')
    .select('setting_key, setting_value, setting_type');
  
  if (category) {
    query = query.eq('category', category);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Sistem ayarları yüklenemedi:', error);
    return {};
  }
  
  // Convert to key-value object
  const settings: Record<string, any> = {};
  for (const setting of data || []) {
    let value = setting.setting_value;
    if (setting.setting_type === 'number') {
      value = parseFloat(value);
    } else if (setting.setting_type === 'boolean') {
      value = value === 'true';
    }
    settings[setting.setting_key] = value;
  }
  
  return settings;
}

export type PricingDefaultsPayload = Record<string, number>;

export async function savePricingDefaultsAction(payload: PricingDefaultsPayload, locale?: string) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Oturum bulunamadı', success: false };

  const { data: profil } = await (supabase as any)
    .from('profiller')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();
  if (profil?.rol !== 'Yönetici') {
    return { error: 'Yetki bulunamadı', success: false };
  }

  const entries = Object.entries(payload || {}).filter(([, value]) => Number.isFinite(Number(value)));
  if (entries.length === 0) {
    return { error: 'Kaydedilecek gecerli deger yok', success: false };
  }

  const rows = entries.map(([setting_key, value]) => ({
    setting_key,
    setting_value: String(value),
    setting_type: 'number',
    category: 'pricing',
    updated_by: user.id,
  }));

  const { error } = await (supabase as any)
    .from('system_settings')
    .upsert(rows, { onConflict: 'setting_key' });

  if (error) {
    const e: any = error;
    console.error('Fiyat varsayilanlari kaydedilemedi:', { message: e?.message, details: e?.details, hint: e?.hint, code: e?.code });
    return { error: 'Veritabanı hatası', success: false };
  }

  revalidatePath(`/${locale ?? ''}/admin/ayarlar/sistem-ayarlari`);
  revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyat-hesaplama`);
  revalidatePath(`/${locale ?? ''}/admin/urun-yonetimi/fiyatlandirma-hub`);

  return { success: true, message: 'Fiyat varsayilanlari kaydedildi' };
}